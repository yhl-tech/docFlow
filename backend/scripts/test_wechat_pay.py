"""
微信支付配置诊断脚本
"""
import sys
from pathlib import Path

# 添加 backend 到路径
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import settings

print("=== 微信支付配置诊断 ===\n")

# 1. 检查配置
print("1. 配置检查：")
print(f"   商户号 (MCH_ID): {settings.WECHAT_MCH_ID}")
print(f"   AppID: {settings.WECHAT_APP_ID}")
print(f"   APIv3密钥: {settings.WECHAT_API_V3_KEY[:8]}...（共{len(settings.WECHAT_API_V3_KEY)}位）")
print(f"   证书序列号: {settings.WECHAT_CERT_SERIAL_NO[:20]}...")
print(f"   私钥路径: {settings.WECHAT_PRIVATE_KEY_PATH}")

# 2. 检查私钥文件
key_path = Path(settings.WECHAT_PRIVATE_KEY_PATH)
if not key_path.is_absolute():
    key_path = backend_dir / key_path

print(f"\n2. 私钥文件检查：")
if key_path.exists():
    content = key_path.read_text()
    print(f"   文件存在: {key_path}")
    print(f"   文件大小: {len(content)} 字节")
    if "BEGIN PRIVATE KEY" in content or "BEGIN RSA PRIVATE KEY" in content:
        print("   格式: 正确的 PEM 私钥格式")
    else:
        print("   格式: ⚠️ 不是标准 PEM 格式")
else:
    print(f"   ⚠️ 文件不存在: {key_path}")

# 3. 尝试初始化 SDK
print(f"\n3. SDK 初始化测试：")
try:
    from wechatpayv3 import WeChatPay, WeChatPayType
    
    private_key = key_path.read_text()
    cert_dir = backend_dir / "certs" / "platform"
    cert_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"   证书缓存目录: {cert_dir}")
    
    wxpay = WeChatPay(
        wechatpay_type=WeChatPayType.NATIVE,
        mchid=settings.WECHAT_MCH_ID,
        private_key=private_key,
        cert_serial_no=settings.WECHAT_CERT_SERIAL_NO,
        apiv3_key=settings.WECHAT_API_V3_KEY,
        appid=settings.WECHAT_APP_ID,
        cert_dir=str(cert_dir),
    )
    print("   ✅ SDK 初始化成功！")
    
    # 4. 尝试下单
    print(f"\n4. 测试下单（1分钱）：")
    code, message = wxpay.pay(
        description="测试订单",
        out_trade_no="TEST" + str(int(__import__('time').time())),
        amount={"total": 1, "currency": "CNY"},
        notify_url="https://example.com/notify",
    )
    print(f"   返回码: {code}")
    print(f"   返回信息: {message}")
    
except Exception as e:
    print(f"   ❌ 失败: {e}")
    import traceback
    traceback.print_exc()
