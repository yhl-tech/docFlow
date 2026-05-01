from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event, inspect, text

from app.config import settings

connect_args = {"check_same_thread": False} if settings.is_sqlite else {}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args=connect_args,
    isolation_level="SERIALIZABLE" if settings.is_sqlite else None,
)


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.is_sqlite:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """创建所有数据表（仅开发/测试用，生产环境用 Alembic 迁移）"""
    async with engine.begin() as conn:
        from app.models import user, record, order, document, sms_code, document_template  # noqa: F401 确保模型已注册
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_ensure_editor_schema)


def _ensure_editor_schema(sync_conn) -> None:
    inspector = inspect(sync_conn)
    tables = set(inspector.get_table_names())

    if "documents" in tables:
        columns = {col["name"] for col in inspector.get_columns("documents")}
        if "template_binding_json" not in columns:
            sync_conn.execute(
                text("ALTER TABLE documents ADD COLUMN template_binding_json TEXT DEFAULT ''")
            )
