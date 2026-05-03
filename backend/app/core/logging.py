"""结构化日志配置"""
import sys
import json
from contextvars import ContextVar
from typing import Any, Optional
from loguru import logger

# 请求级别上下文变量
request_id_var: ContextVar[str] = ContextVar("request_id", default="")
user_id_var: ContextVar[str] = ContextVar("user_id", default="")
template_id_var: ContextVar[str] = ContextVar("template_id", default="")
document_id_var: ContextVar[str] = ContextVar("document_id", default="")


class StructuredLogFormatter:
    """JSON Lines 格式日志"""

    def __call__(self, message: Any) -> str:
        record = message.record
        log_data = {
            "timestamp": record["time"].isoformat(),
            "level": record["level"].name,
            "message": record["message"],
            "request_id": request_id_var.get(),
            "user_id": user_id_var.get(),
            "template_id": template_id_var.get(),
            "document_id": document_id_var.get(),
            "module": record["name"],
            "function": record["function"],
            "line": record["line"],
        }
        if record["extra"]:
            log_data.update(record["extra"])
        return json.dumps(log_data, ensure_ascii=False) + "\n"


def setup_logging(level: str = "INFO", format_type: str = "simple") -> None:
    """
    初始化日志配置

    Args:
        level: 日志级别，默认 INFO
        format_type: 格式类型，"simple" 或 "json"
    """
    logger.remove()

    if format_type == "json":
        # JSON Lines 格式，便于日志收集和分析
        logger.add(
            sys.stderr,
            format="{message}",
            level=level,
            serialize=True,
        )
    else:
        # 简单格式，便于开发调试
        logger.add(
            sys.stderr,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | <level>{message}</level>",
            level=level,
        )


def set_request_context(
    request_id: Optional[str] = None,
    user_id: Optional[str] = None,
    template_id: Optional[str] = None,
    document_id: Optional[str] = None,
) -> None:
    """设置请求上下文"""
    if request_id:
        request_id_var.set(request_id)
    if user_id:
        user_id_var.set(user_id)
    if template_id:
        template_id_var.set(template_id)
    if document_id:
        document_id_var.set(document_id)


def clear_request_context() -> None:
    """清除请求上下文"""
    request_id_var.set("")
    user_id_var.set("")
    template_id_var.set("")
    document_id_var.set("")


def get_logger(name: str = __name__):
    """
    获取带上下文的 logger

    示例:
        _log = get_logger(__name__)
        _log.info("开始导出", extra={"format": "docx"})
    """
    return logger.bind(name=name)


# 导出 logger 实例供直接使用
__all__ = ["logger", "setup_logging", "set_request_context", "clear_request_context", "get_logger"]
