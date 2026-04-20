"""
支付路由（真实交易架构）

标准流程：
    1. POST /create-order          → 返回渠道对应的支付参数（code_url / pay_url / form）
    2. 用户跳转/扫码 → 在第三方完成付款
    3. 第三方异步调用 POST /wechat/notify 或 /alipay/notify
       → 验签 → PaymentService.fulfill_order() → 返回第三方规定的成功响应
    4. 前端轮询 GET /order/{order_no} 直到 status == "paid"

开发辅助：
    POST /dev/simulate-paid        （仅 DEBUG + ENABLE_MOCK_PAYMENT 开启时可用）
    用于本地联调时跳过"用户真实扫码"这一步。
"""
import time
import uuid
from typing import Annotated

from fastapi import APIRouter, Body, HTTPException, Request
from loguru import logger
from sqlalchemy import select

from app.config import settings
from app.core.dependencies import CurrentUser, DB
from app.core.limiter import limiter
from app.models.order import Order
from app.schemas.order import (
    CreateOrderRequest,
    CreateOrderResponse,
    MockConfirmRequest,
    OrderItem,
)
from app.services.payment_channels import get_channel, list_available_channels
from app.services.payment_service import (
    MEMBER_PLANS,
    TOPUP_CENTS_PER_YUAN,
    TOPUP_MAX_YUAN,
    PaymentError,
    fulfill_order,
)

router = APIRouter()


# ------------------------------------------------------------------ #
#  辅助
# ------------------------------------------------------------------ #


def _generate_order_no() -> str:
    """订单号：毫秒时间戳 + 8 位 uuid 片段；短、可排序、近似唯一"""
    return f"{int(time.time() * 1000)}{uuid.uuid4().hex[:8].upper()}"


def _build_notify_url(request: Request, channel: str) -> str:
    """构造异步回调地址（必须公网可访问）"""
    if settings.PAYMENT_NOTIFY_BASE_URL:
        base = settings.PAYMENT_NOTIFY_BASE_URL.rstrip("/")
    else:
        base = str(request.base_url).rstrip("/")
    return f"{base}/api/payment/{channel}/notify"


# ------------------------------------------------------------------ #
#  可用渠道查询（前端用来展示支付方式）
# ------------------------------------------------------------------ #


@router.get("/channels", summary="获取可用支付渠道列表")
async def get_channels():
    return {
        "available": list_available_channels(),
        "mock_enabled": settings.DEBUG and settings.ENABLE_MOCK_PAYMENT,
    }


# ------------------------------------------------------------------ #
#  下单
# ------------------------------------------------------------------ #


