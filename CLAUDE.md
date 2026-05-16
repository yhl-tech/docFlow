# DocFlow 项目开发规范

> 本文件定义了 Claude Code 在 DocFlow 项目中的开发规范和工作流程

## 📋 项目概述

DocFlow 是一个在线文档编辑和导出平台，集成AI辅助写作功能。

- **技术栈**：Next.js 14 + FastAPI + TipTap + SQLAlchemy
- **代码仓库**：https://github.com/yhl-tech/docFlow.git
- **开发分支**：feat-template-optimize（当前）

---

## 🎯 开发流程规范

### 1. 需求驱动开发

**流程**：
```
US（用户故事） → 需求分析 → 技术方案 → 代码实现 → 测试 → 代码审查 → 合并
```

**要求**：
- 所有开发必须从用户故事出发
- 每个任务必须有明确的验收标准
- 代码变更必须关联到具体的US

### 2. 分支管理

**分支命名**：
- 功能分支：`feat/{feature-name}`
- 修复分支：`fix/{bug-name}`
- 文档分支：`docs/{doc-name}`

**当前分支**：`feat-template-optimize`

### 3. 提交规范

**Conventional Commits**：
```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型**：
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**：
```
feat(template): 添加页眉页脚自定义功能

- 支持左右中三栏内容
- 支持字体和字号配置
- 支持首页显示控制

Closes #123
```

---

## 🛠️ 技术规范

### 前端规范

1. **TypeScript 严格模式**
   - 禁止使用 `any` 类型
   - 所有函数必须有返回类型注解
   - 接口定义必须完整

2. **React 组件规范**
   - 使用函数式组件 + Hooks
   - 组件文件使用 PascalCase
   - Props 接口必须定义清晰

3. **代码风格**
   - 使用 ESLint + Prettier
   - 单引号、无分号
   - 2空格缩进

4. **状态管理**
   - 使用 Zustand
   - Store 按功能模块划分
   - 避免全局状态滥用

5. **样式规范**
   - 使用 TailwindCSS
   - 遵循项目现有的样式变量
   - 响应式设计优先

### 后端规范

1. **Python 规范**
   - 遵循 PEP8
   - 完整的类型注解
   - 使用 async/await

2. **FastAPI 规范**
   - 路由分层：Router → Service → Model
   - 使用 Pydantic 进行数据验证
   - 统一的异常处理

3. **数据库规范**
   - 使用 SQLAlchemy 2.0 Async
   - 所有表必须有 id、created_at、updated_at
   - 使用软删除（is_deleted）

4. **API 规范**
   - RESTful 风格
   - 统一的响应格式
   - 完整的错误处理

---

## 📁 目录结构规范

### 前端
```
frontend/
├── app/                    # Next.js App Router
├── components/            # 组件库
│   ├── workspace/       # 工作空间组件
│   ├── editor/          # 编辑器组件
│   └── ui/              # 通用UI组件
├── store/                 # Zustand状态管理
├── lib/                   # API客户端和工具函数
├── types/                 # TypeScript类型定义
└── styles/                # 全局样式
```

### 后端
```
backend/
├── app/
│   ├── models/           # 数据库模型
│   ├── schemas/          # Pydantic模式
│   ├── routers/          # API路由
│   ├── services/         # 业务逻辑
│   ├── core/             # 核心功能
│   └── utils/            # 工具函数
├── tests/                # 测试文件
└── alembic/              # 数据库迁移
```

---

## 🧪 测试规范

### 前端测试
- 使用 Vitest + React Testing Library
- 组件测试覆盖率 > 80%
- 关键功能必须有 E2E 测试

### 后端测试
- 使用 pytest
- API 端点必须有测试
- 业务逻辑必须有单元测试

---

## 🔍 代码审查清单

### 功能检查
- [ ] 代码实现了需求中的所有功能
- [ ] 边界条件已处理
- [ ] 错误处理完整

### 代码质量
- [ ] 无 TypeScript/Python 类型错误
- [ ] 无 ESLint/Flake8 警告
- [ ] 代码可读性好
- [ ] 无重复代码

### 安全检查
- [ ] 输入验证完整
- [ ] SQL 注入防护
- [ ] XSS 防护
- [ ] 敏感信息未泄露

### 性能检查
- [ ] 无性能瓶颈
- [ ] 数据库查询优化
- [ ] 前端渲染优化

---

## 🚀 部署规范

### 开发环境
```bash
# 前端
cd frontend
npm run dev

# 后端
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 测试
```bash
# 前端测试
cd frontend
npm run test

# 后端测试
cd backend
pytest
```

### 构建
```bash
# 前端构建
cd frontend
npm run build

# 后端打包
cd backend
pip install -r requirements.txt
```

---

## 📝 文档规范

### 代码文档
- 复杂逻辑必须有注释
- API 必须有 Swagger 文档
- 组件必须有 Props 说明

### 项目文档
- README.md 必须完整
- API 文档自动生成
- 变更日志维护

---

## 🔄 CI/CD 流程（待配置）

### GitHub Actions
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Run tests
        run: cd frontend && npm run test
      - name: Build
        run: cd frontend && npm run build

  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: cd backend && pip install -r requirements.txt
      - name: Run tests
        run: cd backend && pytest
```

### SonarQube 集成
- 代码质量检测
- 安全漏洞扫描
- 测试覆盖率报告

---

## 🎨 模板开发规范（当前重点）

### 模板配置结构
```typescript
interface TemplateConfig {
  layout: LayoutConfig           // 页面布局
  headingStyles: HeadingStyle[]  // 标题样式
  paragraphStyle: ParagraphStyle // 正文样式
  codeBlockStyle: CodeBlockStyle // 代码块样式
  imageStyle: ImageStyle         // 图片样式
  headerFooter: HeaderFooter     // 页眉页脚
  pageNumber: PageNumber         // 页码
}
```

### 开发流程
1. **需求分析**：明确模板需要支持哪些样式配置
2. **数据模型**：定义 TypeScript 接口
3. **UI 组件**：创建配置面板组件
4. **状态管理**：更新 Zustand store
5. **后端支持**：添加必要的 API
6. **导出实现**：更新导出服务
7. **测试验证**：确保导出效果正确

### 当前任务
- 优化模板配置系统
- 支持更多样式选项
- 改进导出质量

---

## 🔗 相关资源

- **GitHub**：https://github.com/yhl-tech/docFlow
- **API 文档**：http://localhost:8000/docs（开发环境）
- **设计文档**：待补充

---

## ⚠️ 注意事项

1. **数据库**：开发环境使用 SQLite，生产环境使用 PostgreSQL
2. **AI 服务**：需要配置 QWEN_API_KEY 或 DEEPSEEK_API_KEY
3. **导出功能**：需要安装 Pandoc、wkhtmltopdf 等工具
4. **环境变量**：参考 `.env.example` 配置

---

*最后更新：2026-05-16*
