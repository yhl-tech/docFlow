'use client'

import { WorkspaceChat } from '@/components/workspace/WorkspaceChat'
import { WorkspaceEditor } from '@/components/workspace/WorkspaceEditor'

export default function WorkspacePage() {
  return (
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

      {/* 右侧创作工作台 - 核心编辑区域 */}
      <WorkspaceEditor />
    </div>
  )
}
