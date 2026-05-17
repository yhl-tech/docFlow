'use client'

import { FileManagerPanel } from '../file-manager/FileManagerPanel'
import type { NavPanelId } from '@/store/workspaceNavStore'

interface WorkspaceNavPanelProps {
  activeId: NavPanelId
  width: number
  onResizeStart: (e: React.MouseEvent) => void
  onCollapse: () => void
}

export function WorkspaceNavPanel({ activeId, width, onResizeStart, onCollapse }: WorkspaceNavPanelProps) {
  return (
    <div
      className="relative flex shrink-0 flex-col border-r bg-white"
      style={{ width }}
    >
      <div className="flex-1 overflow-hidden">
        {activeId === 'files' && <FileManagerPanel onCollapse={onCollapse} />}
      </div>

      {/* 拖拽调整宽度的把手 */}
      <div
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-200"
        onMouseDown={onResizeStart}
      />
    </div>
  )
}

