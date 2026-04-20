import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    email: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nickname: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # --- 计费相关 ---
    # 免费导出配额：注册赠送 6 次
    quota_total: Mapped[int] = mapped_column(Integer, default=6)
    quota_used: Mapped[int] = mapped_column(Integer, default=0)
    quota_reset_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # 账户余额（单位：分），无会员时按次扣费用
    balance_cents: Mapped[int] = mapped_column(Integer, default=0)

    # 会员：monthly / annual / lifetime；None 或 "free" 表示无有效会员
    member_plan: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default=None)
    # 会员到期时间；lifetime 可存 2099-12-31 或由代码判断 member_plan == "lifetime"
    member_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    @property
    def quota_remaining(self) -> int:
        return max(0, self.quota_total - self.quota_used)

    @property
    def is_member_active(self) -> bool:
        """判断用户是否有有效会员（在有效期内或为终身会员）"""
        if self.member_plan == "lifetime":
            return True
        if self.member_expires_at is None:
            return False
        expires = self.member_expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return _utcnow() < expires
