import json
import os
import re
import tempfile
import uuid
from pathlib import Path
from typing import Any, List, Optional

import httpx
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, delete

from app.core.dependencies import CurrentUser, DB, OptionalUser
from app.models.document import Document
from app.models.document_template import DocumentTemplate
from app.services.export_service import PandocNotAvailableError, export_service

router = APIRouter()

# 图片上传目录（相对于项目根目录）
UPLOAD_DIR = Path(__file__).parent.parent.parent / "assets" / "uploads" / "images"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class RenderLatexRequest(BaseModel):
    latex: str
    display_mode: bool = False


class ValidateLatexRequest(BaseModel):
    latex: str


class TemplateInfo(BaseModel):
    id: str
    name: str
    description: str
    thumbnail: Optional[str] = None


class FontInfo(BaseModel):
    id: str
    name: str


class TemplateDefinition(BaseModel):
    id: str
    kind: str
    source: str
    name: str
    description: str = ""
    basedOnTemplateId: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    capabilities: dict[str, Any] = Field(default_factory=dict)
    schema: dict[str, Any] = Field(default_factory=dict)
    config: dict[str, Any] = Field(default_factory=dict)
    constraints: Optional[dict[str, Any]] = None
    exportProfile: Optional[dict[str, Any]] = None
    ownerUserId: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class ApplyTemplateRequest(BaseModel):
    template: str
    content: str


class SaveDocumentRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    content: str
    title: Optional[str] = None
    template: Optional[str] = None
    template_binding: Optional[dict[str, Any]] = Field(default=None, alias="templateBinding")


class DocumentMeta(BaseModel):
    id: str
    title: str
    createdAt: str
    updatedAt: str
    wordCount: int


class SaveDocumentResponse(BaseModel):
    id: str
    savedAt: str
    wordCount: int


class ValidateTemplateRequest(BaseModel):
    template: TemplateDefinition


class UpdateTemplateBindingRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    template_binding: dict[str, Any] = Field(alias="templateBinding")


class GenerateTocRequest(BaseModel):
    content: str


# ── 模板配置 ──────────────────────────────────────────────────────────────────

AVAILABLE_FONTS: List[FontInfo] = [
    # ── 仿宋系 ──
    FontInfo(id="FangSong_GB2312",  name="仿宋_GB2312"),
    FontInfo(id="FangSong",         name="仿宋"),
    FontInfo(id="STFangsong",       name="华文仿宋"),
    # ── 黑体系 ──
    FontInfo(id="SimHei",           name="黑体"),
    FontInfo(id="HuaWenHeiTi",      name="华文黑体"),
    FontInfo(id="Microsoft YaHei",  name="微软雅黑"),
    FontInfo(id="DengXian",         name="等线"),
    # ── 楷体系 ──
    FontInfo(id="KaiTi_GB2312",     name="楷体_GB2312"),
    FontInfo(id="KaiTi",            name="楷体"),
    FontInfo(id="STKaiti",          name="华文楷体"),
    # ── 宋体系 ──
    FontInfo(id="FZXiaoBiaoSong",   name="方正小标宋"),
    FontInfo(id="SimSun",           name="宋体"),
    FontInfo(id="NSimSun",          name="新宋体"),
    FontInfo(id="STSong",           name="华文宋体"),
    FontInfo(id="STZhongsong",      name="华文中宋"),
]


def _build_form_schema(style_keys: List[str], include_rules: bool = True) -> dict[str, Any]:
    return {
        "sections": [
            {
                "key": "styles",
                "title": "字体字号设置",
                "styleKeys": style_keys,
            },
            {
                "key": "layout",
                "title": "布局设置",
                "fields": [
                    "paperSize",
                    "marginTopMm",
                    "marginBottomMm",
                    "marginLeftMm",
                    "marginRightMm",
                    "defaultLineHeight",
                    "defaultParagraphSpacingBeforePt",
                    "defaultParagraphSpacingAfterPt",
                    "defaultFirstLineIndentChars",
                ],
            },
            {
                "key": "rules",
                "title": "文档规则",
                "fields": ["datePlacement", "signaturePlacement", "pageNumber"],
                "hidden": not include_rules,
            },
        ]
    }


def _base_capabilities(style_keys: List[str]) -> dict[str, Any]:
    return {
        "editableStyleSlots": style_keys,
        "editableLayoutFields": [
            "paperSize",
            "marginTopMm",
            "marginBottomMm",
            "marginLeftMm",
            "marginRightMm",
            "defaultLineHeight",
            "defaultParagraphSpacingBeforePt",
            "defaultParagraphSpacingAfterPt",
            "defaultFirstLineIndentChars",
            "pageNumber",
        ],
        "supportsHeaderFooter": False,
        "supportsPageNumber": True,
        "supportsCoverPage": False,
        "supportsWatermark": False,
        "supportsExportDocx": True,
        "supportsExportPdf": True,
    }


