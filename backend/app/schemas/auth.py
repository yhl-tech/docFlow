from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class RegisterRequest(BaseModel):
    """注册请求"""
    phone: str = Field(..., description="手机号")
    password: str = Field(..., min_length=6, max_length=32, description="密码")
    sms_code: str = Field(..., min_length=6, max_length=6, description="短信验证码")
    nickname: Optional[str] = Field(None, max_length=50, description="昵称")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v, info):
        # TODO: 添加手机号格式验证
        return v


class LoginRequest(BaseModel):
    """密码登录请求"""
    phone: str = Field(..., description="手机号")
    password: str = Field(..., description="密码")


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
    old_password: str = Field(..., description="旧密码")
    new_password: str = Field(..., min_length=6, max_length=32, description="新密码")


class TokenResponse(BaseModel):
    """Token 响应"""
    access_token: str
    token_type: str = "bearer"


class UserInfo(BaseModel):
    """用户信息（含计费与会员状态）"""
    id: str
    phone: Optional[str] = None
    email: Optional[str] = None
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    # 配额
    quota_total: int
    quota_used: int
    quota_remaining: int
    # 余额（单位：分，100分 = 1元）
    balance_cents: int = 0
    # 会员
    member_plan: Optional[str] = None  # monthly / annual / lifetime / None
    member_expires_at: Optional[datetime] = None
    is_member_active: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}
