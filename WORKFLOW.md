# DocFlow 规范驱动开发工作流

## 📋 概述

本文档描述了 DocFlow 项目的规范驱动开发工作流，实现从用户故事（US）到代码交付的全自动化流程。

## 🎯 工作流架构

```
┌─────────────────────────────────────────────────────────────┐
│                      开发工作流                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Jira    │───▶│ US Reader│───▶│ 任务生成  │              │
│  │ (需求)   │    │          │    │          │              │
│  └──────────┘    └──────────┘    └──────────┘              │
│       │                              │                      │
│       ▼                              ▼                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │Confluence│───▶│ 需求分析  │───▶│ 技术方案  │              │
│  │ (文档)   │    │          │    │          │              │
│  └──────────┘    └──────────┘    └──────────┘              │
│                                                             │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    开发阶段                           │  │
│  │                                                      │  │
│  │  ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐ │  │
│  │  │创建分支 │──▶│ 代码实现 │──▶│ 自动测试 │──▶│ 代码提交 │ │  │
│  │  └────────┘   └────────┘   └────────┘   └────────┘ │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    质量保证                           │  │
│  │                                                      │  │
│  │  ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐ │  │
│  │  │ GitHub │──▶│ Sonar  │──▶│  Review │──▶│ Merge  │ │  │
│  │  │Actions │   │Qube    │   │        │   │        │ │  │
│  │  └────────┘   └────────┘   └────────┘   └────────┘ │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    部署阶段                           │  │
│  │                                                      │  │
│  │  ┌────────┐   ┌────────┐   ┌────────┐              │  │
│  │  │Staging │──▶│ 测试验证 │──▶│Production│            │  │
│  │  └────────┘   └────────┘   └────────┘              │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone https://github.com/yhl-tech/docFlow.git
cd docFlow

# 安装依赖
cd frontend && npm install && cd ..
cd backend && pip install -r requirements.txt && cd ..

# 配置工作流环境变量
cp .env.workflow.example .env.workflow
# 编辑 .env.workflow 填入实际值
```

### 2. 一键启动开发

```bash
# Windows (PowerShell)
.\scripts\dev.ps1 PROJ-123

# Linux/Mac
./scripts/dev.sh PROJ-123

# 直接使用 Python
python scripts/dev-workflow.py PROJ-123
```

## 📝 工作流详解

### 阶段 1：需求读取

**输入**：用户故事 ID（如 PROJ-123）

**处理**：
1. 从 Jira 读取用户故事详情
2. 从 Confluence 读取技术文档
3. 解析验收标准

**输出**：
- 用户故事对象
- 技术需求列表
- 设计规范

```python
# 示例代码
us = reader.read_from_jira("PROJ-123")
requirements = reader.read_from_confluence("page-PROJ-123")
```

### 阶段 2：任务生成

**输入**：用户故事和需求文档

**处理**：
1. 根据验收标准生成子任务
2. 确定任务类型（前端/后端/全栈）
3. 估算工时
4. 识别依赖关系

**输出**：
- 开发任务列表
- 任务优先级
- 依赖图

```python
# 生成的任务示例
tasks = [
    DevelopmentTask(
        id="PROJ-123-T001",
        title="实现页眉页脚配置",
        type="frontend",
        priority=1,
        estimated_hours=4.0
    ),
    DevelopmentTask(
        id="PROJ-123-T002",
        title="后端API支持",
        type="backend",
        priority=2,
        estimated_hours=3.0
    ),
    # ...
]
```

### 阶段 3：分支创建

**输入**：用户故事 ID

**处理**：
1. 切换到 develop 分支
2. 创建功能分支：`feat/proj-123-20260516`
3. 设置分支跟踪

**输出**：
- 新的功能分支
- 分支名称

```bash
# 自动执行的命令
git checkout develop
git checkout -b feat/proj-123-20260516
```

### 阶段 4：代码实现

**输入**：开发任务

**处理**：
1. 按任务优先级排序
2. 逐步实现每个任务
3. 遵循项目代码规范
4. 添加必要的注释

**输出**：
- 实现的代码
- 更新的文档

**代码规范**：
- TypeScript 严格模式
- ESLint + Prettier
- 完整的类型注解
- 组件化设计

### 阶段 5：自动测试

**输入**：实现的代码

**处理**：
1. 运行前端测试
   - TypeScript 类型检查
   - ESLint 检查
   - 单元测试
   - 集成测试

2. 运行后端测试
   - Python 语法检查
   - 类型检查（mypy）
   - 单元测试
   - API 测试

**输出**：
- 测试报告
- 覆盖率统计
- 错误日志

