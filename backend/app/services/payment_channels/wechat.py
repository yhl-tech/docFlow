"""
微信支付 V3 渠道适配器（Native 扫码支付）

下单：POST https://api.mch.weixin.qq.com/v3/pay/transactions/native
回调：微信异步 POST 到 notify_url，Header 带签名，Body 为加密 JSON

前置配置（.env）：
    WECHAT_MCH_ID            商户号
    WECHAT_APP_ID            应用 AppID
    WECHAT_API_V3_KEY        APIv3 密钥（32位）
    WECHAT_PRIVATE_KEY_PATH  商户私钥路径（apiclient_key.pem）
    WECHAT_CERT_SERIAL_NO    商户证书序列号
    WECHAT_PUBLIC_KEY_ID     微信支付公钥ID（PUB_KEY_ID_xxx）
    WECHAT_PUBLIC_KEY_PATH   微信支付公钥路径
"""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

from loguru import logger

from app.config import settings
from app.services.payment_channels.base import NotifyResult, PayParams, PaymentChannel
from app.services.payment_service import PaymentError

BACKEND_DIR = Path(__file__).parent.parent.parent.parent


def _load_file(path_str: str) -> str:
    """读取文件内容，支持相对路径"""
    path = Path(path_str)
    if not path.is_absolute():
        path = BACKEND_DIR / path
    return path.read_text(encoding="utf-8")


def _build_wxpay():
    """构造 WeChatPay 实例（使用公钥模式）"""
    from wechatpayv3 import WeChatPay, WeChatPayType

    private_key = _load_file(settings.WECHAT_PRIVATE_KEY_PATH)
    public_key = _load_file(settings.WECHAT_PUBLIC_KEY_PATH)
    
    return WeChatPay(
        wechatpay_type=WeChatPayType.NATIVE,
        mchid=settings.WECHAT_MCH_ID,
        private_key=private_key,
        cert_serial_no=settings.WECHAT_CERT_SERIAL_NO,
        apiv3_key=settings.WECHAT_API_V3_KEY,
        appid=settings.WECHAT_APP_ID,
        public_key=public_key,
        public_key_id=settings.WECHAT_PUBLIC_KEY_ID,
    )


