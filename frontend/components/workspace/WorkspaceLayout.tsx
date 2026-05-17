'use client'

import { useCallback, useState } from 'react'
import { WorkspaceHeader } from './WorkspaceHeader'
import { WorkspaceEditor } from './WorkspaceEditor'
import { WorkspaceChat } from './WorkspaceChat'
import { DocumentOutline } from './outline/DocumentOutline'
import { WorkspaceNav, type NavPanelId } from './nav/WorkspaceNav'
import { WorkspaceNavPanel } from './nav/WorkspaceNavPanel'
import { ExportDebugPanel } from './editor/ExportDebugPanel'
import { UpgradeModal } from '@/components/pricing/UpgradeModal'
import { useEditorStore } from '@/store/editorStore'
import { useWorkspaceNavStore } from '@/store/workspaceNavStore'
import { useResizablePanel } from '@/hooks/useResizablePanel'
import { TemplateMarketFullPage } from './template-market/TemplateMarketFullPage'
import { TemplateEditLayout } from './template-editor/TemplateEditLayout'

export function WorkspaceLayout() {
  const { activeNavId, panelOpen, editingTemplateId, setActiveNavId, setPanelOpen } = useWorkspaceNavStore()
  const { rightPanelMode, toggleRightPanel } = useEditorStore()
  const { width, startResize } = useResizablePanel('workspace-nav-panel-width', 280)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  // 全屏视图优先级：模板编辑 > 模板市场 > 普通编辑器
  const isTemplateEditPage = !!editingTemplateId
  const isTemplateMarketPage = !isTemplateEditPage && activeNavId === 'templates'

  const handleNavClick = useCallback((id: NavPanelId) => {
    setActiveNavId(id)
    if (id !== 'files') {
      setPanelOpen(false)
    } else {
      setPanelOpen(true)
    }
  }, [setActiveNavId, setPanelOpen])

  const handleAIClick = useCallback(() => {
    toggleRightPanel('ai')
  }, [toggleRightPanel])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <WorkspaceHeader />

      <div className="flex flex-1 overflow-hidden">
        <WorkspaceNav
          activeId={activeNavId}
          panelOpen={panelOpen && !isTemplateMarketPage}
          aiPanelOpen={rightPanelMode === 'ai'}
          onNavClick={handleNavClick}
          onAIClick={handleAIClick}
          onUpgradeClick={() => setUpgradeModalOpen(true)}
        />

        {isTemplateEditPage ? (
          // 模板编辑页全屏显示
          <TemplateEditLayout templateId={editingTemplateId!} />
        ) : isTemplateMarketPage ? (
          // 模板市场全屏显示
          <TemplateMarketFullPage />
        ) : (
          // 我的文档页面：左侧面板 + 右侧编辑器
          <>
            {panelOpen && (
              <WorkspaceNavPanel
                activeId={activeNavId}
                width={width}
                onResizeStart={startResize}
                onCollapse={() => setPanelOpen(false)}
              />
            )}

            <div className="flex flex-1 overflow-hidden">
              {rightPanelMode === 'ai' && <WorkspaceChat />}

              <WorkspaceEditor
                panelOpen={panelOpen}
                onTogglePanel={() => setPanelOpen(true)}
                aiPanelOpen={rightPanelMode === 'ai'}
                onToggleAI={handleAIClick}
              />

              {rightPanelMode === 'outline' && <DocumentOutline />}
            </div>
          </>
        )}
      </div>

      <ExportDebugPanel />

      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        initialTab="member"
      />
    </div>
  )
}