def _builtin_templates() -> List[TemplateDefinition]:
    gov_style_keys = [
        "document_title",
        "document_subtitle",
        "body",
        "heading_1",
        "heading_2",
        "heading_3",
        "heading_4",
        "heading_5",
        "date",
    ]
    gov_config = {
        "styles": {
            "document_title":    {"label": "标题",    "role": "document_title",    "fontFamily": "HuaWenHeiTi",    "fontSizePt": 22, "bold": True,  "align": "center"},
            "document_subtitle": {"label": "副标题",  "role": "document_subtitle", "fontFamily": "KaiTi_GB2312",   "fontSizePt": 16, "bold": False, "align": "center"},
            "body":              {"label": "正文",    "role": "body",              "fontFamily": "FangSong_GB2312", "fontSizePt": 16, "bold": False, "align": "justify", "lineHeight": 1.5, "firstLineIndentChars": 2},
            "heading_1":         {"label": "一级标题", "role": "heading_1",         "fontFamily": "SimHei",          "fontSizePt": 16, "bold": True,  "align": "left"},
            "heading_2":         {"label": "二级标题", "role": "heading_2",         "fontFamily": "KaiTi_GB2312",   "fontSizePt": 16, "bold": True,  "align": "left"},
            "heading_3":         {"label": "三级标题", "role": "heading_3",         "fontFamily": "FangSong_GB2312", "fontSizePt": 16, "bold": True,  "align": "left"},
            "heading_4":         {"label": "四级标题", "role": "heading_4",         "fontFamily": "FangSong_GB2312", "fontSizePt": 16, "bold": True,  "align": "left"},
            "heading_5":         {"label": "五级标题", "role": "heading_5",         "fontFamily": "FangSong_GB2312", "fontSizePt": 16, "bold": True,  "align": "left"},
            "date":              {"label": "日期",    "role": "date",              "fontFamily": "FangSong_GB2312", "fontSizePt": 16, "bold": False, "align": "right"},
            "page_number":       {"label": "页码",    "role": "page_number",       "fontFamily": "SimSun",          "fontSizePt": 12, "bold": False, "align": "right"},
        },
        "layout": {
            "paperSize": "A4",
            "marginTopMm": 37,
            "marginBottomMm": 35,
            "marginLeftMm": 28,
            "marginRightMm": 26,
            "defaultLineHeight": 1.5,
            "defaultParagraphSpacingBeforePt": 0,
            "defaultParagraphSpacingAfterPt": 0,
            "defaultFirstLineIndentChars": 2,
            "pageNumber": {"enabled": True, "position": "bottom", "align": "right"},
        },
        "documentRules": {"datePlacement": "body_end_right", "signaturePlacement": "none"},
    }
    report_style_keys = ["document_title", "body", "heading_1", "heading_2", "caption"]
    report_config = {
        "styles": {
            "document_title": {"label": "标题", "role": "document_title", "fontFamily": "SimHei", "fontSizePt": 20, "bold": True, "align": "center"},
            "body": {"label": "正文", "role": "body", "fontFamily": "SimSun", "fontSizePt": 14, "bold": False, "align": "justify", "lineHeight": 1.75, "firstLineIndentChars": 2},
            "heading_1": {"label": "一级标题", "role": "heading_1", "fontFamily": "SimHei", "fontSizePt": 16, "bold": True, "align": "left"},
            "heading_2": {"label": "二级标题", "role": "heading_2", "fontFamily": "Microsoft YaHei", "fontSizePt": 14, "bold": True, "align": "left"},
            "caption": {"label": "图表说明", "role": "caption", "fontFamily": "SimSun", "fontSizePt": 12, "bold": False, "align": "center"},
            "page_number": {"label": "页码", "role": "page_number", "fontFamily": "SimSun", "fontSizePt": 12, "bold": False, "align": "center"},
        },
        "layout": {
            "paperSize": "A4",
            "marginTopMm": 25,
            "marginBottomMm": 25,
            "marginLeftMm": 25,
            "marginRightMm": 25,
            "defaultLineHeight": 1.75,
            "defaultParagraphSpacingBeforePt": 0,
            "defaultParagraphSpacingAfterPt": 6,
            "defaultFirstLineIndentChars": 2,
            "pageNumber": {"enabled": True, "position": "bottom", "align": "center"},
        },
        "documentRules": {"datePlacement": "title_below", "signaturePlacement": "body_end_right"},
    }
    lesson_plan_style_keys = [
        "document_title",
        "subject_info",
        "body",
        "heading_1",
        "heading_2",
        "heading_3",
        "heading_4",
        "heading_5",
        "date",
    ]
    lesson_plan_config = {
        "styles": {
            "document_title": {"label": "课题标题", "role": "document_title",    "fontFamily": "HuaWenHeiTi",    "fontSizePt": 22, "bold": True,  "align": "center"},
            "subject_info":   {"label": "副标题",   "role": "document_subtitle", "fontFamily": "KaiTi_GB2312",   "fontSizePt": 16, "bold": False, "align": "left"},
            "body":           {"label": "正文",     "role": "body",              "fontFamily": "FangSong_GB2312", "fontSizePt": 16, "bold": False, "align": "justify", "lineHeight": 1.5, "firstLineIndentChars": 2},
            "heading_1":      {"label": "一级标题", "role": "heading_1",         "fontFamily": "SimHei",          "fontSizePt": 16, "bold": True,  "align": "left"},
            "heading_2":      {"label": "二级标题", "role": "heading_2",         "fontFamily": "KaiTi_GB2312",   "fontSizePt": 16, "bold": True,  "align": "left"},
            "heading_3":      {"label": "三级标题", "role": "heading_3",         "fontFamily": "FangSong_GB2312", "fontSizePt": 16, "bold": True,  "align": "left"},
            "heading_4":      {"label": "四级标题", "role": "heading_4",         "fontFamily": "FangSong_GB2312", "fontSizePt": 16, "bold": True,  "align": "left"},
            "heading_5":      {"label": "五级标题", "role": "heading_5",         "fontFamily": "FangSong_GB2312", "fontSizePt": 16, "bold": True,  "align": "left"},
            "date":           {"label": "日期",     "role": "date",              "fontFamily": "FangSong_GB2312", "fontSizePt": 16, "bold": False, "align": "right"},
            "page_number":    {"label": "页码",     "role": "page_number",       "fontFamily": "SimSun",          "fontSizePt": 12, "bold": False, "align": "right"},
        },
        "layout": {
            "paperSize": "A4",
            "marginTopMm": 20,
            "marginBottomMm": 20,
            "marginLeftMm": 25,
            "marginRightMm": 20,
            "defaultLineHeight": 1.5,
            "defaultParagraphSpacingBeforePt": 0,
            "defaultParagraphSpacingAfterPt": 0,
            "defaultFirstLineIndentChars": 2,
            "pageNumber": {"enabled": True, "position": "bottom", "align": "right"},
        },
        "documentRules": {"datePlacement": "none", "signaturePlacement": "none"},
    }

    notice_style_keys = ["document_title", "body", "heading_1", "date", "signature"]
    notice_config = {
        "styles": {
            "document_title": {"label": "标题", "role": "document_title", "fontFamily": "SimHei", "fontSizePt": 20, "bold": True, "align": "center"},
            "body": {"label": "正文", "role": "body", "fontFamily": "FangSong_GB2312", "fontSizePt": 15, "bold": False, "align": "justify", "lineHeight": 1.6, "firstLineIndentChars": 2},
            "heading_1": {"label": "一级标题", "role": "heading_1", "fontFamily": "SimHei", "fontSizePt": 15, "bold": True, "align": "left"},
            "date": {"label": "日期", "role": "date", "fontFamily": "FangSong_GB2312", "fontSizePt": 14, "bold": False, "align": "right"},
            "signature": {"label": "落款", "role": "signature", "fontFamily": "FangSong_GB2312", "fontSizePt": 14, "bold": False, "align": "right"},
            "page_number": {"label": "页码", "role": "page_number", "fontFamily": "SimSun", "fontSizePt": 12, "bold": False, "align": "center"},
        },
        "layout": {
            "paperSize": "A4",
            "marginTopMm": 30,
            "marginBottomMm": 25,
            "marginLeftMm": 28,
            "marginRightMm": 26,
            "defaultLineHeight": 1.6,
            "defaultParagraphSpacingBeforePt": 0,
            "defaultParagraphSpacingAfterPt": 4,
            "defaultFirstLineIndentChars": 2,
            "pageNumber": {"enabled": True, "position": "bottom", "align": "center"},
        },
        "documentRules": {"datePlacement": "body_end_right", "signaturePlacement": "body_end_right"},
    }
    templates = [
        TemplateDefinition(
            id="general_lesson_plan",
            kind="lesson_plan",
            source="builtin",
            name="通用教案",
            description="适用于中小学及高校课堂教案，符合国内通用排版规范",
            tags=["教案"],
            capabilities=_base_capabilities(lesson_plan_style_keys),
            schema={
                "blockMappings": {
                    "document_title": "document_title",
                    "document_subtitle": "subject_info",
                    "paragraph": "body",
                    "heading_1": "heading_1",
                    "heading_2": "heading_2",
                    "heading_3": "heading_3",
                    "heading_4": "heading_4",
                    "heading_5": "heading_5",
                    "date": "date",
                },
                "formSchema": _build_form_schema(lesson_plan_style_keys),
            },
            config=lesson_plan_config,
            constraints={
                "allowedFonts": [font.id for font in AVAILABLE_FONTS],
                "fontSizeRangePt": {"min": 8, "max": 72},
                "marginRangeMm": {"min": 10, "max": 50},
            },
            exportProfile={"docxStrategy": "postprocess", "pdfStrategy": "css"},
        ),
        TemplateDefinition(
            id="gov_doc_gbt9704",
            kind="gov_doc",
            source="builtin",
            name="国标公文（GB/T 9704）",
            description="适用于备案、申报、通知等正式公文场景",
            tags=["公文", "国标"],
            capabilities=_base_capabilities(gov_style_keys),
            schema={
                "blockMappings": {
                    "document_title": "document_title",
                    "document_subtitle": "document_subtitle",
                    "paragraph": "body",
                    "heading_1": "heading_1",
                    "heading_2": "heading_2",
                    "heading_3": "heading_3",
                    "heading_4": "heading_4",
                    "heading_5": "heading_5",
                    "date": "date",
                },
                "formSchema": _build_form_schema(gov_style_keys),
            },
            config=gov_config,
            constraints={
                "allowedFonts": [font.id for font in AVAILABLE_FONTS],
                "fontSizeRangePt": {"min": 8, "max": 72},
                "marginRangeMm": {"min": 10, "max": 50},
            },
            exportProfile={"docxStrategy": "postprocess", "pdfStrategy": "css"},
        ),
        TemplateDefinition(
            id="general_report",
            kind="report",
            source="builtin",
            name="通用报告",
            description="适用于教研报告、工作总结等场景",
            tags=["报告"],
            capabilities=_base_capabilities(report_style_keys),
            schema={
                "blockMappings": {
                    "document_title": "document_title",
                    "paragraph": "body",
                    "heading_1": "heading_1",
                    "heading_2": "heading_2",
                    "image_caption": "caption",
                    "table": "caption",
                },
                "formSchema": _build_form_schema(report_style_keys),
            },
            config=report_config,
            constraints={
                "allowedFonts": [font.id for font in AVAILABLE_FONTS],
                "fontSizeRangePt": {"min": 8, "max": 72},
                "marginRangeMm": {"min": 10, "max": 50},
            },
            exportProfile={"docxStrategy": "postprocess", "pdfStrategy": "css"},
        ),
        TemplateDefinition(
            id="general_notice",
            kind="notice",
            source="builtin",
            name="通用通知",
            description="适用于校内活动、会议、公告等通知场景",
            tags=["通知"],
            capabilities=_base_capabilities(notice_style_keys),
            schema={
                "blockMappings": {
                    "document_title": "document_title",
                    "paragraph": "body",
                    "heading_1": "heading_1",
                    "date": "date",
                    "signature": "signature",
                },
                "formSchema": _build_form_schema(notice_style_keys),
            },
            config=notice_config,
            constraints={
                "allowedFonts": [font.id for font in AVAILABLE_FONTS],
                "fontSizeRangePt": {"min": 8, "max": 72},
                "marginRangeMm": {"min": 10, "max": 50},
            },
            exportProfile={"docxStrategy": "postprocess", "pdfStrategy": "css"},
        ),
    ]
    return templates


