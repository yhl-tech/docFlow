from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger
from app.core.logging import get_logger

_log = get_logger(__name__)


class AppError(Exception):
    """业务异常基类"""

    def __init__(self, message: str, code: str = "ERROR", status_code: int = 400, suggestion: str = ""):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.suggestion = suggestion
        super().__init__(message)

    def to_dict(self) -> dict:
        """转换为字典，用于 API 响应"""
        result = {"error": self.message, "code": self.code}
        if self.suggestion:
            result["suggestion"] = self.suggestion
        return result


class QuotaExceededError(AppError):
    def __init__(self):
        super().__init__("免费次数已用完，请开通会员或充值余额", "QUOTA_EXCEEDED", 402)


class InsufficientBalanceError(AppError):
    def __init__(self):
        super().__init__("余额不足，请先充值", "INSUFFICIENT_BALANCE", 402)


class ContentTooLargeError(AppError):
    def __init__(self):
        super().__init__("内容超过 50000 字符限制", "CONTENT_TOO_LARGE", 413)


class NotImplementedError(AppError):
    def __init__(self, feature: str = "该功能"):
        super().__init__(f"{feature}暂未实现", "NOT_IMPLEMENTED", 501)


# ─── 导出相关异常 ───

class ExportError(AppError):
    """导出相关错误基类"""

    def __init__(self, message: str, code: str, suggestion: str = ""):
        super().__init__(message, code, 422, suggestion)


class PandocNotFoundError(ExportError):
    """Pandoc 未安装"""

    def __init__(self):
        super().__init__(
            message="Word 导出功能暂时不可用",
            code="PANDOC_NOT_FOUND",
            suggestion="请联系管理员安装 Pandoc >= 3.0",
        )


class PdfEngineNotAvailableError(ExportError):
    """PDF 引擎不可用"""

    def __init__(self, engine: str = "Pandoc"):
        super().__init__(
            message=f"PDF 导出功能暂时不可用（{engine} 不可用）",
            code="PDF_ENGINE_NOT_AVAILABLE",
            suggestion="请联系管理员安装 PDF 转换工具",
        )


class TemplateValidationError(ExportError):
    """模板配置校验失败"""

    def __init__(self, errors: list[str]):
        super().__init__(
            message=f"模板配置校验失败：{errors[0] if errors else '未知错误'}",
            code="TEMPLATE_VALIDATION_ERROR",
            suggestion="请检查模板配置是否完整",
        )
        self.errors = errors


class ExportTimeoutError(ExportError):
    """导出超时"""

    def __init__(self):
        super().__init__(
            message="文档转换超时，请稍后重试",
            code="EXPORT_TIMEOUT",
            suggestion="文档可能过大，建议分批处理或减少内容",
        )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        _log.warning(
            f"业务异常: {exc.code}",
            extra={
                "error_code": exc.code,
                "error_message": exc.message,
            }
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_dict(),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = exc.errors()
        first = errors[0] if errors else {}
        msg = first.get("msg", "请求参数错误")
        _log.warning(
            f"参数校验失败: {msg}",
            extra={"validation_errors": errors}
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"error": msg, "code": "VALIDATION_ERROR", "detail": errors},
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
        _log.exception(
            f"未处理异常: {type(exc).__name__}",
            extra={"exception_type": type(exc).__name__}
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "服务器内部错误", "code": "INTERNAL_ERROR", "detail": None},
        )
