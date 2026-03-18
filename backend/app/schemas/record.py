from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class RecordItem(BaseModel):
    id: str
    format: str
    char_count: Optional[int] = None
    status: str
    error_msg: Optional[str] = None
    template: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RecordList(BaseModel):
    total: int
    page: int
    size: int
    items: list[RecordItem]


class RecordStats(BaseModel):
    total: int
    this_month: int
    success_count: int
    failed_count: int
