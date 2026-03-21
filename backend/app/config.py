from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


# 获取 backend 目录的绝对路径
BACKEND_DIR = Path(__file__).parent.parent
ENV_FILE = BACKEND_DIR / ".env"

print(f"[DEBUG] BACKEND_DIR: {BACKEND_DIR}")
print(f"[DEBUG] ENV_FILE exists: {ENV_FILE.exists()}")
print(f"[DEBUG] ENV_FILE: {ENV_FILE}")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # 数据库
    DATABASE_URL: str = "sqlite+aiosqlite:///./dssxz.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY: str = "dev-secret-key-please-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 天

    # 服务器
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    DEBUG: bool = False
    CORS_ORIGINS: str = "http://localhost:3000"

    # 模拟支付（开发/测试用；生产环境务必关闭）
    ENABLE_MOCK_PAYMENT: bool = False

    # 阿里云短信
    ALIYUN_ACCESS_KEY_ID: str = ""
    ALIYUN_ACCESS_KEY_SECRET: str = ""
    ALIYUN_SMS_SIGN_NAME: str = ""
    ALIYUN_SMS_TEMPLATE_CODE: str = ""

    # 微信支付
    WECHAT_MCH_ID: str = ""
    WECHAT_APP_ID: str = ""
    WECHAT_API_V3_KEY: str = ""
    WECHAT_PRIVATE_KEY_PATH: str = ""

    # 支付宝
    ALIPAY_APP_ID: str = ""
    ALIPAY_PRIVATE_KEY: str = ""
    ALIPAY_PUBLIC_KEY: str = ""

    # DeepSeek AI
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"

    # Qwen AI (阿里云)
    QWEN_API_KEY: str = ""
    QWEN_MODEL: str = "qwen-turbo"

    # API 模式: qwen / deepseek / auto (优先用 qwen)
    API_MODE: str = "auto"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")


settings = Settings()
