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
from typing import Optional

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

    def _pdf_header_html(self, template: str, page_size: str) -> str:
        """生成注入到 HTML <head> 的 CSS 片段（中文字体 + 页面尺寸），供 wkhtmltopdf/weasyprint"""
        cjk = ", ".join(self._CJK_FONTS)
        color = self._TEMPLATE_COLORS.get(template, "#333333")
        return (
            f"<style>\n"
            f"@page {{ size: {page_size}; margin: 2.5cm 2cm; }}\n"
            f"body {{\n"
            f"  font-family: {cjk};\n"
            f"  font-size: 12pt;\n"
            f"  line-height: 1.75;\n"
            f"  color: {color};\n"
            f"}}\n"
            f"code, pre {{\n"
            f"  font-family: \"Cascadia Code\", Consolas, \"Courier New\", monospace;\n"
            f"  font-size: 10pt;\n"
            f"  background: #f5f5f5;\n"
            f"  border-radius: 3px;\n"
            f"  padding: 0 3px;\n"
            f"}}\n"
            f"pre {{ padding: 8px 12px; overflow-x: auto; }}\n"
            f"h1,h2,h3 {{ font-weight: bold; margin-top: 1.5em; }}\n"
            f"table {{ border-collapse: collapse; width: 100%; }}\n"
            f"th, td {{ border: 1px solid #ccc; padding: 6px 10px; }}\n"
            f"th {{ background: #f0f0f0; }}\n"
            f"</style>\n"
        )

    def _pdf_header_latex(self, page_size: str) -> str:
        """生成 LaTeX  preamble 片段（xelatex 中文 + 页面），供 pandoc --pdf-engine=xelatex"""
        # 页面边距与尺寸（pandoc 默认 A4，此处仅加 CJK）
        return (
            "\\usepackage{xeCJK}\n"
            "\\setCJKmainfont{SimHei}\n"
            "\\setCJKsansfont{SimHei}\n"
            "\\setCJKmonofont{SimSun}\n"
        )

    # ------------------------------------------------------------------ #
    #  主导出方法
    # ------------------------------------------------------------------ #

    async def export_pdf(
        self,
        markdown: str,
        template: str = "default",
        page_size: str = "A4",
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
            processed = await self._preprocess_mermaid(markdown, tmpdir)

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
                        f.write(self._pdf_header_latex(page_size))
                    cmd.extend(["--include-in-header", "header.tex"])
            else:
                # wkhtmltopdf / weasyprint：通过 HTML + MathML，公式易出现乱码或残缺
                header_path = os.path.join(tmpdir, "header.html")
                with open(header_path, "w", encoding="utf-8") as f:
                    f.write(self._pdf_header_html(template, page_size))
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

        with tempfile.TemporaryDirectory() as tmpdir:
            # 1. 预处理 Mermaid 块
            processed = await self._preprocess_mermaid(markdown, tmpdir)

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
                self._apply_docx_font(output_path)
            except Exception as e:
                logger.warning(f"设置字体失败，跳过: {e}")

            # 6. 读取并返回 docx 字节
            try:
                with open(output_path, "rb") as f:
                    return f.read()
            except Exception as e:
                logger.error(f"读取 docx 文件失败: {e}")
                raise RuntimeError(f"读取导出文件失败: {e}")

    @staticmethod
    def _set_rpr_color_black(rPr_elem) -> None:
        """将 w:rPr 的文字颜色设为黑色，与正文一致（避免 Pandoc 默认标题蓝色）。"""
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
        color_elem = rPr_elem.find(qn("w:color"))
        if color_elem is None:
            color_elem = OxmlElement("w:color")
            rPr_elem.append(color_elem)
        color_elem.set(qn("w:val"), "000000")

    @staticmethod
    def _apply_docx_font(docx_path: str, cjk_font: str = "Microsoft YaHei") -> None:
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
            doc = Document(docx_path)

            def set_font_properties(rPr_elem, east_asia: str, ascii: str = None, h_ansi: str = None):
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

            set_font_properties(rPr_default, cjk_font, "Times New Roman", "Times New Roman")
            ExportService._set_rpr_color_black(rPr_default)

            # ── 2. 段落 / 标题样式（字体 + 标题颜色统一为黑色）───────────────────
            target_styles = [
                "Normal", "Default Paragraph Font",
                "Heading 1", "Heading 2", "Heading 3",
                "Heading 4", "Heading 5", "Heading 6",
            ]
            for style_name in target_styles:
                try:
                    style = doc.styles[style_name]
                    rPr_elem = style.element.get_or_add_rPr()
                    set_font_properties(rPr_elem, cjk_font, "Times New Roman", "Times New Roman")
                    ExportService._set_rpr_color_black(rPr_elem)
                except (KeyError, AttributeError):
                    pass

            # ── 3. 处理文档正文中所有带有字体属性的段落 ───────────────────────────
            # 遍历所有段落，移除可能导致字体不生效的内联 rPr
            for paragraph in doc.paragraphs:
                # 检查段落样式是否有字体设置
                pPr = paragraph.element.find(qn("w:pPr"))
                if pPr is not None:
                    pPr_rPr = pPr.find(qn("w:rPr"))
                    if pPr_rPr is not None:
                        # 段落级别已有字体设置，跳过
                        pass

            doc.save(docx_path)
            logger.info(f"docx 字体已设置为 {cjk_font} + Times New Roman")
        except Exception as e:
            logger.warning(f"设置 docx 字体失败，跳过此步骤: {e}")
            # 字体设置失败不影响导出，文件已生成


# 全局单例
export_service = ExportService()