# ── 辅助函数 ──────────────────────────────────────────────────────────────────

def _count_words(content: str) -> int:
    """统计字数：中文按字计，英文按词计"""
    chinese = len(re.findall(r'[\u4e00-\u9fff]', content))
    english = len(re.findall(r'\b[a-zA-Z]+\b', content))
    return chinese + english


def _ensure_upload_dir() -> Path:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOAD_DIR


def _validate_latex_syntax(latex: str) -> tuple[bool, Optional[str]]:
    """基础 LaTeX 语法检查（括号匹配、常见命令）"""
    # 检查花括号配对
    depth = 0
    for ch in latex:
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
        if depth < 0:
            return False, "花括号不匹配：多余的 '}'"
    if depth != 0:
        return False, f"花括号不匹配：缺少 {depth} 个 '}}'"

    # 检查 \begin{...} / \end{...} 配对
    begins = re.findall(r'\\begin\{([^}]+)\}', latex)
    ends   = re.findall(r'\\end\{([^}]+)\}',   latex)
    if begins != ends:
        return False, "\\begin{...} 与 \\end{...} 环境不匹配"

    # 检查孤立的 & 或 \\ （应在 tabular/align 等环境中）
    # 简单通过：不报错，仅做上面两项检查
    return True, None


def _json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def _json_loads(value: Optional[str], fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def _serialize_template_row(row: DocumentTemplate) -> TemplateDefinition:
    return TemplateDefinition(
        id=row.id,
        kind=row.kind,
        source=row.source,
        name=row.name,
        description=row.description or "",
        basedOnTemplateId=row.based_on_template_id,
        capabilities=_json_loads(row.capabilities_json, {}),
        schema=_json_loads(row.schema_json, {}),
        config=_json_loads(row.config_json, {}),
        constraints=_json_loads(row.constraints_json, None),
        exportProfile=_json_loads(row.export_profile_json, None),
        ownerUserId=row.owner_user_id,
        createdAt=row.created_at.isoformat() if row.created_at else None,
        updatedAt=row.updated_at.isoformat() if row.updated_at else None,
    )


def _ensure_template_valid(template: TemplateDefinition, require_id: bool = True) -> list[str]:
    errors: list[str] = []
    if require_id and not template.id:
        errors.append("模板 id 不能为空")
    if not template.name.strip():
        errors.append("模板名称不能为空")
    if not template.kind.strip():
        errors.append("模板类型不能为空")
    styles = template.config.get("styles", {})
    if not styles:
        errors.append("至少需要一个样式槽位")
    block_mappings = template.schema.get("blockMappings", {})
    for _, slot_key in block_mappings.items():
        if slot_key not in styles:
            errors.append(f"blockMappings 引用了不存在的样式槽位: {slot_key}")
    constraints = template.constraints or {}
    allowed_fonts = set(constraints.get("allowedFonts", []))
    if allowed_fonts:
        for style in styles.values():
            font_family = style.get("fontFamily")
            if font_family and font_family not in allowed_fonts:
                errors.append(f"字体 {font_family} 不在允许列表内")
    return errors


# ── 图片上传 ──────────────────────────────────────────────────────────────────

@router.post("/upload-image", summary="上传图片")
async def upload_image(
    image: Optional[UploadFile] = File(None),
    url: Optional[str] = None,
):
    """
    支持两种方式：
    - multipart/form-data：直接上传文件（字段名 `image`）
    - JSON body：传入 `url` 字段，服务端抓取后存储
    """
    upload_dir = _ensure_upload_dir()

    # —— 文件上传 ——
    if image is not None:
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail={"error": "不支持的图片格式", "code": "INVALID_IMAGE_TYPE"})

        data = await image.read()
        if len(data) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail={"error": "图片文件过大（最大 10MB）", "code": "IMAGE_TOO_LARGE"})

        suffix = Path(image.filename or "image.png").suffix or ".png"
        filename = f"{uuid.uuid4().hex}{suffix}"
        dest = upload_dir / filename
        dest.write_bytes(data)

        return {"url": f"/assets/uploads/images/{filename}"}

    # —— URL 抓取 ——
    if url:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url, follow_redirects=True)
                resp.raise_for_status()
        except Exception as e:
            raise HTTPException(status_code=400, detail={"error": f"无法获取远程图片：{e}", "code": "FETCH_FAILED"})

        content_type = resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()
        if content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail={"error": "远程 URL 不是有效图片", "code": "INVALID_IMAGE_TYPE"})

        ext_map = {
            "image/jpeg": ".jpg", "image/png": ".png",
            "image/gif": ".gif",  "image/webp": ".webp", "image/svg+xml": ".svg",
        }
        suffix = ext_map.get(content_type, ".jpg")
        filename = f"{uuid.uuid4().hex}{suffix}"
        dest = upload_dir / filename
        dest.write_bytes(resp.content)

        return {"url": f"/assets/uploads/images/{filename}"}

    raise HTTPException(status_code=400, detail={"error": "请提供图片文件或 URL", "code": "MISSING_IMAGE"})


