"""
开发辅助渠道（Mock Channel）

仅用于本地开发 / 自动化测试：
- 不对接真实支付，直接生成一个可被 /payment/dev/simulate-paid 调用的"伪支付"流程
- 必须在 settings.DEBUG=True 且 settings.ENABLE_MOCK_PAYMENT=True 时才可用
- 生产环境严禁启用
"""
from __future__ import annotations

from app.services.payment_channels.base import NotifyResult, PayParams, PaymentChannel


class MockChannel(PaymentChannel):
    name = "mock"

    def __init__(self, enabled: bool):
        self._enabled = enabled

    def is_ready(self) -> bool:
        return self._enabled

    async def create_pay_params(
        self,
        order_no: str,
        amount_yuan: float,
        subject: str,
        notify_url: str,
    ) -> PayParams:
        return PayParams(
            channel=self.name,
            pay_url=None,
            extra={
                "mock_enabled": True,
                "dev_simulate_url": f"/api/payment/dev/simulate-paid",
                "hint": "开发环境：请调用 POST /api/payment/dev/simulate-paid 模拟支付完成",
            },
        )

    async def parse_notify(self, raw_body: bytes, headers: dict[str, str]) -> NotifyResult:
        # Mock 渠道不提供 notify 入口；由 /dev/simulate-paid 直接调 fulfill_order
        raise NotImplementedError("mock 渠道不提供异步通知，请调用 /dev/simulate-paid")
