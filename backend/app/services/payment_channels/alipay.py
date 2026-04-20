"""
支付宝渠道适配器（电脑网站支付 / 手机网站支付）

下单：返回一段 form HTML，前端自动提交跳转至支付宝收银台
回调：支付宝异步 POST form 表单到 notify_url，含 sign 字段

接入前置条件：
- 应用 ALIPAY_APP_ID
- 应用私钥 ALIPAY_PRIVATE_KEY（用于请求签名）
- 支付宝公钥 ALIPAY_PUBLIC_KEY（用于验证回调签名）

注：本文件实现的是**架构骨架**，当密钥配齐后启用 python-alipay-sdk 或手写 RSA2 签名即可对接。
"""
from __future__ import annotations

from typing import Any

from loguru import logger

from app.config import settings
from app.services.payment_channels.base import NotifyResult, PayParams, PaymentChannel
from app.services.payment_service import PaymentError


class AlipayChannel(PaymentChannel):
    name = "alipay"

    def is_ready(self) -> bool:
        return bool(
            settings.ALIPAY_APP_ID
            and settings.ALIPAY_PRIVATE_KEY
            and settings.ALIPAY_PUBLIC_KEY
        )

    async def create_pay_params(
        self,
        order_no: str,
        amount_yuan: float,
        subject: str,
        notify_url: str,
    ) -> PayParams:
        if not self.is_ready():
            raise PaymentError("支付宝未配置", "CHANNEL_NOT_READY")

        # ==================================================================
        # TODO: 真实对接时替换为调用 python-alipay-sdk
        # 伪代码：
        #   from alipay import AliPay
        #   ap = AliPay(appid=..., app_private_key_string=..., alipay_public_key_string=..., sign_type="RSA2")
        #   order_string = ap.api_alipay_trade_page_pay(
        #       subject=subject,
        #       out_trade_no=order_no,
        #       total_amount=str(amount_yuan),
        #       return_url="https://yourdomain.com/pay/result",
        #       notify_url=notify_url,
        #   )
        #   pay_url = f"https://openapi.alipay.com/gateway.do?{order_string}"
        # ==================================================================
        logger.warning("[alipay] create_pay_params 尚未接入真实 SDK")
        raise PaymentError("支付宝暂未接入真实网关", "CHANNEL_NOT_IMPLEMENTED")

    async def parse_notify(self, raw_body: bytes, headers: dict[str, str]) -> NotifyResult:
        if not self.is_ready():
            raise PaymentError("支付宝未配置", "CHANNEL_NOT_READY")

        # ==================================================================
        # TODO: 真实对接时完成：
        # 1. 解析 form-urlencoded body 为 dict
        # 2. 用 ALIPAY_PUBLIC_KEY 验证 sign 字段（RSA2），防伪造
        # 3. 校验 app_id 与 ALIPAY_APP_ID 一致
        # 4. 提取 out_trade_no / trade_no / total_amount / trade_status
        # 5. 仅当 trade_status in ("TRADE_SUCCESS", "TRADE_FINISHED") 时视为支付成功
        # ==================================================================
        logger.warning("[alipay] parse_notify 尚未接入真实验签")
        raise PaymentError("支付宝回调解析暂未接入", "CHANNEL_NOT_IMPLEMENTED")

    def notify_response_ok(self) -> tuple[str, str]:
        return ("success", "text/plain")

    def notify_response_fail(self, reason: str) -> tuple[str, str]:
        return ("fail", "text/plain")
