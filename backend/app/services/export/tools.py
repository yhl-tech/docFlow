"""
工具检测模块

负责检测和管理导出依赖的外部工具：
- pandoc: Markdown → docx/pdf 转换
- wkhtmltopdf: PDF 渲染
- xelatex/pdflatex: LaTeX PDF 渲染（公式效果最佳）
- mmdc: Mermaid 图表渲染
"""

import asyncio
import os
import shutil
from typing import Optional

from app.core.logging import get_logger

_log = get_logger(__name__)


class ToolChecker:
    """工具可用性检测器"""

    # pandoc 搜索路径
    PANDOC_PATHS = [
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

    # wkhtmltopdf 搜索路径
    WKHTMLTOPDF_PATHS = [
        "wkhtmltopdf",
        r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe",
        r"C:\Program Files (x86)\wkhtmltopdf\bin\wkhtmltopdf.exe",
        r"C:\Users\yuanhl\AppData\Local\Programs\wkhtmltopdf\wkhtmltopdf.exe",
        r"C:\Users\yuanhl\scoop\shims\wkhtmltopdf.exe",
        r"/usr/bin/wkhtmltopdf",
        r"/usr/local/bin/wkhtmltopdf",
    ]

    def __init__(self) -> None:
        # 缓存检测结果
        self._pandoc_ok: Optional[bool] = None
        self._pandoc_bin_path: str = "pandoc"
        self._mmdc_ok: Optional[bool] = None
        self._pdf_engine: Optional[str] = None
        self._wkhtmltopdf_bin_path: str = "wkhtmltopdf"
        self._latex_engine_bin_path: str = "xelatex"

    async def check_tool(self, *cmd: str) -> bool:
        """检测命令是否可用"""
        try:
            cmd_str = " ".join(cmd) if len(cmd) > 1 else cmd[0]
            proc = await asyncio.create_subprocess_shell(
                cmd_str,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await asyncio.wait_for(proc.communicate(), timeout=10)
            return proc.returncode == 0
        except FileNotFoundError:
            _log.debug(f"命令不存在: {cmd[0]}")
            return False
        except asyncio.TimeoutError:
            _log.debug(f"命令执行超时: {cmd[0]}")
            return False
        except OSError as e:
            _log.debug(f"命令执行错误 {cmd[0]}: {e}")
            return False

    async def get_pandoc_path(self) -> str:
        """返回可用的 pandoc 可执行文件路径"""
        # 1. 优先从 PATH 环境变量动态查找
        path_from_env = shutil.which("pandoc")
        if path_from_env:
            path_normalized = path_from_env.lower().replace(".exe", "") + ".exe"
            if os.path.exists(path_normalized):
                _log.info(f"从 PATH 找到 pandoc: {path_normalized}")
                return path_normalized
            if os.path.exists(path_from_env):
                _log.info(f"从 PATH 找到 pandoc: {path_from_env}")
                return path_from_env

        # 2. 后备：遍历硬编码的路径列表
        for candidate in self.PANDOC_PATHS:
            if candidate == "pandoc":
                continue
            if os.path.exists(candidate):
                _log.info(f"从备用路径找到 pandoc: {candidate}")
                return candidate

        # 3. 最后尝试通过命令检测
        for candidate in ["pandoc"]:
            if await self.check_tool(candidate, "--version"):
                _log.info(f"从命令检测找到 pandoc: {candidate}")
                return candidate

        _log.warning("未找到 pandoc，请确保已安装 https://pandoc.org")
        return ""

    async def is_pandoc_available(self) -> bool:
        """检查 pandoc 是否可用"""
        if self._pandoc_ok is None:
            bin_path = await self.get_pandoc_path()
            self._pandoc_ok = bool(bin_path)
            if self._pandoc_ok:
                self._pandoc_bin_path = bin_path
            else:
                _log.warning("pandoc 未找到，导出不可用")
        return self._pandoc_ok

    async def get_wkhtmltopdf_path(self) -> str:
        """返回可用的 wkhtmltopdf 可执行文件路径"""
        wk_path = shutil.which("wkhtmltopdf")
        if wk_path and os.path.exists(wk_path):
            return wk_path

        for candidate in self.WKHTMLTOPDF_PATHS:
            if candidate == "wkhtmltopdf":
                continue
            if os.path.exists(candidate):
                return candidate
        return ""

    async def get_latex_engine_path(self) -> str:
        """检测可用的 LaTeX 引擎（xelatex 优先支持中文）"""
        for name in ("xelatex", "pdflatex"):
            path = shutil.which(name)
            if path and os.path.exists(path):
                if await self.check_tool(name, "--version"):
                    return path
        return ""

    async def get_pdf_engine(self) -> str:
        """
        检测可用的 PDF 引擎。
        优先级：xelatex > pdflatex > wkhtmltopdf > weasyprint
        """
        if self._pdf_engine is not None:
            return self._pdf_engine

        latex_bin = await self.get_latex_engine_path()
        if latex_bin:
            engine = "xelatex" if "xelatex" in latex_bin.lower() else "pdflatex"
            self._pdf_engine = engine
            self._latex_engine_bin_path = latex_bin
            _log.info(f"PDF 引擎：{engine} ({latex_bin})，公式由 LaTeX 原生渲染")
        else:
            wkbin = await self.get_wkhtmltopdf_path()
            if wkbin:
                self._pdf_engine = "wkhtmltopdf"
                self._wkhtmltopdf_bin_path = wkbin
                _log.info(f"PDF 引擎：wkhtmltopdf ({wkbin})")
            else:
                try:
                    import weasyprint  # noqa: F401
                    self._pdf_engine = "weasyprint"
                    _log.info("PDF 引擎：weasyprint")
                except ImportError:
                    self._pdf_engine = ""
                    _log.warning(
                        "未找到 PDF 引擎（xelatex/pdflatex/wkhtmltopdf/weasyprint），"
                        "PDF 导出不可用。安装 TeX Live 可获最佳公式效果：https://www.tug.org/texlive/"
                    )

        return self._pdf_engine

    async def is_mmdc_available(self) -> bool:
        """检查 mmdc (Mermaid CLI) 是否可用"""
        if self._mmdc_ok is None:
            self._mmdc_ok = await self.check_tool("mmdc", "--version")
            if not self._mmdc_ok:
                self._mmdc_ok = await self.check_tool("npx", "--yes", "mmdc", "--version")
            if not self._mmdc_ok:
                _log.info("mmdc (Mermaid CLI) 未找到，Mermaid 图表将降级为代码块")
        return self._mmdc_ok

    @property
    def pandoc_bin_path(self) -> str:
        return self._pandoc_bin_path

    @property
    def wkhtmltopdf_bin_path(self) -> str:
        return self._wkhtmltopdf_bin_path

    @property
    def latex_engine_bin_path(self) -> str:
        return self._latex_engine_bin_path
