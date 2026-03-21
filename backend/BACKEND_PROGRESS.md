# 后端框架搭建进度文档

> 生成时间：2026-03-08
> 技术栈：Python 3.10 + FastAPI + SQLAlchemy 2.0 (Async) + SQLite(开发) / PostgreSQL(生产)

---

## 一、目录结构（已生成）

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI 入口，注册路由/中间件/异常处理/静态文件
│   ├── config.py                # 环境变量配置（pydantic-settings）
│   ├── database.py              # SQLAlchemy 异步引擎 + 会话 + 自动建表
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py              # 用户表
│   │   ├── record.py            # 转换记录表
│   │   ├── order.py             # 订单表 / 额度流水表 / 套餐配置表
│   │   └── document.py          # 编辑器文档表
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── common.py            # 通用响应格式（ErrorResponse / MessageResponse）
│   │   ├── user.py              # 用户注册/登录/信息 Schema
│   │   ├── export.py            # 导出请求 Schema
│   │   ├── record.py            # 记录列表/统计 Schema
│   │   └── order.py             # 订单 Schema
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py              # 认证路由
│   │   ├── export.py            # 导出路由
│   │   ├── records.py           # 转换记录路由
│   │   ├── user.py              # 用户/额度路由
│   │   ├── payment.py           # 支付路由
│   │   ├── ai.py                # AI 编辑路由
│   │   └── editor.py            # 编辑器辅助路由
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py          # JWT 生成/验证、bcrypt 密码哈希
│   │   ├── dependencies.py      # FastAPI Depends（当前用户、DB 会话）
│   │   ├── exceptions.py        # 统一异常类 + 全局异常处理器
│   │   └── limiter.py           # slowapi 限流器实例
│   ├── services/
│   │   └── __init__.py          # 占位，业务服务层待实现
│   └── utils/
│       └── __init__.py          # 占位，工具函数待实现
├── alembic/
│   ├── env.py                   # Alembic 异步迁移配置
│   ├── script.py.mako           # 迁移文件模板
│   └── versions/                # 迁移版本文件（待生成）
├── alembic.ini                  # Alembic 配置文件
├── requirements.txt             # Python 依赖
├── .env                         # 本地开发环境变量（SQLite，不入库）
└── .env.example                 # 环境变量模板
```

---

## 二、各文件说明

### 2.1 配置与入口

#### `app/config.py`
使用 `pydantic-settings` 管理所有环境变量，支持从 `.env` 文件加载。

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./dssxz.db` | 数据库连接串（开发用 SQLite） |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis 连接串 |
| `SECRET_KEY` | dev 占位值 | JWT 签名密钥（生产必须替换） |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080`（7天） | Token 有效期 |
| `CORS_ORIGINS` | `http://localhost:3000` | 允许的跨域来源 |
| `DEEPSEEK_API_KEY` | 空 | DeepSeek AI 密钥 |

#### `app/main.py`
- 注册所有 7 个路由前缀
- 配置 CORS 中间件
- 配置 slowapi 全局限流
- 注册统一异常处理器
- 启动时自动调用 `init_db()` 创建数据表
- 挂载 `/assets` 静态文件目录（供图片上传后访问）

#### `app/database.py`
- 异步 SQLAlchemy 引擎（支持 SQLite / PostgreSQL）
- `get_db()` — FastAPI 依赖注入用数据库会话（自动提交/回滚）
- `init_db()` — 开发环境自动建表（生产用 Alembic 迁移）

---

### 2.2 数据模型

#### `models/user.py` — 用户表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `phone` | VARCHAR(20) | 手机号（唯一） |
| `email` | VARCHAR(100) | 邮箱（唯一） |
| `password` | VARCHAR(255) | bcrypt 哈希 |
| `nickname` | VARCHAR(50) | 昵称 |
| `plan` | VARCHAR(20) | 套餐：free / basic / pro |
| `quota_total` | INT | 总额度（默认 5） |
| `quota_used` | INT | 已用额度 |
| `quota_reset_at` | TIMESTAMPTZ | 每月重置时间 |

