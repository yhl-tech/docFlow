import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select

from app.config import settings
from app.core.dependencies import CurrentUser, DB
from app.models.order import Order
from app.models.user import User
from app.schemas.order import CreateOrderResponse, OrderItem

router = APIRouter()

# ------------------------------------------------------------------ #
#  会员定价（服务端常量，可后续迁移到 plans 表）
# ------------------------------------------------------------------ #


MEMBER_PLANS: dict[str, dict] = {
    "monthly": {
        "name": "月度会员",
        "price": 19.9,
        "days": 30,
        "description": "30 天内无限次导出",
    },
    "annual": {
        "name": "年度会员",
        "price": 99.0,
        "days": 365,
        "description": "365 天内无限次导出",
    },
    "lifetime": {
        "name": "终身会员",
        "price": 299.0,
        "days": 365 * 100,  # 100 年，实际由代码判断 member_plan == "lifetime"
        "description": "永久无限次导出",
    },
}

# 按次充值（1 元 = 100 分）
TOPUP_CENTS_PER_YUAN = 100


def _generate_order_no() -> str:
    return f"{int(time.time() * 1000)}{uuid.uuid4().hex[:8].upper()}"


# ------------------------------------------------------------------ #
#  Schema（请求/响应）
# ------------------------------------------------------------------ #


class CreateOrderRequest(BaseModel):
    plan: str  # monthly / annual / lifetime / topup
    pay_channel: str = "mock"  # wechat / alipay / mock
    topup_amount: int | None = None  # 仅 topup 时使用，单位：元


class MockConfirmRequest(BaseModel):
    order_no: str


class CreateOrderResponseData(BaseModel):
    order_no: str
    amount: float
    plan: str
    pay_url: str | None = None  # 微信/支付宝支付链接；模拟支付时为 null


# ------------------------------------------------------------------ #
#  路由
# ------------------------------------------------------------------ #


@router.post("/create-order", response_model=CreateOrderResponse, summary="创建支付订单")
async def create_order(body: CreateOrderRequest, current_user: CurrentUser, db: DB):
    """
    创建订单：
    - 会员（monthly / annual / lifetime）：amount 取服务端定价，quota_added = 0
    - topup：按 topup_amount 元充值，amount = 元数，quota_added = 元数 * 100 分
    """
    if body.plan not in MEMBER_PLANS and body.plan != "topup":
        raise HTTPException(status_code=400, detail={"error": "无效的 plan", "code": "INVALID_PLAN"})

    if body.plan == "topup":
        if not body.topup_amount or body.topup_amount < 1:
            raise HTTPException(status_code=400, detail={"error": "充值金额至少 1 元", "code": "INVALID_TOPUP_AMOUNT"})
        amount = float(body.topup_amount)
        quota_added = body.topup_amount * TOPUP_CENTS_PER_YUAN
        plan_label = "topup"
    else:
        plan_info = MEMBER_PLANS[body.plan]
        amount = plan_info["price"]
        quota_added = 0  # 会员不增加余额分，按 is_member_active 判断
        plan_label = body.plan

    order_no = _generate_order_no()
    order = Order(
        user_id=current_user.id,
        order_no=order_no,
        plan=plan_label,
        amount=amount,
        quota_added=quota_added,
        pay_channel=body.pay_channel if body.pay_channel != "mock" else "mock",
        status="pending",
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    # mock 阶段 pay_params 为空，前端拿到 order_no 后可调用 /payment/mock/confirm
    pay_params = {
        "order_no": order_no,
        "pay_url": None,
        "mock_enabled": settings.ENABLE_MOCK_PAYMENT,
    }
    return CreateOrderResponse(
        order_no=order_no,
        pay_params=pay_params,
    )


@router.post("/mock/confirm", summary="模拟支付成功回调（仅 DEBUG/MOCK 模式）")
async def mock_confirm(body: MockConfirmRequest, current_user: CurrentUser, db: DB):
    """
    仅在 ENABLE_MOCK_PAYMENT=True 时可用。
    将指定订单标为已支付，并原子性：
    - 会员单：更新用户 member_plan / member_expires_at（续期逻辑）
    - 充值单：增加用户 balance_cents
    """
    if not settings.ENABLE_MOCK_PAYMENT:
        raise HTTPException(status_code=403, detail={"error": "模拟支付已禁用", "code": "MOCK_DISABLED"})

    result = await db.execute(
        select(Order).where(Order.order_no == body.order_no, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail={"error": "订单不存在", "code": "ORDER_NOT_FOUND"})
    if order.status == "paid":
        raise HTTPException(status_code=400, detail={"error": "订单已支付", "code": "ALREADY_PAID"})

    now = datetime.now(timezone.utc)

    if order.plan in MEMBER_PLANS:
        # 会员：计算到期时间
        plan_info = MEMBER_PLANS[order.plan]
        days = plan_info["days"]
        expires_at = now + timedelta(days=days)

        # 续期逻辑：已有会员且未过期，在原到期时间上叠加
        user_result = await db.execute(select(User).where(User.id == current_user.id))
        user = user_result.scalar_one()
        if user.member_plan == order.plan and user.member_expires_at and user.member_expires_at > now:
            expires_at = user.member_expires_at + timedelta(days=days)

        user.member_plan = order.plan
        user.member_expires_at = expires_at
        order.expires_at = expires_at

    elif order.plan == "topup":
        user_result = await db.execute(select(User).where(User.id == current_user.id))
        user = user_result.scalar_one()
        user.balance_cents += order.quota_added

    order.status = "paid"
    order.paid_at = now
    await db.commit()
    await db.refresh(order)

    return {"success": True, "order_no": order.order_no, "status": order.status}


@router.get("/order/{order_no}", response_model=OrderItem, summary="查询订单状态")
async def get_order(order_no: str, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Order).where(Order.order_no == order_no, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail={"error": "订单不存在", "code": "NOT_FOUND"})
    return OrderItem.model_validate(order)


# ------------------------------------------------------------------ #
#  TODO：真实支付接入（占位，保持结构一致）
# ------------------------------------------------------------------ #


@router.post("/wechat/notify", summary="微信支付回调")
async def wechat_notify(request: Request, db: DB):
    # TODO: 验证微信签名 + 更新订单状态 + 增加额度
    raise HTTPException(status_code=501, detail={"error": "微信支付回调暂未实现", "code": "NOT_IMPLEMENTED"})


@router.post("/alipay/notify", summary="支付宝回调")
async def alipay_notify(request: Request, db: DB):
    # TODO: 验证支付宝签名 + 更新订单状态 + 增加额度
    raise HTTPException(status_code=501, detail={"error": "支付宝回调暂未实现", "code": "NOT_IMPLEMENTED"})
