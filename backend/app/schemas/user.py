from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    """注册请求"""
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    password: str = Field(..., min_length=6, max_length=32)
    sms_code: Optional[str] = Field(None, min_length=6, max_length=6)
    nickname: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v, info):
        return v


class LoginRequest(BaseModel):
    """密码登录请求"""
    account: str = Field(..., description="手机号或邮箱")
    password: str


class SmsLoginRequest(BaseModel):
    """短信验证码登录请求"""
    phone: str = Field(..., description="手机号")
    code: str = Field(..., min_length=6, max_length=6, description="6位验证码")


class SendSmsRequest(BaseModel):
    """发送短信验证码请求"""
    phone: str = Field(..., description="手机号")
    type: str = Field("login", description="验证码类型: login/register/reset_password")


class ChangePasswordRequest(BaseModel):
    """修改密码请求"""
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=32)


class TokenResponse(BaseModel):
    """Token 响应"""
    access_token: str
    token_type: str = "bearer"


class UserInfo(BaseModel):
    """用户信息"""
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
    """配额信息"""
    plan: str
    quota_total: int
    quota_used: int
    quota_remaining: int
    quota_reset_at: Optional[datetime] = None