class WechatChannel(PaymentChannel):
    name = "wechat"

    def is_ready(self) -> bool:
        return bool(
            settings.WECHAT_MCH_ID
            and settings.WECHAT_APP_ID
            and settings.WECHAT_API_V3_KEY
            and settings.WECHAT_PRIVATE_KEY_PATH
            and settings.WECHAT_CERT_SERIAL_NO
            and settings.WECHAT_PUBLIC_KEY_ID
            and settings.WECHAT_PUBLIC_KEY_PATH
        )

    async def create_pay_params(
        self,
        order_no: str,
        amount_yuan: float,
        subject: str,
        notify_url: str,
    ) -> PayParams:
        if not self.is_ready():
            raise PaymentError("微信支付未配置完整", "CHANNEL_NOT_READY")

        amount_cents = int(round(amount_yuan * 100))

        def _sync_pay():
            wxpay = _build_wxpay()
            code, message = wxpay.pay(
                description=subject,
                out_trade_no=order_no,
                amount={"total": amount_cents, "currency": "CNY"},
                notify_url=notify_url,
            )
            return code, message

        loop = asyncio.get_event_loop()
        try:
            code, message = await loop.run_in_executor(None, _sync_pay)
        except Exception as exc:
            logger.exception(f"[wechat] 调用微信下单接口异常: {exc}")
            raise PaymentError(f"微信下单异常: {exc}", "WECHAT_PAY_ERROR")

        if code != 200:
            logger.error(f"[wechat] 下单失败 code={code} message={message}")
            try:
                err_detail = json.loads(message) if isinstance(message, str) else message
                err_msg = err_detail.get("message") or err_detail.get("code") or str(message)
            except Exception:
                err_msg = str(message)
            raise PaymentError(f"微信下单失败: {err_msg}", "WECHAT_PAY_FAILED")

        try:
            resp = json.loads(message) if isinstance(message, str) else message
            code_url = resp["code_url"]
        except (KeyError, json.JSONDecodeError) as exc:
            logger.error(f"[wechat] 解析 code_url 失败: {message}")
            raise PaymentError("微信下单响应格式异常", "WECHAT_RESPONSE_ERROR")

        logger.info(f"[wechat] 下单成功 order_no={order_no} amount={amount_cents}分")
        return PayParams(
            channel="wechat",
            code_url=code_url,
        )

    async def query_order(self, order_no: str) -> dict | None:
        """
        主动查询微信订单状态
        返回 {"trade_state": "SUCCESS", "transaction_id": "...", "amount": ...} 或 None
        """
        if not self.is_ready():
            return None

        def _sync_query():
            wxpay = _build_wxpay()
            code, message = wxpay.query(out_trade_no=order_no)
            return code, message

        loop = asyncio.get_event_loop()
        try:
            code, message = await loop.run_in_executor(None, _sync_query)
        except Exception as exc:
            logger.warning(f"[wechat] 查询订单异常 order_no={order_no}: {exc}")
            return None

        if code != 200:
            logger.warning(f"[wechat] 查询订单失败 order_no={order_no} code={code}")
            return None

        try:
            result = json.loads(message) if isinstance(message, str) else message
            logger.info(f"[wechat] 查询订单结果 order_no={order_no}: trade_state={result.get('trade_state')}")
            return result
        except Exception:
            return None

    async def parse_notify(self, raw_body: bytes, headers: dict[str, str]) -> NotifyResult:
        if not self.is_ready():
            raise PaymentError("微信支付未配置", "CHANNEL_NOT_READY")

        body_str = raw_body.decode("utf-8")

        def _sync_callback():
            wxpay = _build_wxpay()
            # SDK 自动完成：验签 + AES-GCM 解密 resource.ciphertext
            return wxpay.callback(headers=headers, body=body_str)

        loop = asyncio.get_event_loop()
        try:
            result = await loop.run_in_executor(None, _sync_callback)
        except Exception as exc:
            logger.exception(f"[wechat] 回调验签/解密异常: {exc}")
            raise PaymentError(f"回调处理异常: {exc}", "NOTIFY_EXCEPTION")

        if result is None:
            logger.warning("[wechat] 回调验签失败或解密失败（result=None）")
            raise PaymentError("微信回调验签失败", "NOTIFY_VERIFY_FAILED")

        # 打印完整回调数据用于调试
        logger.info(f"[wechat] 回调解密后数据: {result}")

        trade_state = result.get("trade_state", "")
        if trade_state != "SUCCESS":
            # 对于非成功状态，记录但不抛异常（返回成功让微信停止重试）
            logger.info(f"[wechat] 回调 trade_state={trade_state}，非成功状态")
            raise PaymentError(f"非支付成功回调: {trade_state}", "TRADE_NOT_SUCCESS")

        order_no = result.get("out_trade_no", "")
        transaction_id = result.get("transaction_id", "")
        amount_cents = result.get("amount", {}).get("total", 0)

        if not order_no or not transaction_id:
            logger.error(f"[wechat] 回调缺少关键字段: {result}")
            raise PaymentError("回调数据不完整", "NOTIFY_DATA_INCOMPLETE")

        logger.info(
            f"[wechat] 回调解析成功 order_no={order_no} "
            f"transaction_id={transaction_id} amount={amount_cents}分"
        )
        return NotifyResult(
            order_no=order_no,
            pay_trade_no=transaction_id,
            amount_cents=amount_cents,
            raw=result,
        )

    def notify_response_ok(self) -> tuple[str, str]:
        return ('{"code":"SUCCESS","message":"成功"}', "application/json")

    def notify_response_fail(self, reason: str) -> tuple[str, str]:
        return (f'{{"code":"FAIL","message":"{reason}"}}', "application/json")
