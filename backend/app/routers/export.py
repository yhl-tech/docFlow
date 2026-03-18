import re
from datetime import datetime
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from loguru import logger
from sqlalchemy import select

from app.core.dependencies import OptionalUser, DB
from app.core.exceptions import QuotaExceededError
from app.core.limiter import limiter
from app.models.record import ExportRecord
from app.schemas.export import ExportRequest
from app.services.ai_service import ai_service
from app.services.export_service import PandocNotAvailableError, export_service

router = APIRouter()


# ------------------------------------------------------------------ #
#  辅助：额度检查 & 扣减
# ------------------------------------------------------------------ #


async def _check_and_deduct_quota(user, db) -> None:
    """检查余量；不足则抛 QuotaExceededError；足够则原子性扣减。"""
    if user is None:
        return  # 未登录用户跳过额度检查
    if user.quota_remaining <= 0:
        raise QuotaExceededError()
    user.quota_used += 1
    await db.commit()
    await db.refresh(user)


async def _write_record(
    db,
    user_id: str,
    fmt: str,
    template: str,
    char_count: int,
    status: str,
    error_msg: str | None = None,
) -> None:
    record = ExportRecord(
        user_id=user_id,
        format=fmt,
        template=template,
        char_count=char_count,
        status=status,
        error_msg=error_msg,
    )
    db.add(record)
    await db.commit()


# ------------------------------------------------------------------ #
#  Word 导出（核心功能）
# ------------------------------------------------------------------ #


@router.post("/docx", summary="导出 Word 文档")
@limiter.limit("20/hour")
async def export_docx(
    request: Request,
    body: ExportRequest,
    current_user: OptionalUser,
    db: DB,
):
    """
    将 Markdown 转换为 Word (.docx) 文件。

    - **LaTeX 公式** → OMML 原生可编辑公式（pandoc 自动处理）
    - **Mermaid 图表** → PNG 插图（需服务器安装 Node.js + mmdc）
    - **代码块** → 等宽字体样式保留
    - **模板** → 对应 reference-doc 样式（如存在）
    """
    char_count = len(body.markdown)

    # 1. 额度检查（未登录用户跳过）
    await _check_and_deduct_quota(current_user, db)

    # 2. 调用导出服务
    logger.info(f"开始导出 docx, 字数={char_count}, template={body.template}, page_size={body.page_size}")
    try:
        docx_bytes = await export_service.export_docx(
            markdown=body.markdown,
            template=body.template,
            page_size=body.page_size,
        )
    except PandocNotAvailableError as exc:
        # 记录失败，但不扣额度（已扣，需要退还）
        if current_user:
            current_user.quota_used = max(0, current_user.quota_used - 1)
            await db.commit()
            await _write_record(db, current_user.id, "docx", body.template, char_count, "failed", str(exc))
        raise HTTPException(status_code=503, detail={"error": str(exc), "code": "PANDOC_NOT_AVAILABLE"})
    except RuntimeError as exc:
        if current_user:
            current_user.quota_used = max(0, current_user.quota_used - 1)
            await db.commit()
            await _write_record(db, current_user.id, "docx", body.template, char_count, "failed", str(exc))
            logger.exception(f"export_docx 失败 user={current_user.id}: {exc}")
        raise HTTPException(status_code=500, detail={"error": "Word 导出失败，请稍后重试", "code": "EXPORT_FAILED"})
    except Exception as exc:
        if current_user:
            current_user.quota_used = max(0, current_user.quota_used - 1)
            await db.commit()
            await _write_record(db, current_user.id, "docx", body.template, char_count, "failed", str(exc))
            logger.exception(f"export_docx 未预期异常 user={current_user.id if current_user else 'anonymous'}")
        raise HTTPException(status_code=500, detail={"error": "服务器内部错误", "code": "INTERNAL_ERROR"})

    # 3. 写入成功记录
    if current_user:
        await _write_record(db, current_user.id, "docx", body.template, char_count, "success")

    # 4. 生成文件名（AI 总结，失败降级为时间戳）
    try:
        ai_name = await ai_service.generate_filename(body.markdown)
    except Exception as e:
        logger.warning(f"AI 生成文件名失败: {e}")
        ai_name = ""
    stem = ai_name if ai_name else f"文档_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    filename = f"{stem}.docx"
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )


