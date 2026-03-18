from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.dependencies import CurrentUser, DB
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.user import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    SendSmsRequest,
    TokenResponse,
    UserInfo,
)

router = APIRouter()


@router.post("/register", response_model=TokenResponse, summary="注册")
async def register(body: RegisterRequest, db: DB):
    if not body.phone and not body.email:
        raise HTTPException(status_code=400, detail={"error": "手机号或邮箱必填", "code": "INVALID_PARAMS"})

    # 检查是否已存在
    if body.phone:
        result = await db.execute(select(User).where(User.phone == body.phone))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail={"error": "手机号已注册", "code": "PHONE_EXISTS"})
    if body.email:
        result = await db.execute(select(User).where(User.email == body.email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail={"error": "邮箱已注册", "code": "EMAIL_EXISTS"})

    user = User(
        phone=body.phone,
        email=body.email,
        password=hash_password(body.password),
        nickname=body.nickname or (body.phone[:3] + "****" + body.phone[-4:] if body.phone else body.email),
    )
    db.add(user)
    await db.flush()

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse, summary="登录")
async def login(body: LoginRequest, db: DB):
    # 支持手机号或邮箱登录
    result = await db.execute(
        select(User).where((User.phone == body.account) | (User.email == body.account))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=401, detail={"error": "账号不存在", "code": "USER_NOT_FOUND"})

    if body.password:
        if not user.password or not verify_password(body.password, user.password):
            raise HTTPException(status_code=401, detail={"error": "密码错误", "code": "WRONG_PASSWORD"})
    elif body.sms_code:
        # TODO: 验证短信验证码
        raise HTTPException(status_code=501, detail={"error": "短信验证码登录暂未实现", "code": "NOT_IMPLEMENTED"})
    else:
        raise HTTPException(status_code=400, detail={"error": "密码或验证码必填", "code": "INVALID_PARAMS"})

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/send-sms-code", response_model=MessageResponse, summary="发送短信验证码")
async def send_sms_code(body: SendSmsRequest):
    # TODO: 接入阿里云短信 SDK
    raise HTTPException(status_code=501, detail={"error": "短信服务暂未配置", "code": "NOT_IMPLEMENTED"})


@router.post("/logout", response_model=MessageResponse, summary="退出登录")
async def logout(current_user: CurrentUser):
    # TODO: 可实现 Token 黑名单（Redis）
    return MessageResponse(message="已退出登录")


@router.get("/me", response_model=UserInfo, summary="获取当前用户信息")
async def get_me(current_user: CurrentUser):
    return UserInfo(
        id=current_user.id,
        phone=current_user.phone,
        email=current_user.email,
        nickname=current_user.nickname,
        avatar_url=current_user.avatar_url,
        plan=current_user.plan,
        quota_total=current_user.quota_total,
        quota_used=current_user.quota_used,
        quota_remaining=current_user.quota_remaining,
        created_at=current_user.created_at,
    )


@router.put("/password", response_model=MessageResponse, summary="修改密码")
async def change_password(body: ChangePasswordRequest, current_user: CurrentUser, db: DB):
    if not current_user.password or not verify_password(body.old_password, current_user.password):
        raise HTTPException(status_code=400, detail={"error": "旧密码错误", "code": "WRONG_PASSWORD"})

    current_user.password = hash_password(body.new_password)
    db.add(current_user)
    return MessageResponse(message="密码修改成功")
