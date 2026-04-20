# DocFlow — 后端服务

## 环境要求

- Python 3.11+
- Conda（推荐）
- **Pandoc**（Word 导出 + **上传 docx 解析公式** 均依赖，与导出同一套 OMML↔LaTeX）

---

## 快速启动

### 1. 创建 conda 环境

```bash
conda create -n dssxz python=3.11 -y
```

conda create -n docFlow python=3.11 -y
conda activate docFlow

### 2. 安装依赖

```bash
conda activate dssxz
pip install -i https://mirrors.aliyun.com/pypi/simple/ -r requirements.txt
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 按需编辑 .env（开发环境默认 SQLite，无需额外配置）
# 若前端使用 pay_channel=mock：需 DEBUG=true 且 ENABLE_MOCK_PAYMENT=true（见 .env.example）
```

### 4. 启动服务

```bash
cd code/backend
conda activate dssxz
cd d:\project\dssxz\code\backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

# 改用 8001 端口

nohup uvicorn app.main:app --host 0.0.0.0 --port 8001 > docflow.log 2>&1 &

# 先 kill 掉旧进程

pkill -f "uvicorn.\*8001"

# 再重新启动

nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > docflow.log 2>&1 &

启动成功后访问：

| 地址                         | 说明             |
| ---------------------------- | ---------------- |
| http://localhost:8000/health | 健康检查         |
| http://localhost:8000/docs   | Swagger 接口文档 |
| http://localhost:8000/redoc  | ReDoc 接口文档   |

---

## 数据库迁移（可选）

开发环境启动时自动建表，生产环境使用 Alembic：

```bash
conda activate dssxz
cd d:\project\dssxz\code\backend

# 生成迁移文件
alembic revision --autogenerate -m "initial"

# 执行迁移
alembic upgrade head
```

---

## 生产环境启动

```bash
conda activate dssxz
cd d:\project\dssxz\code\backend
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```