# ------------------------------------------------------------------ #
#  其余格式（暂未实现）
# ------------------------------------------------------------------ #


@router.post("/pdf", summary="导出 PDF 文档")
@limiter.limit("20/hour")
async def export_pdf(
    request: Request,
    body: ExportRequest,
    current_user: OptionalUser,
    db: DB,
):
    """
    将 Markdown 转换为 PDF 文件。

    - **中文字体**：自动注入 CJK font-family CSS（Microsoft YaHei / Noto Sans CJK / PingFang）
    - **数学公式**：wkhtmltopdf 引擎使用 MathJax；weasyprint 引擎使用 MathML
    - **Mermaid 图表**：同 Word 导出，渲染为 PNG 嵌入
    - **引擎优先级**：wkhtmltopdf（系统安装）> weasyprint（pip install）
    """
    char_count = len(body.markdown)

    # 1. 额度检查（未登录用户跳过）
    await _check_and_deduct_quota(current_user, db)

    # 2. 调用导出服务
    logger.info(f"开始导出 pdf, 字数={char_count}, template={body.template}, page_size={body.page_size}")
    try:
        pdf_bytes = await export_service.export_pdf(
            markdown=body.markdown,
            template=body.template,
            page_size=body.page_size,
        )
    except PandocNotAvailableError as exc:
        if current_user:
            current_user.quota_used = max(0, current_user.quota_used - 1)
            await db.commit()
            await _write_record(db, current_user.id, "pdf", body.template, char_count, "failed", str(exc))
        raise HTTPException(status_code=503, detail={"error": str(exc), "code": "PANDOC_NOT_AVAILABLE"})
    except RuntimeError as exc:
        if current_user:
            current_user.quota_used = max(0, current_user.quota_used - 1)
            await db.commit()
            await _write_record(db, current_user.id, "pdf", body.template, char_count, "failed", str(exc))
            logger.error(f"export_pdf 失败 user={current_user.id}: {exc}")
        raise HTTPException(status_code=500, detail={"error": str(exc), "code": "EXPORT_FAILED"})
    except Exception as exc:
        if current_user:
            current_user.quota_used = max(0, current_user.quota_used - 1)
            await db.commit()
            await _write_record(db, current_user.id, "pdf", body.template, char_count, "failed", str(exc))
            logger.exception(f"export_pdf 未预期异常 user={current_user.id if current_user else 'anonymous'}")
        raise HTTPException(status_code=500, detail={"error": "服务器内部错误", "code": "INTERNAL_ERROR"})

    # 3. 写入成功记录
    if current_user:
        await _write_record(db, current_user.id, "pdf", body.template, char_count, "success")

    # 4. 生成文件名（AI 总结，失败降级为时间戳）
    try:
        ai_name = await ai_service.generate_filename(body.markdown)
    except Exception as e:
        logger.warning(f"AI 生成文件名失败: {e}")
        ai_name = ""
    stem = ai_name if ai_name else f"文档_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    filename = f"{stem}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )


@router.post("/excel", summary="导出 Excel 表格")
@limiter.limit("20/hour")
async def export_excel(request: Request, body: ExportRequest, current_user: OptionalUser, db: DB):
    """
    将 Markdown 中的表格提取并导出为 Excel (.xlsx) 文件。
    """
    raise HTTPException(
        status_code=501,
        detail={"error": "Excel 导出功能暂未实现", "code": "NOT_IMPLEMENTED"},
    )


@router.post("/image", summary="导出图片")
@limiter.limit("20/hour")
async def export_image(request: Request, body: ExportRequest, current_user: OptionalUser, db: DB):
    """
    将 Markdown 渲染为 PNG 图片。
    """
    raise HTTPException(
        status_code=501,
        detail={"error": "图片导出功能暂未实现", "code": "NOT_IMPLEMENTED"},
    )
