# 对话列表滚动问题修复文档

## 问题描述

对话列表长度过长时，滚动会话列表导致页面整体上移，输入框也随之上移。

## 原因分析

1. **`scrollIntoView` 的滚动目标问题**：原代码使用 `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })` 自动滚动到底部。`scrollIntoView` 会寻找最近的滚动祖先元素进行滚动，如果识别到的滚动祖先是 `document` 或 `window`，就会导致整页滚动，使输入框随之上移。

2. **Flex/Grid 布局的收缩问题**：在 CSS Flex/Grid 布局中，当中间内容区域高度增加时，如果父容器没有正确约束高度，可能导致整个面板被撑高，触发页面级滚动。

## 解决方案

### 1. 修复自动滚动逻辑 (`WorkspaceChat.tsx`)

**修改前：**
```typescript
// 自动滚动到底部
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages, streamingContent])
```

**修改后：**
```typescript
// 对话列表滚动容器，仅在此容器内滚动，避免 scrollIntoView 触发整页滚动
const chatScrollRef = useRef<HTMLDivElement>(null)

// 自动滚动到底部（仅滚动对话列表容器，不触发整页滚动）
useEffect(() => {
  const el = chatScrollRef.current
  if (!el) return
  el.scrollTop = el.scrollHeight
}, [messages, streamingContent])
```

关键改动：
- 新增 `chatScrollRef` 引用对话列表滚动容器
- 改用直接操作容器的 `scrollTop` 属性，避免 `scrollIntoView` 可能触发的整页滚动

### 2. 绑定滚动容器 Ref

```tsx
{/* 消息列表区域 - 仅此区域可滚动，输入框固定底部 */}
<div ref={chatScrollRef} className="chat-scroll min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4">
```

### 3. 页面布局固定高度 (`page.tsx`)

```tsx
<div
  className="workspace-container flex overflow-hidden bg-white"
  style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    maxHeight: '100vh',
  }}
>
  {/* 左侧 AI 对话区 - 固定高度，禁止本块产生页面级滚动 */}
  <div
    className="workspace-chat-column flex h-full shrink-0 flex-col overflow-hidden"
    style={{ height: '100vh', maxHeight: '100vh' }}
  >
    <WorkspaceChat />
  </div>
  {/* 右侧创作工作台 */}
  <WorkspaceEditor />
</div>
```

关键改动：
- 使用内联样式固定 `position: fixed` 和完整视口尺寸
- 左侧对话列固定 `height: 100vh` 和 `maxHeight: 100vh`

### 4. 对话区布局使用 Grid + minmax (`WorkspaceChat.tsx`)

```tsx
<div className="relative z-10 grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-r border-slate-100 bg-white">
```

关键改动：
- 使用 `grid-rows-[auto_minmax(0,1fr)_auto]`：中间行使用 `minmax(0, 1fr)` 强制可收缩，确保只有中间区域出现滚动条
- 顶部标题栏和底部输入框固定，不参与滚动

### 5. 全局样式约束 (`globals.css`)

```css
.workspace-container {
  font-feature-settings: "ss01", "ss02", "cv01", "cv02";
  overflow: hidden !important;
}
.workspace-chat-column {
  overflow: hidden !important;
  min-height: 0;
}
```

关键改动：
- 强制禁止工作台容器出现滚动条
- 左侧列禁止溢出并允许收缩

## 修改文件清单

| 文件路径 | 修改内容 |
|---------|---------|
| `components/workspace/WorkspaceChat.tsx` | 修复滚动逻辑、使用 Grid + minmax 布局 |
| `app/(dashboard)/workspace/page.tsx` | 固定页面高度，禁止整页滚动 |
| `app/globals.css` | 添加工作台容器样式约束 |

## 验证方法

1. 对话列表添加多条消息，使列表长度超过可视区域
2. 手动滚动对话列表
3. 观察输入框是否保持在视口底部不再上移
4. 观察页面是否出现整体滚动（右侧滚动条是否出现）

## 技术要点总结

1. **滚动容器隔离**：将滚动限制在特定容器内，避免触发整页滚动
2. **直接操作滚动属性**：使用 `scrollTop` 而非 `scrollIntoView` 可更精确控制滚动行为
3. **CSS Grid 的 minmax**：使用 `minmax(0, 1fr)` 确保中间行可收缩，这是实现「只有中间滚动」的关键
4. **高度链完整性**：从 `html → body → 容器 → 对话区 → 消息列表` 每一层都需要正确的高度约束和 `min-h-0`
