# 技术方案：模板市场 + 文件管理 + 文档结构增强

**文档版本**：v1.3  
**日期**：2026-05-17  
**关联 PRD**：[PRD-template-market-and-file-management.md](./PRD-template-market-and-file-management.md)  
**技术栈**：Next.js 14 (App Router) + FastAPI + SQLAlchemy + Zustand

> **v1.3 变更**：重新定义 `TemplatePanel` 的职责边界——编辑器工具栏模板入口只做选择，样式配置迁移到独立的模板编辑页

---

## 一、当前实现状态总览

### 1.1 v1.0 已完成

| 模块 | 组件/文件 | 状态 |
|------|----------|------|
| 侧边导航 | `WorkspaceNav`, `WorkspaceNavPanel`, `WorkspaceLayout` | ✅ |
| 模板市场全屏页 | `TemplateMarketFullPage`, `TemplateMarketCard`, `TemplateFilterBar` | ✅ |
| 模板预览抽屉（含实时预览） | `TemplatePreviewDrawer` | ✅ |
| 用户模板卡片菜单 | `TemplateMarketCardMenu` | ✅ |
| 模板使用确认 | `TemplateUsageConfirm` | ✅ |
| 编辑器内模板选择器（轻量） | `TemplateMiniSelector` | ✅ 已实现，待接入工具栏 |
| 文件管理面板 | `FileManagerPanel`, `FolderTree`, `FolderNode`, `DocumentNode` | ✅ |
| 文档复制 | `DocumentNode` 菜单 + `useDocumentNode.duplicateDoc` + 后端接口 | ✅ |
| 文件夹内新建 | `FolderNode` 菜单"在此新建文档/子文件夹" | ✅ |
| 搜索、回收站、移动对话框 | `FileManagerSearch`, `TrashPanel`, `MoveToDialog` | ✅ |
| 文档大纲 | `DocumentOutline`, `useDocumentOutline` | ✅ |
| 后端：所有 CRUD 接口 | `folders.py`, `document_service.py`, `editor.py` | ✅ |

### 1.2 待实现（v1.1 目标）

| # | 功能 | 涉及文件 | 优先级 |
|---|------|---------|--------|
| N1 | 编辑器工具栏改造：只触发 `TemplateMiniSelector`，废弃 `TemplatePanel` 样式配置入口 | `EditorRichToolbar.tsx`, `TemplateMiniSelector.tsx` | P0 |
| N2 | 模板编辑页：`/workspace/templates/[id]/edit`（三栏：导航 + 配置 + 预览） | 新建路由页 + 复用配置组件 | P0 |
| N3 | 新建自定义模板：模板市场"+ 新建模板"卡片 | `TemplateMarketFullPage.tsx` | P1 |
| N4 | 用户模板菜单"编辑样式"跳转到模板编辑页 | `TemplateMarketCardMenu.tsx` | P1（依赖 N2） |

---

## 二、v1.1 核心架构变更：模板职责拆分

### 2.1 问题根源

当前 `TemplatePanel`（编辑器工具栏触发）混合了两个场景：

```
现状 TemplatePanel（680px 右侧抽屉）：
  ├── 模板选择列表（TemplateList）
  ├── 快捷调整（字号/行距/对齐）        ← 应移除，写作场景不需要
  └── 完整样式配置（9个分类的 Editor）  ← 应迁移到模板编辑页
```

**改造后，两个场景完全独立**：

```
场景一：写作中选模板（编辑器工具栏触发）
  TemplateMiniSelector（轻量弹窗，≤200px 宽）
  ├── 当前模板名称
  ├── 近期模板列表（最多显示6个，含小缩略预览）
  └── "去模板市场" 跳转链接
  → 不含任何样式配置

场景二：创建/编辑我的模板（模板广场触发）
  /workspace/templates/[id]/edit（全屏独立页面）
  ├── 左侧：配置导航（10个分类）
  ├── 中间：复用现有各 *Editor 组件
  └── 右侧：TemplatePreview 实时预览
  → 不含文档内容，专注于模板样式
```

### 2.2 `TemplatePanel.tsx` 的处置

