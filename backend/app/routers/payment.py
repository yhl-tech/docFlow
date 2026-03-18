from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select

from app.core.dependencies import CurrentUser, DB
from app.models.order import Order
from app.schemas.order import CreateOrderRequest, CreateOrderResponse, OrderItem

router = APIRouter()


@router.post("/create-order", response_model=CreateOrderResponse, summary="创建支付订单")
async def create_order(body: CreateOrderRequest, current_user: CurrentUser, db: DB):
    # TODO: 实现订单创建 + 微信/支付宝支付参数生成
    raise HTTPException(
        status_code=501,
        detail={"error": "支付功能暂未实现", "code": "NOT_IMPLEMENTED"},
    )


@router.post("/wechat/notify", summary="微信支付回调")
async def wechat_notify(request: Request, db: DB):
    # TODO: 验证微信签名 + 更新订单状态 + 增加额度
    raise HTTPException(
        status_code=501,
        detail={"error": "微信支付回调暂未实现", "code": "NOT_IMPLEMENTED"},
    )


@router.post("/alipay/notify", summary="支付宝回调")
async def alipay_notify(request: Request, db: DB):
    # TODO: 验证支付宝签名 + 更新订单状态 + 增加额度
    raise HTTPException(
        status_code=501,
        detail={"error": "支付宝回调暂未实现", "code": "NOT_IMPLEMENTED"},
    )


@router.get("/order/{order_no}", response_model=OrderItem, summary="查询订单状态")
async def get_order(order_no: str, current_user: CurrentUser, db: DB):
    result = await db.execute(
        select(Order).where(Order.order_no == order_no, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail={"error": "订单不存在", "code": "NOT_FOUND"})
    return OrderItem.model_validate(order)
