from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class QuotaInfo(BaseModel):
    """配额信息"""
    quota_total: int
    quota_used: int
    quota_remaining: int
    quota_reset_at: Optional[datetime] = None
    # 计费相关
    balance_cents: int = 0
    member_plan: Optional[str] = None  # monthly / annual / lifetime
    member_expires_at: Optional[datetime] = None
    is_member_active: bool = False
