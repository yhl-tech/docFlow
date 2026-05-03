"""导出服务单元测试"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Any

from app.services.export_service import ExportService


class TestExportServiceInit:
    """ExportService 初始化测试"""

    def test_service_has_export_method(self):
        """ExportService 应有 export 方法"""
        svc = ExportService()
        assert hasattr(svc, "export")
        assert callable(getattr(svc, "export"))

    def test_service_has_export_docx_method(self):
        """ExportService 应有 export_docx 方法"""
        svc = ExportService()
        assert hasattr(svc, "export_docx")
        assert callable(getattr(svc, "export_docx"))

    def test_service_has_export_pdf_method(self):
        """ExportService 应有 export_pdf 方法"""
        svc = ExportService()
        assert hasattr(svc, "export_pdf")
        assert callable(getattr(svc, "export_pdf"))


class TestBindingStyles:
    """TemplateBinding 样式提取测试"""

    def test_binding_styles_extracts_from_snapshot(
        self, sample_template_binding: dict[str, Any]
    ):
        """TemplateBinding.configSnapshot.styles 应被正确提取"""
        svc = ExportService()
        styles = svc._binding_styles(sample_template_binding)

        assert "body" in styles
        assert styles["body"]["fontFamily"] == "FangSong_GB2312"
        assert styles["body"]["fontSizePt"] == 16
        assert styles["heading_1"]["bold"] is True
        assert styles["heading_1"]["fontFamily"] == "SimHei"

    def test_binding_styles_fallback_to_default(self):
        """无 snapshot 时应返回默认样式"""
        svc = ExportService()
        styles = svc._binding_styles(None)

        assert "body" in styles
        assert styles["body"]["fontFamily"] == "SimSun"
        assert styles["body"]["fontSizePt"] == 16

    def test_binding_styles_handles_partial_config(self):
        """部分配置应正确合并"""
        partial_binding = {
            "templateId": "test",
            "appliedAt": "2026-05-02T00:00:00Z",
            "configSnapshot": {
                "styles": {
                    "body": {"fontFamily": "SimHei", "fontSizePt": 18}
                },
                "layout": {},
            }
        }
        svc = ExportService()
        styles = svc._binding_styles(partial_binding)

        assert styles["body"]["fontFamily"] == "SimHei"
        assert styles["body"]["fontSizePt"] == 18
        # 其他样式应有默认值
        assert "heading_1" in styles


class TestBindingLayout:
    """TemplateBinding 布局提取测试"""

    def test_binding_layout_extracts_from_snapshot(
        self, sample_template_binding: dict[str, Any]
    ):
        """Layout 应从 snapshot 正确提取"""
        svc = ExportService()
        layout = svc._binding_layout(sample_template_binding)

        assert layout["paperSize"] == "A4"
        assert layout["marginTopMm"] == 37
        assert layout["marginBottomMm"] == 35
        assert layout["marginLeftMm"] == 28
        assert layout["marginRightMm"] == 26

    def test_binding_layout_fallback_to_default(self):
        """无 layout 时应返回默认值"""
        svc = ExportService()
        layout = svc._binding_layout(None)

        assert layout["paperSize"] == "A4"
        assert layout["marginTopMm"] == 25
        assert layout["marginBottomMm"] == 25

    def test_binding_layout_partial_config(self):
        """部分布局配置应正确填充"""
        partial_binding = {
            "templateId": "test",
            "appliedAt": "2026-05-02T00:00:00Z",
            "configSnapshot": {
                "styles": {},
                "layout": {"paperSize": "B5", "marginTopMm": 30}
            }
        }
        svc = ExportService()
        layout = svc._binding_layout(partial_binding)

        assert layout["paperSize"] == "B5"
        assert layout["marginTopMm"] == 30
        # 其他字段应有默认值
        assert layout["marginBottomMm"] > 0


class TestPageSize:
    """页面尺寸测试"""

    def test_resolve_page_size_a4(self):
        """A4 尺寸应为 (210, 297)"""
        svc = ExportService()
        result = svc._resolve_page_size("A4", None)
        assert result == (210, 297)

    def test_resolve_page_size_b5(self):
        """B5 尺寸应为 (176, 250)"""
        svc = ExportService()
        result = svc._resolve_page_size("B5", None)
        assert result == (176, 250)

    def test_resolve_page_size_16k(self):
        """16K 尺寸应为 (184, 260)"""
        svc = ExportService()
        result = svc._resolve_page_size("16K", None)
        assert result == (184, 260)

    def test_resolve_page_size_letter(self):
        """Letter 尺寸应为 (216, 279)"""
        svc = ExportService()
        result = svc._resolve_page_size("Letter", None)
        assert result == (216, 279)

    def test_resolve_page_size_custom(self):
        """自定义尺寸应正确解析"""
        svc = ExportService()
        result = svc._resolve_page_size("Custom", (300, 400))
        assert result == (300, 400)

    def test_resolve_page_size_unknown_with_fallback(self):
        """未知尺寸有 fallback 时使用 fallback"""
        svc = ExportService()
        result = svc._resolve_page_size("Unknown", (100, 200))
        assert result == (100, 200)

    def test_resolve_page_size_unknown_without_fallback(self):
        """未知尺寸无 fallback 时返回 A4"""
        svc = ExportService()
        result = svc._resolve_page_size("Unknown", None)
        assert result == (210, 297)


class TestStyleGeneration:
    """样式生成测试"""

    def test_generate_docx_styles_basic(
        self, sample_styles: dict[str, Any]
    ):
        """基础样式生成测试"""
        svc = ExportService()
        styles = svc._generate_docx_styles(sample_styles)

        assert isinstance(styles, dict)
        assert "body" in styles
        assert "heading_1" in styles

    def test_generate_docx_styles_with_font(
        self, sample_styles: dict[str, Any]
    ):
        """样式应包含字体信息"""
        svc = ExportService()
        styles = svc._generate_docx_styles(sample_styles)

        body_style = styles["body"]
        assert body_style.font.name == "FangSong_GB2312"
        assert body_style.font.size.pt == 16

    def test_generate_docx_styles_with_alignment(
        self, sample_styles: dict[str, Any]
    ):
        """样式应包含对齐方式"""
        svc = ExportService()
        styles = svc._generate_docx_styles(sample_styles)

        # body 应该是两端对齐
        assert styles["body"].paragraph_format.alignment is not None


class TestMarkdownValidation:
    """Markdown 内容验证测试"""

    def test_validate_markdown_empty(self):
        """空内容应返回错误"""
        svc = ExportService()
        is_valid, error = svc._validate_markdown("")
        assert is_valid is False
        assert error is not None

    def test_validate_markdown_valid(self, sample_markdown: str):
        """有效内容应通过验证"""
        svc = ExportService()
        is_valid, error = svc._validate_markdown(sample_markdown)
        assert is_valid is True
        assert error is None

    def test_validate_markdown_too_long(self):
        """超长内容应返回错误"""
        svc = ExportService()
        long_content = "# Title\n\n" + "x" * 100000
        is_valid, error = svc._validate_markdown(long_content)
        assert is_valid is False
        assert "超长" in error


class TestContentLength:
    """内容长度限制测试"""

    def test_content_length_limit(self):
        """内容长度限制应为 50000"""
        svc = ExportService()
        assert svc.CONTENT_MAX_LENGTH == 50000

    def test_content_within_limit(self, sample_markdown: str):
        """正常长度内容应通过"""
        svc = ExportService()
        assert len(sample_markdown) < svc.CONTENT_MAX_LENGTH
        is_valid, _ = svc._validate_markdown(sample_markdown)
        assert is_valid is True