#### `models/record.py` — 转换记录表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `user_id` | UUID FK | 关联用户 |
| `format` | VARCHAR(10) | docx / pdf / excel / image |
| `char_count` | INT | 字符数 |
| `status` | VARCHAR(20) | success / failed |
| `template` | VARCHAR(50) | 使用的模板 |
| `is_deleted` | BOOL | 软删除标记 |

#### `models/order.py` — 订单相关（3 张表）

- **`orders`** — 订单主表（order_no / amount / status / pay_channel）
- **`quota_logs`** — 额度流水（change 正数增加负数扣减 / reason / ref_id）
- **`plans`** — 套餐配置（code / price / quota / period）

#### `models/document.py` — 编辑器文档表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `user_id` | UUID | 关联用户（索引） |
| `title` | VARCHAR(200) | 文档标题（默认"未命名文档"） |
| `content` | TEXT | 文档 HTML 内容 |
| `template` | VARCHAR(50) | 使用的模板（default/academic/business/simple） |
| `word_count` | INT | 字数统计（中文按字 + 英文按词） |
| `created_at` | TIMESTAMPTZ | 创建时间 |
| `updated_at` | TIMESTAMPTZ | 最后更新时间 |

---

### 2.3 核心模块

#### `core/security.py`
```python
hash_password(password)          # bcrypt 加密
verify_password(plain, hashed)   # 密码验证
create_access_token(user_id)     # 生成 JWT
decode_access_token(token)       # 解码 JWT → user_id
```

#### `core/dependencies.py`
```python
CurrentUser   # Depends：必须登录，返回 User 对象，否则 401
OptionalUser  # Depends：可选登录，未登录返回 None
DB            # Depends：AsyncSession 数据库会话
```

#### `core/exceptions.py`
| 异常类 | HTTP 状态码 | 错误码 |
|--------|------------|--------|
| `AppError`（基类） | 400 | `ERROR` |
| `QuotaExceededError` | 402 | `QUOTA_EXCEEDED` |
| `ContentTooLargeError` | 413 | `CONTENT_TOO_LARGE` |
| `NotImplementedError` | 501 | `NOT_IMPLEMENTED` |

统一错误响应格式：
```json
{ "error": "错误说明", "code": "ERROR_CODE", "detail": null }
```

---

### 2.4 路由实现状态

| 路由前缀 | 方法 | 路径 | 实现状态 |
|----------|------|------|---------|
| `/api/auth` | POST | `/register` | ✅ 已实现（邮箱/手机号注册） |
| `/api/auth` | POST | `/login` | ✅ 已实现（密码登录） |
| `/api/auth` | POST | `/send-sms-code` | 🚧 待实现（阿里云短信） |
| `/api/auth` | POST | `/logout` | ✅ 已实现（客户端清 Token） |
| `/api/auth` | GET | `/me` | ✅ 已实现 |
| `/api/auth` | PUT | `/password` | ✅ 已实现 |
| `/api/export` | POST | `/docx` | ✅ 已实现（Pandoc → OMML 公式 + Mermaid→PNG） |
| `/api/export` | POST | `/pdf` | ✅ 已实现（wkhtmltopdf / weasyprint 双引擎，CJK 字体注入） |
| `/api/export` | POST | `/excel` | 🚧 待实现（返回 501） |
| `/api/export` | POST | `/image` | 🚧 待实现（返回 501） |
| `/api/records` | GET | `` | ✅ 已实现（分页列表） |
| `/api/records` | GET | `/stats` | ✅ 已实现（统计数据） |
| `/api/records` | DELETE | `/{id}` | ✅ 已实现（软删除） |
| `/api/user` | GET | `/quota` | ✅ 已实现 |
| `/api/user` | GET | `/orders` | ✅ 已实现（分页） |
| `/api/payment` | POST | `/create-order` | 🚧 待实现（返回 501） |
| `/api/payment` | POST | `/wechat/notify` | 🚧 待实现（返回 501） |
| `/api/payment` | POST | `/alipay/notify` | 🚧 待实现（返回 501） |
| `/api/payment` | GET | `/order/{order_no}` | ✅ 已实现（查询） |
| `/api/ai` | POST | `/chat` | 🚧 待实现（返回 501） |
| `/api/ai` | POST | `/chat/stream` | 🚧 待实现（返回 501） |
| `/api/ai` | POST | `/rewrite` | 🚧 待实现（返回 501） |
| `/api/ai` | GET | `/models` | ✅ 已实现（返回模型列表） |
| `/api/editor` | GET | `/templates` | ✅ 已实现（4 个内置模板） |
| `/api/editor` | POST | `/validate-latex` | ✅ 已实现（花括号 + begin/end 配对检查） |
| `/api/editor` | POST | `/generate-toc` | ✅ 已实现（正则解析 Markdown 标题） |
| `/api/editor` | POST | `/upload-image` | ✅ 已实现（文件上传 & URL 抓取，存 assets/uploads/images/） |
| `/api/editor` | POST | `/render-latex` | ✅ 已实现（包装 KaTeX 标记返回，供前端渲染） |
| `/api/editor` | POST | `/apply-template` | ✅ 已实现（内容包裹模板 CSS 类） |
| `/api/editor` | POST | `/save` | ✅ 已实现（持久化保存，需登录） |
| `/api/editor` | GET | `/documents` | ✅ 已实现（当前用户文档列表，需登录） |
| `/api/editor` | GET | `/document/{id}` | ✅ 已实现（获取单篇文档，需登录） |
| `/api/editor` | DELETE | `/document/{id}` | ✅ 已实现（删除文档，需登录） |
| `/health` | GET | — | ✅ 健康检查 |

