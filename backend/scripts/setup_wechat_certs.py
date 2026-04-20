"""
微信支付证书配置辅助脚本

用法：
    python scripts/setup_wechat_certs.py

功能：
    1. 从 certs/apiclient_cert.pem 自动读取证书序列号
    2. 将序列号写入 .env 文件的 WECHAT_CERT_SERIAL_NO 字段
"""
import re
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent
CERT_PATH = BACKEND_DIR / "certs" / "apiclient_cert.pem"
KEY_PATH = BACKEND_DIR / "certs" / "apiclient_key.pem"
ENV_PATH = BACKEND_DIR / ".env"


def get_serial_from_cert(cert_path: Path) -> str:
    """从 PEM 证书文件中提取序列号（不依赖 openssl 命令）"""
    try:
        from cryptography import x509
        from cryptography.hazmat.backends import default_backend

        cert_data = cert_path.read_bytes()
        cert = x509.load_pem_x509_certificate(cert_data, default_backend())
        serial_hex = format(cert.serial_number, "X")
        return serial_hex
    except ImportError:
        print("提示：未安装 cryptography 库，尝试使用 openssl 命令行...")
        import subprocess
        result = subprocess.run(
            ["openssl", "x509", "-in", str(cert_path), "-noout", "-serial"],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            print(f"openssl 执行失败：{result.stderr}")
            sys.exit(1)
        # 输出格式: serial=3A4B5C...
        return result.stdout.strip().split("=", 1)[1].upper()


def update_env(serial: str):
    """将序列号更新到 .env 文件"""
    content = ENV_PATH.read_text(encoding="utf-8")
    # 替换 WECHAT_CERT_SERIAL_NO 行
    new_content = re.sub(
        r"^WECHAT_CERT_SERIAL_NO=.*$",
        f"WECHAT_CERT_SERIAL_NO={serial}",
        content,
        flags=re.MULTILINE,
    )
    if new_content == content:
        print("警告：.env 中未找到 WECHAT_CERT_SERIAL_NO，请手动添加：")
        print(f"WECHAT_CERT_SERIAL_NO={serial}")
    else:
        ENV_PATH.write_text(new_content, encoding="utf-8")
        print(f"已将证书序列号写入 .env：{serial}")


def main():
    print("=== 微信支付证书配置工具 ===\n")

    # 检查文件
    missing = []
    if not CERT_PATH.exists():
        missing.append(f"  缺少：{CERT_PATH}")
    if not KEY_PATH.exists():
        missing.append(f"  缺少：{KEY_PATH}")

    if missing:
        print("错误：以下文件不存在，请先将微信支付证书复制到 certs/ 目录：")
        for m in missing:
            print(m)
        print("\n获取方式：微信支付商户后台 → 账户中心 → API安全 → 申请API证书")
        sys.exit(1)

    print(f"找到证书文件：{CERT_PATH}")
    print(f"找到私钥文件：{KEY_PATH}")

    serial = get_serial_from_cert(CERT_PATH)
    print(f"\n证书序列号：{serial}")

    update_env(serial)

    print("\n配置完成！可以启动后端服务了。")
    print("验证：GET /api/payment/channels 返回的 available 列表中应包含 'wechat'")


if __name__ == "__main__":
    main()
