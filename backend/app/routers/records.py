from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.core.dependencies import CurrentUser, DB
from app.models.record import ExportRecord
from app.schemas.common import MessageResponse
from app.schemas.record import RecordItem, RecordList, RecordStats

router = APIRouter()


@router.get("", response_model=RecordList, summary="转换记录列表")
async def list_records(
    current_user: CurrentUser,
    db: DB,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * size

    total_result = await db.execute(
        select(func.count()).where(
            ExportRecord.user_id == current_user.id,
            ExportRecord.is_deleted == False,
        )
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(ExportRecord)
        .where(ExportRecord.user_id == current_user.id, ExportRecord.is_deleted == False)
        .order_by(ExportRecord.created_at.desc())
        .offset(offset)
        .limit(size)
    )
    records = result.scalars().all()

    return RecordList(
        total=total,
        page=page,
        size=size,
        items=[RecordItem.model_validate(r) for r in records],
    )


@router.get("/stats", response_model=RecordStats, summary="转换统计")
async def get_stats(current_user: CurrentUser, db: DB):
    from datetime import datetime, timezone
    from sqlalchemy import and_

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_result = await db.execute(
        select(func.count()).where(
            ExportRecord.user_id == current_user.id,
            ExportRecord.is_deleted == False,
        )
    )
    total = total_result.scalar_one()

    month_result = await db.execute(
        select(func.count()).where(
            ExportRecord.user_id == current_user.id,
            ExportRecord.is_deleted == False,
            ExportRecord.created_at >= month_start,
        )
    )
    this_month = month_result.scalar_one()

    success_result = await db.execute(
        select(func.count()).where(
            ExportRecord.user_id == current_user.id,
            ExportRecord.is_deleted == False,
            ExportRecord.status == "success",
        )
    )
    success_count = success_result.scalar_one()

    return RecordStats(
        total=total,
        this_month=this_month,
        success_count=success_count,
        failed_count=total - success_count,
    )


@router.delete("/{record_id}", response_model=MessageResponse, summary="删除记录")
async def delete_record(record_id: str, current_user: CurrentUser, db: DB):
    from fastapi import HTTPException

    result = await db.execute(
        select(ExportRecord).where(
            ExportRecord.id == record_id,
            ExportRecord.user_id == current_user.id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail={"error": "记录不存在", "code": "NOT_FOUND"})

    record.is_deleted = True
    db.add(record)
    return MessageResponse(message="删除成功")
