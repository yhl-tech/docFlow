"""
微信支付深度诊断 - 直接调用微信 API 检查配置
"""
import json
import os
import time
import base64
import hashlib
import requests
from pathlib import Path
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend

# Credentials come from the environment. Never hardcode merchant secrets.
WECHAT_MCH_ID = os.environ.get("WECHAT_MCH_ID", "")
WECHAT_APP_ID = os.environ.get("WECHAT_APP_ID", "")
WECHAT_API_V3_KEY = os.environ.get("WECHAT_API_V3_KEY", "")
WECHAT_CERT_SERIAL_NO = os.environ.get("WECHAT_CERT_SERIAL_NO", "")
_missing = [
    name
    for name, value in {
        "WECHAT_MCH_ID": WECHAT_MCH_ID,
        "WECHAT_APP_ID": WECHAT_APP_ID,
        "WECHAT_API_V3_KEY": WECHAT_API_V3_KEY,
        "WECHAT_CERT_SERIAL_NO": WECHAT_CERT_SERIAL_NO,
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

print("=== 微信支付深度诊断 ===\n")

# 1. 加载私钥
print("1. 加载私钥...")
try:
    private_key_pem = key_path.read_bytes()
    private_key = serialization.load_pem_private_key(
        private_key_pem, password=None, backend=default_backend()
    )
    print("   ✅ 私钥加载成功")
except Exception as e:
    print(f"   ❌ 私钥加载失败: {e}")
    exit(1)

# 2. 生成签名
print("\n2. 生成请求签名...")
url = "https://api.mch.weixin.qq.com/v3/certificates"
method = "GET"
timestamp = str(int(time.time()))
nonce = hashlib.md5(str(time.time()).encode()).hexdigest()[:32]

sign_str = f"{method}\n/v3/certificates\n{timestamp}\n{nonce}\n\n"
print(f"   签名串: {repr(sign_str[:50])}...")

try:
    signature = private_key.sign(
        sign_str.encode('utf-8'),
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    signature_b64 = base64.b64encode(signature).decode('utf-8')
    print(f"   ✅ 签名生成成功")
except Exception as e:
    print(f"   ❌ 签名失败: {e}")
    exit(1)

# 3. 构造 Authorization 头
auth_header = (
    f'WECHATPAY2-SHA256-RSA2048 '
    f'mchid="{WECHAT_MCH_ID}",'
    f'nonce_str="{nonce}",'
    f'timestamp="{timestamp}",'
    f'serial_no="{WECHAT_CERT_SERIAL_NO}",'
    f'signature="{signature_b64}"'
)
print(f"\n3. Authorization 头:")
print(f"   {auth_header[:80]}...")

# 4. 发送请求获取平台证书
print("\n4. 请求微信支付 API (获取平台证书)...")
headers = {
    "Authorization": auth_header,
    "Accept": "application/json",
    "User-Agent": "wechatpay-test/1.0",
}

try:
    resp = requests.get(url, headers=headers, timeout=30)
    print(f"   HTTP 状态码: {resp.status_code}")
    print(f"   响应头 Request-ID: {resp.headers.get('Request-ID', 'N/A')}")
    
    if resp.status_code == 200:
        print("   ✅ 请求成功！配置正确。")
        data = resp.json()
        print(f"   证书数量: {len(data.get('data', []))}")
    else:
        print(f"   ❌ 请求失败")
        try:
            err = resp.json()
            print(f"   错误码: {err.get('code')}")
            print(f"   错误信息: {err.get('message')}")
        except:
            print(f"   响应内容: {resp.text[:200]}")
            
except requests.exceptions.RequestException as e:
    print(f"   ❌ 网络错误: {e}")