# ── LaTeX ─────────────────────────────────────────────────────────────────────

@router.post("/render-latex", summary="渲染 LaTeX 公式")
async def render_latex(body: RenderLatexRequest):
    """
    服务端 LaTeX 渲染（前端已有 KaTeX 客户端渲染，此接口供备用）。
    当前直接返回原始 LaTeX 包装成行内/行间标记，供前端 KaTeX 二次渲染。
    """
    if body.display_mode:
        html = f'<span class="math-display">$${body.latex}$$</span>'
    else:
        html = f'<span class="math-inline">${body.latex}$</span>'
    return {"html": html}


@router.post("/validate-latex", summary="验证 LaTeX 公式")
async def validate_latex(body: ValidateLatexRequest):
    valid, error = _validate_latex_syntax(body.latex)
    if valid:
        return {"valid": True}
    return {"valid": False, "error": error}


# ── 模板 ──────────────────────────────────────────────────────────────────────

def _find_builtin_template(template_id: str) -> Optional[TemplateDefinition]:
    for template in _builtin_templates():
        if template.id == template_id:
            return template
    return None


@router.get("/templates", response_model=List[TemplateDefinition], summary="获取模板列表")
async def get_templates(
    current_user: OptionalUser,
    db: DB,
    kind: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
):
    builtin_templates = _builtin_templates()
    # 隐藏指定的内置模板（不在列表中返回）
    hidden_template_ids = {"gov_doc_gbt9704", "general_report", "general_notice"}
    builtin_templates = [t for t in builtin_templates if t.id not in hidden_template_ids]
    if kind:
        builtin_templates = [template for template in builtin_templates if template.kind == kind]
    if source:
        builtin_templates = [template for template in builtin_templates if template.source == source]
    if current_user is None:
        return builtin_templates

    query = (
        select(DocumentTemplate)
        .where(
            DocumentTemplate.is_active == True,
            DocumentTemplate.owner_user_id == current_user.id,
            DocumentTemplate.source == "user",
        )
        .order_by(DocumentTemplate.updated_at.desc())
    )
    if kind:
        query = query.where(DocumentTemplate.kind == kind)
    if source == "builtin":
        return builtin_templates
    if source:
        query = query.where(DocumentTemplate.source == source)

    result = await db.execute(query)
    user_templates = [
        _serialize_template_row(row)
        for row in result.scalars().all()
    ]
    return builtin_templates + user_templates