```bash
# 前端测试
cd frontend
npm run type-check
npm run lint
npm run test:ci

# 后端测试
cd backend
pytest tests/ -v --cov=app
```

### 阶段 6：代码提交

**输入**：测试通过的代码

**处理**：
1. 检查代码变更
2. 生成提交信息（Conventional Commits）
3. 添加变更文件
4. 创建提交

**输出**：
- Git 提交
- 提交信息

**提交信息格式**：
```
<type>(<scope>): <subject>

<body>

<footer>
```

**示例**：
```
feat(template): 添加页眉页脚自定义功能

- 支持左右中三栏内容
- 支持字体和字号配置
- 支持首页显示控制

Task: PROJ-123-T001
Co-Authored-By: Claude Code <noreply@anthropic.com>
```

### 阶段 7：质量检查

**输入**：Git 提交

**处理**：
1. GitHub Actions 自动运行
   - 前端构建检查
   - 后端测试
   - 安全扫描

2. SonarQube 代码质量分析
   - 代码规范检查
   - 安全漏洞扫描
   - 测试覆盖率
   - 技术债务

3. 代码审查
   - 自动分配审查者
   - 检查清单验证
   - 评论和反馈

**输出**：
- CI/CD 状态
- 质量报告
- 审查意见

### 阶段 8：合并部署

**输入**：审查通过的 PR

**处理**：
1. 合并到 develop 分支
2. 自动部署到 Staging
3. 运行 E2E 测试
4. 部署到 Production（需审批）

**输出**：
- 部署的版本
- 部署报告

## 🔧 配置说明

### 工作流配置 (workflow.config.json)

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

### 环境变量 (.env.workflow)

```bash
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-api-token
SONAR_URL=https://sonar.example.com
SONAR_TOKEN=your-sonar-token
```

## 📊 报告示例

运行工作流后会自动生成报告：

```markdown
# 开发任务报告

## 用户故事：模板样式优化
- **ID**: PROJ-123
- **优先级**: High
- **状态**: In Progress

### 验收标准
- [ ] 支持自定义页眉页脚
- [ ] 支持页码配置
- [ ] 支持标题样式配置

### 生成的任务

#### 前端任务
- **PROJ-123-T001**: 实现页眉页脚配置 (4.0h)
- **PROJ-123-T002**: 实现页码配置 (3.0h)

#### 后端任务
- **PROJ-123-T003**: API 支持模板配置 (3.0h)

### 统计信息
- **总任务数**: 5
- **预估总工时**: 16.0 小时
- **前端任务**: 2 个
- **后端任务**: 1 个
- **全栈任务**: 2 个
```

## 🎯 使用场景

### 场景 1：新功能开发

```bash
# 1. PM 在 Jira 创建 US
# 2. 开发者运行工作流
.\scripts\dev.ps1 PROJ-456

# 3. 工作流自动：
#    - 读取 US
#    - 生成任务
#    - 创建分支
#    - 提示开发者实现

# 4. 开发者实现代码
# 5. 工作流自动测试并提交
```

### 场景 2：Bug 修复

```bash
# 1. QA 在 Jira 创建 Bug
# 2. 开发者运行修复工作流
.\scripts\dev.ps1 BUG-789 --task BUG-789-T001

# 3. 快速修复并测试
# 4. 自动提交和部署
```

### 场景 3：团队协作

```bash
# 开发者 A：前端任务
.\scripts\dev.ps1 PROJ-456 --task PROJ-456-T001

# 开发者 B：后端任务
.\scripts\dev.ps1 PROJ-456 --task PROJ-456-T002

# 开发者 C：集成测试
.\scripts\dev.ps1 PROJ-456 --task PROJ-456-T003
```

## 🔗 集成工具

### Jira
- 需求管理
- 任务跟踪
- 进度可视化

### Confluence
- 技术文档
- 设计规范
- API 文档

### GitHub
- 代码托管
- Pull Request
- Code Review

### GitHub Actions
- CI/CD 自动化
- 测试运行
- 部署管理

### SonarQube
- 代码质量
- 安全扫描
- 技术债务

### Jenkins（可选）
- 构建管理
- 部署编排
- 监控告警

## 📚 相关文档

- [CLAUDE.md](CLAUDE.md) - 项目开发规范
- [workflow.config.json](workflow.config.json) - 工作流配置
- [scripts/README.md](scripts/README.md) - 脚本使用说明

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证

## 🆘 获取帮助

- 查看 [scripts/README.md](scripts/README.md) 了解脚本使用
- 查看 [CLAUDE.md](CLAUDE.md) 了解开发规范
- 在 GitHub Issues 提问

---

**最后更新**: 2026-05-16
**维护者**: DocFlow Team
