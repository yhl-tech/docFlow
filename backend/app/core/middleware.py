"""请求中间件"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from uuid import uuid4
from app.core.logging import request_id_var, user_id_var, set_request_context, clear_request_context


class LoggingMiddleware(BaseHTTPMiddleware):
    """自动注入 request_id 和用户上下文"""

    async def dispatch(self, request: Request, call_next):
        # 生成或使用传入的 request_id
        request_id = request.headers.get("X-Request-ID") or str(uuid4())
        request_id_var.set(request_id)

        # 从 Authorization header 提取 user_id（简化版，实际应解析 JWT）
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            # TODO: 实际应解析 JWT 获取真实 user_id
            user_id_var.set("extracted_user_id")
        else:
            user_id_var.set("")

        # 设置请求上下文
        set_request_context(request_id=request_id, user_id=user_id_var.get())

        response = await call_next(request)

        # 响应头注入 request_id
        response.headers["X-Request-ID"] = request_id

        # 清除上下文
        clear_request_context()

        return response
