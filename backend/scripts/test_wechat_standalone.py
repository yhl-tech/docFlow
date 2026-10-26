"""
微信支付独立诊断脚本（公钥模式）

Reads merchant credentials from the environment. Do not hardcode them.
"""
import os
from pathlib import Path

WECHAT_MCH_ID = os.environ.get("WECHAT_MCH_ID", "")
WECHAT_APP_ID = os.environ.get("WECHAT_APP_ID", "")
WECHAT_API_V3_KEY = os.environ.get("WECHAT_API_V3_KEY", "")
WECHAT_CERT_SERIAL_NO = os.environ.get("WECHAT_CERT_SERIAL_NO", "")
WECHAT_PUBLIC_KEY_ID = os.environ.get("WECHAT_PUBLIC_KEY_ID", "")
_missing = [
    name
    for name, value in {
        "WECHAT_MCH_ID": WECHAT_MCH_ID,
        "WECHAT_APP_ID": WECHAT_APP_ID,
        "WECHAT_API_V3_KEY": WECHAT_API_V3_KEY,
        "WECHAT_CERT_SERIAL_NO": WECHAT_CERT_SERIAL_NO,
        "WECHAT_PUBLIC_KEY_ID": WECHAT_PUBLIC_KEY_ID,
    }.items()
    if not value
]
if _missing:
    raise SystemExit(
        "Missing WeChat environment variables: "
        + ", ".join(_missing)
        + ". Copy backend/.env.example to backend/.env and export those values."
    )

backend_dir = Path(__file__).parent.parent
key_path = backend_dir / "certs" / "apiclient_key.pem"
public_key_path = backend_dir / "certs" / "wechatpay_public_key.pem"

print("=== 微信支付配置诊断（公钥模式）===\n")

print("1. 配置：")
print(f"   商户号: {WECHAT_MCH_ID}")
print(f"   AppID: {WECHAT_APP_ID}")
print(f"   APIv3密钥: {WECHAT_API_V3_KEY[:8]}...（{len(WECHAT_API_V3_KEY)}位）")
print(f"   证书序列号: {WECHAT_CERT_SERIAL_NO[:20]}...")
print(f"   公钥ID: {WECHAT_PUBLIC_KEY_ID[:30]}...")

print(f"\n2. 文件检查：")
private_key = key_path.read_text() if key_path.exists() else None
public_key = public_key_path.read_text() if public_key_path.exists() else None
print(f"   私钥: {'✅ 存在' if private_key else '❌ 缺失'}")
print(f"   公钥: {'✅ 存在' if public_key else '❌ 缺失'}")

if not private_key or not public_key:
    exit(1)

print(f"\n3. SDK 初始化（公钥模式）：")
try:
    from wechatpayv3 import WeChatPay, WeChatPayType
    
    wxpay = WeChatPay(
        wechatpay_type=WeChatPayType.NATIVE,
        mchid=WECHAT_MCH_ID,
        private_key=private_key,
        cert_serial_no=WECHAT_CERT_SERIAL_NO,
        apiv3_key=WECHAT_API_V3_KEY,
        appid=WECHAT_APP_ID,
        public_key=public_key,
        public_key_id=WECHAT_PUBLIC_KEY_ID,
    )
    print("   ✅ 初始化成功！")
    
    print(f"\n4. 测试下单（1分钱）：")
    import time
    code, message = wxpay.pay(
        description="测试订单",
        out_trade_no=f"TEST{int(time.time())}",
        amount={"total": 1, "currency": "CNY"},
        notify_url="https://example.com/notify",
    )
    print(f"   HTTP状态码: {code}")
    print(f"   响应: {message}")
    
    if code == 200:
        print("   ✅ 下单成功！微信支付配置正确。")
    
except Exception as e:
    print(f"   ❌ 错误: {e}")
