# DocFlow 开发工作流工具

本目录包含自动化开发工作流的脚本和工具。

## 📁 文件说明

- `us-reader.py` - US读取器，从Jira/Confluence读取用户故事
- `dev-workflow.py` - 开发工作流自动化脚本
- `dev.sh` - 快速启动脚本（Linux/Mac）
- `dev.ps1` - 快速启动脚本（Windows）

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装依赖
pip install requests  # 如果需要访问 Jira API

# 配置环境变量（可选，用于连接外部系统）
cp .env.workflow.example .env.workflow
# 编辑 .env.workflow 填入实际值
```

### 2. 使用方法

#### 基本用法

```bash
# Linux/Mac
./scripts/dev.sh PROJ-123

# Windows
.\scripts\dev.ps1 PROJ-123

# 直接使用 Python
python scripts/dev-workflow.py PROJ-123
```

#### 高级选项

```bash
# 自动提交每个任务
./scripts/dev.sh PROJ-123 --auto-commit

# 只执行特定任务
./scripts/dev.sh PROJ-123 --task PROJ-123-T001

# 使用自定义配置
./scripts/dev.sh PROJ-123 --config workflow.config.json
```

### 3. 工作流程

运行脚本后，会自动执行以下步骤：

1. **📖 读取US** - 从Jira读取用户故事信息
2. **📝 生成任务** - 根据验收标准生成开发任务
3. **🌿 创建分支** - 自动创建功能分支
4. **⚡ 执行任务** - 逐步实现各个任务
5. **🧪 运行测试** - 自动运行前后端测试
6. **📊 生成报告** - 生成开发报告

## 🔧 配置说明

### workflow.config.json

配置文件定义了工作流的各种参数：

```json
{
  "jira": {
    "base_url": "https://your-jira.atlassian.net",
    "project_key": "DOCFLOW"
  },
  "task_generation": {
    "frontend_keywords": ["UI", "component", "style"],
    "backend_keywords": ["API", "database", "service"]
  },
  "testing": {
    "frontend": {
      "command": "npm run test:ci",
      "coverage_threshold": 80
    }
  }
}
```

### 环境变量

敏感信息通过环境变量配置：

```bash
export JIRA_USERNAME=your-email@example.com
export JIRA_API_TOKEN=your-api-token
```

## 📋 命令参考

### us-reader.py

```bash
# 基本用法
python scripts/us-reader.py PROJ-123

# 输出到文件
python scripts/us-reader.py PROJ-123 --output report.md

# JSON格式输出
python scripts/us-reader.py PROJ-123 --output report.json --format json
```

### dev-workflow.py

```bash
# 完整工作流
python scripts/dev-workflow.py PROJ-123

# 自动提交
python scripts/dev-workflow.py PROJ-123 --auto-commit

# 执行特定任务
python scripts/dev-workflow.py PROJ-123 --task PROJ-123-T001
```

## 🎯 使用场景

### 场景1：完整功能开发

```bash
# 1. 启动工作流
./scripts/dev.sh PROJ-456

# 2. 按照提示实现各个任务
# 3. 工作流会自动测试并生成报告
```

### 场景2：快速修复

```bash
# 1. 只执行特定任务
./scripts/dev.sh PROJ-456 --task PROJ-456-T003

# 2. 实现修复
# 3. 自动提交
./scripts/dev.sh PROJ-456 --task PROJ-456-T003 --auto-commit
```

### 场景3：团队协作

```bash
# 1. 开发者A完成前端任务
./scripts/dev.sh PROJ-456 --task PROJ-456-T001

# 2. 开发者B完成后端任务
./scripts/dev.sh PROJ-456 --task PROJ-456-T002

# 3. 开发者C进行集成测试
./scripts/dev.sh PROJ-456 --task PROJ-456-T003
```

## 🔗 集成说明

### GitHub Actions

工作流会自动集成 GitHub Actions：
- 提交前自动检查代码质量
- PR 自动运行测试
- 合并后自动部署

### SonarQube

代码质量检查：
- 代码规范检查
- 安全漏洞扫描
- 测试覆盖率统计

### Jira/Confluence

需求管理：
- 自动读取用户故事
- 更新任务状态
- 生成开发报告

## 🐛 故障排除

### 问题1：无法连接 Jira

```bash
# 检查网络连接
ping your-jira.atlassian.net

# 验证凭证
curl -u username:token https://your-jira.atlassian.net/rest/api/3/myself
```

### 问题2：Git 命令失败

```bash
# 检查 Git 状态
git status

# 确保在正确的分支
git branch

# 清理未提交的更改
git stash
```

### 问题3：测试失败

```bash
# 查看详细错误
cd frontend && npm run test
cd backend && pytest tests/ -v

# 检查依赖
npm install
pip install -r requirements.txt
```

## 📚 相关文档

- [CLAUDE.md](../CLAUDE.md) - 项目开发规范
- [workflow.config.json](../workflow.config.json) - 工作流配置
- [.env.workflow.example](../.env.workflow.example) - 环境变量示例

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../LICENSE) 文件了解详情
