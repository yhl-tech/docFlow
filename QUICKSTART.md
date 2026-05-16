# DocFlow 快速启动指南

## 🚀 5 分钟快速上手

### 步骤 1：环境检查

确保已安装：
- Python 3.11+
- Node.js 18+
- Git

```bash
# 检查版本
python --version
node --version
git --version
```

### 步骤 2：配置环境

```bash
# 进入项目目录
cd d:\project\dssxz\code

# 复制环境变量文件
cp .env.workflow.example .env.workflow

# 编辑 .env.workflow（可选，用于连接外部系统）
# 如果只是本地开发，可以跳过此步骤
```

### 步骤 3：运行工作流

#### Windows 用户

```powershell
# 运行完整工作流
.\scripts\dev.ps1 PROJ-123

# 或使用 Python
python scripts/dev-workflow.py PROJ-123
```

#### Linux/Mac 用户

```bash
# 运行完整工作流
./scripts/dev.sh PROJ-123

# 或使用 Python
python scripts/dev-workflow.py PROJ-123
```

### 步骤 4：查看结果

工作流会自动：
1. ✅ 读取用户故事
2. ✅ 生成开发任务
3. ✅ 创建功能分支
4. ✅ 运行测试
5. ✅ 生成报告

## 📝 常用命令

### 1. 基础用法

```bash
# 完整工作流
python scripts/dev-workflow.py PROJ-123

# 自动提交模式
python scripts/dev-workflow.py PROJ-123 --auto-commit

# 执行特定任务
python scripts/dev-workflow.py PROJ-123 --task PROJ-123-T001
```

### 2. 只读取 US

```bash
# 读取 US 并生成报告
python scripts/us-reader.py PROJ-123

# 输出到文件
python scripts/us-reader.py PROJ-123 --output report.md

# JSON 格式
python scripts/us-reader.py PROJ-123 --output report.json --format json
```

### 3. 手动开发流程

如果不想使用自动化脚本，可以手动执行：

```bash
# 1. 创建功能分支
git checkout develop
git checkout -b feat/template-optimization

# 2. 开发代码
# ... 编写代码 ...

# 3. 运行测试
cd frontend && npm run test
cd backend && pytest

# 4. 提交代码
git add .
git commit -m "feat(template): add header footer support"

# 5. 推送并创建 PR
git push origin feat/template-optimization
```

## 🎯 实际示例

### 示例 1：开发模板功能

```bash
# 场景：需要开发模板的页眉页脚功能

# 1. 启动工作流
.\scripts\dev.ps1 TEMPLATE-001

# 2. 工作流会显示：
#    - 用户故事详情
#    - 生成的任务列表
#    - 创建的分支名称

# 3. 按照任务列表逐步实现
#    - T001: 实现页眉配置 UI
#    - T002: 实现页脚配置 UI
#    - T003: 后端 API 支持
#    - T004: 导出功能集成

# 4. 每完成一个任务，可以自动提交
.\scripts\dev.ps1 TEMPLATE-001 --task TEMPLATE-001-T001 --auto-commit
```

### 示例 2：修复 Bug

```bash
# 场景：修复导出功能的 Bug

# 1. 启动修复工作流
.\scripts\dev.ps1 BUG-456

# 2. 只执行修复任务
.\scripts\dev.ps1 BUG-456 --task BUG-456-T001

# 3. 测试修复
cd frontend && npm run test
cd backend && pytest

# 4. 提交修复
.\scripts\dev.ps1 BUG-456 --task BUG-456-T001 --auto-commit
```

### 示例 3：团队协作

```bash
# 开发者 A：负责前端
.\scripts\dev.ps1 PROJ-789 --task PROJ-789-T001

# 开发者 B：负责后端
.\scripts\dev.ps1 PROJ-789 --task PROJ-789-T002

# 开发者 C：负责测试
.\scripts\dev.ps1 PROJ-789 --task PROJ-789-T003
```

## 🔧 配置说明

### 工作流配置

编辑 `workflow.config.json`：

```json
{
  "jira": {
    "base_url": "https://your-jira.atlassian.net",
    "project_key": "DOCFLOW"
  },
  "task_generation": {
    "frontend_keywords": ["UI", "component", "style"],
    "backend_keywords": ["API", "database", "service"]
  }
}
```

### 环境变量

编辑 `.env.workflow`：

```bash
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

## 📊 查看报告

### 1. 控制台输出

工作流会在控制台显示：
- 任务列表
- 进度信息
- 测试结果

### 2. 文件报告

报告会保存到：
```
reports/
└── PROJ-123-report.md
```

### 3. Git 日志

查看提交历史：
```bash
git log --oneline --graph
```

## 🐛 故障排除

### 问题 1：Python 编码错误

```bash
# 错误信息：'gbk' codec can't encode character
# 解决方案：设置环境变量
set PYTHONIOENCODING=utf-8
```

### 问题 2：Git 命令失败

```bash
# 检查 Git 状态
git status

# 确保在正确的分支
git branch

# 清理未提交的更改
git stash
```

### 问题 3：测试失败

```bash
# 查看详细错误
cd frontend && npm run test
cd backend && pytest tests/ -v

# 检查依赖
npm install
pip install -r requirements.txt
```

### 问题 4：脚本权限问题（Linux/Mac）

```bash
# 添加执行权限
chmod +x scripts/dev.sh
chmod +x scripts/us-reader.py
chmod +x scripts/dev-workflow.py
```

## 📚 相关文档

- [CLAUDE.md](CLAUDE.md) - 项目开发规范
- [WORKFLOW.md](WORKFLOW.md) - 完整工作流文档
- [scripts/README.md](scripts/README.md) - 脚本使用说明

## 💡 提示

1. **首次使用**：建议先运行一个测试 US（如 TEST-001）熟悉流程
2. **团队使用**：确保所有成员都配置了环境变量
3. **CI/CD**：推送到 GitHub 后，GitHub Actions 会自动运行
4. **代码审查**：PR 创建后，会自动分配审查者

## 🆘 获取帮助

```bash
# 查看帮助
python scripts/dev-workflow.py --help
python scripts/us-reader.py --help

# 查看版本
python scripts/dev-workflow.py --version
```

## ✅ 成功标志

工作流成功完成后，你会看到：

```
============================================================
✅ 工作流完成！
============================================================

📋 摘要:
   US: 模板样式优化
   任务数: 7
   预估工时: 26.0 小时
   分支: feat/proj-123-20260516
```

## 🎉 开始开发

现在你已经准备好开始规范驱动开发了！

```bash
# 开始你的第一个 US
.\scripts\dev.ps1 YOUR-US-ID
```

祝你开发愉快！🚀

---

**最后更新**: 2026-05-16
