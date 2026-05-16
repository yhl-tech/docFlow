"""
文档导出服务（Word / PDF）

技术路径：Pandoc

Word (.docx)
  - Markdown + tex_math_dollars → docx（OMML 原生公式自动处理）
  - Mermaid 代码块 → mmdc CLI → PNG，再嵌入 docx
  - 支持 reference-doc 模板（academic / business / simple / default）

PDF
  - PDF 引擎优先级：xelatex > pdflatex > wkhtmltopdf > weasyprint
  - 数学公式：LaTeX 引擎原生渲染
  - 中文字体：通过 CSS font-family 注入
  - Mermaid 同 docx（PNG 嵌入）
"""

import asyncio
import os
import re
import shutil
import subprocess
import tempfile
from functools import partial
from pathlib import Path
from typing import Any, Optional

from app.core.logging import get_logger
from app.services.export import ToolChecker, MarkdownPreprocessor, StyleBindings, CssGenerator, DocxStyler

_log = get_logger(__name__)


class PandocNotAvailableError(RuntimeError):
    """Pandoc 未安装时抛出"""


class ExportService:
    """
    导出服务

    使用子模块：
    - ToolChecker: 工具检测
    - MarkdownPreprocessor: Markdown 预处理
    - StyleBindings: 样式绑定提取
    - CssGenerator: CSS 生成
    - DocxStyler: DOCX 样式应用
    """

    def __init__(self) -> None:
        self._tool_checker = ToolChecker()
        self._preprocessor = MarkdownPreprocessor()
        self._styler = DocxStyler()

    # ------------------------------------------------------------------ #
    #  工具可用性检测（委托给 ToolChecker）
    # ------------------------------------------------------------------ #

    async def _check_tool(self, *cmd: str) -> bool:
        return await self._tool_checker.check_tool(*cmd)

    @property
    def _pandoc_bin_path(self) -> str:
        return self._tool_checker.pandoc_bin_path

    @property
    def _wkhtmltopdf_bin_path(self) -> str:
        return self._tool_checker.wkhtmltopdf_bin_path

    @property
    def _latex_engine_bin_path(self) -> str:
        return self._tool_checker.latex_engine_bin_path

    async def pandoc_available(self) -> bool:
        return await self._tool_checker.is_pandoc_available()

    async def pdf_engine(self) -> str:
        return await self._tool_checker.get_pdf_engine()

    async def mmdc_available(self) -> bool:
        return await self._tool_checker.is_mmdc_available()

    # ------------------------------------------------------------------ #
    #  Word 导入功能
    # ------------------------------------------------------------------ #

    def _convert_bold_paras_to_headings(self, text: str) -> str:
        """将"加粗的正文段落"转换为真正的 Markdown 标题"""
        lines = text.split('\n')
        result_lines = []

        for line in lines:
            bold_only_pattern = r'^(\*{2}|_{2})([^\*\_]+)\1\s*$'
            match = re.match(bold_only_pattern, line.strip())

            if match:
                content = match.group(2).strip()
                heading_patterns = [
                    r'^[一二三四五六七八九十百千]+[、.　 ]',
                    r'^[（\(][一二三四五六七八九十]+[）\)]',
                    r'^第[一二三四五六七八九十0-9]+[节章节部分篇]',
                    r'^[0-9]+[.、]',
                    r'^[ivxIVX]+[.、)]',
                    r'^[A-Z][.、)]',
                ]
                is_heading = any(re.match(p, content) for p in heading_patterns)

                if is_heading:
                    result_lines.append(f"# {content}")
                    continue

            result_lines.append(line)

        return '\n'.join(result_lines)

    async def docx_to_markdown(self, docx_path: str) -> str:
        """Word (.docx) → Markdown，公式转为 $...$ / $$...$$ LaTeX"""
        if not await self.pandoc_available():
            raise PandocNotAvailableError("未安装 Pandoc，无法高质量解析 Word 公式。请安装：https://pandoc.org")

        tmpdir = tempfile.mkdtemp()
        try:
            out_md = os.path.join(tmpdir, "parsed.md")
            abs_docx = os.path.abspath(docx_path)
            cmd = [
                self._pandoc_bin_path,
                "--from=docx",
                "--to=markdown+tex_math_dollars+tex_math_single_backslash",
                "-o", out_md,
                abs_docx,
            ]

            def quote_arg(arg: str) -> str:
                return f'"{arg}"' if " " in arg else arg

            quoted = [quote_arg(cmd[0])] + cmd[1:]
            cmd_str = " ".join(quoted)
            loop = asyncio.get_event_loop()
            proc = await loop.run_in_executor(
                None,
                partial(subprocess.run, cmd_str, shell=True, capture_output=True, cwd=tmpdir, timeout=120),
            )
            if proc.returncode != 0:
                err = (proc.stderr or b"").decode("utf-8", errors="replace")[:500]
                _log.error(f"Pandoc docx→md 失败: {err}")
                raise RuntimeError(f"Pandoc 解析 docx 失败: {err[:200]}")
            if not os.path.isfile(out_md):
                raise RuntimeError("Pandoc 未生成 Markdown 文件")
            with open(out_md, encoding="utf-8") as f:
                text = f.read()
            text = re.sub(r"^---\s*\n.*?\n---\s*\n", "", text, count=1, flags=re.DOTALL)
            text = self._convert_bold_paras_to_headings(text)
            return text.lstrip("\n")
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    async def docx_to_html(self, docx_path: str) -> str:
        """Word (.docx) → HTML，保留原始样式"""
        if not await self.pandoc_available():
            raise PandocNotAvailableError("未安装 Pandoc，无法解析 Word 样式。请安装：https://pandoc.org")

        tmpdir = tempfile.mkdtemp()
        try:
            out_html = os.path.join(tmpdir, "parsed.html")
            abs_docx = os.path.abspath(docx_path)
            cmd = [self._pandoc_bin_path, "--from=docx", "--to=html", "-o", out_html, abs_docx]

            def quote_arg(arg: str) -> str:
                return f'"{arg}"' if " " in arg else arg

            quoted = [quote_arg(cmd[0])] + cmd[1:]
            cmd_str = " ".join(quoted)
            loop = asyncio.get_event_loop()
            proc = await loop.run_in_executor(
                None,
                partial(subprocess.run, cmd_str, shell=True, capture_output=True, timeout=120),
            )
            if proc.returncode != 0:
                err = (proc.stderr or b"").decode("utf-8", errors="replace")[:500]
                _log.error(f"Pandoc docx→html 失败: {err}")
                raise RuntimeError(f"Pandoc 解析 docx 失败: {err[:200]}")
            if not os.path.isfile(out_html):
                raise RuntimeError("Pandoc 未生成 HTML 文件")
            with open(out_html, encoding="utf-8") as f:
                html_content = f.read()
            body_start = html_content.find("<body>")
            body_end = html_content.find("</body>")
            if body_start != -1 and body_end != -1:
                html_content = html_content[body_start + 6:body_end]
            return html_content.strip()
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    async def docx_to_style_runs(self, docx_path: str) -> list:
        """Word (.docx) → style runs，提取样式信息"""
        if not await self.pandoc_available():
            raise PandocNotAvailableError("未安装 Pandoc")

        tmpdir = tempfile.mkdtemp()
        try:
            out_md = os.path.join(tmpdir, "parsed.md")
            abs_docx = os.path.abspath(docx_path)
            cmd = [self._pandoc_bin_path, "--from=docx", "--to=markdown", "-o", out_md, abs_docx]

            def quote_arg(arg: str) -> str:
                return f'"{arg}"' if " " in arg else arg

            quoted = [quote_arg(cmd[0])] + cmd[1:]
            cmd_str = " ".join(quoted)
            loop = asyncio.get_event_loop()
            proc = await loop.run_in_executor(
                None,
                partial(subprocess.run, cmd_str, shell=True, capture_output=True, cwd=tmpdir, timeout=120),
            )
            if proc.returncode != 0:
                err = (proc.stderr or b"").decode("utf-8", errors="replace")[:500]
                _log.error(f"Pandoc docx→md 失败: {err}")
                raise RuntimeError(f"Pandoc 解析 docx 失败: {err[:200]}")
            if not os.path.isfile(out_md):
                raise RuntimeError("Pandoc 未生成 Markdown 文件")
            with open(out_md, encoding="utf-8") as f:
                text = f.read()

            style_runs = []
            heading_pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)

            for match in heading_pattern.finditer(text):
                level = len(match.group(1))
                content = match.group(2).strip()
                style_runs.append({
                    "type": "heading",
                    "level": level,
                    "content": content,
                    "style_key": f"heading_{level}",
                })

            for line in text.split('\n'):
                stripped = line.strip()
                if stripped and not stripped.startswith('#'):
                    style_runs.append({
                        "type": "paragraph",
                        "content": line,
                        "style_key": "body",
                    })

            return style_runs
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    # ------------------------------------------------------------------ #
    #  Markdown 预处理（委托给 MarkdownPreprocessor）
    # ------------------------------------------------------------------ #

    async def _render_mermaid(self, code: str, tmpdir: str) -> Optional[str]:
        return await self._preprocessor.render_mermaid(code, tmpdir)

    async def _preprocess_mermaid(self, markdown: str, tmpdir: str) -> str:
        return await self._preprocessor.preprocess_mermaid(markdown, tmpdir)

    async def _preprocess_images(self, markdown: str, tmpdir: str) -> str:
        return await self._preprocessor.preprocess_images(markdown, tmpdir)

    def _reference_doc(self, template: str) -> Optional[str]:
        return self._preprocessor.get_reference_doc_path(template)

    # ------------------------------------------------------------------ #
    #  样式绑定提取（委托给 StyleBindings）
    # ------------------------------------------------------------------ #

    def _binding_styles(self, template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        return StyleBindings.get_styles(template_binding)

    def _binding_layout(self, template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        return StyleBindings.get_layout(template_binding)

    def _binding_list_styles(self, template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        return StyleBindings.get_list_styles(template_binding)

    def _binding_codeblock_styles(self, template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        return StyleBindings.get_codeblock_styles(template_binding)

    def _binding_table_styles(self, template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        return StyleBindings.get_table_styles(template_binding)

    def _binding_image_styles(self, template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        return StyleBindings.get_image_styles(template_binding)

    def _binding_heading_styles(self, template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        return StyleBindings.get_heading_styles(template_binding)

    def _binding_paragraph_styles(self, template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        return StyleBindings.get_paragraph_styles(template_binding)

    def _resolve_page_size(self, page_size: str, template_binding: Optional[dict[str, Any]]) -> str:
        return StyleBindings.get_page_size(page_size, template_binding)

    def _template_id(self, template: str, template_binding: Optional[dict[str, Any]]) -> str:
        return StyleBindings.get_template_id(template, template_binding)

    def _font_display_name(self, font_id: str | None, fallback: str = "微软雅黑") -> str:
        return StyleBindings.font_display_name(font_id, fallback)

    # ------------------------------------------------------------------ #
    #  CSS 生成（委托给 CssGenerator）
    # ------------------------------------------------------------------ #

    def _get_codeblock_css(self, template_binding: Optional[dict[str, Any]]) -> str:
        return CssGenerator.get_codeblock_css(template_binding)

    def _get_table_css(self, template_binding: Optional[dict[str, Any]]) -> str:
        return CssGenerator.get_table_css(template_binding)

    def _get_list_css(self, template_binding: Optional[dict[str, Any]]) -> str:
        return CssGenerator.get_list_css(template_binding)

    def _get_image_css(self, template_binding: Optional[dict[str, Any]]) -> str:
        return CssGenerator.get_image_css(template_binding)

    def _get_full_css(self, template_binding: Optional[dict[str, Any]], font_family: str | None = None) -> str:
        return CssGenerator.get_full_css(template_binding, font_family)

    # ------------------------------------------------------------------ #
    #  PDF 导出
    # ------------------------------------------------------------------ #

    def _apply_template_semantics(self, markdown: str, template: str, template_binding: Optional[dict[str, Any]]) -> str:
        """为 Markdown 应用模板语义标记，用于 CSS 选择"""
        heading_styles = self._binding_heading_styles(template_binding)
        styles = self._binding_styles(template_binding)

        # 获取图表编号前缀（用于识别居中的图表说明行）
        table_styles = self._binding_table_styles(template_binding)
        table_numbering = table_styles.get("tableNumbering", {})
        table_prefix = table_numbering.get("prefix", "表 ")
        escaped_prefix = re.escape(table_prefix.strip())
        numbering_pattern = re.compile(rf'^(?:{escaped_prefix}|图)\s*\d+')

        result_lines = []
        lines = markdown.split('\n')
        i = 0

        while i < len(lines):
            line = lines[i]
            stripped = line.strip()

            # 处理标题
            heading_match = re.match(r'^(#{1,6})\s+(.+)$', stripped)
            if heading_match:
                level = len(heading_match.group(1))
                content = heading_match.group(2)
                heading_cfg = heading_styles.get(f"level{level}", {})
                align = heading_cfg.get("align", "left")
                if align != "left":
                    result_lines.append(f'<div align="{align}" data-heading-level="{level}">{line}')
                else:
                    result_lines.append(line)
                i += 1
                continue

            # 处理图表编号行（如"表 1 xxx"、"**表 1**"），始终居中
            # 剥离可能的 markdown 加粗标记后再匹配
            stripped_plain = re.sub(r'\*{1,2}([^*]+)\*{1,2}', r'\1', stripped).strip()
            is_numbering_line = numbering_pattern.match(stripped_plain) is not None
            if is_numbering_line:
                result_lines.append(f'<p align="center">{line}</p>')
                i += 1
                continue

            # 处理正文段落（跳过表格行、分隔线、空行等特殊 Markdown 语法）
            is_table_row = stripped.startswith('|')
            is_hr = re.match(r'^[-*_]{3,}$', stripped) is not None
            if stripped and not stripped.startswith('#') and not stripped.startswith('!') and not is_table_row and not is_hr:
                # 检查段落样式配置
                para_cfg = self._binding_paragraph_styles(template_binding)
                align = para_cfg.get("align") or styles.get("body", {}).get("align")
                if align and align != "left":
                    result_lines.append(f'<p align="{align}">{line}</p>')
                else:
                    result_lines.append(line)
            else:
                result_lines.append(line)

            i += 1

        return '\n'.join(result_lines)

    @staticmethod
    def _fix_empty_table_cells(markdown: str) -> str:
        """修复 markdown pipe table 中空单元格被 pandoc 渲染为 em dash（—）的问题。
        pandoc pipe_tables 扩展将内容为空的单元格在 docx 输出时填充 em dash；
        用不间断空格（NBSP U+00A0）占位，pandoc 把它当作普通文字保留，
        而 docx_styler 后续能正常处理表格样式。
        """
        NBSP = ' '  # 不间断空格，pandoc 不忽略、不替换
        SEP_RE = re.compile(r'^\s*\|[\s:|]*-[\s\-:|]*\|\s*$')  # 分隔行（必须含 -）
        TABLE_RE = re.compile(r'^\s*\|')

        lines = markdown.split('\n')
        result = []
        i = 0
        while i < len(lines):
            line = lines[i]
            if SEP_RE.match(line):
                result.append(line)
                i += 1
                continue
            if TABLE_RE.match(line):
                cells = line.strip().strip('|').split('|')
                filled = [c if c.strip() else f' {NBSP} ' for c in cells]
                result.append('|' + '|'.join(filled) + '|')
                i += 1
                continue
            result.append(line)
            i += 1
        return '\n'.join(result)

    def _pdf_header_html(self, template_binding: Optional[dict[str, Any]]) -> str:
        """生成 PDF 头部的 HTML 片段（包含中文字体声明）"""
        layout = self._binding_layout(template_binding)
        styles = self._binding_styles(template_binding)

        body_font_id = styles.get("body", {}).get("fontFamily")
        body_font = self._font_display_name(body_font_id) if body_font_id else "微软雅黑"

        cjk_fonts = (
            '"Microsoft YaHei", "SimHei", "Heiti SC", '
            '"Noto Sans CJK SC", "WenQuanYi Micro Hei", sans-serif'
        )

        body_size = styles.get("body", {}).get("fontSizePt", 12)
        line_height = layout.get("defaultLineHeight", 1.5)
        first_indent = layout.get("defaultFirstLineIndentChars", 0)
        spacing_before = layout.get("defaultParagraphSpacingBeforePt", 0)
        spacing_after = layout.get("defaultParagraphSpacingAfterPt", 0)

        page_size = layout.get("paperSize", "A4")
        page_width_map = {"A4": "210mm", "A3": "297mm", "Letter": "8.5in"}
        page_height_map = {"A4": "297mm", "A3": "420mm", "Letter": "11in"}
        page_width = page_width_map.get(page_size, "210mm")
        page_height = page_height_map.get(page_size, "297mm")

        margin_top = layout.get("marginTopMm", 25)
        margin_bottom = layout.get("marginBottomMm", 25)
        margin_left = layout.get("marginLeftMm", 25)
        margin_right = layout.get("marginRightMm", 25)

        return f"""
<head>
<meta charset="utf-8">
<style>
@page {{
  size: {page_width} {page_height};
  margin: {margin_top}mm {margin_right}mm {margin_bottom}mm {margin_left}mm;
}}
body {{
  font-family: '{body_font}', {cjk_fonts};
  font-size: {body_size}pt;
  line-height: {line_height};
}}
p {{
  margin-top: {spacing_before}pt;
  margin-bottom: {spacing_after}pt;
  text-indent: {first_indent * 2}em;
}}
p:first-of-type {{ text-indent: 0; }}
h1, h2, h3, h4, h5, h6 {{ page-break-after: avoid; }}
{self._get_codeblock_css(template_binding)}
{self._get_table_css(template_binding)}
{self._get_list_css(template_binding)}
{self._get_image_css(template_binding)}
</style>
</head>
"""

    def _pdf_header_latex(self, template_binding: Optional[dict[str, Any]]) -> str:
        """生成 LaTeX 头部片段（中文字体设置）"""
        layout = self._binding_layout(template_binding)
        styles = self._binding_styles(template_binding)

        body_font_id = styles.get("body", {}).get("fontFamily")
        body_font = self._font_display_name(body_font_id) if body_font_id else "微软雅黑"

        page_size = layout.get("paperSize", "A4")
        page_width = "a4paper" if page_size == "A4" else ("a3paper" if page_size == "A3" else "letterpaper")
        margin_top = layout.get("marginTopMm", 25)
        margin_bottom = layout.get("marginBottomMm", 25)
        margin_left = layout.get("marginLeftMm", 25)
        margin_right = layout.get("marginRightMm", 25)

        return f"""
\\usepackage{{xeCJK}}
\\setCJKmainfont{{{body_font}}}
\\usepackage{{geometry}}
\\geometry{{{page_width}, top={{{margin_top}mm}}, bottom={{{margin_bottom}mm}}, left={{{margin_left}mm}}, right={{{margin_right}mm}}}}
"""

    async def export_pdf(
        self,
        markdown: str,
        template: str = "default",
        page_size: str = "A4",
        template_binding: Optional[dict[str, Any]] = None,
    ) -> bytes:
        """将 Markdown 转换为 PDF"""
        engine = await self.pdf_engine()
        if not engine:
            raise RuntimeError("未找到 PDF 引擎（xelatex/pdflatex/wkhtmltopdf/weasyprint）")

        page_size = self._resolve_page_size(page_size, template_binding)
        with tempfile.TemporaryDirectory() as tmpdir:
            # 预处理
            semantic_markdown = self._apply_template_semantics(markdown, template, template_binding)
            semantic_markdown = self._fix_empty_table_cells(semantic_markdown)
            processed = await self._preprocess_mermaid(semantic_markdown, tmpdir)
            processed = await self._preprocess_images(processed, tmpdir)

            # 生成 CSS
            css = self._get_full_css(template_binding)
            header_html = self._pdf_header_html(template_binding)

            # 写入文件
            input_path = os.path.join(tmpdir, "input.md")
            output_path = os.path.join(tmpdir, "output.pdf")
            css_path = os.path.join(tmpdir, "style.css")
            header_path = os.path.join(tmpdir, "header.html")

            with open(input_path, "w", encoding="utf-8-sig") as f:
                f.write(processed)
            with open(css_path, "w", encoding="utf-8-sig") as f:
                f.write(css)
            with open(header_path, "w", encoding="utf-8") as f:
                f.write(header_html)

            # 构建 pandoc 命令
            if engine in ("xelatex", "pdflatex"):
                latex_header = self._pdf_header_latex(template_binding)
                header_latex_path = os.path.join(tmpdir, "header.tex")
                with open(header_latex_path, "w", encoding="utf-8") as f:
                    f.write(latex_header)

                cmd = [
                    self._pandoc_bin_path,
                    "--from=markdown+tex_math_dollars+tex_math_single_backslash+raw_html",
                    "--to=pdf",
                    "--pdf-engine", engine,
                    "--include-in-header", header_latex_path,
                    "--resource-path", ".",
                    "-o", "output.pdf",
                    "input.md",
                ]
            else:
                cmd = [
                    self._pandoc_bin_path,
                    "--from=markdown+tex_math_dollars+tex_math_single_backslash+raw_html",
                    "--to=html5",
                    "--css", "style.css",
                    "--include-in-body-header", "header.html",
                    "--resource-path", ".",
                    "-o", "output.html",
                    "input.md",
                ]

            def quote_path(path: str) -> str:
                return f'"{path}"' if " " in path else path

            quoted_cmd = [quote_path(arg) if i == 0 else arg for i, arg in enumerate(cmd)]
            cmd_str = " ".join(quoted_cmd)

            _log.info(f"执行 pandoc: {cmd_str}")
            loop = asyncio.get_event_loop()
            proc = await loop.run_in_executor(
                None,
                partial(subprocess.run, cmd_str, shell=True, capture_output=True, cwd=tmpdir, timeout=120),
            )

            if proc.returncode != 0:
                stderr = (proc.stderr or b"").decode("utf-8", errors="replace")
                _log.error(f"Pandoc PDF 转换失败: {stderr[:500]}")
                raise RuntimeError(f"Pandoc PDF 转换失败: {stderr[:200]}")

            # 如果是 HTML5 引擎，需要额外转换
            if engine not in ("xelatex", "pdflatex"):
                # TODO: 使用 wkhtmltopdf 或 weasyprint 转换
                with open(os.path.join(tmpdir, "output.html"), encoding="utf-8") as f:
                    html_content = f.read()
                return html_content.encode("utf-8")

            if not os.path.isfile(output_path):
                raise RuntimeError("Pandoc 未生成 PDF 文件")

            with open(output_path, "rb") as f:
                return f.read()

    # ------------------------------------------------------------------ #
    #  DOCX 导出
    # ------------------------------------------------------------------ #

    async def export_docx(
        self,
        markdown: str,
        template: str = "default",
        page_size: str = "A4",
        template_binding: Optional[dict[str, Any]] = None,
    ) -> bytes:
        """将 Markdown 转换为 docx"""
        if not await self.pandoc_available():
            raise PandocNotAvailableError("服务器未安装 Pandoc")

        page_size = self._resolve_page_size(page_size, template_binding)
        with tempfile.TemporaryDirectory() as tmpdir:
            # 预处理
            semantic_markdown = self._apply_template_semantics(markdown, template, template_binding)
            semantic_markdown = self._fix_empty_table_cells(semantic_markdown)
            processed = await self._preprocess_mermaid(semantic_markdown, tmpdir)
            processed = await self._preprocess_images(processed, tmpdir)

            input_path = os.path.join(tmpdir, "input.md")
            output_path = os.path.join(tmpdir, "output.docx")

            with open(input_path, "w", encoding="utf-8-sig") as f:
                f.write(processed)

            # 构建 pandoc 命令
            cmd = [
                self._pandoc_bin_path,
                "--from=markdown+tex_math_dollars+tex_math_single_backslash+raw_html",
                "--to=docx",
                "--resource-path", ".",
                "-o", "output.docx",
                "input.md",
            ]

            ref_doc = self._reference_doc(template)
            if ref_doc:
                cmd.extend(["--reference-doc", ref_doc])

            def quote_path(path: str) -> str:
                return f'"{path}"' if " " in path else path

            quoted_cmd = [quote_path(arg) if i == 0 else arg for i, arg in enumerate(cmd)]
            cmd_str = " ".join(quoted_cmd)

            _log.info(f"执行 pandoc: {cmd_str}")
            loop = asyncio.get_event_loop()
            proc = await loop.run_in_executor(
                None,
                partial(subprocess.run, cmd_str, shell=True, capture_output=True, cwd=tmpdir, timeout=90),
            )

            if proc.returncode != 0:
                stderr = (proc.stderr or b"").decode("utf-8", errors="replace")
                _log.error(f"Pandoc 转换失败: {stderr[:500]}")
                raise RuntimeError(f"Pandoc 转换失败: {stderr[:200]}")

            if not os.path.isfile(output_path):
                raise RuntimeError("Pandoc 未生成 docx 文件")

            # 后处理：应用样式
            await self._postprocess_docx(output_path, template_binding)

            with open(output_path, "rb") as f:
                return f.read()

    def _fix_numbering_paragraph_alignment(self, doc, template_binding: Optional[dict[str, Any]]) -> None:
        """将图表编号段落（如"表 1 xxx"、"图1 xxx"）强制设为居中对齐"""
        from docx.enum.text import WD_ALIGN_PARAGRAPH

        table_styles = self._binding_table_styles(template_binding)
        table_prefix = table_styles.get("tableNumbering", {}).get("prefix", "表 ")
        escaped_prefix = re.escape(table_prefix.strip())
        numbering_pattern = re.compile(rf'^(?:{escaped_prefix}|图)\s*\d+')

        for para in doc.paragraphs:
            text = para.text.strip()
            if numbering_pattern.match(text):
                para.alignment = WD_ALIGN_PARAGRAPH.CENTER

    async def _postprocess_docx(self, docx_path: str, template_binding: Optional[dict[str, Any]]) -> None:
        """DOCX 后处理：应用字体、图片样式、页眉页脚（使用同一 doc 对象避免覆盖）"""
        from docx import Document

        doc = Document(docx_path)

        # 清除 _fix_empty_table_cells 填充的占位 NBSP（\xa0）
        # NBSP 仅用于防止 pandoc 忽略空 header row，导出完成后应清除，否则在 Word 某些样式下显示为 —
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        for run in para.runs:
                            if run.text == '\xa0':
                                run.text = ''

        # 应用字体样式（传入 doc 对象，避免重复加载/覆盖）
        self._styler.apply_docx_font(docx_path, template_binding=template_binding, doc=doc)

        # 对图表编号段落强制居中（Pandoc 不支持 <p align> 转 Word 对齐）
        self._fix_numbering_paragraph_alignment(doc, template_binding)

        # 应用表格样式
        self._styler.apply_docx_table_styles(doc, template_binding)

        # 插入表格题注编号（tableStyles.tableNumbering.enabled=True 时）
        self._styler.apply_docx_table_numbering(doc, template_binding)

        # 应用列表样式
        self._styler.apply_docx_list_styles(doc, template_binding)

        # 应用代码块样式
        self._styler.apply_docx_codeblock_styles(doc, template_binding)

        # 应用图片样式
        self._styler.apply_docx_image_styles(doc, template_binding)

        # 插入图片题注编号（imageStyles.numbering.enabled=True 时）
        self._styler.apply_docx_image_numbering(doc, template_binding)

        # 添加页码
        self._styler.add_page_number_footer(doc, template_binding)

        # 添加页眉页脚
        self._styler.add_header_footer_content(doc, template_binding)

        # 设置页面边距和纸张方向
        layout = self._binding_layout(template_binding)
        from docx.shared import Mm
        from docx.enum.section import WD_ORIENT
        for section in doc.sections:
            section.top_margin = Mm(layout.get("marginTopMm", 25))
            section.bottom_margin = Mm(layout.get("marginBottomMm", 25))
            section.left_margin = Mm(layout.get("marginLeftMm", 25))
            section.right_margin = Mm(layout.get("marginRightMm", 25))

            # 设置纸张方向
            paper_direction = layout.get("paperDirection", "portrait")
            if paper_direction == "landscape":
                section.orientation = WD_ORIENT.LANDSCAPE
                # 横向时交换宽高
                section.page_width = Mm(layout.get("pageHeightMm", 297))
                section.page_height = Mm(layout.get("pageWidthMm", 210))
            else:
                section.orientation = WD_ORIENT.PORTRAIT
                section.page_width = Mm(layout.get("pageWidthMm", 210))
                section.page_height = Mm(layout.get("pageHeightMm", 297))

        doc.save(docx_path)

    # ------------------------------------------------------------------ #
    #  统一导出入口
    # ------------------------------------------------------------------ #

    async def export(
        self,
        format: str,
        markdown: str,
        template: str = "default",
        page_size: str = "A4",
        template_binding: Optional[dict[str, Any]] = None,
    ) -> bytes:
        """统一导出入口"""
        if format == "pdf":
            return await self.export_pdf(markdown, template, page_size, template_binding)
        elif format == "docx":
            return await self.export_docx(markdown, template, page_size, template_binding)
        else:
            raise ValueError(f"不支持的导出格式: {format}")


# 全局单例
export_service = ExportService()