@router.get("/templates/{template_id}", response_model=TemplateDefinition, summary="获取模板详情")
async def get_template_detail(template_id: str, current_user: OptionalUser, db: DB):
    builtin_template = _find_builtin_template(template_id)
    if builtin_template:
        return builtin_template

    if current_user is None:
        raise HTTPException(status_code=404, detail={"error": "模板不存在", "code": "NOT_FOUND"})

    result = await db.execute(
        select(DocumentTemplate).where(
            DocumentTemplate.id == template_id,
            DocumentTemplate.owner_user_id == current_user.id,
            DocumentTemplate.is_active == True,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail={"error": "模板不存在", "code": "NOT_FOUND"})
    return _serialize_template_row(row)


@router.get("/fonts", response_model=List[FontInfo], summary="获取可用字体")
async def get_fonts():
    return AVAILABLE_FONTS


@router.post("/templates/validate", summary="校验模板配置")
async def validate_template(body: ValidateTemplateRequest):
    errors = _ensure_template_valid(body.template)
    return {"valid": len(errors) == 0, "errors": errors}


@router.post("/templates", response_model=TemplateDefinition, summary="创建自定义模板")
async def create_template(body: TemplateDefinition, current_user: CurrentUser, db: DB):
    template_id = body.id or str(uuid.uuid4())
    template = body.model_copy(update={"id": template_id, "source": "user", "ownerUserId": current_user.id})
    errors = _ensure_template_valid(template, require_id=False)
    if errors:
        raise HTTPException(status_code=400, detail={"error": "模板配置不合法", "code": "INVALID_TEMPLATE", "detail": errors})

    row = DocumentTemplate(
        id=template.id,
        source="user",
        kind=template.kind,
        name=template.name,
        description=template.description,
        based_on_template_id=template.basedOnTemplateId,
        capabilities_json=_json_dumps(template.capabilities),
        schema_json=_json_dumps(template.schema),
        config_json=_json_dumps(template.config),
        constraints_json=_json_dumps(template.constraints) if template.constraints is not None else None,
        export_profile_json=_json_dumps(template.exportProfile) if template.exportProfile is not None else None,
        owner_user_id=current_user.id,
    )
    db.add(row)
    await db.flush()
    await db.refresh(row)
    return _serialize_template_row(row)


@router.put("/templates/{template_id}", response_model=TemplateDefinition, summary="更新自定义模板")
async def update_template(template_id: str, body: TemplateDefinition, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(DocumentTemplate).where(
            DocumentTemplate.id == template_id,
            DocumentTemplate.owner_user_id == current_user.id,
            DocumentTemplate.source == "user",
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail={"error": "模板不存在", "code": "NOT_FOUND"})

    template = body.model_copy(update={"id": template_id, "source": "user", "ownerUserId": current_user.id})
    errors = _ensure_template_valid(template)
    if errors:
        raise HTTPException(status_code=400, detail={"error": "模板配置不合法", "code": "INVALID_TEMPLATE", "detail": errors})

    row.kind = template.kind
    row.name = template.name
    row.description = template.description
    row.based_on_template_id = template.basedOnTemplateId
    row.capabilities_json = _json_dumps(template.capabilities)
    row.schema_json = _json_dumps(template.schema)
    row.config_json = _json_dumps(template.config)
    row.constraints_json = _json_dumps(template.constraints) if template.constraints is not None else None
    row.export_profile_json = _json_dumps(template.exportProfile) if template.exportProfile is not None else None
    await db.flush()
    await db.refresh(row)
    return _serialize_template_row(row)


@router.post("/templates/{template_id}/duplicate", response_model=TemplateDefinition, summary="复制模板")
async def duplicate_template(template_id: str, current_user: CurrentUser, db: DB):
    async def _next_copy_name(base_name: str) -> str:
        result = await db.execute(
            select(DocumentTemplate.name).where(
                DocumentTemplate.owner_user_id == current_user.id,
                DocumentTemplate.source == "user",
                DocumentTemplate.is_active == True,
            )
        )
        existing_names = set(result.scalars().all())
        candidate = f"{base_name}（副本）"
        if candidate not in existing_names:
            return candidate
        index = 2
        while True:
            candidate = f"{base_name}（副本 {index}）"
            if candidate not in existing_names:
                return candidate
            index += 1

    builtin_template = _find_builtin_template(template_id)
    if builtin_template:
        source_template = builtin_template
        row = DocumentTemplate(
            source="user",
            kind=source_template.kind,
            name=await _next_copy_name(source_template.name),
            description=source_template.description,
            based_on_template_id=source_template.id,
            capabilities_json=_json_dumps(source_template.capabilities),
            schema_json=_json_dumps(source_template.schema),
            config_json=_json_dumps(source_template.config),
            constraints_json=_json_dumps(source_template.constraints) if source_template.constraints is not None else None,
            export_profile_json=_json_dumps(source_template.exportProfile) if source_template.exportProfile is not None else None,
            owner_user_id=current_user.id,
        )
        db.add(row)
        await db.flush()
        await db.refresh(row)
        return _serialize_template_row(row)

    result = await db.execute(
        select(DocumentTemplate).where(
            DocumentTemplate.id == template_id,
            DocumentTemplate.owner_user_id == current_user.id,
            DocumentTemplate.source == "user",
        )
    )
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail={"error": "模板不存在", "code": "NOT_FOUND"})

    copy_row = DocumentTemplate(
        source="user",
        kind=original.kind,
        name=await _next_copy_name(original.name),
        description=original.description,
        based_on_template_id=template_id,
        capabilities_json=original.capabilities_json,
        schema_json=original.schema_json,
        config_json=original.config_json,
        constraints_json=original.constraints_json,
        export_profile_json=original.export_profile_json,
        owner_user_id=current_user.id,
    )
    db.add(copy_row)
    await db.flush()
    await db.refresh(copy_row)
    return _serialize_template_row(copy_row)


@router.delete("/templates/{template_id}", summary="删除自定义模板")
async def delete_template(template_id: str, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(DocumentTemplate).where(
            DocumentTemplate.id == template_id,
            DocumentTemplate.owner_user_id == current_user.id,
            DocumentTemplate.source == "user",
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail={"error": "模板不存在", "code": "NOT_FOUND"})
    await db.delete(row)
    return {"ok": True}


@router.post("/apply-template", summary="应用模板")
async def apply_template(body: ApplyTemplateRequest):
    """
    在 HTML 内容外层包裹模板 CSS 类，供导出渲染器使用。
    内容本身不修改，仅添加 data-template 标记。
    """
    wrapped = f'<div class="template-surface" data-template="{body.template}">{body.content}</div>'
    return {"content": wrapped}


# ── 文档 CRUD ─────────────────────────────────────────────────────────────────

@router.post("/save", response_model=SaveDocumentResponse, summary="保存文档")
async def save_document(body: SaveDocumentRequest, current_user: CurrentUser, db: DB):
    word_count = _count_words(body.content)
    title = (body.title or "未命名文档").strip() or "未命名文档"
    template = body.template or "default"

    doc = Document(
        user_id=current_user.id,
        title=title,
        content=body.content,
        template=template,
        template_binding_json=_json_dumps(body.template_binding) if body.template_binding else "",
        word_count=word_count,
    )
    db.add(doc)
    await db.flush()  # 获取 id & timestamps（commit 由 get_db 上下文完成）

    return SaveDocumentResponse(
        id=doc.id,
        savedAt=doc.updated_at.isoformat(),
        wordCount=word_count,
    )


@router.get("/documents", response_model=List[DocumentMeta], summary="文档列表")
async def list_documents(current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.updated_at.desc())
    )
    docs = result.scalars().all()
    return [
        DocumentMeta(
            id=d.id,
            title=d.title,
            createdAt=d.created_at.isoformat(),
            updatedAt=d.updated_at.isoformat(),
            wordCount=d.word_count,
        )
        for d in docs
    ]


@router.get("/document/{doc_id}", summary="获取文档")
async def get_document(doc_id: str, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail={"error": "文档不存在", "code": "NOT_FOUND"})

    return {
        "content": doc.content,
        "templateBinding": _json_loads(doc.template_binding_json, None),
        "meta": DocumentMeta(
            id=doc.id,
            title=doc.title,
            createdAt=doc.created_at.isoformat(),
            updatedAt=doc.updated_at.isoformat(),
            wordCount=doc.word_count,
        ),
    }


@router.put("/document/{doc_id}/template-binding", summary="更新文档模板快照")
async def update_document_template_binding(
    doc_id: str,
    body: UpdateTemplateBindingRequest,
    current_user: CurrentUser,
    db: DB,
):
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail={"error": "文档不存在", "code": "NOT_FOUND"})
    doc.template_binding_json = _json_dumps(body.template_binding)
    doc.template = body.template_binding.get("templateId") or doc.template
    await db.flush()
    return {"ok": True}