`TemplatePanel` 当前代码约 550 行，其中：
- `TemplateList` 部分 → 迁移到 `TemplateMiniSelector` 的模板列表（已有基础）
- 各 `*Editor` 组件（`StyleEditor`, `HeadingStyleEditor` 等）→ 迁移到模板编辑页（直接复用，不修改）
- `handleApply` 逻辑（更新模板 config + 保存文档绑定）→ 迁移到模板编辑页的保存逻辑

**处置方式**：`TemplatePanel.tsx` 在 v1.1 完成后可整体删除。在 v1.1 开发期间保留但不从工具栏触发。

---

## 三、目录结构（v1.1 目标）

```
frontend/
├── app/
│   └── (dashboard)/
│       └── workspace/
│           ├── page.tsx                               ✅ 已实现
│           └── templates/
│               └── [id]/
│                   └── edit/
│                       └── page.tsx                   ❌ 待实现（N2）
│
├── components/workspace/
│   ├── WorkspaceLayout.tsx                            ✅
│   ├── WorkspaceHeader.tsx                            ✅（旧文档按钮已移除）
│   ├── nav/
│   │   ├── WorkspaceNav.tsx                           ✅
│   │   ├── WorkspaceNavItem.tsx                       ✅
│   │   └── WorkspaceNavPanel.tsx                      ✅
│   ├── file-manager/
│   │   ├── FileManagerPanel.tsx                       ✅
│   │   ├── FolderTree.tsx                             ✅
│   │   ├── FolderNode.tsx                             ✅
│   │   ├── DocumentNode.tsx                           ✅
│   │   └── ...其他已实现组件                          ✅
│   ├── template-market/
│   │   ├── TemplateMarketFullPage.tsx                 ✅（待加"+ 新建模板"卡片）
│   │   ├── TemplateMarketCard.tsx                     ✅
│   │   ├── TemplateMarketCardMenu.tsx                 ✅（待加"编辑样式"跳转）
│   │   ├── TemplateFilterBar.tsx                      ✅
│   │   ├── TemplatePreviewDrawer.tsx                  ✅
│   │   ├── TemplateUsageConfirm.tsx                   ✅
│   │   └── TemplateMiniSelector.tsx                   ⚠️ 已实现但需增强（N1）
│   └── outline/
│       └── ...                                        ✅
│
├── components/workspace/editor/
│   ├── EditorRichToolbar.tsx                          ⚠️ 工具栏"模板"按钮触发改造（N1）
│   ├── TemplatePanel.tsx                              ⚠️ v1.1 完成后废弃
│   └── template/
│       ├── StyleEditor.tsx                            ✅ 复用于模板编辑页
│       ├── HeadingStyleEditor.tsx                     ✅ 复用
│       ├── ParagraphStyleEditor.tsx                   ✅ 复用
│       ├── ListStyleEditor.tsx                        ✅ 复用
│       ├── LayoutEditor.tsx                           ✅ 复用
│       ├── HeaderFooterEditor.tsx                     ✅ 复用
│       ├── PageNumberEditor.tsx                       ✅ 复用
│       ├── TableStyleEditor.tsx                       ✅ 复用
│       ├── ImageStyleEditor.tsx                       ✅ 复用
│       ├── CodeBlockEditor.tsx                        ✅ 复用
│       └── TemplatePreview.tsx                        ✅ 复用
```

---

## 四、v1.1 详细实现方案

### N1：编辑器工具栏模板入口改造

**目标**：工具栏"模板"按钮只弹出轻量选择器，不再触发 `TemplatePanel`。

**修改 `EditorRichToolbar.tsx`**：

```typescript
// 当前：点击触发 openTemplatePanel()（打开完整 TemplatePanel）
// 改为：点击触发 setTemplateSelectorOpen(true)（打开 TemplateMiniSelector）

// 在工具栏中找到模板按钮，将 onClick 改为：
onClick={() => setTemplateSelectorOpen(true)}
```

**增强 `TemplateMiniSelector.tsx`**：

当前 `TemplateMiniSelector` 只显示"当前模板名 + 更换模板"链接，需要增强为：
```
当前模板：[品 通用教案]  更换模板 →（跳转模板市场）
─────────────────────────────────
最近使用：
  ○ 国标公文
  ● 通用教案（当前，选中状态）
  ○ 我的模板1
─────────────────────────────────
[去模板市场选更多模板 →]
```

