from contextlib import asynccontextmanager
from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.limiter import limiter
from app.database import init_db
from app.routers import auth, export, records, user, payment, ai, editor


# 配置 loguru 日志输出到 stdout（确保终端能看到日志）
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="DEBUG",  # 开发环境使用 DEBUG 级别
    colorize=True,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("启动服务，初始化数据库...")
    await init_db()
    logger.info("服务启动完成")
    yield
    logger.info("服务关闭")


app = FastAPI(
    title="DS随心转 API",
    description="AI 文档导出平台后端接口",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# 限流
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 统一异常处理
register_exception_handlers(app)

# 注册路由
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(export.router, prefix="/api/export", tags=["导出"])
app.include_router(records.router, prefix="/api/records", tags=["转换记录"])
app.include_router(user.router, prefix="/api/user", tags=["用户"])
app.include_router(payment.router, prefix="/api/payment", tags=["支付"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI编辑"])
app.include_router(editor.router, prefix="/api/editor", tags=["编辑器"])

# 静态文件（上传图片等）
_assets_dir = Path(__file__).parent.parent / "assets"
_assets_dir.mkdir(exist_ok=True)
# 确保导出模板目录存在
templates_dir = _assets_dir / "templates" / "docx"
templates_dir.mkdir(parents=True, exist_ok=True)
app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")


@app.get("/health", tags=["健康检查"])
async def health():
    return {"status": "ok", "version": "1.0.0"}
