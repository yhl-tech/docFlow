from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

ExportFormat = Literal["docx", "pdf", "excel", "image"]
Template = str


class ExportRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    markdown: str
    template: Template = "default"
    page_size: str = "A4"
    template_binding: Optional[dict[str, Any]] = Field(
        default=None,
        validation_alias="templateBinding"  # 前端发送的字段名
    )

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