- 数据来源：`editorStore.templates`（已有）
- 点击某个模板：调用 `setCurrentTemplate(tpl)` 直接应用（无需保存配置，只切换当前模板）
- "更换模板"/"去模板市场"：调用 `workspaceNavStore.setActiveNavId('templates')`

**关键约束**：
- `TemplateMiniSelector` 不包含任何样式配置项
- 点击后直接应用模板（不需要用户再点"应用"确认），相当于预览切换

---

### N2：模板编辑页

**路由**：`app/(dashboard)/workspace/templates/[id]/edit/page.tsx`

**页面结构**：

```typescript
// page.tsx（≤60行，只做布局）
export default function TemplateEditPage({ params }: { params: { id: string } }) {
  return <TemplateEditLayout templateId={params.id} />
}

// components/workspace/template-editor/TemplateEditLayout.tsx（容器组件）
// 职责：加载模板数据、管理 draftConfig 状态、处理保存逻辑
```

**组件拆分**：

```
template-editor/
├── TemplateEditLayout.tsx     容器，管理数据和状态（≤150行）
├── TemplateEditHeader.tsx     顶部：返回按钮 + 模板名 + 保存按钮（≤60行）
├── TemplateEditNav.tsx        左侧导航：10个配置分类（≤80行）
├── TemplateEditPanel.tsx      中间：根据 activeSection 渲染对应 *Editor（≤100行）
└── TemplateEditPreview.tsx    右侧：TemplatePreview 实时预览（≤50行）
```

**数据流**：

```typescript
// 进入页面：GET /api/editor/templates/{id} 获取完整模板（含 config）
// 编辑过程：修改 draftConfig（本地状态，不触发 API）
// 保存：PUT /api/editor/templates/{id} { config: draftConfig, name: ... }
// 实时预览：draftConfig 每次变更触发 TemplatePreview 重渲染
```

**内置模板的处理**：
- 加载后判断 `template.source === 'builtin'`
- 所有 Editor 组件传入 `disabled={true}`
- 顶部显示提示条："内置模板不可修改，[复制并编辑]"
- 点击"复制并编辑"：调用 duplicate API，跳转到副本的编辑页

**保存逻辑**（从 `TemplatePanel.handleApply` 迁移）：

```typescript
async function handleSave() {
  if (template.source !== 'user') return
  try {
    const saved = await editorService.updateTemplate(template.id, {
      ...template,
      config: draftConfig,
    })
    toast.success('模板已保存')
    // 同步更新 editorStore.templates（如果编辑器正在使用此模板）
    const { templates, setTemplates, currentTemplate, setCurrentTemplate } = useEditorStore.getState()
    const updated = templates.map(t => t.id === saved.id ? saved : t)
    setTemplates(updated)
    if (currentTemplate?.id === saved.id) setCurrentTemplate(saved)
  } catch {
    toast.error('保存失败')
  }
}
```

---

### N3：新建自定义模板

**修改 `TemplateMarketFullPage.tsx`**，在模板网格末尾添加"+ 新建模板"卡片：

```typescript
// 固定最后一张卡片
<div
  className="flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500"
  onClick={() => setCreateDialogOpen(true)}
>
  <Plus size={24} />
  <span className="text-sm">新建我的模板</span>
</div>
```

**新建流程弹窗**（`CreateTemplateDialog`）：
1. 展示内置模板列表（供选择基础模板）
2. 用户选中后，调用 `POST /api/editor/templates/{id}/duplicate`
3. 跳转到 `/workspace/templates/{newId}/edit`

---

### N4：用户模板菜单"编辑样式"

**修改 `TemplateMarketCardMenu.tsx`**，在菜单顶部添加：

```typescript
// 仅 source === 'user' 时显示（当前已通过父组件条件渲染保证）
{ label: '编辑样式', onClick: () => router.push(`/workspace/templates/${templateId}/edit`) }
```

---

## 五、Store 设计

### editorStore.ts（现有，待小改）

