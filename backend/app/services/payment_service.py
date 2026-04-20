"""
支付履约服务（Payment Service）

职责：
- 将「订单状态流转 + 用户权益变更 + 流水记录」封装为**渠道无关**的核心履约逻辑
- 所有真实支付回调（微信/支付宝）与开发辅助通道（mock）都调用同一个 fulfill_order()
- 保证幂等性：同一订单无论回调多少次，都只履约一次

关键不变量：
1. 只有 status == "pending" 的订单可被履约
2. 行锁（SELECT FOR UPDATE）+ 二次状态检查防并发双重履约
3. 履约成功后写入 QuotaLog 流水，便于对账
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, QuotaLog
from app.models.user import User


# ------------------------------------------------------------------ #
#  服务端权威定价（不信任任何前端/第三方数据）
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
        "days": 365 * 100,
        "description": "永久无限次导出",
    },
}

TOPUP_CENTS_PER_YUAN = 100
TOPUP_MAX_YUAN = 10_000  # 单笔充值上限


class PaymentError(Exception):
    def __init__(self, message: str, code: str = "PAYMENT_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


# ------------------------------------------------------------------ #
#  核心履约
# ------------------------------------------------------------------ #


async def fulfill_order(
    db: AsyncSession,
    order_no: str,
    *,
    pay_trade_no: Optional[str] = None,
    expected_amount_cents: Optional[int] = None,
) -> tuple[Order, bool]:
    """
    履约入口（所有渠道共享）。

    Args:
        db: 数据库会话
        order_no: 我方订单号
        pay_trade_no: 第三方交易号（微信 transaction_id / 支付宝 trade_no / mock 自填）
        expected_amount_cents: 回调中的实收金额（分），用于防止金额篡改

    Returns:
        (order, newly_fulfilled): newly_fulfilled 表示本次调用是否触发了履约；
        重复回调时返回 (order, False)，便于上层回复"success"给第三方而不会重复发货。

    Raises:
        PaymentError: 订单不存在 / 金额不匹配 / 状态非法 等
    """
    # 行锁锁定订单，防并发双重履约
    result = await db.execute(
        select(Order).where(Order.order_no == order_no).with_for_update()
    )
    order = result.scalar_one_or_none()
    if not order:
        raise PaymentError("订单不存在", "ORDER_NOT_FOUND")

    # 幂等：已支付订单直接返回（第三方回调常常重发）
    if order.status == "paid":
        logger.info(f"[payment] fulfill_order idempotent skip order_no={order_no}")
        return order, False

    if order.status != "pending":
        raise PaymentError(f"订单状态非 pending: {order.status}", "ORDER_STATUS_INVALID")

    # 金额校验：回调金额必须与下单时服务端记录一致，防篡改
    if expected_amount_cents is not None:
        order_amount_cents = int(round(float(order.amount) * 100))
        if expected_amount_cents != order_amount_cents:
            raise PaymentError(
                f"支付金额不匹配: expected={order_amount_cents} got={expected_amount_cents}",
                "AMOUNT_MISMATCH",
            )

    # 锁定用户
    user_result = await db.execute(
        select(User).where(User.id == order.user_id).with_for_update()
    )
    user = user_result.scalar_one()

    now = datetime.now(timezone.utc)

    # 发放权益
    if order.plan in MEMBER_PLANS:
        _apply_membership(user, order, now)
    elif order.plan == "topup":
        _apply_topup(db, user, order)
    else:
        raise PaymentError(f"未知订单类型: {order.plan}", "UNKNOWN_PLAN")

    # 更新订单
    order.status = "paid"
    order.paid_at = now
    if pay_trade_no:
        order.pay_trade_no = pay_trade_no

    await db.commit()
    await db.refresh(order)

    logger.info(
        f"[payment] fulfill_order success user={user.id} order_no={order_no} "
        f"plan={order.plan} amount={order.amount} trade_no={pay_trade_no}"
    )
    return order, True


# ------------------------------------------------------------------ #
#  权益发放（内部函数）
# ------------------------------------------------------------------ #


def _apply_membership(user: User, order: Order, now: datetime) -> None:
    """发放会员权益（支持续期叠加 / 升档策略）"""
    plan_info = MEMBER_PLANS[order.plan]
    days = plan_info["days"]

    # 续期策略：
    # - 同档未过期：在原到期时间上叠加
    # - 终身会员：保持 lifetime（或更长的到期时间）
    # - 其他情况（升档/首次）：以当前时间为基准
    if (
        user.member_plan == order.plan
        and user.member_expires_at
        and user.member_expires_at > now
    ):
        expires_at = user.member_expires_at + timedelta(days=days)
    elif user.member_plan == "lifetime" and order.plan != "lifetime":
        # 已是终身会员再买其他套餐：保留 lifetime，不降级
        expires_at = user.member_expires_at
        logger.warning(
            f"[payment] lifetime user {user.id} bought {order.plan}, keep lifetime"
        )
        order.expires_at = expires_at
        return
    else:
        expires_at = now + timedelta(days=days)

    user.member_plan = order.plan
    user.member_expires_at = expires_at
    order.expires_at = expires_at


def _apply_topup(db: AsyncSession, user: User, order: Order) -> None:
    """充值余额 + 写入流水"""
    user.balance_cents = (user.balance_cents or 0) + order.quota_added
    db.add(
        QuotaLog(
            user_id=user.id,
            change=order.quota_added,
            reason="topup",
            ref_id=order.id,
        )
    )
