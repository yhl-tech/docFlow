from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger


class AppError(Exception):
    """业务异常基类"""

    def __init__(self, message: str, code: str = "ERROR", status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class QuotaExceededError(AppError):
    def __init__(self):
        super().__init__("导出次数已用完，请升级套餐", "QUOTA_EXCEEDED", 402)


class ContentTooLargeError(AppError):
    def __init__(self):
        super().__init__("内容超过 50000 字符限制", "CONTENT_TOO_LARGE", 413)


class NotImplementedError(AppError):
    def __init__(self, feature: str = "该功能"):
        super().__init__(f"{feature}暂未实现", "NOT_IMPLEMENTED", 501)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message, "code": exc.code, "detail": None},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = exc.errors()
        first = errors[0] if errors else {}
        msg = first.get("msg", "请求参数错误")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"error": msg, "code": "VALIDATION_ERROR", "detail": errors},
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"未处理异常: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "服务器内部错误", "code": "INTERNAL_ERROR", "detail": None},
        )
