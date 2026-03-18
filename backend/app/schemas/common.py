from typing import Any

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    error: str
    code: str = "INTERNAL_ERROR"
    detail: Any = None


class MessageResponse(BaseModel):
    message: str


class PaginatedResponse(BaseModel):
    total: int
    page: int
    size: int
    items: list
