"""
手动数据库迁移脚本 - 添加计费字段
（alembic 未安装时的备选方案）

用法：python scripts/migrate_add_billing_fields.py
"""
import sqlite3
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent
DB_PATH = BACKEND_DIR / "dssxz.db"


def migrate():
    if not DB_PATH.exists():
        print(f"[ERROR] 数据库文件不存在: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 检查 users 表结构
    cursor.execute("PRAGMA table_info(users)")
    columns = {row[1] for row in cursor.fetchall()}

    new_columns = {
        "balance_cents": "INTEGER NOT NULL DEFAULT 0",
        "member_plan": "TEXT",
        "member_expires_at": "TIMESTAMP",
    }

    for col, col_type in new_columns.items():
        if col not in columns:
            sql = f"ALTER TABLE users ADD COLUMN {col} {col_type}"
            cursor.execute(sql)
            print(f"[OK] 添加列: {col}")
        else:
            print(f"[SKIP] 列已存在: {col}")

    # 升级已有用户的免费配额：从 5 改为 6
    cursor.execute("UPDATE users SET quota_total = 6 WHERE quota_total = 5")
    updated = cursor.rowcount
    if updated > 0:
        print(f"[OK] 升级已有用户配额: {updated} 条")

    conn.commit()
    conn.close()
    print("[DONE] 迁移完成")


if __name__ == "__main__":
    migrate()