@router.delete("/document/{doc_id}", summary="删除文档")
async def delete_document(doc_id: str, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail={"error": "文档不存在", "code": "NOT_FOUND"})
    await db.delete(doc)
    return JSONResponse(status_code=200, content={"ok": True})


# ── 目录生成 ──────────────────────────────────────────────────────────────────

@router.post("/generate-toc", summary="生成目录")
async def generate_toc(body: GenerateTocRequest):
    toc = []
    for line in body.content.splitlines():
        match = re.match(r"^(#{1,6})\s+(.+)", line)
        if match:
            level = len(match.group(1))
            text = match.group(2).strip()
            anchor = re.sub(r"[^\w\u4e00-\u9fff-]", "", text.lower().replace(" ", "-"))
            toc.append({"level": level, "text": text, "anchor": anchor})
    return toc


# ── Word 文档解析 ──────────────────────────────────────────────────────────

@router.post("/parse-docx-html", summary="解析 Word 文档（保留样式）")
async def parse_docx_html(file: UploadFile = File(...)):
    """
    解析 Word (.docx) → HTML（保留原始字体、字号、对齐等样式）。
    用于导入时保持文档原样。
    """
    # 验证文件类型
    if not file.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail={"error": "仅支持 .docx 格式", "code": "INVALID_FILE_TYPE"})

    # 读取文件内容
    content = await file.read()

    # 写入临时文件
    with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        try:
            html_content = await export_service.docx_to_html(tmp_path)
            return {
                "html": html_content,
                "filename": file.filename,
                "parse_source": "pandoc",
            }
        except PandocNotAvailableError as e:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": f"Pandoc 不可用: {str(e)}",
                    "code": "PANDOC_NOT_AVAILABLE",
                },
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": f"文档解析失败: {str(e)}", "code": "PARSE_ERROR"})
    finally:
        # 清理临时文件
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


