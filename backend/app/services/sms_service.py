import random
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from loguru import logger

from sqlalchemy import select, update, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.config import settings


class SMSServiceError(Exception):
    """短信服务异常"""
    pass


class SMSService:
    """短信服务"""

    CODE_EXPIRE_MINUTES = 5
    SEND_INTERVAL_SECONDS = 60
    MAX_VERIFY_COUNT = 3

    def __init__(self):
        self.access_key_id = settings.ALIYUN_ACCESS_KEY_ID
        self.access_key_secret = settings.ALIYUN_ACCESS_KEY_SECRET
        self.sign_name = settings.ALIYUN_SMS_SIGN_NAME
        self.template_code = settings.ALIYUN_SMS_TEMPLATE_CODE

    def _validate_phone(self, phone: str) -> bool:
        pattern = r"^1[3-9]\d{9}$"
        return bool(re.match(pattern, phone))

    def generate_code(self) -> str:
        return f"{random.randint(0, 999999):06d}"

    async def send_sms(self, phone: str, code: str, template_type: str = "login") -> bool:
        if not self._validate_phone(phone):
            raise SMSServiceError("手机号格式不正确")

        if not self.access_key_id or not self.access_key_secret:
            logger.warning(f"阿里云短信未配置，跳过真实发送，验证码: {code}")
            return True

        try:
            from alibabacloud_dysmsapi20170525 import Client
            from alibabacloud_tea_openapi import models as open_api_models
            from alibabacloud_dysmsapi20170525 import models as dysms_models

            config = open_api_models.Config(
                access_key_id=self.access_key_id,
                access_key_secret=self.access_key_secret,
            )
            config.endpoint = "dysmsapi.aliyuncs.com"

            client = Client(config)
            request = dysms_models.SendSmsRequest(
                phone_numbers=phone,
                sign_name=self.sign_name,
                template_code=self.template_code,
                template_param=f'{{"code":"{code}"}}',
            )
            response = await self._send_sms_async(client, request)
            return response.body.code == "OK"

        except ImportError:
            logger.warning("阿里云短信 SDK 未安装，使用模拟发送")
            logger.info(f"模拟发送短信到 {phone}，验证码: {code}")
            return True
        except Exception as e:
            logger.error(f"发送短信失败: {e}")
            raise SMSServiceError(f"发送短信失败: {str(e)}")

    async def _send_sms_async(self, client, request):
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, client.send_sms, request)


# 全局单例
sms_service = SMSService()


class SmsCodeManager:
    """短信验证码管理器（数据库存储）"""

    # 验证码有效期（分钟）
    CODE_EXPIRE_MINUTES = 5

    # 最大验证次数
    MAX_VERIFY_COUNT = 3

    # 发送间隔（秒）
    SEND_INTERVAL_SECONDS = 60

    @classmethod
    async def save_code(cls, phone: str, code: str, code_type: str = "login") -> datetime:
        """保存验证码到数据库"""
        from app.models.sms_code import SmsCode

        expires_at = datetime.now(timezone.utc) + timedelta(minutes=cls.CODE_EXPIRE_MINUTES)

        async with AsyncSessionLocal() as db:
            # 先将该手机号+类型的旧记录标记为已使用
            await db.execute(
                update(SmsCode)
                .where(and_(SmsCode.phone == phone, SmsCode.type == code_type))
                .values(is_used=True)
            )

            # 插入新记录
            record = SmsCode(
                id=str(uuid.uuid4()),
                phone=phone,
                code=code,
                type=code_type,
                expires_at=expires_at,
                verify_count=0,
                is_used=False,
            )
            db.add(record)
            await db.commit()

        return expires_at

    @classmethod
    async def verify_code(cls, phone: str, code: str, code_type: str = "login") -> bool:
        """验证验证码"""
        from app.models.sms_code import SmsCode

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(SmsCode).where(
                    and_(
                        SmsCode.phone == phone,
                        SmsCode.type == code_type,
                        SmsCode.is_used == False,
                    )
                )
            )
            record = result.scalar_one_or_none()

            if not record:
                return False

            # 检查是否过期
            if datetime.now(timezone.utc) > record.expires_at.replace(tzinfo=timezone.utc):
                await db.execute(
                    update(SmsCode)
                    .where(SmsCode.id == record.id)
                    .values(is_used=True)
                )
                await db.commit()
                return False

            # 检查验证次数
            if record.verify_count >= cls.MAX_VERIFY_COUNT:
                await db.execute(
                    update(SmsCode)
                    .where(SmsCode.id == record.id)
                    .values(is_used=True)
                )
                await db.commit()
                return False

            # 验证码匹配
            if record.code == code:
                await db.execute(
                    update(SmsCode)
                    .where(SmsCode.id == record.id)
                    .values(verify_count=record.verify_count + 1)
                )
                await db.commit()
                return True

            # 验证码错误，增加计数
            await db.execute(
                update(SmsCode)
                .where(SmsCode.id == record.id)
                .values(verify_count=record.verify_count + 1)
            )
            await db.commit()
            return False

    @classmethod
    async def can_send(cls, phone: str) -> tuple[bool, int]:
        """检查是否可以发送短信"""
        from app.models.sms_code import SmsCode

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(SmsCode)
                .where(and_(SmsCode.phone == phone, SmsCode.is_used == False))
                .order_by(SmsCode.created_at.desc())
                .limit(1)
            )
            record = result.scalar_one_or_none()

            if not record:
                return True, 0

            elapsed = (datetime.now(timezone.utc) - record.created_at.replace(tzinfo=timezone.utc)).total_seconds()
            remaining = cls.SEND_INTERVAL_SECONDS - elapsed

            if remaining > 0:
                return False, int(remaining)

            return True, 0

    @classmethod
    async def delete_code(cls, phone: str, code_type: str = "login", db: AsyncSession | None = None):
        """删除验证码（标记为已使用）"""
        from app.models.sms_code import SmsCode

        if db is not None:
            await db.execute(
                update(SmsCode)
                .where(and_(SmsCode.phone == phone, SmsCode.type == code_type))
                .values(is_used=True)
            )
        else:
            async with AsyncSessionLocal() as session:
                await session.execute(
                    update(SmsCode)
                    .where(and_(SmsCode.phone == phone, SmsCode.type == code_type))
                    .values(is_used=True)
                )
                await session.commit()


# 全局单例
sms_code_manager = SmsCodeManager()