v1.1 中 `TemplatePanel` 的 `draftTemplateConfig`、`updateDraftStyle` 等 action 不再从工具栏触发，但保留在 store 中供模板编辑页使用（或在 v1.2 迁移到独立 store）。

模板编辑页**优先使用本地 useState** 管理 `draftConfig`，不依赖 `editorStore`，避免编辑模板时干扰编辑器的当前状态。

### workspaceNavStore.ts（现有，无需改动）

```typescript
// 从模板选择器跳转到模板市场
useWorkspaceNavStore.getState().setActiveNavId('templates')
```

---

## 六、API 设计（补充）

### 已有接口（无需新增后端接口）

```python
GET  /api/editor/templates          # 获取模板列表（含 config 字段）
GET  /api/editor/templates/{id}     # 获取单个模板完整信息
PUT  /api/editor/templates/{id}     # 更新模板（保存编辑结果）
POST /api/editor/templates/{id}/duplicate  # 复制模板（新建自定义模板时使用）
```

> v1.1 所有功能均复用现有后端接口，**无需新增后端接口**。

---

## 七、关键组件依赖关系

```
TemplateMiniSelector（工具栏触发）
  ├── 数据：editorStore.templates（已加载）
  └── 操作：editorStore.setCurrentTemplate（直接切换）

TemplateEditLayout（模板编辑页）
  ├── 数据：GET /api/editor/templates/{id}（独立请求）
  ├── 配置组件：StyleEditor, HeadingStyleEditor, ...（直接 import，无改动）
  ├── 预览：TemplatePreview（直接 import，无改动）
  └── 保存：PUT /api/editor/templates/{id}（更新后同步 editorStore）
```

---

## 八、开发顺序（v1.1）

```
Step 1：N1 - 工具栏改造（改 EditorRichToolbar + 增强 TemplateMiniSelector）
         预计改动：EditorRichToolbar.tsx（约10行），TemplateMiniSelector.tsx（约80行新增）

Step 2：N2 - 模板编辑页（新建路由 + 4个新组件）
         预计改动：新建 page.tsx + TemplateEditLayout/Header/Nav/Panel/Preview（共约400行）
         复用：10个现有 *Editor 组件（无改动）+ TemplatePreview（无改动）

Step 3：N4 - 用户模板菜单"编辑样式"跳转（依赖 N2 完成）
         预计改动：TemplateMarketCardMenu.tsx（约5行）

Step 4：N3 - 新建自定义模板入口（依赖 N2 完成）
         预计改动：TemplateMarketFullPage.tsx（约30行）+ 新建 CreateTemplateDialog.tsx（约80行）

Step 5：废弃 TemplatePanel.tsx（确认 N1/N2 稳定后删除）
```

---

## 九、测试要点（v1.1）

### 工具栏改造（N1）
- [ ] 点击工具栏"模板"按钮，弹出 `TemplateMiniSelector`，不再出现 `TemplatePanel`
- [ ] 从 `TemplateMiniSelector` 选择模板，正确切换当前文档样式
- [ ] 点击"去模板市场"，切换到模板市场全屏页

### 模板编辑页（N2）
- [ ] 访问 `/workspace/templates/{用户模板id}/edit`，页面正常渲染，三栏布局
- [ ] 修改任意配置项，右侧预览实时更新
- [ ] 点击"保存"，调用 PUT 接口，toast 提示成功
- [ ] 访问 `/workspace/templates/{内置模板id}/edit`，所有配置项 disabled，顶部显示提示条
- [ ] 内置模板页点击"复制并编辑"，创建副本并跳转

### 新建模板（N3）
- [ ] 模板市场末尾显示"+ 新建模板"卡片
- [ ] 点击后弹出选择基础模板对话框
- [ ] 选择后创建副本并跳转到编辑页

---

## 十、开发规范

### 组件行数上限

| 文件类型 | 行数上限 |
|---------|---------|
| 页面组件（page.tsx） | 80 行 |
| 容器组件 | 150 行 |
| 展示组件 | 100 行 |
| 自定义 Hook | 80 行 |
| Store 文件 | 120 行 |
| 后端 Router | 120 行 |
| 后端 Service | 150 行 |

---

*文档作者：技术团队*  
*最后更新：2026-05-17（v1.3）*