@router.post("/create-order", response_model=CreateOrderResponse, summary="创建支付订单")
@limiter.limit("30/minute")
async def create_order(
    request: Request,
    body: CreateOrderRequest,
    current_user: CurrentUser,
    db: DB,
):
    """
    下单流程：
    1. 服务端根据 plan 确定金额（MEMBER_PLANS 权威定价，不信任前端）
    2. 根据 pay_channel 查找已就绪的渠道适配器
    3. 调用渠道生成 pay_params，写入订单并返回
    """
    # 1. 业务金额计算
    if body.plan == "topup":
        if not body.topup_amount or body.topup_amount < 0.1:
            raise HTTPException(
                status_code=400,
                detail={"error": "充值金额至少 0.1 元", "code": "INVALID_TOPUP_AMOUNT"},
            )
        if body.topup_amount > TOPUP_MAX_YUAN:
            raise HTTPException(
                status_code=400,
                detail={"error": f"单笔充值不能超过 {TOPUP_MAX_YUAN} 元", "code": "TOPUP_AMOUNT_TOO_LARGE"},
            )
        amount = float(body.topup_amount)
        quota_added = int(body.topup_amount * TOPUP_CENTS_PER_YUAN)
        subject = f"余额充值 ¥{body.topup_amount}"
        plan_label = "topup"
    else:
        plan_info = MEMBER_PLANS[body.plan]
        amount = plan_info["price"]
        quota_added = 0
        subject = plan_info["name"]
        plan_label = body.plan

    # 2. 查找渠道
    channel = get_channel(body.pay_channel)
    if channel is None:
        raise HTTPException(
            status_code=400,
            detail={"error": "不支持的支付渠道", "code": "CHANNEL_UNKNOWN"},
        )
    if not channel.is_ready():
        raise HTTPException(
            status_code=501,
            detail={
                "error": f"{body.pay_channel} 支付暂未接入或未启用",
                "code": "CHANNEL_NOT_READY",
                "available": list_available_channels(),
            },
        )

    # 3. 先落订单（pending），后向第三方请求参数；若第三方失败则标 failed
    order_no = _generate_order_no()
    order = Order(
        user_id=current_user.id,
        order_no=order_no,
        plan=plan_label,
        amount=amount,
        quota_added=quota_added,
        pay_channel=body.pay_channel,
        status="pending",
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    notify_url = _build_notify_url(request, body.pay_channel)

    try:
        pay_params = await channel.create_pay_params(
            order_no=order_no,
            amount_yuan=amount,
            subject=subject,
            notify_url=notify_url,
        )
    except PaymentError as e:
        order.status = "failed"
        await db.commit()
        logger.warning(f"[payment] create_pay_params failed order_no={order_no} err={e.message}")
        raise HTTPException(
            status_code=502,
            detail={"error": e.message, "code": e.code},
        )

    logger.info(
        f"[payment] order created user={current_user.id} order_no={order_no} "
        f"plan={plan_label} amount={amount} channel={body.pay_channel}"
    )

    return CreateOrderResponse(
        order_no=order_no,
        amount=amount,
        plan=plan_label,
        pay_params={
            "order_no": order_no,
            "channel": pay_params.channel,
            "pay_url": pay_params.pay_url,
            "code_url": pay_params.code_url,
            "form_html": pay_params.form_html,
            "prepay_id": pay_params.prepay_id,
            **pay_params.extra,
        },
    )


# ------------------------------------------------------------------ #
#  真实异步回调
# ------------------------------------------------------------------ #


@router.post("/wechat/notify", summary="微信支付异步回调")
async def wechat_notify(request: Request, db: DB):
    """
    微信 V3 回调。我方职责：验签 → 解析 → 履约 → 返回微信要求的 200 JSON。
    返回 5xx 或非标准响应时微信会重试。
    """
    channel = get_channel("wechat")
    if channel is None or not channel.is_ready():
        raise HTTPException(status_code=501, detail={"error": "微信支付未启用", "code": "CHANNEL_NOT_READY"})

    raw = await request.body()
    headers = dict(request.headers)

    try:
        result = await channel.parse_notify(raw, headers)
    except PaymentError as e:
        logger.warning(f"[wechat/notify] 验签/解析失败: {e.message}")
        body, ct = channel.notify_response_fail(e.code)
        return _raw_response(body, ct, status_code=400)

    try:
        await fulfill_order(
            db,
            order_no=result.order_no,
            pay_trade_no=result.pay_trade_no,
            expected_amount_cents=result.amount_cents,
        )
    except PaymentError as e:
        logger.error(f"[wechat/notify] 履约失败 order_no={result.order_no}: {e.message}")
        body, ct = channel.notify_response_fail(e.code)
        # ORDER_NOT_FOUND 时返回 4xx 让微信停止重试；其他返回 5xx 触发重试
        status_code = 400 if e.code == "ORDER_NOT_FOUND" else 500
        return _raw_response(body, ct, status_code=status_code)

    body, ct = channel.notify_response_ok()
    return _raw_response(body, ct)


@router.post("/alipay/notify", summary="支付宝异步回调")
async def alipay_notify(request: Request, db: DB):
    """
    支付宝回调。验签通过后必须回复 "success"（纯文本），否则支付宝会重试最多 8 次。
    """
    channel = get_channel("alipay")
    if channel is None or not channel.is_ready():
        raise HTTPException(status_code=501, detail={"error": "支付宝未启用", "code": "CHANNEL_NOT_READY"})

    raw = await request.body()
    headers = dict(request.headers)

    try:
        result = await channel.parse_notify(raw, headers)
    except PaymentError as e:
        logger.warning(f"[alipay/notify] 验签/解析失败: {e.message}")
        body, ct = channel.notify_response_fail(e.code)
        return _raw_response(body, ct, status_code=400)

    try:
        await fulfill_order(
            db,
            order_no=result.order_no,
            pay_trade_no=result.pay_trade_no,
            expected_amount_cents=result.amount_cents,
        )
    except PaymentError as e:
        logger.error(f"[alipay/notify] 履约失败 order_no={result.order_no}: {e.message}")
        body, ct = channel.notify_response_fail(e.code)
        return _raw_response(body, ct, status_code=500)

    body, ct = channel.notify_response_ok()
    return _raw_response(body, ct)


# ------------------------------------------------------------------ #
#  订单查询（前端轮询）
# ------------------------------------------------------------------ #


@router.get("/order/{order_no}", response_model=OrderItem, summary="查询订单状态")
async def get_order(order_no: str, current_user: CurrentUser, db: DB):
    """
    前端在唤起支付后应轮询本接口（建议 2s/次、最长 5 分钟），
    直到 status == "paid" 再跳转"支付成功"页。
    
    对于 pending 状态的微信订单，会主动向微信查询以确认支付状态。
    """
    result = await db.execute(
        select(Order).where(Order.order_no == order_no, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail={"error": "订单不存在", "code": "NOT_FOUND"})

    # 对于 pending 状态的微信订单，主动向微信查询
    if order.status == "pending" and order.pay_channel == "wechat":
        channel = get_channel("wechat")
        if channel and channel.is_ready():
            wx_result = await channel.query_order(order_no)
            if wx_result and wx_result.get("trade_state") == "SUCCESS":
                # 微信已支付成功，执行履约
                try:
                    order, _ = await fulfill_order(
                        db,
                        order_no=order_no,
                        pay_trade_no=wx_result.get("transaction_id", ""),
                        expected_amount_cents=wx_result.get("amount", {}).get("total", 0),
                    )
                    logger.info(f"[payment] 主动查单触发履约成功 order_no={order_no}")
                except PaymentError as e:
                    logger.warning(f"[payment] 主动查单履约失败 order_no={order_no}: {e.message}")

    return OrderItem.model_validate(order)


# ------------------------------------------------------------------ #
#  开发辅助：模拟用户完成扫码（绝非 mock_confirm，不代替真实回调）
# ------------------------------------------------------------------ #


@router.post(
    "/dev/simulate-paid",
    summary="【开发专用】模拟用户在第三方完成支付（仅 DEBUG + MOCK 开启时可用）",
)
@limiter.limit("20/minute")
async def dev_simulate_paid(
    request: Request,
    body: Annotated[MockConfirmRequest, Body()],
    current_user: CurrentUser,
    db: DB,
):
    """
    这不是真实支付接口，不对应任何生产流量。

    仅用途：本地联调时，前端下完 mock 单后调用本接口，触发与真实回调**同一条**履约链路
    （PaymentService.fulfill_order），以便完整测试"下单→履约→轮询→刷新"的闭环。

    安全门（三重）：
      1. settings.DEBUG 必须为 True
      2. settings.ENABLE_MOCK_PAYMENT 必须为 True
      3. 目标订单的 pay_channel 必须为 "mock"（禁止借此伪造真实渠道订单）
    """
    if not (settings.DEBUG and settings.ENABLE_MOCK_PAYMENT):
        raise HTTPException(
            status_code=403,
            detail={"error": "模拟支付仅在开发环境可用", "code": "DEV_ONLY"},
        )

    # 查订单 + 鉴权（必须属于当前用户 + 必须是 mock 渠道）
    result = await db.execute(
        select(Order).where(Order.order_no == body.order_no, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail={"error": "订单不存在", "code": "ORDER_NOT_FOUND"})
    if order.pay_channel != "mock":
        raise HTTPException(
            status_code=403,
            detail={"error": "仅 mock 渠道订单可模拟支付", "code": "CHANNEL_MISMATCH"},
        )

    # 调用与真实回调同一条履约链路
    try:
        order, newly = await fulfill_order(
            db,
            order_no=body.order_no,
            pay_trade_no=f"DEV-SIM-{body.order_no}",
            expected_amount_cents=int(round(float(order.amount) * 100)),
        )
    except PaymentError as e:
        raise HTTPException(status_code=400, detail={"error": e.message, "code": e.code})

    return {
        "success": True,
        "order_no": order.order_no,
        "status": order.status,
        "newly_fulfilled": newly,
    }


# ------------------------------------------------------------------ #
#  内部：原始响应（绕过 Pydantic 序列化）
# ------------------------------------------------------------------ #


def _raw_response(body: str, content_type: str, status_code: int = 200):
    from fastapi.responses import Response
    return Response(content=body, media_type=content_type, status_code=status_code)
