import re
import tempfile
import uuid
from pathlib import Path
from typing import List, Optional

import httpx
from docxlatex import Document as DocxLatexDocument
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select, delete

from app.core.dependencies import CurrentUser, DB
from app.models.document import Document

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


class ApplyTemplateRequest(BaseModel):
    template: str
    content: str


class SaveDocumentRequest(BaseModel):
    content: str
    title: Optional[str] = None
    template: Optional[str] = None


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


class GenerateTocRequest(BaseModel):
    content: str


# ── 模板配置 ──────────────────────────────────────────────────────────────────

TEMPLATES: List[TemplateInfo] = [
    TemplateInfo(id="default",  name="默认",   description="标准文档样式"),
    TemplateInfo(id="academic", name="学术",   description="适合论文、报告的学术样式"),
    TemplateInfo(id="business", name="商务",   description="专业商务文档样式"),
    TemplateInfo(id="simple",   name="简洁",   description="极简风格文档"),
]

# 模板 CSS 类名，导出时由前端/渲染器应用
TEMPLATE_CSS_CLASS: dict[str, str] = {
    "default":  "template-default",
    "academic": "template-academic",
    "business": "template-business",
    "simple":   "template-simple",
}


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

@router.get("/templates", response_model=List[TemplateInfo], summary="获取模板列表")
async def get_templates():
    return TEMPLATES


@router.post("/apply-template", summary="应用模板")
async def apply_template(body: ApplyTemplateRequest):
    """
    在 HTML 内容外层包裹模板 CSS 类，供导出渲染器使用。
    内容本身不修改，仅添加 data-template 标记。
    """
    css_class = TEMPLATE_CSS_CLASS.get(body.template, "template-default")
    wrapped = f'<div class="{css_class}" data-template="{body.template}">{body.content}</div>'
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
        "meta": DocumentMeta(
            id=doc.id,
            title=doc.title,
            createdAt=doc.created_at.isoformat(),
            updatedAt=doc.updated_at.isoformat(),
            wordCount=doc.word_count,
        ),
    }


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

@router.post("/parse-docx", summary="解析 Word 文档")
async def parse_docx(file: UploadFile = File(...)):
    """
    解析 Word (.docx) 文档，提取文本和数学公式。
    返回：纯文本内容和公式列表（LaTeX 格式）
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
        # 使用 docxlatex 解析文档
        doc = DocxLatexDocument(tmp_path)

        # 获取纯文本
        text = doc.get_text()

        # 获取公式列表（LaTeX 格式）
        equations = doc.equations if hasattr(doc, 'equations') else []

        return {
            "text": text,
            "equations": equations,
            "filename": file.filename,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": f"文档解析失败: {str(e)}", "code": "PARSE_ERROR"})
    finally:
        # 清理临时文件
        Path(tmp_path).unlink(missing_ok=True)
