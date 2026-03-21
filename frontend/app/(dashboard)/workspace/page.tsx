'use client'

import { WorkspaceChat } from '@/components/workspace/WorkspaceChat'
import { WorkspaceEditor } from '@/components/workspace/WorkspaceEditor'
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader'

export default function WorkspacePage() {
  return (
    <div
      className="flex flex-col overflow-hidden bg-white"
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
      {/* 顶部导航栏：标题 + 会员 + 导出 + 全屏 + 用户头像 */}
      <WorkspaceHeader />

      {/* 下方左右两栏 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧 AI 对话区 - 固定宽度，禁止产生页面级滚动 */}
        <div className="workspace-chat-column flex shrink-0 flex-col overflow-hidden">
          <WorkspaceChat />
        </div>

        {/* 右侧创作工作台 - 核心编辑区域 */}
        <WorkspaceEditor />
      </div>
    </div>
  )
}
