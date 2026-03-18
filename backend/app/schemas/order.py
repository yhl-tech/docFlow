from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CreateOrderRequest(BaseModel):
    plan: str  # basic / pro / pack_50
    pay_channel: str  # wechat / alipay


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
    pay_params: dict  # 微信/支付宝支付参数
