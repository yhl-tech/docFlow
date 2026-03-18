import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    order_no: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    plan: Mapped[str | None] = mapped_column(String(20), nullable=True)  # basic / pro / pack_50
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    quota_added: Mapped[int] = mapped_column(Integer, nullable=False)
    pay_channel: Mapped[str | None] = mapped_column(String(20), nullable=True)  # wechat / alipay
    pay_trade_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/paid/failed/refunded
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class QuotaLog(Base):
    __tablename__ = "quota_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    change: Mapped[int] = mapped_column(Integer, nullable=False)  # 正数增加，负数扣减
    reason: Mapped[str | None] = mapped_column(String(50), nullable=True)  # export/purchase/reset/refund
    ref_id: Mapped[str | None] = mapped_column(String(36), nullable=True)  # 关联 order_id 或 record_id
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)  # free/basic/pro/pack_50
    name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    quota: Mapped[int | None] = mapped_column(Integer, nullable=True)
    period: Mapped[str | None] = mapped_column(String(20), nullable=True)  # monthly/yearly/onetime
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
