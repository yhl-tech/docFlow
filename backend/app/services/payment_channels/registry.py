"""支付渠道注册中心"""
from __future__ import annotations

from functools import lru_cache

from app.config import settings
from app.services.payment_channels.alipay import AlipayChannel
from app.services.payment_channels.base import PaymentChannel
from app.services.payment_channels.mock import MockChannel
from app.services.payment_channels.wechat import WechatChannel


@lru_cache(maxsize=1)
def _build_registry() -> dict[str, PaymentChannel]:
    return {
        "wechat": WechatChannel(),
        "alipay": AlipayChannel(),
        "mock": MockChannel(enabled=settings.DEBUG and settings.ENABLE_MOCK_PAYMENT),
    }


def get_channel(name: str) -> PaymentChannel | None:
    return _build_registry().get(name)


def list_available_channels() -> list[str]:
    """返回已就绪可用的渠道名列表"""
    return [name for name, ch in _build_registry().items() if ch.is_ready()]