---

## 三、启动方式

### 3.1 安装依赖

系统若配置了代理（如 Clash），需先关闭代理或手动安装缺失包：

```bash
cd d:\project\dssxz\code\backend

# 已安装：fastapi, uvicorn, sqlalchemy, aiosqlite, python-jose
# 需补装：
pip install loguru passlib[bcrypt] pydantic-settings slowapi python-multipart httpx
```

### 3.2 启动服务

```bash
cd d:\project\dssxz\code\backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

启动成功后访问：
- API 文档：http://localhost:8000/docs
- ReDoc：http://localhost:8000/redoc
- 健康检查：http://localhost:8000/health

### 3.3 数据库迁移（可选，开发阶段自动建表）

```bash
# 生成迁移文件
alembic revision --autogenerate -m "initial"

# 执行迁移
alembic upgrade head
```

---

## 四、待实现模块（业务层）

按优先级排列：

| 优先级 | 模块 | 文件位置 | 依赖 |
|--------|------|----------|------|
| ~~P0~~ | ~~Word 导出~~ | `services/export_service.py` | ✅ 已完成（Pandoc） |
| ~~P0~~ | ~~PDF 导出~~ | `services/export_service.py` | ✅ 已完成（wkhtmltopdf / weasyprint） |
| P1 | Mermaid 渲染 | `services/mermaid_service.py` | Node.js + mmdc CLI |
| P1 | 短信验证码 | `services/sms_service.py` | 阿里云短信 SDK |
| P2 | 额度扣减 | `services/quota_service.py` | Redis 缓存 |
| P2 | Excel 导出 | `services/export_service.py` | pandas / openpyxl |
| P3 | 微信支付 | `services/payment_service.py` | wechatpayv3 |
| P3 | 支付宝 | `services/payment_service.py` | alipay-sdk-python |
| P4 | AI 对话 | `services/ai_service.py` | DeepSeek API / httpx |

---

## 五、环境变量说明

复制 `.env.example` 为 `.env` 并按需填写：

```bash
cp .env.example .env
```

**最小启动配置**（仅需这几项即可启动）：

```env
DATABASE_URL=sqlite+aiosqlite:///./dssxz.db
SECRET_KEY=your-random-secret-key-32-chars
DEBUG=true
CORS_ORIGINS=http://localhost:3000
```

**生产环境必须替换**：

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dssxz
SECRET_KEY=<openssl rand -hex 32 生成的随机值>
DEBUG=false
```
