import re
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select

from app.core.dependencies import CurrentUser, DB
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SendSmsRequest,
    SmsLoginRequest,
    TokenResponse,
    UserInfo,
)
from app.services.sms_service import sms_service, sms_code_manager, SMSServiceError
from app.core.limiter import limiter

router = APIRouter()


@router.post("/register", response_model=TokenResponse, summary="注册")
@limiter.limit("10/hour")
async def register(body: RegisterRequest, db: DB, request: Request):
    """手机号注册"""
    # 检查手机号格式
    if not re.match(r"^1[3-9]\d{9}$", body.phone):
        raise HTTPException(status_code=400, detail={"error": "手机号格式不正确", "code": "INVALID_PHONE"})

    # 验证短信验证码
    if not await sms_code_manager.verify_code(body.phone, body.sms_code, "register"):
        raise HTTPException(status_code=400, detail={"error": "验证码错误或已过期", "code": "INVALID_SMS_CODE"})

    # 检查手机号是否已注册
    result = await db.execute(select(User).where(User.phone == body.phone))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail={"error": "手机号已注册", "code": "PHONE_EXISTS"})

    # 创建用户
    user = User(
        phone=body.phone,
        password=hash_password(body.password),
        nickname=body.nickname or (body.phone[:3] + "****" + body.phone[-4:]),
    )
    db.add(user)
    await db.flush()

    # 删除已使用的验证码（复用同一个 session，避免多连接锁竞争）
    await sms_code_manager.delete_code(body.phone, "register", db)

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse, summary="密码登录")
@limiter.limit("20/hour")
async def login(body: LoginRequest, db: DB, request: Request):
    """手机号 + 密码登录"""
    # 检查手机号格式
    if not re.match(r"^1[3-9]\d{9}$", body.phone):
        raise HTTPException(status_code=400, detail={"error": "手机号格式不正确", "code": "INVALID_PHONE"})

    # 查找用户
    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail={"error": "账号不存在", "code": "USER_NOT_FOUND"})

    if not user.password or not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail={"error": "密码错误", "code": "WRONG_PASSWORD"})

    if not user.is_active:
        raise HTTPException(status_code=401, detail={"error": "账号已被禁用", "code": "USER_DISABLED"})

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/sms-login", response_model=TokenResponse, summary="短信验证码登录")
@limiter.limit("10/hour")
async def sms_login(body: SmsLoginRequest, db: DB, request: Request):
    """手机号 + 短信验证码登录"""
    # 检查手机号格式
    if not re.match(r"^1[3-9]\d{9}$", body.phone):
        raise HTTPException(status_code=400, detail={"error": "手机号格式不正确", "code": "INVALID_PHONE"})

    # 验证短信验证码
    if not await sms_code_manager.verify_code(body.phone, body.code, "login"):
        raise HTTPException(status_code=400, detail={"error": "验证码错误或已过期", "code": "INVALID_SMS_CODE"})

    # 查找用户
    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail={"error": "该手机号未注册", "code": "USER_NOT_FOUND"})

    if not user.is_active:
        raise HTTPException(status_code=401, detail={"error": "账号已被禁用", "code": "USER_DISABLED"})

    # 删除已使用的验证码
    await sms_code_manager.delete_code(body.phone, "login")

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/send-sms-code", summary="发送短信验证码")
@limiter.limit("10/minute")
async def send_sms_code(body: SendSmsRequest, request: Request):
    """发送短信验证码"""
    # 检查手机号格式
    if not re.match(r"^1[3-9]\d{9}$", body.phone):
        raise HTTPException(status_code=400, detail={"error": "手机号格式不正确", "code": "INVALID_PHONE"})

    # 检查发送频率
    can_send, remaining = await sms_code_manager.can_send(body.phone)
    if not can_send:
        raise HTTPException(
            status_code=429,
            detail={"error": f"发送太频繁，请 {remaining} 秒后重试", "code": "SEND_TOO_FREQUENT"},
        )

    # 生成验证码
    code = sms_service.generate_code()

    try:
        # 发送短信
        success = await sms_service.send_sms(body.phone, code, body.type)
        if not success:
            raise HTTPException(status_code=500, detail={"error": "短信发送失败", "code": "SMS_SEND_FAILED"})

        # 保存验证码
        await sms_code_manager.save_code(body.phone, code, body.type)

        return MessageResponse(message="验证码已发送")

    except SMSServiceError as e:
        raise HTTPException(status_code=500, detail={"error": str(e), "code": "SMS_SERVICE_ERROR"})


@router.post("/reset-password", response_model=MessageResponse, summary="重置密码（忘记密码）")
@limiter.limit("10/hour")
async def reset_password(body: ResetPasswordRequest, db: DB, request: Request):
    """通过短信验证码重置密码"""
    # 检查手机号格式
    if not re.match(r"^1[3-9]\d{9}$", body.phone):
        raise HTTPException(status_code=400, detail={"error": "手机号格式不正确", "code": "INVALID_PHONE"})

    # 验证短信验证码
    if not await sms_code_manager.verify_code(body.phone, body.sms_code, "reset_password"):
        raise HTTPException(status_code=400, detail={"error": "验证码错误或已过期", "code": "INVALID_SMS_CODE"})

    # 查找用户
    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail={"error": "该手机号未注册", "code": "USER_NOT_FOUND"})

    if not user.is_active:
        raise HTTPException(status_code=400, detail={"error": "账号已被禁用", "code": "USER_DISABLED"})

    # 更新密码
    user.password = hash_password(body.new_password)
    db.add(user)

    # 删除已使用的验证码
    await sms_code_manager.delete_code(body.phone, "reset_password", db)

    return MessageResponse(message="密码重置成功，请使用新密码登录")


@router.post("/logout", response_model=MessageResponse, summary="退出登录")
async def logout(current_user: CurrentUser):
    return MessageResponse(message="已退出登录")


@router.get("/me", response_model=UserInfo, summary="获取当前用户信息")
async def get_me(current_user: CurrentUser):
    return UserInfo(
        id=current_user.id,
        phone=current_user.phone,
        email=current_user.email,
        nickname=current_user.nickname,
        avatar_url=current_user.avatar_url,
        quota_total=current_user.quota_total,
        quota_used=current_user.quota_used,
        quota_remaining=current_user.quota_remaining,
        balance_cents=current_user.balance_cents,
        member_plan=current_user.member_plan,
        member_expires_at=current_user.member_expires_at,
        is_member_active=current_user.is_member_active,
        created_at=current_user.created_at,
    )


@router.put("/password", response_model=MessageResponse, summary="修改密码")
async def change_password(body: ChangePasswordRequest, current_user: CurrentUser, db: DB):
    if not current_user.password or not verify_password(body.old_password, current_user.password):
        raise HTTPException(status_code=400, detail={"error": "旧密码错误", "code": "WRONG_PASSWORD"})

    current_user.password = hash_password(body.new_password)
    db.add(current_user)
    return MessageResponse(message="密码修改成功")
