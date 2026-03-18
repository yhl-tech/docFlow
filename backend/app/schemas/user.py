from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    password: str
    sms_code: Optional[str] = None
    nickname: Optional[str] = None

    @field_validator("phone", "email")
    @classmethod
    def at_least_one(cls, v, info):
        return v


class LoginRequest(BaseModel):
    account: str  # 手机号或邮箱
    password: Optional[str] = None
    sms_code: Optional[str] = None


class SendSmsRequest(BaseModel):
    phone: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserInfo(BaseModel):
    id: str
    phone: Optional[str] = None
    email: Optional[str] = None
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    plan: str
    quota_total: int
    quota_used: int
    quota_remaining: int
    created_at: datetime

    model_config = {"from_attributes": True}


class QuotaInfo(BaseModel):
    plan: str
    quota_total: int
    quota_used: int
    quota_remaining: int
    quota_reset_at: Optional[datetime] = None
