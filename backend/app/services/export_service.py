"""
文档导出服务（Word / PDF）
技术路径：Pandoc（方案 A）

Word (.docx)
  - Markdown + tex_math_dollars → docx（OMML 原生公式自动处理）
  - Mermaid 代码块 → mmdc CLI → PNG，再嵌入 docx
  - 支持 reference-doc 模板（academic / business / simple / default）

PDF
  - PDF 引擎优先级：wkhtmltopdf > weasyprint（均通过 pandoc 调用）
  - 数学公式：wkhtmltopdf 用 --mathjax（CDN），weasyprint 用 --mathml
  - 中文字体：通过 --include-in-header 注入 CSS font-family
  - Mermaid 同 docx（PNG 嵌入）
"""

import asyncio
import os
import re
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Any, Optional

from loguru import logger


class PandocNotAvailableError(RuntimeError):
    """Pandoc 未安装时抛出"""


class ExportService:
    """单例导出服务，缓存外部工具可用性检测结果"""

    def __init__(self) -> None:
        self._pandoc_ok: Optional[bool] = None
        self._pandoc_bin_path: str = "pandoc"
        self._mmdc_ok: Optional[bool] = None
        self._pdf_engine: Optional[str] = None   # "xelatex" | "pdflatex" | "wkhtmltopdf" | "weasyprint" | ""
        self._wkhtmltopdf_bin_path: str = "wkhtmltopdf"
        self._latex_engine_bin_path: str = "xelatex"  # 用于 xelatex/pdflatex

    # ------------------------------------------------------------------ #
    #  工具可用性检测
    # ------------------------------------------------------------------ #

    async def _check_tool(self, *cmd: str) -> bool:
        # Windows 上需要使用 shell 来正确查找 PATH 中的可执行文件
        try:
            # 当使用 shell 时，需要将命令合并为字符串
            cmd_str = " ".join(cmd) if len(cmd) > 1 else cmd[0]
            proc = await asyncio.create_subprocess_shell(
                cmd_str,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await asyncio.wait_for(proc.communicate(), timeout=10)
            return proc.returncode == 0
        except FileNotFoundError:
            logger.debug(f"命令不存在: {cmd[0]}")
            return False
        except asyncio.TimeoutError:
            logger.debug(f"命令执行超时: {cmd[0]}")
            return False
        except OSError as e:
            logger.debug(f"命令执行错误 {cmd[0]}: {e}")
            return False

    # pandoc 搜索路径：优先从 PATH 环境变量动态获取，后备常见安装位置
    _PANDOC_PATHS = [
        "pandoc",  # PATH 中可用（通过 shutil.which 查找）
        r"C:\Program Files\Pandoc\pandoc.exe",
        r"C:\Program Files (x86)\Pandoc\pandoc.exe",
        r"C:\Users\yuanhl\AppData\Local\Pandoc\pandoc.exe",
        r"C:\Users\yuanhl\AppData\Local\Programs\Pandoc\pandoc.exe",
        r"C:\Users\yuanhl\scoop\shims\pandoc.exe",
        r"C:\Users\yuanhl\Documents\PowerShell\Modules\pandoc\bin\pandoc.exe",
        r"C:\Users\yuanhl\Anaconda3\Scripts\pandoc.exe",
        r"C:\Users\yuanhl\miniconda3\Scripts\pandoc.exe",
        r"/usr/bin/pandoc",
        r"/usr/local/bin/pandoc",
        r"/opt/homebrew/bin/pandoc",
    ]

    async def _pandoc_bin(self) -> str:
        """返回可用的 pandoc 可执行文件路径，优先从 PATH 动态查找"""
        import os

        # 1. 优先从 PATH 环境变量动态查找（跨平台最佳实践）
        path_from_env = shutil.which("pandoc")
        if path_from_env:
            # Windows 上 shutil.which 可能返回大写 .EXE，尝试规范化
            path_normalized = path_from_env.lower().replace(".exe", "") + ".exe"
            # 直接检查文件是否存在（更可靠）
            if os.path.exists(path_normalized):
                logger.info(f"从 PATH 找到 pandoc: {path_normalized}")
                return path_normalized
            # 也尝试原始路径
            if os.path.exists(path_from_env):
                logger.info(f"从 PATH 找到 pandoc: {path_from_env}")
                return path_from_env

        # 2. 后备：遍历硬编码的路径列表（直接检查文件存在性）
        for candidate in self._PANDOC_PATHS:
            # 跳过占位符
            if candidate == "pandoc":
                continue
            if os.path.exists(candidate):
                logger.info(f"从备用路径找到 pandoc: {candidate}")
                return candidate

        # 3. 最后尝试通过命令检测（兜底方案）
        for candidate in ["pandoc"]:
            if await self._check_tool(candidate, "--version"):
                logger.info(f"从命令检测找到 pandoc: {candidate}")
                return candidate

        logger.warning("未找到 pandoc，请确保已安装 https://pandoc.org")
        return ""

    async def pandoc_available(self) -> bool:
        if self._pandoc_ok is None:
            bin_path = await self._pandoc_bin()
            self._pandoc_ok = bool(bin_path)
            if self._pandoc_ok:
                self._pandoc_bin_path = bin_path
            else:
                logger.warning("pandoc 未找到，导出不可用")
        return self._pandoc_ok

    def _convert_bold_paras_to_headings(self, text: str) -> str:
        """
        将"加粗的正文段落"转换为真正的 Markdown 标题。

        Word 文档中，标题通常有三种情况：
        1. 应用了 Word 内置标题样式（如"标题 1"）→ Pandoc 正确转为 # ## 等
        2. 仅加粗但没有标题样式 → Pandoc 转为 **加粗文字**
        3. 既有加粗又有标题样式 → Pandoc 转为 # **加粗文字**

        本方法处理情况 2，将符合标题特征的加粗段落转为真正的标题。
        """
        import re

        lines = text.split('\n')
        result_lines = []

        for line in lines:
            # 匹配孤立的一行加粗文本（前后是空行或文档边界）
            # 模式：**文本** 或 **文本**（后面可能有空格和内容但内容是空的或只有空白）
            # 但排除 **文本** 后面跟着非空内容的情况（那可能是加粗的普通句子）
            bold_only_pattern = r'^(\*{2}|_{2})([^\*\_]+)\1\s*$'
            match = re.match(bold_only_pattern, line.strip())

            if match:
                content = match.group(2).strip()
                # 判断是否为标题特征
                # 1. 以中文数字开头：一、二、三...
                # 2. 以括号开头：（一）、(一)
                # 3. 以"第X节/章/部分"开头
                # 4. 以罗马数字、阿拉伯数字+顿号/点开头
                heading_patterns = [
                    r'^[一二三四五六七八九十百千]+[、.　 ]',  # 一、二、三 或 一. 三
                    r'^[（\(][一二三四五六七八九十]+[）\)]',  # （一）、(一)
                    r'^第[一二三四五六七八九十0-9]+[节章节部分篇]',  # 第一节、第三章
                    r'^[0-9]+[.、]',  # 1. 2、
                    r'^[ivxIVX]+[.、)]',  # i. ii.
                    r'^[A-Z][.、)]',  # A. B、
                ]
                is_heading = any(re.match(p, content) for p in heading_patterns)

                if is_heading:
                    # 转换为一级标题
                    result_lines.append(f"# {content}")
                    continue

            result_lines.append(line)

        return '\n'.join(result_lines)

    async def docx_to_markdown(self, docx_path: str) -> str:
        """
        Word (.docx) → Markdown，公式转为 $...$ / $$...$$ LaTeX。
        与 export_docx 使用同一 Pandoc，OMML↔LaTeX 与导出路径一致，避免第三方库损坏公式。
        """
        if not await self.pandoc_available():
            raise PandocNotAvailableError(
                "未安装 Pandoc，无法高质量解析 Word 公式。请安装：https://pandoc.org"
            )
        import subprocess
        from functools import partial

        tmpdir = tempfile.mkdtemp()
        try:
            out_md = os.path.join(tmpdir, "parsed.md")
            abs_docx = os.path.abspath(docx_path)
            cmd = [
                self._pandoc_bin_path,
                "--from=docx",
                "--to=markdown+tex_math_dollars+tex_math_single_backslash",
                "-o",
                out_md,
                abs_docx,
            ]

            def quote_arg(arg: str) -> str:
                return f'"{arg}"' if " " in arg else arg

            quoted = [quote_arg(cmd[0])] + cmd[1:]
            cmd_str = " ".join(quoted)
            loop = asyncio.get_event_loop()
            proc = await loop.run_in_executor(
                None,
                partial(
                    subprocess.run,
                    cmd_str,
                    shell=True,
                    capture_output=True,
                    cwd=tmpdir,
                    timeout=120,
                ),
            )
            if proc.returncode != 0:
                err = (proc.stderr or b"").decode("utf-8", errors="replace")[:500]
                logger.error(f"Pandoc docx→md 失败: {err}")
                raise RuntimeError(f"Pandoc 解析 docx 失败: {err[:200]}")
            if not os.path.isfile(out_md):
                raise RuntimeError("Pandoc 未生成 Markdown 文件")
            with open(out_md, encoding="utf-8") as f:
                text = f.read()
            text = re.sub(
                r"^---\s*\n.*?\n---\s*\n",
                "",
                text,
                count=1,
                flags=re.DOTALL,
            )
            # 后处理：将"加粗的正文段落"转换为真正的标题
            # Word 导入时，如果标题只是加粗而没有应用标题样式，会被转为 **text**
            # 这里将其转换为 Markdown 标题，保持与导出的一致性
            text = self._convert_bold_paras_to_headings(text)
            return text.lstrip("\n")
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    async def docx_to_html(self, docx_path: str) -> str:
        """
        Word (.docx) → HTML，保留原始字体、字号、对齐等样式。
        用于导入时保留原文样式。
        """
        if not await self.pandoc_available():
            raise PandocNotAvailableError(
                "未安装 Pandoc，无法解析 Word 样式。请安装：https://pandoc.org"
            )
        import subprocess
        from functools import partial

        tmpdir = tempfile.mkdtemp()
        try:
            out_html = os.path.join(tmpdir, "parsed.html")
            abs_docx = os.path.abspath(docx_path)
            # --to=html 保留 docx 的原始样式（内联样式）
            cmd = [
                self._pandoc_bin_path,
                "--from=docx",
                "--to=html",
                "-o",
                out_html,
                abs_docx,
            ]

            def quote_arg(arg: str) -> str:
                return f'"{arg}"' if " " in arg else arg

            quoted = [quote_arg(cmd[0])] + cmd[1:]
            cmd_str = " ".join(quoted)
            loop = asyncio.get_event_loop()
            proc = await loop.run_in_executor(
                None,
                partial(
                    subprocess.run,
                    cmd_str,
                    shell=True,
                    capture_output=True,
                    timeout=120,
                ),
            )
            if proc.returncode != 0:
                err = (proc.stderr or b"").decode("utf-8", errors="replace")[:500]
                logger.error(f"Pandoc docx→html 失败: {err}")
                raise RuntimeError(f"Pandoc 解析 docx 失败: {err[:200]}")
            if not os.path.isfile(out_html):
                raise RuntimeError("Pandoc 未生成 HTML 文件")
            with open(out_html, encoding="utf-8") as f:
                html_content = f.read()
            # 移除 pandoc 添加的默认 head 和 body 包装，保留 body 内容
            body_match = re.search(r'<body[^>]*>(.*?)</body>', html_content, re.DOTALL)
            result = body_match.group(1).strip() if body_match else html_content.strip()
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)
        return result

    async def docx_to_style_runs(self, docx_path: str) -> list:
        """
        Word (.docx) → 字符级样式列表（style_runs）。
        
        关键：字符位置必须与 docx_to_markdown 返回的文本一致，
        因为前端 markdown parser 会将 Markdown 解析为 TipTap doc，
        需要精确的位置对应才能正确应用样式。
        
        实现策略：
        1. 获取 Markdown 文本作为权威文本
        2. 获取 Pandoc JSON AST 获取样式信息
        3. 通过文本匹配将样式映射到 Markdown 文本位置
        """
        if not await self.pandoc_available():
            raise PandocNotAvailableError("未安装 Pandoc，无法解析 Word 样式")

        import subprocess
        from functools import partial

        abs_docx = os.path.abspath(docx_path)
        tmpdir = tempfile.mkdtemp()
        try:
            out_md = os.path.join(tmpdir, "parsed.md")
            
            # 使用与 docx_to_markdown 完全相同的选项
            cmd = [
                self._pandoc_bin_path,
                "--from=docx",
                "--to=markdown+tex_math_dollars+tex_math_single_backslash",
                "-o", out_md,
                abs_docx,
            ]
            cmd_str = " ".join(f'"{a}"' if " " in a else a for a in cmd)
            loop = asyncio.get_event_loop()
            proc_md = await loop.run_in_executor(
                None,
                partial(subprocess.run, cmd_str, shell=True, capture_output=True, cwd=tmpdir, timeout=120),
            )
            if proc_md.returncode != 0:
                logger.warning(f"Pandoc docx→markdown 失败: {proc_md.stderr.decode(errors='replace')[:200]}")
                return []

            with open(out_md, encoding="utf-8") as f:
                markdown_text = f.read()
            # 移除 YAML front matter（与 docx_to_markdown 一致）
            markdown_text = re.sub(r"^---\s*\n.*?\n---\s*\n", "", markdown_text, count=1, flags=re.DOTALL)
            markdown_text = markdown_text.lstrip("\n")
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

        # 调试：打印 Markdown 文本片段，检查格式
        logger.debug(f"docx_to_style_runs: Markdown长度={len(markdown_text)}, 前200字符:\n{markdown_text[:200]}")

        # 获取 JSON AST 获取样式信息
        cmd = [
            self._pandoc_bin_path,
            "--from=docx",
            "--to=json",
            abs_docx,
        ]
        cmd_str = " ".join(f'"{a}"' if " " in a else a for a in cmd)
        proc = await loop.run_in_executor(
            None,
            partial(subprocess.run, cmd_str, shell=True, capture_output=True, timeout=120),
        )
        if proc.returncode != 0:
            err = (proc.stderr or b"").decode("utf-8", errors="replace")[:500]
            logger.error(f"Pandoc docx→json 失败: {err}")
            raise RuntimeError(f"Pandoc 解析 docx 失败: {err[:200]}")

        import json as _json
        ast = _json.loads(proc.stdout)

        # 解析 AST，提取每个文本片段及其样式
        style_runs: list = []

        def extract_styles(inlines: list, active_marks: list) -> list:
            """递归提取 inlines 中的文本片段及其样式"""
            runs = []
            for el in inlines:
                if isinstance(el, list):
                    runs.extend(extract_styles(el, active_marks))
                elif isinstance(el, dict):
                    t = el.get("t", "")
                    if t in ("Strong", "Emph", "Underline"):
                        runs.extend(extract_styles(el.get("c", []), active_marks + [t]))
                    elif t == "Str":
                        text = str(el.get("c", ""))
                        runs.append({
                            "text": text,
                            "bold": "Strong" in active_marks,
                            "italic": "Emph" in active_marks,
                            "underline": "Underline" in active_marks,
                        })
                    elif t in ("Space", "SoftBreak"):
                        runs.append({"text": " ", "bold": False, "italic": False, "underline": False})
                    elif t == "LineBreak":
                        runs.append({"text": "\n", "bold": False, "italic": False, "underline": False})
                    elif t in ("Math", "DisplayMath"):
                        math_text = str(el.get("c", "") if isinstance(el.get("c"), str) else "")
                        runs.append({"text": math_text, "bold": False, "italic": False, "underline": False})
                    elif t == "Code":
                        code_text = str(el.get("c", {}).get("text", "") if isinstance(el.get("c"), dict) else str(el.get("c", "")))
                        runs.append({"text": code_text, "bold": False, "italic": False, "underline": False})
                    elif t == "Link":
                        if isinstance(el.get("c"), list) and len(el["c"]) > 1:
                            runs.extend(extract_styles(el["c"][-1] if isinstance(el["c"][-1], list) else [el["c"][-1]], active_marks))
                    else:
                        if "c" in el and isinstance(el["c"], list):
                            runs.extend(extract_styles(el["c"], active_marks))
                elif isinstance(el, str):
                    runs.append({"text": el, "bold": False, "italic": False, "underline": False})
            return runs

        # 遍历 AST blocks，提取样式
        char_offset = 0
        md_offset = 0
        
        for block in ast.get("blocks", []):
            t = block.get("t", "")
            inlines = []
            
            if t in ("Para", "Plain"):
                inlines = block.get("c", [])
                if isinstance(inlines, list) and len(inlines) > 0 and isinstance(inlines[0], list):
                    inlines = inlines[0]
            elif t == "Header":
                inlines = block.get("c", [])
                if isinstance(inlines, list) and len(inlines) > 0:
                    if isinstance(inlines[-1], list):
                        inlines = inlines[-1]
                    else:
                        inlines = []
            elif t == "BlockQuote":
                for sub in (block.get("c", []) if isinstance(block.get("c"), list) else []):
                    if isinstance(sub, dict) and sub.get("t") == "Para":
                        sub_inlines = sub.get("c", [])
                        if isinstance(sub_inlines, list) and len(sub_inlines) > 0 and isinstance(sub_inlines[0], list):
                            sub_inlines = sub_inlines[0]
                        inlines.extend(sub_inlines if isinstance(sub_inlines, list) else [])
            
            # 提取这个 block 的文本片段
            runs = extract_styles(inlines if isinstance(inlines, list) else [], [])
            
            # 在 Markdown 中定位这些文本片段
            for run in runs:
                text = run["text"]
                if not text:
                    continue
                
                # 在 Markdown 中查找这个文本
                found_pos = markdown_text.find(text, md_offset)
                
                if found_pos != -1:
                    # 检查这个匹配是否在加粗语法内部
                    # 如果匹配之前有奇数个 **，说明在 **...** 内部
                    in_bold = False
                    for check_pos in range(found_pos - 1, max(-1, found_pos - 100) - 1, -1):
                        if check_pos < 0:
                            break
                        if markdown_text[check_pos:check_pos + 2] in ('**', '__'):
                            in_bold = not in_bold
                        elif markdown_text[check_pos] == '\n':
                            break
                    if in_bold:
                        # 跳过，继续找下一个匹配
                        found_pos = markdown_text.find(text, found_pos + 1)
                        if found_pos == -1:
                            # 还是找不到，放弃这个 run
                            next_char_pos = markdown_text.find(text[0] if text else ' ', md_offset + 1)
                            if next_char_pos != -1:
                                md_offset = next_char_pos
                            else:
                                md_offset += len(text)
                        else:
                            style_runs.append({
                                "start": found_pos,
                                "end": found_pos + len(text),
                                "bold": run["bold"],
                                "italic": run["italic"],
                                "underline": run["underline"],
                                "font_family": None,
                            })
                            md_offset = found_pos + len(text)
                        continue

                    # 找到匹配，应用样式
                    style_runs.append({
                        "start": found_pos,
                        "end": found_pos + len(text),
                        "bold": run["bold"],
                        "italic": run["italic"],
                        "underline": run["underline"],
                        "font_family": None,
                    })
                    md_offset = found_pos + len(text)
                else:
                    # 找不到，尝试去除空格
                    text_no_space = text.replace(" ", "").replace("\u00a0", "").replace("\u3000", "")
                    if text_no_space != text:
                        found_pos = markdown_text.find(text_no_space, md_offset)
                        if found_pos != -1:
                            style_runs.append({
                                "start": found_pos,
                                "end": found_pos + len(text_no_space),
                                "bold": run["bold"],
                                "italic": run["italic"],
                                "underline": run["underline"],
                                "font_family": None,
                            })
                            md_offset = found_pos + len(text_no_space)
                            continue
                    
                    # 仍然找不到，跳过，但不要让 md_offset 停滞
                    # 尝试移动到下一个可能的匹配点
                    next_char_pos = markdown_text.find(text[0] if text else ' ', md_offset + 1)
                    if next_char_pos != -1:
                        md_offset = next_char_pos
                    else:
                        md_offset += len(text)

            # 段落分隔
            char_offset += 1
            md_newline = markdown_text.find('\n', md_offset)
            if md_newline != -1:
                md_offset = md_newline + 1
            else:
                md_offset = len(markdown_text)

        # 归并相邻且样式相同的 run
        merged: list = []
        for run in style_runs:
            if run["start"] >= run["end"]:
                continue
            if merged and merged[-1]["end"] == run["start"] and merged[-1].get("bold") == run.get("bold") and merged[-1].get("italic") == run.get("italic") and merged[-1].get("underline") == run.get("underline") and merged[-1].get("font_family") == run.get("font_family"):
                merged[-1]["end"] = run["end"]
            else:
                merged.append(run)

        logger.debug(f"docx_to_style_runs: 完成, merged={len(merged)}")
        for i, m in enumerate(merged[:20]):  # 只打印前20个
            md_snippet = markdown_text[m["start"]:m["end"]][:30].replace("\n", "\\n")
            logger.debug(f"  merged[{i}]: start={m['start']}, end={m['end']}, bold={m.get('bold')}, text='{md_snippet}'")

        return merged

    # wkhtmltopdf 在 Windows 上的默认安装路径（未加入 PATH 时直接用全路径）
    _WKHTMLTOPDF_PATHS = [
        "wkhtmltopdf",  # PATH 中可用
        r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe",
        r"C:\Program Files (x86)\wkhtmltopdf\bin\wkhtmltopdf.exe",
    ]

    async def _wkhtmltopdf_bin(self) -> str:
        """返回可用的 wkhtmltopdf 可执行文件路径，找不到返回空字符串"""
        import os

        # 先检查 shutil.which
        wk_path = shutil.which("wkhtmltopdf")
        if wk_path and os.path.exists(wk_path):
            return wk_path

        # 再遍历硬编码路径
        for candidate in self._WKHTMLTOPDF_PATHS:
            # 跳过占位符
            if candidate == "wkhtmltopdf":
                continue
            if os.path.exists(candidate):
                return candidate
        return ""

    async def _latex_engine_bin(self) -> str:
        """
        检测可用的 LaTeX 引擎（xelatex 优先支持中文，其次 pdflatex）。
        pandoc 用其直接渲染公式，公式质量最佳。
        """
        for name in ("xelatex", "pdflatex"):
            path = shutil.which(name)
            if path and os.path.exists(path):
                if await self._check_tool(name, "--version"):
                    return path
        return ""

    async def pdf_engine(self) -> str:
        """
        检测可用的 PDF 引擎，返回引擎名称；均不可用返回空字符串。
        优先级：xelatex > pdflatex > wkhtmltopdf > weasyprint
        （LaTeX 引擎公式渲染正确；wkhtmltopdf/weasyprint 的 MathML 易出错）
        """
        if self._pdf_engine is not None:
            return self._pdf_engine

        latex_bin = await self._latex_engine_bin()
        if latex_bin:
            self._pdf_engine = "xelatex" if "xelatex" in latex_bin.lower() else "pdflatex"
            self._latex_engine_bin_path = latex_bin
            logger.info(f"PDF 引擎：{self._pdf_engine} ({latex_bin})，公式由 LaTeX 原生渲染")
        else:
            wkbin = await self._wkhtmltopdf_bin()
            if wkbin:
                self._pdf_engine = "wkhtmltopdf"
                self._wkhtmltopdf_bin_path = wkbin
                logger.info(f"PDF 引擎：wkhtmltopdf ({wkbin})")
            else:
                try:
                    import weasyprint  # noqa: F401
                    self._pdf_engine = "weasyprint"
                    logger.info("PDF 引擎：weasyprint")
                except ImportError:
                    self._pdf_engine = ""
                    logger.warning(
                        "未找到 PDF 引擎（xelatex/pdflatex/wkhtmltopdf/weasyprint），"
                        "PDF 导出不可用。安装 TeX Live 可获最佳公式效果：https://www.tug.org/texlive/"
                    )

        return self._pdf_engine

    async def mmdc_available(self) -> bool:
        if self._mmdc_ok is None:
            # 先尝试 npx mmdc，再尝试全局 mmdc
            self._mmdc_ok = await self._check_tool("mmdc", "--version")
            if not self._mmdc_ok:
                self._mmdc_ok = await self._check_tool("npx", "--yes", "mmdc", "--version")
            if not self._mmdc_ok:
                logger.info("mmdc (Mermaid CLI) 未找到，Mermaid 图表将降级为代码块")
        return self._mmdc_ok

    # ------------------------------------------------------------------ #
    #  Mermaid 渲染
    # ------------------------------------------------------------------ #

    async def _render_mermaid(self, code: str, tmpdir: str) -> Optional[str]:
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
                logger.debug(f"mmdc cmd {cmd[0]} failed: {stderr.decode(errors='replace')[:200]}")
            except (FileNotFoundError, asyncio.TimeoutError, OSError) as e:
                logger.debug(f"mmdc cmd {cmd[0]} error: {e}")

        return None

    async def _preprocess_mermaid(self, markdown: str, tmpdir: str) -> str:
        """将 Markdown 中的 ```mermaid 块替换为 PNG 图片引用或降级为普通代码块"""
        pattern = re.compile(r"```mermaid[ \t]*\n(.*?)\n```", re.DOTALL | re.IGNORECASE)
        chunks: list[str] = []
        last_end = 0

        for m in pattern.finditer(markdown):
            chunks.append(markdown[last_end : m.start()])
            code = m.group(1)
            img_path = await self._render_mermaid(code, tmpdir)
            if img_path:
                # pandoc --resource-path 设为 tmpdir，直接用文件名即可
                chunks.append(f"![Mermaid 图表]({img_path})")
            else:
                # 降级：保留为普通代码块，docx 中会以等宽字体显示
                chunks.append(f"```\n{code}\n```")
            last_end = m.end()

        chunks.append(markdown[last_end:])
        return "".join(chunks)

    # ------------------------------------------------------------------ #
    #  模板 reference-doc 路径
    # ------------------------------------------------------------------ #

    @staticmethod
    def _reference_doc(template: str) -> Optional[str]:
        """返回 reference.docx 路径，不存在则返回 None（使用 pandoc 默认样式）"""
        templates_dir = Path(__file__).parent.parent / "assets" / "templates" / "docx"
        # 确保模板目录存在
        templates_dir.mkdir(parents=True, exist_ok=True)
        candidate = templates_dir / f"{template}.docx"
        if candidate.exists():
            logger.debug(f"找到模板: {candidate}")
            return str(candidate)
        # 模板不存在时返回 None，使用 pandoc 默认样式
        logger.debug(f"模板 {template}.docx 不存在，使用 pandoc 默认样式")
        return None

    # ------------------------------------------------------------------ #
    #  PDF 辅助：CSS 注入（中文字体 + 页面样式）
    # ------------------------------------------------------------------ #

    # 默认使用微软雅黑/黑体作为中文主字体
    _CJK_FONTS = (
        '"Microsoft YaHei"',       # Windows 微软雅黑（首选）
        '"SimHei"',                # Windows 黑体
        '"Heiti SC"',              # macOS 黑体
        '"Noto Sans CJK SC"',      # Linux / Android
        '"WenQuanYi Micro Hei"',   # Linux (文泉驿)
        "sans-serif",
    )

    _TEMPLATE_COLORS: dict[str, str] = {
        "default":  "#333333",
        "academic": "#1a1a2e",
        "business": "#0d3349",
        "simple":   "#444444",
    }

    _FONT_ID_TO_NAME: dict[str, str] = {
        # ── 仿宋系 ──
        "FangSong_GB2312":  "仿宋_GB2312",
        "FangSong":         "仿宋",
        "STFangsong":       "华文仿宋",
        # ── 黑体系 ──
        "SimHei":           "黑体",
        "HuaWenHeiTi":      "华文黑体",
        "Microsoft YaHei":  "微软雅黑",
        "DengXian":         "等线",
        # ── 楷体系 ──
        "KaiTi_GB2312":     "楷体_GB2312",
        "KaiTi":            "楷体",
        "STKaiti":          "华文楷体",
        # ── 宋体系 ──
        "FZXiaoBiaoSong":   "方正小标宋",
        "SimSun":           "宋体",
        "NSimSun":          "新宋体",
        "STSong":           "华文宋体",
        "STZhongsong":      "华文中宋",
    }

    # Pandoc 生成的 docx 中 pStyle w:val 与样式名的映射
    _WORD_STYLE_ID_MAP: dict[str, str] = {
        "Heading1": "Heading 1",
        "Heading2": "Heading 2",
        "Heading3": "Heading 3",
        "Heading4": "Heading 4",
        "Heading5": "Heading 5",
        "Heading6": "Heading 6",
        "Title":    "Title",
        "Subtitle": "Subtitle",
    }

    def _font_display_name(self, font_id: str | None, fallback: str = "微软雅黑") -> str:
        if not font_id:
            return fallback
        return self._FONT_ID_TO_NAME.get(font_id, font_id)

    @staticmethod
    def _binding_styles(template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        if not template_binding:
            return {}
        snapshot = template_binding.get("configSnapshot") or {}
        return snapshot.get("styles") or {}

    @staticmethod
    def _binding_layout(template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        if not template_binding:
            return {}
        snapshot = template_binding.get("configSnapshot") or {}
        return snapshot.get("layout") or {}

    def _resolve_page_size(self, page_size: str, template_binding: Optional[dict[str, Any]]) -> str:
        layout = self._binding_layout(template_binding)
        return layout.get("paperSize") or page_size or "A4"

    @staticmethod
    def _template_id(template: str, template_binding: Optional[dict[str, Any]]) -> str:
        if template_binding:
            return str(template_binding.get("templateId") or template or "")
        return template or ""

    def _apply_template_semantics(
        self,
        markdown: str,
        template: str,
        template_binding: Optional[dict[str, Any]] = None,
    ) -> str:
        """
        导出前把“看起来像标题”的普通段落补成 Markdown 标题。

        教案内容常由大模型直接生成，行首通常是：
        - 文档标题：部编版初中语文...
        - 一级标题：一、基本教学信息
        - 二级标题：（一）教学目标

        如果不转成 #/##，Pandoc 会把它们当普通段落导出，Word 后处理也只能套正文样式。
        """
        template_id = self._template_id(template, template_binding)
        if template_id != "general_lesson_plan":
            return markdown

        lines = markdown.splitlines()
        result: list[str] = []
        in_code_fence = False
        first_content_seen = False

        top_heading_re = re.compile(r"^\s*([一二三四五六七八九十]+)、\s*(.+)$")
        sub_heading_re = re.compile(r"^\s*[（(]([一二三四五六七八九十]+)[）)]\s*(.+)$")

        def is_existing_heading(text: str) -> bool:
            return bool(re.match(r"^\s{0,3}#{1,6}\s+", text))

        for line in lines:
            stripped = line.strip()
            if stripped.startswith("```"):
                in_code_fence = not in_code_fence
                result.append(line)
                continue
            if in_code_fence or not stripped:
                result.append(line)
                continue
            if is_existing_heading(line):
                first_content_seen = True
                result.append(line)
                continue

            top_match = top_heading_re.match(line)
            sub_match = sub_heading_re.match(line)

            if not first_content_seen:
                first_content_seen = True
                # 如果第一行本身就是“一、...”，说明文档没有显式标题，不强行当文档标题。
                if top_match:
                    result.append(f"# {top_match.group(1)}、{top_match.group(2).strip()}")
                elif sub_match:
                    result.append(f"## （{sub_match.group(1)}）{sub_match.group(2).strip()}")
                else:
                    result.append(f"# {stripped}")
                continue

            if top_match:
                result.append(f"# {top_match.group(1)}、{top_match.group(2).strip()}")
            elif sub_match:
                result.append(f"## （{sub_match.group(1)}）{sub_match.group(2).strip()}")
            else:
                result.append(line)

        return "\n".join(result)

    def _pdf_header_html(
        self,
        template: str,
        page_size: str,
        template_binding: Optional[dict[str, Any]] = None,
    ) -> str:
        """生成注入到 HTML <head> 的 CSS 片段（中文字体 + 页面尺寸），供 wkhtmltopdf/weasyprint"""
        styles = self._binding_styles(template_binding)
        layout = self._binding_layout(template_binding)
        body_style  = styles.get("body", {})
        h1_style    = styles.get("heading_1", {})
        h2_style    = styles.get("heading_2", {})
        h3_style    = styles.get("heading_3", {})
        h4_style    = styles.get("heading_4", {})
        h5_style    = styles.get("heading_5", {})
        title_style = styles.get("document_title", {})

        def _fw(bold: bool) -> str:
            return "700" if bold else "400"

        cjk = ", ".join(self._CJK_FONTS)
        color = body_style.get("color") or self._TEMPLATE_COLORS.get(template, "#333333")
        margin_top    = layout.get("marginTopMm", 25)
        margin_right  = layout.get("marginRightMm", 20)
        margin_bottom = layout.get("marginBottomMm", 25)
        margin_left   = layout.get("marginLeftMm", 20)
        body_font        = self._font_display_name(body_style.get("fontFamily"))
        body_size        = body_style.get("fontSizePt", 12)
        body_line_height = layout.get("defaultLineHeight") or body_style.get("lineHeight", 1.75)
        body_indent      = layout.get("defaultFirstLineIndentChars")
        if body_indent is None:
            body_indent = body_style.get("firstLineIndentChars", 0)
        paragraph_before = layout.get("defaultParagraphSpacingBeforePt", 0)
        paragraph_after = layout.get("defaultParagraphSpacingAfterPt", 6)

        def _hcss(tag: str, s: dict, fallback_size: int) -> str:
            font = self._font_display_name(s.get("fontFamily"), body_font)
            size = s.get("fontSizePt", fallback_size)
            bold = s.get("bold", True)
            align = s.get("align", "left")
            return (f"{tag} {{ font-family: \"{font}\", {cjk}; "
                    f"font-size: {size}pt; font-weight: {_fw(bold)}; "
                    f"text-align: {align}; }}\n")

        title_font = self._font_display_name(title_style.get("fontFamily"), body_font)
        title_size = title_style.get("fontSizePt", 20)
        return (
            f"<style>\n"
            f"@page {{ size: {page_size}; margin: {margin_top}mm {margin_right}mm {margin_bottom}mm {margin_left}mm; }}\n"
            f"body {{\n"
            f"  font-family: \"{body_font}\", {cjk};\n"
            f"  font-size: {body_size}pt;\n"
            f"  line-height: {body_line_height};\n"
            f"  color: {color};\n"
            f"}}\n"
            f"p {{ text-indent: {body_indent}em; margin: {paragraph_before}pt 0 {paragraph_after}pt; }}\n"
            f"h1.title, h1:first-of-type {{ font-family: \"{title_font}\", {cjk}; font-size: {title_size}pt; "
            f"text-align: {title_style.get('align', 'center')}; font-weight: {_fw(bool(title_style.get('bold')))}; }}\n"
            + _hcss("h1", h1_style, 16)
            + _hcss("h2", h2_style, 15)
            + _hcss("h3", h3_style, 14)
            + _hcss("h4", h4_style, 13)
            + _hcss("h5", h5_style, 12)
            + "code, pre {\n"
            "  font-family: \"Cascadia Code\", Consolas, \"Courier New\", monospace;\n"
            "  font-size: 10pt;\n"
            "  background: #f5f5f5;\n"
            "  border-radius: 3px;\n"
            "  padding: 0 3px;\n"
            "}\n"
            "pre { padding: 8px 12px; overflow-x: auto; }\n"
            "table { border-collapse: collapse; width: 100%; }\n"
            "th, td { border: 1px solid #ccc; padding: 6px 10px; }\n"
            "th { background: #f0f0f0; }\n"
            "</style>\n"
        )

    def _pdf_header_latex(
        self,
        page_size: str,
        template_binding: Optional[dict[str, Any]] = None,
    ) -> str:
        """生成 LaTeX  preamble 片段（xelatex 中文 + 页面），供 pandoc --pdf-engine=xelatex"""
        styles = self._binding_styles(template_binding)
        layout = self._binding_layout(template_binding)
        body_style = styles.get("body", {})
        body_font = self._font_display_name(body_style.get("fontFamily"), "SimHei")
        body_size = body_style.get("fontSizePt", 12)
        body_line_height = layout.get("defaultLineHeight") or body_style.get("lineHeight", 1.5)
        margin_top = layout.get("marginTopMm", 25)
        margin_right = layout.get("marginRightMm", 20)
        margin_bottom = layout.get("marginBottomMm", 25)
        margin_left = layout.get("marginLeftMm", 20)
        latex_paper = {
            "A4": "a4paper",
            "B5": "b5paper",
            "Letter": "letterpaper",
        }.get(page_size, "a4paper")
        return (
            "\\usepackage{geometry}\n"
            f"\\geometry{{paper={latex_paper}, top={margin_top}mm, right={margin_right}mm, bottom={margin_bottom}mm, left={margin_left}mm}}\n"
            "\\usepackage{xeCJK}\n"
            f"\\setCJKmainfont{{{body_font}}}\n"
            f"\\setCJKsansfont{{{body_font}}}\n"
            "\\setCJKmonofont{SimSun}\n"
            f"\\AtBeginDocument{{\\fontsize{{{body_size}pt}}{{{float(body_size) * float(body_line_height)}pt}}\\selectfont}}\n"
        )

    # ------------------------------------------------------------------ #
    #  主导出方法
    # ------------------------------------------------------------------ #

    async def export_pdf(
        self,
        markdown: str,
        template: str = "default",
        page_size: str = "A4",
        template_binding: Optional[dict[str, Any]] = None,
    ) -> bytes:
        """
        将 Markdown 转换为 PDF 字节流。
        引擎选择（自动检测，公式质量从高到低）：
          1. xelatex / pdflatex —— 公式由 LaTeX 原生渲染，效果最佳（需安装 TeX Live）
          2. wkhtmltopdf —— 系统安装，通过 MathML 渲染公式，易出现乱码
          3. weasyprint  —— pip 安装，纯 Python，通过 MathML 渲染公式

        Raises:
            PandocNotAvailableError: pandoc 未安装
            RuntimeError: PDF 引擎不可用 / 转换失败
        """
        if not await self.pandoc_available():
            raise PandocNotAvailableError(
                "服务器未安装 Pandoc，无法执行 PDF 导出。"
                "请联系管理员安装：https://pandoc.org/installing.html"
            )

        page_size = self._resolve_page_size(page_size, template_binding)
        engine = await self.pdf_engine()
        if not engine:
            raise RuntimeError(
                "服务器未安装 PDF 导出引擎。\n"
                "  推荐（公式最佳）：安装 TeX Live 并确保 xelatex 在 PATH — https://www.tug.org/texlive/\n"
                "  或：wkhtmltopdf — https://wkhtmltopdf.org/downloads.html\n"
                "  或：pip install weasyprint"
            )

        with tempfile.TemporaryDirectory() as tmpdir:
            # 1. Mermaid 预处理
            semantic_markdown = self._apply_template_semantics(markdown, template, template_binding)
            processed = await self._preprocess_mermaid(semantic_markdown, tmpdir)

            # 2. 写入临时文件
            input_path = os.path.join(tmpdir, "input.md")
            output_path = os.path.join(tmpdir, "output.pdf")

            with open(input_path, "w", encoding="utf-8-sig") as f:
                f.write(processed)

            # 3. 构建 pandoc 命令（使用检测到的完整路径，避免 PATH 问题）
            use_latex_engine = engine in ("xelatex", "pdflatex")
            if use_latex_engine:
                # LaTeX 引擎：公式由 pandoc 转成 LaTeX 后由 xelatex/pdflatex 原生渲染，质量最佳
                pdf_engine_bin = self._latex_engine_bin_path
                cmd = [
                    self._pandoc_bin_path,
                    "--from=markdown+tex_math_dollars+tex_math_single_backslash+raw_html",
                    "--to=pdf",
                    f"--pdf-engine={pdf_engine_bin}",
                    "--resource-path", ".",
                    "-o", "output.pdf",
                    "input.md",
                ]
                if engine == "xelatex":
                    header_tex = os.path.join(tmpdir, "header.tex")
                    with open(header_tex, "w", encoding="utf-8") as f:
                        f.write(self._pdf_header_latex(page_size, template_binding))
                    cmd.extend(["--include-in-header", "header.tex"])
            else:
                # wkhtmltopdf / weasyprint：通过 HTML + MathML，公式易出现乱码或残缺
                header_path = os.path.join(tmpdir, "header.html")
                with open(header_path, "w", encoding="utf-8") as f:
                    f.write(self._pdf_header_html(template, page_size, template_binding))
                pdf_engine_bin = self._wkhtmltopdf_bin_path if engine == "wkhtmltopdf" else engine
                cmd = [
                    self._pandoc_bin_path,
                    "--from=markdown+tex_math_dollars+tex_math_single_backslash+raw_html",
                    "--to=pdf",
                    f"--pdf-engine={pdf_engine_bin}",
                    "--include-in-header", "header.html",
                    "--resource-path", ".",
                    "-o", "output.pdf",
                    "input.md",
                ]
                cmd.append("--mathml")
                if engine == "wkhtmltopdf":
                    cmd += [
                        "--pdf-engine-opt=--page-size",
                        f"--pdf-engine-opt={page_size}",
                        "--pdf-engine-opt=--encoding",
                        "--pdf-engine-opt=UTF-8",
                        "--pdf-engine-opt=--enable-local-file-access",
                        "--pdf-engine-opt=--disable-javascript",
                        "--pdf-engine-opt=--quiet",
                    ]

            # 4. 执行 pandoc
            # Windows 上 asyncio.create_subprocess_shell 在 uvicorn reload 模式下会抛出
            # NotImplementedError，改用 run_in_executor + subprocess.run 规避此问题。
            # 同时对所有含空格的参数正确加引号（包括 --pdf-engine= 路径）。
            import subprocess
            from functools import partial

            def quote_arg(arg: str) -> str:
                if " " in arg:
                    return f'"{arg}"'
                return arg

            quoted_cmd = [quote_arg(arg) for arg in cmd]
            logger.info(f"PDF 导出引擎={engine}，命令: {' '.join(quoted_cmd)}")
            cmd_str = " ".join(quoted_cmd)
            try:
                loop = asyncio.get_event_loop()
                proc = await loop.run_in_executor(
                    None,
                    partial(subprocess.run, cmd_str, shell=True, capture_output=True, cwd=tmpdir, timeout=120)
                )
                stderr = proc.stderr
            except subprocess.TimeoutExpired:
                raise RuntimeError("PDF 转换超时（120s），请减少文档内容后重试")
            except FileNotFoundError as e:
                logger.error(f"PDF 导出失败: 命令未找到 - {e}")
                raise RuntimeError(f"PDF 导出失败: {e}")
            except OSError as e:
                logger.error(f"PDF 导出失败: OS错误 - {e}")
                raise RuntimeError(f"PDF 导出失败: {e}")
            except Exception as e:
                logger.exception(f"PDF 导出未知异常: {type(e).__name__}: {e}")
                raise RuntimeError(f"PDF 导出失败: {e}")

            if proc.returncode != 0:
                err = stderr.decode("utf-8", errors="replace")
                logger.error(f"PDF 导出失败 (exit {proc.returncode}): {err[:500]}")
                raise RuntimeError(f"PDF 转换失败：{err[:300]}")

            # 5. 读取并返回 PDF 字节
            with open(output_path, "rb") as f:
                return f.read()

    async def export_docx(
        self,
        markdown: str,
        template: str = "default",
        page_size: str = "A4",
        template_binding: Optional[dict[str, Any]] = None,
    ) -> bytes:
        """
        将 Markdown 转换为 docx 字节流。

        Raises:
            PandocNotAvailableError: 服务器未安装 pandoc
            RuntimeError: pandoc 转换失败
        """
        if not await self.pandoc_available():
            raise PandocNotAvailableError(
                "服务器未安装 Pandoc，无法执行 Word 导出。"
                "请联系管理员安装：https://pandoc.org/installing.html"
            )

        page_size = self._resolve_page_size(page_size, template_binding)
        with tempfile.TemporaryDirectory() as tmpdir:
            # 1. 预处理 Mermaid 块
            semantic_markdown = self._apply_template_semantics(markdown, template, template_binding)
            processed = await self._preprocess_mermaid(semantic_markdown, tmpdir)

            # 2. 写入临时 Markdown 文件（UTF-8 BOM 以确保 pandoc 正确识别中文）
            input_path = os.path.join(tmpdir, "input.md")
            output_path = os.path.join(tmpdir, "output.docx")

            with open(input_path, "w", encoding="utf-8-sig") as f:
                f.write(processed)

            # 3. 构建 pandoc 命令（使用检测到的完整路径，避免 PATH 问题）
            #    使用相对路径 + cwd=tmpdir 来避免空格问题
            #    tex_math_dollars: $...$  $$...$$
            #    tex_math_single_backslash: \(...\)  \[...\]
            #    raw_html: 保留 HTML 标签（如 <br>、<sub>）
            cmd = [
                self._pandoc_bin_path,
                "--from=markdown+tex_math_dollars+tex_math_single_backslash+raw_html",
                "--to=docx",
                "--resource-path",
                ".",
                "-o",
                "output.docx",
                "input.md",
            ]

            ref_doc = self._reference_doc(template)
            if ref_doc:
                cmd.extend(["--reference-doc", ref_doc])
                logger.debug(f"使用模板：{ref_doc}")

            # 4. 执行 pandoc
            # Windows 上需要使用 shell 来正确执行 PATH 中的可执行文件
            # 需要对 pandoc 路径用引号括起来（如果包含空格）
            def quote_path(path: str) -> str:
                if " " in path:
                    return f'"{path}"'
                return path

            quoted_cmd = [quote_path(arg) if i == 0 else arg for i, arg in enumerate(cmd)]
            logger.info(f"执行 pandoc: {' '.join(quoted_cmd)}")
            logger.info(f"临时目录: {tmpdir}")
            logger.info(f"输入文件: {input_path}")
            # 打印输入 markdown 内容的调试日志（截取前500字符）
            logger.info(f"输入 markdown (前500字符): {processed[:500]}")
            
            # 使用 run_in_executor 在线程池中执行子进程
            # 避免 Windows + uvicorn reload 模式下的 NotImplementedError
            import subprocess
            from functools import partial
            
            try:
                logger.info("准备在线程池中执行 pandoc...")
                # 构建命令字符串
                cmd_str = " ".join(quoted_cmd)
                loop = asyncio.get_event_loop()
                # 使用线程池执行，避免与 uvicorn 的事件循环冲突
                proc = await loop.run_in_executor(
                    None,
                    partial(subprocess.run, cmd_str, shell=True, capture_output=True, cwd=tmpdir, timeout=90)
                )
                stdout = proc.stdout
                stderr = proc.stderr
                logger.info(f"pandoc 执行完成, returncode={proc.returncode}")
            except subprocess.TimeoutExpired:
                logger.error("Pandoc 执行超时")
                raise RuntimeError("Pandoc 转换超时（90s），请减少文档内容后重试")
            except FileNotFoundError as e:
                logger.error(f"Pandoc 执行失败: 命令未找到 - {e}")
                raise RuntimeError(f"Pandoc 未找到: {e}")
            except OSError as e:
                logger.error(f"Pandoc 执行失败: OS错误 - {e}")
                raise RuntimeError(f"Pandoc 执行失败: {e}")
            except Exception as e:
                logger.exception(f"Pandoc 执行未知异常: {type(e).__name__}: {e}")
                raise RuntimeError(f"Pandoc 执行失败: {e}")

            # 调试：打印 pandoc 输出
            try:
                stdout_decoded = stdout.decode("utf-8", errors="replace") if stdout else ""
                stderr_decoded = stderr.decode("utf-8", errors="replace") if stderr else ""
                logger.info(f"Pandoc stdout: {stdout_decoded[:1000]}")
                logger.info(f"Pandoc stderr: {stderr_decoded[:1000]}")
                logger.info(f"Pandoc returncode: {proc.returncode}")
            except Exception as e:
                logger.error(f"解析 pandoc 输出失败: {e}, stdout={stdout}, stderr={stderr}")

            # 检查返回码
            if proc.returncode != 0:
                raise RuntimeError(f"Pandoc 转换失败，退出码: {proc.returncode}")

            # 检查输出文件是否存在
            if not os.path.exists(output_path):
                raise RuntimeError(f"Pandoc 执行成功但未生成输出文件，可能是内容格式问题")

            # 5. 设置中文字体（黑体）- 失败不影响导出
            try:
                self._apply_docx_font(output_path, template_binding=template_binding)
            except Exception as e:
                logger.warning(f"设置字体失败，跳过: {e}")

            # 6. 读取并返回 docx 字节
            try:
                with open(output_path, "rb") as f:
                    return f.read()
            except Exception as e:
                logger.error(f"读取 docx 文件失败: {e}")
                raise RuntimeError(f"读取导出文件失败: {e}")

    _MATH_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math"

    @staticmethod
    def _set_rpr_color_black(rPr_elem) -> None:
        """
        将 w:rPr 文字颜色设为纯黑，并去掉主题色（否则 Word 仍显示蓝/青链接色）。
        """
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
        # 删除所有 w:color，避免残留 themeColor
        for c in list(rPr_elem):
            if c.tag == qn("w:color"):
                rPr_elem.remove(c)
        color_elem = OxmlElement("w:color")
        color_elem.set(qn("w:val"), "000000")
        rPr_elem.append(color_elem)

    def _apply_docx_font(
        self,
        docx_path: str,
        cjk_font: str = "Microsoft YaHei",
        template_binding: Optional[dict[str, Any]] = None,
    ) -> None:
        """
        Post-process pandoc 生成的 docx，将默认中英文字体设置为黑体和 Times New Roman，
        并将标题与正文颜色统一为黑色（覆盖 Pandoc/Word 默认的蓝色标题）。

        Word 使用 w:eastAsia 属性控制 CJK 字体，需在以下三层全部设置才能生效：
          1. docDefaults（文档全局默认，无样式时的兜底）
          2. Normal 段落样式（正文的基础样式）
          3. Heading 1-6（各级标题样式）

        公式字体说明：docx 内公式为 OMML，由 Word 用 Cambria Math 等数学字体渲染，
        与前端 Markdown 的 KaTeX/MathJax 外观会略有差异，属正常现象。
        """
        try:
            from docx import Document
            from docx.oxml import OxmlElement
            from docx.oxml.ns import qn
        except ImportError:
            logger.warning("python-docx 未安装，跳过字体设置；可运行 pip install python-docx")
            return

        try:
            from docx.shared import Mm, Pt

            doc = Document(docx_path)
            styles_cfg = self._binding_styles(template_binding)
            layout_cfg = self._binding_layout(template_binding)
            
            # 调试日志：打印接收到的模板配置
            logger.info(f"[_apply_docx_font] styles_cfg keys: {list(styles_cfg.keys())}")
            logger.info(f"[_apply_docx_font] heading_1 bold: {styles_cfg.get('heading_1', {}).get('bold', 'NOT_FOUND')}")
            logger.info(f"[_apply_docx_font] heading_1 full: {styles_cfg.get('heading_1', {})}")
            
            body_cfg     = styles_cfg.get("body", {})
            title_cfg    = styles_cfg.get("document_title", {})
            subtitle_cfg = styles_cfg.get("document_subtitle", {})
            heading1_cfg = styles_cfg.get("heading_1", {})
            heading2_cfg = styles_cfg.get("heading_2", {})
            heading3_cfg = styles_cfg.get("heading_3", {})
            heading4_cfg = styles_cfg.get("heading_4", {})
            heading5_cfg = styles_cfg.get("heading_5", {})

            default_cjk_font = self._font_display_name(
                body_cfg.get("fontFamily"), self._font_display_name(cjk_font)
            )
            default_body_size = body_cfg.get("fontSizePt", 12)
            # 调试日志：打印页面布局配置
            logger.info(f"[_apply_docx_font] layout_cfg: marginTop={layout_cfg.get('marginTopMm')}, marginBottom={layout_cfg.get('marginBottomMm')}, marginLeft={layout_cfg.get('marginLeftMm')}, marginRight={layout_cfg.get('marginRightMm')}")
            logger.info(f"[_apply_docx_font] layout_cfg: defaultLineHeight={layout_cfg.get('defaultLineHeight')}, body.lineHeight={body_cfg.get('lineHeight')}")
            default_line_height = layout_cfg.get("defaultLineHeight") or body_cfg.get(
                "lineHeight", 1.75
            )
            logger.info(f"[_apply_docx_font] 最终使用: default_line_height={default_line_height}")
            default_first_indent = layout_cfg.get("defaultFirstLineIndentChars")
            if default_first_indent is None:
                default_first_indent = body_cfg.get("firstLineIndentChars", 0)
            logger.info(f"[_apply_docx_font] 最终使用: default_first_indent={default_first_indent} chars")
            logger.info(f"[_apply_docx_font] 最终使用: default_cjk_font={default_cjk_font}, default_body_size={default_body_size}")
            
            # 调试：打印 title_cfg
            logger.info(f"[_apply_docx_font] title_cfg: {title_cfg}")
            logger.info(f"[_apply_docx_font] body_cfg: fontFamily={body_cfg.get('fontFamily')}, fontSizePt={body_cfg.get('fontSizePt')}, bold={body_cfg.get('bold')}, lineHeight={body_cfg.get('lineHeight')}, firstLineIndentChars={body_cfg.get('firstLineIndentChars')}")

            # 样式名 → 中文字体映射（用于 run 级别按段落样式选字体）
            _style_font_map: dict[str, str] = {
                "Normal":    default_cjk_font,
                "Subtitle":  self._font_display_name(subtitle_cfg.get("fontFamily"), default_cjk_font),
                "Title":     self._font_display_name(title_cfg.get("fontFamily"), default_cjk_font),
                "Heading 1": self._font_display_name(heading1_cfg.get("fontFamily"), default_cjk_font),
                "Heading 2": self._font_display_name(heading2_cfg.get("fontFamily"), default_cjk_font),
                "Heading 3": self._font_display_name(heading3_cfg.get("fontFamily"), default_cjk_font),
                "Heading 4": self._font_display_name(heading4_cfg.get("fontFamily"), default_cjk_font),
                "Heading 5": self._font_display_name(heading5_cfg.get("fontFamily"), default_cjk_font),
            }
            def _to_bool(val, default=False):
                """将值转换为布尔值"""
                if val is None:
                    return default
                if isinstance(val, bool):
                    return val
                if isinstance(val, str):
                    return val.lower() in ("true", "1", "yes", "on")
                return bool(val)

            _style_bold_map: dict[str, bool] = {
                "Normal":    _to_bool(body_cfg.get("bold"), False),
                "Subtitle":  _to_bool(subtitle_cfg.get("bold"), False),
                "Title":     _to_bool(title_cfg.get("bold"), False),
                "Heading 1": _to_bool(heading1_cfg.get("bold"), True),
                "Heading 2": _to_bool(heading2_cfg.get("bold"), True),
                "Heading 3": _to_bool(heading3_cfg.get("bold"), False),
                "Heading 4": _to_bool(heading4_cfg.get("bold"), False),
                "Heading 5": _to_bool(heading5_cfg.get("bold"), False),
            }
            _style_size_map: dict[str, float] = {
                "Normal":    float(default_body_size),
                "Subtitle":  float(subtitle_cfg.get("fontSizePt", default_body_size)),
                "Title":     float(title_cfg.get("fontSizePt", default_body_size)),
                "Heading 1": float(heading1_cfg.get("fontSizePt", default_body_size)),
                "Heading 2": float(heading2_cfg.get("fontSizePt", default_body_size)),
                "Heading 3": float(heading3_cfg.get("fontSizePt", default_body_size)),
                "Heading 4": float(heading4_cfg.get("fontSizePt", default_body_size)),
                "Heading 5": float(heading5_cfg.get("fontSizePt", default_body_size)),
            }

            def _para_style_name(run_elem) -> str:
                """从 run 向上找父段落的样式名"""
                parent = run_elem.getparent()
                para = parent if (parent is not None and parent.tag == qn("w:p")) else (
                    parent.getparent() if parent is not None else None
                )
                if para is None or para.tag != qn("w:p"):
                    return "Normal"
                pPr = para.find(qn("w:pPr"))
                if pPr is None:
                    return "Normal"
                pStyle = pPr.find(qn("w:pStyle"))
                if pStyle is None:
                    return "Normal"
                style_id = pStyle.get(qn("w:val"), "")
                return self._WORD_STYLE_ID_MAP.get(style_id, "Normal")

            def set_font_properties(rPr_elem, east_asia: str, ascii: str = None, h_ansi: str = None, bold: bool = None):
                """设置段落/文本的字体属性"""
                rFonts_elem = rPr_elem.find(qn("w:rFonts"))
                if rFonts_elem is None:
                    rFonts_elem = OxmlElement("w:rFonts")
                    rPr_elem.insert(0, rFonts_elem)
                # 中文字体
                rFonts_elem.set(qn("w:eastAsia"), east_asia)
                # 英文字体（ASCII）
                if ascii:
                    rFonts_elem.set(qn("w:ascii"), ascii)
                # 非中文ANSI字体
                if h_ansi:
                    rFonts_elem.set(qn("w:hAnsi"), h_ansi)

                # 设置粗体（仅当明确指定时）
                if bold is not None:
                    for tag_name in ("w:b", "w:bCs"):
                        elem = rPr_elem.find(qn(tag_name))
                        if elem is None:
                            elem = OxmlElement(tag_name)
                            rPr_elem.append(elem)
                        elem.set(qn("w:val"), "1" if bold else "0")

            # ── 1. docDefaults：文档级全局默认 ──────────────────────────────────
            styles_elem = doc.styles.element
            doc_defaults = styles_elem.find(qn("w:docDefaults"))
            if doc_defaults is None:
                doc_defaults = OxmlElement("w:docDefaults")
                styles_elem.insert(0, doc_defaults)

            rPr_default_wrap = doc_defaults.find(qn("w:rPrDefault"))
            if rPr_default_wrap is None:
                rPr_default_wrap = OxmlElement("w:rPrDefault")
                doc_defaults.append(rPr_default_wrap)

            rPr_default = rPr_default_wrap.find(qn("w:rPr"))
            if rPr_default is None:
                rPr_default = OxmlElement("w:rPr")
                rPr_default_wrap.append(rPr_default)

            set_font_properties(rPr_default, default_cjk_font, "Times New Roman", "Times New Roman")
            ExportService._set_rpr_color_black(rPr_default)

            # ── 2. 段落 / 标题样式（字体 + 标题颜色统一为黑色）───────────────────
            _style_cfg_map = {
                "Normal":    (default_cjk_font,  default_body_size),
                "Heading 1": (self._font_display_name(heading1_cfg.get("fontFamily"), default_cjk_font), heading1_cfg.get("fontSizePt", 16)),
                "Heading 2": (self._font_display_name(heading2_cfg.get("fontFamily"), default_cjk_font), heading2_cfg.get("fontSizePt", 15)),
                "Heading 3": (self._font_display_name(heading3_cfg.get("fontFamily"), default_cjk_font), heading3_cfg.get("fontSizePt", 14)),
                "Heading 4": (self._font_display_name(heading4_cfg.get("fontFamily"), default_cjk_font), heading4_cfg.get("fontSizePt", 13)),
                "Heading 5": (self._font_display_name(heading5_cfg.get("fontFamily"), default_cjk_font), heading5_cfg.get("fontSizePt", 12)),
                "Heading 6": (default_cjk_font, 12),
                "Title":     (self._font_display_name(title_cfg.get("fontFamily"), default_cjk_font), title_cfg.get("fontSizePt", 20)),
                "Subtitle":  (self._font_display_name(subtitle_cfg.get("fontFamily"), default_cjk_font), subtitle_cfg.get("fontSizePt", 14)),
                "Default Paragraph Font": (default_cjk_font, default_body_size),
            }
            for style_name, (style_font, style_size) in _style_cfg_map.items():
                try:
                    style = doc.styles[style_name]
                    rPr_elem = style.element.get_or_add_rPr()
                    set_font_properties(rPr_elem, style_font, "Times New Roman", "Times New Roman")
                    sz = rPr_elem.find(qn("w:sz"))
                    if sz is None:
                        sz = OxmlElement("w:sz")
                        rPr_elem.append(sz)
                    sz.set(qn("w:val"), str(int(style_size * 2)))
                    ExportService._set_rpr_color_black(rPr_elem)
                except (KeyError, AttributeError):
                    pass

            def _run_contains_omath(r_elem) -> bool:
                for child in r_elem:
                    if child.tag.startswith(f"{{{ExportService._MATH_NS}}}"):
                        return True
                return False

            def _set_omath_fonts(omath_elem, latin: str = "Times New Roman") -> None:
                """
                遍历 m:oMath 树，将所有 m:rPr 的 w:rFonts 设为指定字体（Times New Roman），
                覆盖 Word 默认的 Cambria Math，使公式与正文风格一致。
                """
                for mrPr in omath_elem.iter(qn("m:rPr")):
                    rFonts = mrPr.find(qn("w:rFonts"))
                    if rFonts is None:
                        rFonts = OxmlElement("w:rFonts")
                        mrPr.insert(0, rFonts)
                    rFonts.set(qn("w:ascii"), latin)
                    rFonts.set(qn("w:hAnsi"), latin)
                    # eastAsia 保留空白，让系统回退到正文字体
                    for attr in list(rFonts.attrib):
                        if attr.endswith("eastAsia") or attr.endswith("cs"):
                            del rFonts.attrib[attr]

            def _normalize_rpr(rPr_elem_inner, run_elem=None) -> None:
                # 根据父段落样式选择正确字体，而不是全部使用正文字体
                font = default_cjk_font
                size = float(default_body_size)
                bold = bool(body_cfg.get("bold", False))
                style_name = "Normal"
                if run_elem is not None:
                    style_name = _para_style_name(run_elem)
                    font = _style_font_map.get(style_name, default_cjk_font)
                    size = _style_size_map.get(style_name, float(default_body_size))
                    bold = _style_bold_map.get(style_name, False)
                
                # 调试日志：打印每个 run 的样式匹配
                run_text = ""
                if run_elem is not None:
                    for child in run_elem:
                        if child.tag == qn("w:t"):
                            run_text = (child.text or "")[:20]
                            break
                logger.debug(f"[_normalize_rpr] run='{run_text}...', style={style_name}, bold={bold}")
                
                set_font_properties(rPr_elem_inner, font, "Times New Roman", "Times New Roman", None)  # 不覆盖粗体，保留原有设置
                sz = rPr_elem_inner.find(qn("w:sz"))
                if sz is None:
                    sz = OxmlElement("w:sz")
                    rPr_elem_inner.append(sz)
                sz.set(qn("w:val"), str(int(size * 2)))
                sz_cs = rPr_elem_inner.find(qn("w:szCs"))
                if sz_cs is None:
                    sz_cs = OxmlElement("w:szCs")
                    rPr_elem_inner.append(sz_cs)
                sz_cs.set(qn("w:val"), str(int(size * 2)))
                
                # 处理粗体：模板的 bold 值优先，如果 Pandoc 原始有 w:b 也保留
                # 逻辑：如果模板要求 bold=True，强制加粗；如果 bold=False 且原始没有 w:b，则不加粗
                existing_b = rPr_elem_inner.find(qn("w:b"))
                if bold:
                    # 模板要求加粗，确保 w:b 存在且值为 "1"
                    if existing_b is None:
                        existing_b = OxmlElement("w:b")
                        rPr_elem_inner.append(existing_b)
                    existing_b.set(qn("w:val"), "1")
                    logger.debug(f"[_normalize_rpr] run='{run_text}...' 设置加粗 bold=True, style={style_name}")
                else:
                    # 模板要求不加粗，如果没有原始 w:b 则不加粗
                    # 如果有原始 w:b，保留原值（可能用户想保留原始格式）
                    if existing_b is not None:
                        logger.debug(f"[_normalize_rpr] run='{run_text}...' 保留原始 w:b, bold=False, style={style_name}")
                
                # 同样处理 w:bCs（复杂脚本粗体）
                existing_b_cs = rPr_elem_inner.find(qn("w:bCs"))
                if bold:
                    if existing_b_cs is None:
                        existing_b_cs = OxmlElement("w:bCs")
                        rPr_elem_inner.append(existing_b_cs)
                    existing_b_cs.set(qn("w:val"), "1")
                
                ExportService._set_rpr_color_black(rPr_elem_inner)

            normal_style = doc.styles["Normal"]
            normal_style.font.size = Pt(default_body_size)
            try:
                normal_style.paragraph_format.line_spacing = default_line_height
                normal_style.paragraph_format.first_line_indent = Pt(default_body_size * default_first_indent)
                normal_style.paragraph_format.space_after = Pt(
                    layout_cfg.get("defaultParagraphSpacingAfterPt", 0)
                )
                normal_style.paragraph_format.space_before = Pt(
                    layout_cfg.get("defaultParagraphSpacingBeforePt", 0)
                )
            except Exception:
                pass

            from docx.enum.text import WD_ALIGN_PARAGRAPH
            _ALIGN_MAP = {
                "left":    WD_ALIGN_PARAGRAPH.LEFT,
                "center":  WD_ALIGN_PARAGRAPH.CENTER,
                "right":   WD_ALIGN_PARAGRAPH.RIGHT,
                "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
            }

            heading_style_map = {
                "Heading 1": heading1_cfg,
                "Heading 2": heading2_cfg,
                "Heading 3": heading3_cfg,
                "Heading 4": heading4_cfg,
                "Heading 5": heading5_cfg,
                "Title":     title_cfg,
                "Subtitle":  subtitle_cfg,
            }
            for style_name, cfg in heading_style_map.items():
                if not cfg:
                    continue
                try:
                    style = doc.styles[style_name]
                    style.font.size = Pt(cfg.get("fontSizePt", default_body_size))
                    style.font.bold = bool(cfg.get("bold", False))
                    align_val = _ALIGN_MAP.get(cfg.get("align", "left"))
                    if align_val is not None:
                        style.paragraph_format.alignment = align_val
                except Exception:
                    pass

            for section in doc.sections:
                try:
                    section.top_margin = Mm(layout_cfg.get("marginTopMm", 25))
                    section.bottom_margin = Mm(layout_cfg.get("marginBottomMm", 25))
                    section.left_margin = Mm(layout_cfg.get("marginLeftMm", 20))
                    section.right_margin = Mm(layout_cfg.get("marginRightMm", 20))
                except Exception:
                    pass

            # ── 3. 正文 / 表格 / 页眉页脚：每个文字 run 统一字体+黑色 ─────────────
            # Pandoc 常把「1. xxx」列为列表而非标题，样式改不到；必须用 run 级覆盖。
            # 含 OMML 的 run 不改字体，避免公式异常。
            latin = "Times New Roman"
            xml_roots = [doc.element.body]
            try:
                from docx.opc.constants import RELATIONSHIP_TYPE as RT

                for rel in doc.part.rels.values():
                    if rel.reltype in (RT.HEADER, RT.FOOTER):
                        el = rel.target_part.element
                        if el is not None:
                            xml_roots.append(el)
            except Exception:
                pass

            # 调试：统计样式匹配情况
            style_match_count = {}
            
            for root in xml_roots:
                for el in root.iter(qn("w:r")):
                    if _run_contains_omath(el):
                        rPr_m = el.find(qn("w:rPr"))
                        if rPr_m is None:
                            rPr_m = OxmlElement("w:rPr")
                            el.insert(0, rPr_m)
                        ExportService._set_rpr_color_black(rPr_m)
                        for child in el:
                            if child.tag.startswith(f"{{{ExportService._MATH_NS}}}"):
                                _set_omath_fonts(child, latin)
                        continue
                    if not any(
                        c.tag == qn("w:t")
                        or c.tag == qn("w:tab")
                        or c.tag == qn("w:br")
                        for c in el
                    ):
                        continue
                    rPr_run = el.find(qn("w:rPr"))
                    if rPr_run is None:
                        rPr_run = OxmlElement("w:rPr")
                        el.insert(0, rPr_run)
                    style_name = _para_style_name(el)
                    style_match_count[style_name] = style_match_count.get(style_name, 0) + 1
                    _normalize_rpr(rPr_run, run_elem=el)

            # 调试日志：打印样式匹配统计
            logger.info(f"[_apply_docx_font] 样式匹配统计: {style_match_count}")
            logger.info(f"[_apply_docx_font] _style_bold_map: {_style_bold_map}")

            # ── 4. 段落级 pPr/rPr（列表缩进等带来的主题色）──────────────────────
            for root in xml_roots:
                for p in root.iter(qn("w:p")):
                    pPr = p.find(qn("w:pPr"))
                    if pPr is None:
                        continue
                    p_rPr = pPr.find(qn("w:rPr"))
                    if p_rPr is not None:
                        # 传入段落的第一个 run 作为上下文（或直接传段落本身）
                        first_run = p.find(qn("w:r"))
                        _normalize_rpr(p_rPr, run_elem=first_run)

            heading_slots = {
                "Heading 1": heading1_cfg,
                "Heading 2": heading2_cfg,
                "Heading 3": heading3_cfg,
                "Heading 4": heading4_cfg,
                "Heading 5": heading5_cfg,
                "Title":     title_cfg,
                "Subtitle":  subtitle_cfg,
            }
            for paragraph in doc.paragraphs:
                cfg = heading_slots.get(paragraph.style.name, body_cfg)
                try:
                    is_body_paragraph = cfg is body_cfg
                    paragraph.paragraph_format.line_spacing = (
                        default_line_height if is_body_paragraph else cfg.get("lineHeight", default_line_height)
                    )
                    paragraph.paragraph_format.space_before = Pt(
                        cfg.get("spacingBeforePt", layout_cfg.get("defaultParagraphSpacingBeforePt", 0))
                    )
                    paragraph.paragraph_format.space_after = Pt(
                        cfg.get("spacingAfterPt", layout_cfg.get("defaultParagraphSpacingAfterPt", 0))
                    )
                    if paragraph.style.name == "Normal":
                        paragraph.paragraph_format.first_line_indent = Pt(
                            default_body_size * default_first_indent
                        )
                except Exception:
                    pass

            def _force_paragraph_template_style(paragraph, cfg: dict[str, Any], *, clear_indent: bool = True) -> None:
                """按模板槽位强制写入段落和 run 的 Word XML 样式。"""
                if not cfg:
                    return
                font_name = self._font_display_name(cfg.get("fontFamily"), default_cjk_font)
                font_size = float(cfg.get("fontSizePt", default_body_size))
                font_bold = _to_bool(cfg.get("bold"), False)  # 使用 _to_bool 转换
                align_cfg = cfg.get("align", "left")
                align = _ALIGN_MAP.get(align_cfg)
                logger.info(f"[_force_paragraph_template_style] 段落='{paragraph.text[:20]}...', align_cfg={align_cfg}, align={align}, font={font_name}, size={font_size}, bold={font_bold}")
                
                pf = paragraph.paragraph_format
                if align is not None:
                    pf.alignment = align
                    logger.info(f"[_force_paragraph_template_style] 已设置对齐: {align}")
                pf.line_spacing = cfg.get("lineHeight", default_line_height)
                pf.space_before = Pt(cfg.get("spacingBeforePt", layout_cfg.get("defaultParagraphSpacingBeforePt", 0)))
                pf.space_after = Pt(cfg.get("spacingAfterPt", layout_cfg.get("defaultParagraphSpacingAfterPt", 0)))
                if clear_indent:
                    pf.first_line_indent = Pt(0)
                    pf.left_indent = Pt(0)
                    pf.right_indent = Pt(0)

                pPr = paragraph._p.get_or_add_pPr()
                if clear_indent:
                    numPr = pPr.find(qn("w:numPr"))
                    if numPr is not None:
                        pPr.remove(numPr)
                    ind = pPr.find(qn("w:ind"))
                    if ind is None:
                        ind = OxmlElement("w:ind")
                        pPr.append(ind)
                    ind.set(qn("w:left"), "0")
                    ind.set(qn("w:right"), "0")
                    ind.set(qn("w:firstLine"), "0")
                    ind.set(qn("w:hanging"), "0")

                if align is not None:
                    jc = pPr.find(qn("w:jc"))
                    if jc is None:
                        jc = OxmlElement("w:jc")
                        pPr.append(jc)
                    jc.set(qn("w:val"), cfg.get("align", "left"))

                for run in paragraph.runs:
                    run.font.size = Pt(font_size)
                    run.font.bold = font_bold
                    run.font.name = font_name
                    rPr_run = run._element.find(qn("w:rPr"))
                    if rPr_run is None:
                        rPr_run = OxmlElement("w:rPr")
                        run._element.insert(0, rPr_run)
                    set_font_properties(rPr_run, font_name, font_name, font_name, font_bold)
                    rFonts = rPr_run.find(qn("w:rFonts"))
                    if rFonts is not None:
                        rFonts.set(qn("w:eastAsia"), font_name)
                        rFonts.set(qn("w:ascii"), font_name)
                        rFonts.set(qn("w:hAnsi"), font_name)
                        rFonts.set(qn("w:cs"), font_name)
                    for tag_name in ("w:sz", "w:szCs"):
                        elem = rPr_run.find(qn(tag_name))
                        if elem is None:
                            elem = OxmlElement(tag_name)
                            rPr_run.append(elem)
                        elem.set(qn("w:val"), str(int(font_size * 2)))
                    # 处理粗体：模板要求加粗时才添加/设置 w:b
                    if font_bold:
                        for tag_name in ("w:b", "w:bCs"):
                            elem = rPr_run.find(qn(tag_name))
                            if elem is None:
                                elem = OxmlElement(tag_name)
                                rPr_run.append(elem)
                            elem.set(qn("w:val"), "1")
                    ExportService._set_rpr_color_black(rPr_run)

            # 标题最终兜底必须放在所有 run/paragraph 统一处理之后，
            # 否则会被正文样式再次覆盖，导致字号字体不生效或视觉偏移。
            if title_cfg:
                title_align = _ALIGN_MAP.get(title_cfg.get("align", "center"), WD_ALIGN_PARAGRAPH.CENTER)
                title_font_name = self._font_display_name(title_cfg.get("fontFamily"), default_cjk_font)
                title_size = title_cfg.get("fontSizePt", default_body_size)
                title_bold = _to_bool(title_cfg.get("bold"), False)  # 使用 _to_bool 转换
                logger.info(f"[_apply_docx_font] title处理: align={title_cfg.get('align')}, title_align={title_align}, font={title_font_name}, size={title_size}, bold={title_bold}, bold_raw={repr(title_cfg.get('bold'))}")

                # 调试：打印前5个段落的信息
                logger.info(f"[_apply_docx_font] === 前5个段落信息 ===")
                for i, paragraph in enumerate(doc.paragraphs[:5]):
                    text = paragraph.text.strip()[:30]
                    style_name = paragraph.style.name
                    # 检查每个 run
                    run_info = []
                    for run in paragraph.runs:
                        run_info.append(f"'{run.text[:10]}...' bold={run.bold}")
                    logger.info(f"  段落{i}: style={style_name}, text='{text}...', runs=[{', '.join(run_info)}]")
                logger.info(f"[_apply_docx_font] ==========================")

                # 1. 先找 First Paragraph 样式（Pandoc 生成的文档标题常用此样式）
                title_paragraph = None
                for paragraph in doc.paragraphs:
                    if paragraph.style.name == "First Paragraph" and paragraph.text.strip():
                        title_paragraph = paragraph
                        logger.info(f"[_apply_docx_font] 找到 First Paragraph 段落: '{paragraph.text[:30]}...'")
                        break
                
                # 2. 再找 Title 样式
                if title_paragraph is None:
                    for paragraph in doc.paragraphs:
                        if paragraph.style.name == "Title" and paragraph.text.strip():
                            title_paragraph = paragraph
                            logger.info(f"[_apply_docx_font] 找到 Title 段落: '{paragraph.text[:30]}...'")
                            break
                
                # 3. 找第一个非 Heading 1/2/3... 的段落，且文本较短（可能是标题而非正文）
                if title_paragraph is None:
                    max_title_len = 50  # 标题通常不超过50字符
                    for paragraph in doc.paragraphs:
                        text = paragraph.text.strip()
                        style = paragraph.style.name
                        if not text:
                            continue
                        # 跳过 Heading 样式
                        if style.startswith("Heading"):
                            continue
                        # 文本较短的可能是标题
                        if len(text) <= max_title_len:
                            title_paragraph = paragraph
                            logger.info(f"[_apply_docx_font] 找到短文本段落（非Heading）: '{paragraph.text[:30]}...', style={style}")
                            break
                
                # 4. 找第一个 Bold 段落
                if title_paragraph is None:
                    logger.info(f"[_apply_docx_font] 未找到 First Paragraph/Title/短文本段落，开始查找 Bold 段落...")
                    for i, paragraph in enumerate(doc.paragraphs):
                        text = paragraph.text.strip()
                        if not text:
                            continue
                        # 检查段落是否包含加粗 run
                        is_bold = False
                        for run in paragraph.runs:
                            if run.bold:
                                is_bold = True
                                logger.info(f"[_apply_docx_font] 段落 {i}: '{text[:20]}...' 是 Bold, style={paragraph.style.name}, run.bold={run.bold}")
                                break
                        if is_bold and text:
                            title_paragraph = paragraph
                            logger.info(f"[_apply_docx_font] 找到 Bold 段落: '{paragraph.text[:30]}...', style={paragraph.style.name}")
                            break
                    if title_paragraph is None:
                        logger.info(f"[_apply_docx_font] 未找到 Bold 段落")
                
                # 5. 最后才找 Heading 1
                if title_paragraph is None:
                    for paragraph in doc.paragraphs:
                        if paragraph.style.name == "Heading 1" and paragraph.text.strip():
                            title_paragraph = paragraph
                            logger.info(f"[_apply_docx_font] 找到 Heading 1 段落: '{paragraph.text[:30]}...'")
                            break
                
                # 6. 兜底：找第一个非空段落
                if title_paragraph is None:
                    for paragraph in doc.paragraphs:
                        if paragraph.text.strip():
                            title_paragraph = paragraph
                            logger.info(f"[_apply_docx_font] 兜底找到段落: '{paragraph.text[:30]}...', style={paragraph.style.name}")
                            break
                
                logger.info(f"[_apply_docx_font] title段落: {title_paragraph.text[:30] if title_paragraph else 'None'}, 当前样式={title_paragraph.style.name if title_paragraph else 'N/A'}")

                if title_paragraph is not None:
                    try:
                        _force_paragraph_template_style(title_paragraph, title_cfg)
                        logger.info(f"[_apply_docx_font] 已应用title样式到段落")
                    except Exception as e:
                        logger.error(f"[_apply_docx_font] 应用title样式失败: {e}")

            # 教案标题兜底：不依赖 Pandoc heading 样式，直接按文本形态套模板槽位。
            top_heading_re = re.compile(r"^\s*[一二三四五六七八九十]+、\s*.+$")
            sub_heading_re = re.compile(r"^\s*[（(][一二三四五六七八九十]+[）)]\s*.+$")
            for paragraph in doc.paragraphs:
                text = paragraph.text.strip()
                if not text:
                    continue
                try:
                    if top_heading_re.match(text):
                        _force_paragraph_template_style(paragraph, heading1_cfg)
                    elif sub_heading_re.match(text):
                        _force_paragraph_template_style(paragraph, heading2_cfg)
                except Exception:
                    pass

            # ── 5. 添加页脚页码 ─────────────────────────────────────────────────
            page_cfg = layout_cfg.get("pageNumber", {})
            page_number_style = styles_cfg.get("page_number", {})
            logger.info(f"[_apply_docx_font] page_number_style: {page_number_style}")
            logger.info(f"[_apply_docx_font] layout.pageNumber: {page_cfg}")
            if page_cfg.get("enabled", True):
                # 获取页码样式自己的字体和对齐方式，而不是使用 layout 中的值
                page_font = self._font_display_name(
                    page_number_style.get("fontFamily"),
                    default_cjk_font
                )
                # 优先使用页码样式中的对齐方式，其次使用 layout 配置
                page_align = page_number_style.get("align") or page_cfg.get("align", "right")
                self._add_page_number_footer(
                    doc,
                    page_number_style,
                    page_cfg.get("position", "bottom"),
                    page_align,
                    page_font,
                )

            doc.save(docx_path)
            logger.info(
                f"docx 已应用模板字体与页面参数，正文中文字体={default_cjk_font}"
            )
        except Exception as e:
            logger.warning(f"设置 docx 字体失败，跳过此步骤: {e}")
            # 字体设置失败不影响导出，文件已生成

    def _add_page_number_footer(
        self,
        doc,
        page_number_style: dict[str, Any],
        position: str,
        align: str,
        default_font: str,
    ) -> None:
        """
        为 Word 文档添加页脚页码。

        使用 Word 原生字段 { PAGE } 实现自动页码，
        支持配置字体、字号、对齐方式和位置（顶部/底部）。
        """
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.shared import Pt

        _ALIGN_MAP = {
            "left": WD_ALIGN_PARAGRAPH.LEFT,
            "center": WD_ALIGN_PARAGRAPH.CENTER,
            "right": WD_ALIGN_PARAGRAPH.RIGHT,
            "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
        }

        # 获取页码样式配置
        font_name = self._font_display_name(page_number_style.get("fontFamily"), default_font)
        font_size_pt = float(page_number_style.get("fontSizePt", 12))

        # 遍历所有 section，为每个添加页脚
        for section in doc.sections:
            try:
                # 获取页脚
                footer = section.footer
                footer.is_linked_to_previous = False

                # 清空现有页脚内容
                for para in list(footer.paragraphs):
                    p = para._element
                    p.getparent().remove(p)

                # 添加新的页脚段落
                footer_p = footer.add_paragraph()
                footer_p.alignment = _ALIGN_MAP.get(align, WD_ALIGN_PARAGRAPH.RIGHT)

                # 设置页边距
                section.footer_distance = Pt(20)
                section.header_distance = Pt(20)

                # 添加 PAGE 字段 - 所有 run 都需要正确的字体属性
                runs_info = [
                    ("begin", None),      # 字段开始
                    ("instr", " PAGE "),  # 字段指令
                    ("sep", None),        # 字段分隔
                    ("result", "1"),      # 字段结果
                    ("end", None),        # 字段结束
                ]

                for run_type, text in runs_info:
                    if run_type in ("begin", "sep", "end"):
                        # fldChar run
                        run = footer_p.add_run()
                        rPr = OxmlElement("w:rPr")
                        # 设置字体
                        rFonts = OxmlElement("w:rFonts")
                        rFonts.set(qn("w:eastAsia"), font_name)
                        rFonts.set(qn("w:ascii"), font_name)
                        rFonts.set(qn("w:hAnsi"), font_name)
                        rFonts.set(qn("w:cs"), font_name)
                        rPr.append(rFonts)
                        # 设置字号
                        sz = OxmlElement("w:sz")
                        sz.set(qn("w:val"), str(int(font_size_pt * 2)))
                        rPr.append(sz)
                        szCs = OxmlElement("w:szCs")
                        szCs.set(qn("w:val"), str(int(font_size_pt * 2)))
                        rPr.append(szCs)
                        # 字段字符
                        fldChar = OxmlElement("w:fldChar")
                        fldChar.set(qn("w:fldCharType"), run_type)
                        rPr.append(fldChar)
                        run._r.append(rPr)
                    elif run_type == "instr":
                        # 指令文本 run
                        run = footer_p.add_run()
                        rPr = OxmlElement("w:rPr")
                        # 设置字体
                        rFonts = OxmlElement("w:rFonts")
                        rFonts.set(qn("w:eastAsia"), font_name)
                        rFonts.set(qn("w:ascii"), font_name)
                        rFonts.set(qn("w:hAnsi"), font_name)
                        rFonts.set(qn("w:cs"), font_name)
                        rPr.append(rFonts)
                        # 设置字号
                        sz = OxmlElement("w:sz")
                        sz.set(qn("w:val"), str(int(font_size_pt * 2)))
                        rPr.append(sz)
                        szCs = OxmlElement("w:szCs")
                        szCs.set(qn("w:val"), str(int(font_size_pt * 2)))
                        rPr.append(szCs)
                        # 指令文本
                        instrText = OxmlElement("w:instrText")
                        instrText.set(qn("xml:space"), "preserve")
                        instrText.text = text
                        rPr.append(instrText)
                        run._r.append(rPr)
                    else:
                        # 普通文本 run
                        run = footer_p.add_run()
                        run.text = text
                        rPr = OxmlElement("w:rPr")
                        # 设置字体
                        rFonts = OxmlElement("w:rFonts")
                        rFonts.set(qn("w:eastAsia"), font_name)
                        rFonts.set(qn("w:ascii"), font_name)
                        rFonts.set(qn("w:hAnsi"), font_name)
                        rFonts.set(qn("w:cs"), font_name)
                        rPr.append(rFonts)
                        # 设置字号
                        sz = OxmlElement("w:sz")
                        sz.set(qn("w:val"), str(int(font_size_pt * 2)))
                        rPr.append(sz)
                        szCs = OxmlElement("w:szCs")
                        szCs.set(qn("w:val"), str(int(font_size_pt * 2)))
                        rPr.append(szCs)
                        # 将 rPr 插入到 run 的开头
                        run._r.insert(0, rPr)

                logger.debug(f"已添加页脚页码: font={font_name}, size={font_size_pt}, align={align}")
            except Exception as e:
                logger.warning(f"添加页脚页码失败: {e}")
                continue


# 全局单例
export_service = ExportService()
