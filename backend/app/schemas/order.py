from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ==== 请求 ====

PLAN_VALUES = Literal["monthly", "annual", "lifetime", "topup"]
PAY_CHANNEL_VALUES = Literal["wechat", "alipay", "mock"]


class CreateOrderRequest(BaseModel):
    plan: PLAN_VALUES  # monthly / annual / lifetime / topup
    pay_channel: PAY_CHANNEL_VALUES = "mock"  # wechat / alipay / mock
    topup_amount: Optional[float] = Field(
        default=None, ge=0.1, le=10_000, description="仅 topup 时使用，单位：元（0.1-10000）"
    )


class MockConfirmRequest(BaseModel):
    order_no: str = Field(..., min_length=8, max_length=64)


# ==== 响应 ====


class OrderItem(BaseModel):
    id: str
    order_no: str
    plan: Optional[str] = None
    amount: float
    quota_added: int
    pay_channel: Optional[str] = None
    status: str
    paid_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderList(BaseModel):
    total: int
    page: int
    size: int
    items: list[OrderItem]


class CreateOrderResponse(BaseModel):
    order_no: str
    amount: float
    plan: str
    pay_params: dict  # 包含 mock_enabled / pay_url / qr_code 等
