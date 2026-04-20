"""支付渠道抽象接口（所有渠道必须实现）"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class PayParams:
    """下单返回给前端的支付参数（按渠道决定字段）"""
    channel: str                       # mock / wechat / alipay
    pay_url: Optional[str] = None      # 网页跳转支付 URL（支付宝 Page / 微信 H5）
    code_url: Optional[str] = None     # 扫码支付 URL（微信 Native 二维码内容）
    form_html: Optional[str] = None    # 支付宝 Page 返回的 form 片段
    prepay_id: Optional[str] = None    # 微信 JSAPI prepay_id
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class NotifyResult:
    """异步回调解析结果"""
    order_no: str                      # 我方订单号
    pay_trade_no: str                  # 第三方交易号
    amount_cents: int                  # 实收金额（分）
    raw: dict[str, Any] = field(default_factory=dict)


class PaymentChannel(ABC):
    """
    支付渠道适配器抽象。

    负责：
    1. create_pay_params: 根据订单生成用户支付所需的参数（二维码 URL / 跳转 URL 等）
    2. parse_notify:      解析并验签第三方异步回调；验证失败抛异常
    3. notify_response_ok / notify_response_fail: 返回第三方要求的成功/失败响应文本
    """

    name: str = "base"

    @abstractmethod
    def is_ready(self) -> bool:
        """渠道配置是否齐全（密钥、证书等）"""

    @abstractmethod
    async def create_pay_params(
        self,
        order_no: str,
        amount_yuan: float,
        subject: str,
        notify_url: str,
    ) -> PayParams:
        """创建下单支付参数"""

    @abstractmethod
    async def parse_notify(self, raw_body: bytes, headers: dict[str, str]) -> NotifyResult:
        """验签并解析异步回调；失败抛 PaymentError"""

    def notify_response_ok(self) -> tuple[str, str]:
        """回调成功时返回给第三方的 (body, content_type)"""
        return ("SUCCESS", "text/plain")

    def notify_response_fail(self, reason: str) -> tuple[str, str]:
        """回调失败时返回给第三方的 (body, content_type)"""
        return (f"FAIL: {reason}", "text/plain")
