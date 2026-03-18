from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.core.dependencies import CurrentUser, DB
from app.models.order import Order
from app.schemas.order import OrderItem, OrderList
from app.schemas.user import QuotaInfo

router = APIRouter()


@router.get("/quota", response_model=QuotaInfo, summary="查询剩余导出次数")
async def get_quota(current_user: CurrentUser):
    return QuotaInfo(
        plan=current_user.plan,
        quota_total=current_user.quota_total,
        quota_used=current_user.quota_used,
        quota_remaining=current_user.quota_remaining,
        quota_reset_at=current_user.quota_reset_at,
    )


@router.get("/orders", response_model=OrderList, summary="订单列表")
async def list_orders(
    current_user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * size

    total_result = await db.execute(
        select(func.count()).where(Order.user_id == current_user.id)
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(Order)
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .offset(offset)
        .limit(size)
    )
    orders = result.scalars().all()

    return OrderList(
        total=total,
        page=page,
        size=size,
        items=[OrderItem.model_validate(o) for o in orders],
    )
