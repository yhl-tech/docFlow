"""
样式绑定提取模块

从 template_binding 中提取各类样式配置：
- styles: 文档样式（标题、正文等）
- layout: 页面布局
- headingStyles: 标题样式
- paragraphStyles: 段落样式
- listStyles: 列表样式
- codeBlockStyles: 代码块样式
- tableStyles: 表格样式
- imageStyles: 图片样式
"""

from typing import Any, Optional

from app.core.logging import get_logger

_log = get_logger(__name__)


class StyleBindings:
    """样式绑定提取器"""

    # 默认字体映射表
    FONT_ID_TO_NAME: dict[str, str] = {
        # 仿宋系
        "FangSong_GB2312": "仿宋_GB2312",
        "FangSong": "仿宋",
        "STFangsong": "华文仿宋",
        # 黑体系
        "SimHei": "黑体",
        "HuaWenHeiTi": "华文黑体",
        "Microsoft YaHei": "微软雅黑",
        "DengXian": "等线",
        # 楷体系
        "KaiTi_GB2312": "楷体_GB2312",
        "KaiTi": "楷体",
        "STKaiti": "华文楷体",
        # 宋体系
        "FZXiaoBiaoSong": "方正小标宋",
        "SimSun": "宋体",
        "NSimSun": "新宋体",
        "STSong": "华文宋体",
        "STZhongsong": "华文中宋",
    }

    # Word 样式 ID 映射
    WORD_STYLE_ID_MAP: dict[str, str] = {
        "Heading1": "Heading 1",
        "Heading2": "Heading 2",
        "Heading3": "Heading 3",
        "Heading4": "Heading 4",
        "Heading5": "Heading 5",
        "Heading6": "Heading 6",
        "Title": "Title",
        "Subtitle": "Subtitle",
    }

    @staticmethod
    def get_styles(template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        """获取文档样式配置"""
        if not template_binding:
            return {}
        snapshot = template_binding.get("configSnapshot") or {}
        return snapshot.get("styles") or {}

    @staticmethod
    def get_layout(template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        """获取页面布局配置"""
        if not template_binding:
            return {}
        snapshot = template_binding.get("configSnapshot") or {}
        return snapshot.get("layout") or {}

    @staticmethod
    def get_list_styles(template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        """获取列表样式配置"""
        if not template_binding:
            return {}
        snapshot = template_binding.get("configSnapshot") or {}
        return snapshot.get("listStyles") or {}

    @staticmethod
    def get_codeblock_styles(template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        """获取代码块样式配置"""
        if not template_binding:
            return {}
        snapshot = template_binding.get("configSnapshot") or {}
        return snapshot.get("codeBlockStyles") or {}

    @staticmethod
    def get_table_styles(template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        """获取表格样式配置"""
        if not template_binding:
            return {}
        snapshot = template_binding.get("configSnapshot") or {}
        return snapshot.get("tableStyles") or {}

    @staticmethod
    def get_image_styles(template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        """获取图片样式配置"""
        if not template_binding:
            return {}
        snapshot = template_binding.get("configSnapshot") or {}
        return snapshot.get("imageStyles") or {}

    @staticmethod
    def get_heading_styles(template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        """获取标题样式配置"""
        if not template_binding:
            return {}
        snapshot = template_binding.get("configSnapshot") or {}
        return snapshot.get("headingStyles") or {}

    @staticmethod
    def get_paragraph_styles(template_binding: Optional[dict[str, Any]]) -> dict[str, Any]:
        """获取段落样式配置"""
        if not template_binding:
            return {}
        snapshot = template_binding.get("configSnapshot") or {}
        return snapshot.get("paragraphStyles") or {}

    @staticmethod
    def font_display_name(font_id: str | None, fallback: str = "微软雅黑") -> str:
        """将字体 ID 转换为显示名称"""
        if not font_id:
            return fallback
        return StyleBindings.FONT_ID_TO_NAME.get(font_id, font_id)

    @staticmethod
    def get_page_size(page_size: str, template_binding: Optional[dict[str, Any]]) -> str:
        """解析页面尺寸，优先级：参数 > 配置 > 默认 A4"""
        if page_size and page_size != "default":
            return page_size

        layout = StyleBindings.get_layout(template_binding)
        configured_size = layout.get("paperSize")
        if configured_size:
            return configured_size

        return "A4"

    @staticmethod
    def get_template_id(
        template: str,
        template_binding: Optional[dict[str, Any]],
    ) -> str:
        """获取模板 ID"""
        if template and template != "default":
            return template

        if template_binding:
            bound_id = template_binding.get("templateId")
            if bound_id:
                return bound_id

        return "default"