@router.post("/parse-docx", summary="解析 Word 文档")
async def parse_docx(file: UploadFile = File(...)):
    """
    解析 Word (.docx) → Markdown（含 $...$ / $$...$$ 公式）。
    默认用 Pandoc（与导出 Word 同一套 OMML↔LaTeX）；不可用时回退 docxlatex。
    """
    # 验证文件类型
    if not file.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail={"error": "仅支持 .docx 格式", "code": "INVALID_FILE_TYPE"})

    # 读取文件内容
    content = await file.read()

    # 写入临时文件
    with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        try:
            text = await export_service.docx_to_markdown(tmp_path)
            style_runs = await export_service.docx_to_style_runs(tmp_path)
            parse_source = "pandoc"
            equations: list = []
        except (PandocNotAvailableError, RuntimeError) as e:
            from loguru import logger

            logger.warning(f"parse-docx 回退 docxlatex: {e}")
            try:
                from docxlatex import Document as DocxLatexDocument
            except ImportError:
                raise HTTPException(
                    status_code=503,
                    detail={
                        "error": "请安装 Pandoc 以正确解析 Word 公式，或 pip install docxlatex",
                        "code": "PARSE_UNAVAILABLE",
                    },
                ) from e
            doc = DocxLatexDocument(tmp_path)
            text = doc.get_text()
            equations = doc.equations if hasattr(doc, "equations") else []
            parse_source = "docxlatex"
            style_runs = None

        return {
            "text": text,
            "equations": equations,
            "filename": file.filename,
            "parse_source": parse_source,
            "style_runs": style_runs,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": f"文档解析失败: {str(e)}", "code": "PARSE_ERROR"})
    finally:
        # 清理临时文件
        Path(tmp_path).unlink(missing_ok=True)
