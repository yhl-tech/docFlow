"""
Markdown 预处理模块

负责 Markdown 导出前的预处理：
- Mermaid 图表渲染为 PNG
- 图片下载和本地化（URL → 本地文件）
- reference-doc 模板路径解析
"""

import asyncio
import base64
import os
import re
import shutil
import uuid
from pathlib import Path
from typing import Optional

from app.core.logging import get_logger

_log = get_logger(__name__)


class MarkdownPreprocessor:
    """Markdown 预处理"""

    def __init__(self, mmdc_available: bool = False) -> None:
        self._mmdc_available = mmdc_available

    async def render_mermaid(self, code: str, tmpdir: str) -> Optional[str]:
        """将 Mermaid 代码渲染为 PNG，返回文件路径；失败返回 None"""
        uid = uuid.uuid4().hex
        input_file = os.path.join(tmpdir, f"mmd_{uid}.mmd")
        output_file = os.path.join(tmpdir, f"mmd_{uid}.png")

        with open(input_file, "w", encoding="utf-8") as f:
            f.write(code)

        # 优先全局 mmdc，否则用 npx
        for cmd in (
            ["mmdc", "-i", input_file, "-o", output_file],
            ["npx", "--yes", "@mermaid-js/mermaid-cli", "-i", input_file, "-o", output_file],
        ):
            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                _, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)
                if proc.returncode == 0 and os.path.exists(output_file):
                    return output_file
                _log.debug(f"mmdc cmd {cmd[0]} failed: {stderr.decode(errors='replace')[:200]}")
            except (FileNotFoundError, asyncio.TimeoutError, OSError) as e:
                _log.debug(f"mmdc cmd {cmd[0]} error: {e}")

        return None

    async def preprocess_mermaid(self, markdown: str, tmpdir: str) -> str:
        """将 Markdown 中的 ```mermaid 块替换为 PNG 图片引用或降级为普通代码块"""
        pattern = re.compile(r"```mermaid[ \t]*\n(.*?)\n```", re.DOTALL | re.IGNORECASE)
        chunks: list[str] = []
        last_end = 0

        for m in pattern.finditer(markdown):
            chunks.append(markdown[last_end : m.start()])
            code = m.group(1)
            img_path = await self.render_mermaid(code, tmpdir)
            if img_path:
                chunks.append(f"![Mermaid 图表]({img_path})")
            else:
                chunks.append(f"```\n{code}\n```")
            last_end = m.end()

        chunks.append(markdown[last_end:])
        return "".join(chunks)

    async def preprocess_images(self, markdown: str, tmpdir: str) -> str:
        """
        处理 Markdown 中的图片：
        1. 服务器图片 URL → 复制到临时目录
        2. Base64 图片 → 解码保存到临时目录
        """
        # 匹配 markdown 图片语法: ![alt](url)
        image_pattern = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")

        # 获取 assets 目录的绝对路径
        assets_dir = Path(__file__).parent.parent.parent.parent / "assets"

        def process_match(m: re.Match) -> str:
            nonlocal assets_dir
            alt_text = m.group(1)
            url = m.group(2)

            # 处理 Base64 图片
            if url.startswith("data:image/"):
                try:
                    header, data = url.split(",", 1)
                    mime_match = re.search(r"data:image/(\w+);", header)
                    if not mime_match:
                        _log.warning(f"无法识别的 Base64 图片格式: {header[:50]}...")
                        return m.group(0)
                    ext = mime_match.group(1)
                    image_data = base64.b64decode(data)
                    filename = f"{uuid.uuid4().hex}.{ext}"
                    local_path = os.path.join(tmpdir, filename)
                    with open(local_path, "wb") as f:
                        f.write(image_data)
                    _log.debug(f"保存 Base64 图片: {filename} ({len(image_data)} bytes)")
                    return f"![{alt_text}]({filename})"
                except Exception as e:
                    _log.warning(f"处理 Base64 图片失败: {e}")
                    return m.group(0)

            # 处理相对路径的服务器图片（/assets/uploads/images/...）
            if not url.startswith("/assets/uploads/images/"):
                return m.group(0)

            filename = url.split("/")[-1]
            source_path = assets_dir / "uploads" / "images" / filename
            local_path = os.path.join(tmpdir, filename)

            try:
                if source_path.exists():
                    shutil.copy2(source_path, local_path)
                    _log.debug(f"复制图片到本地: {local_path}")
                    return f"![{alt_text}]({filename})"
                else:
                    _log.warning(f"图片文件不存在: {source_path}")
                    return m.group(0)
            except Exception as e:
                _log.warning(f"复制图片失败: {source_path}, 错误: {e}")
                return m.group(0)

        # 从后往前替换，避免位置偏移问题
        matches = list(image_pattern.finditer(markdown))
        matches.reverse()
        processed = markdown
        for m in matches:
            result = process_match(m)
            processed = processed[:m.start()] + result + processed[m.end():]

        return processed

    @staticmethod
    def get_reference_doc_path(template: str) -> Optional[str]:
        """返回 reference.docx 路径，不存在则返回 None（使用 pandoc 默认样式）"""
        templates_dir = Path(__file__).parent.parent.parent.parent / "assets" / "templates" / "docx"
        templates_dir.mkdir(parents=True, exist_ok=True)
        candidate = templates_dir / f"{template}.docx"
        if candidate.exists():
            _log.debug(f"找到模板: {candidate}")
            return str(candidate)
        _log.debug(f"模板 {template}.docx 不存在，使用 pandoc 默认样式")
        return None

    async def full_preprocess(
        self,
        markdown: str,
        tmpdir: str,
        preprocess_mermaid: bool = True,
    ) -> str:
        """执行完整的 Markdown 预处理流程"""
        if preprocess_mermaid:
            markdown = await self.preprocess_mermaid(markdown, tmpdir)
        markdown = await self.preprocess_images(markdown, tmpdir)
        return markdown
