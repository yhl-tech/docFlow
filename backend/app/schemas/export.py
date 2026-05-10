from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

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


class ExportErrorResponse(BaseModel):
    error: str
    code: str
    detail: Optional[str] = None
