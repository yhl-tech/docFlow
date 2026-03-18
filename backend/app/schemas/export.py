from typing import Literal, Optional

from pydantic import BaseModel, field_validator

ExportFormat = Literal["docx", "pdf", "excel", "image"]
Template = Literal["default", "academic", "business", "simple"]


class ExportRequest(BaseModel):
    markdown: str
    template: Template = "default"
    page_size: str = "A4"

    @field_validator("markdown")
    @classmethod
    def validate_markdown_length(cls, v: str) -> str:
        if len(v) > 50_000:
            raise ValueError("内容超过 50000 字符限制")
        return v


class ExportErrorResponse(BaseModel):
    error: str
    code: str
    detail: Optional[str] = None
