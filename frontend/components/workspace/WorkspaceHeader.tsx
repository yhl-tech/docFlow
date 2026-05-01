'use client'

import { useState } from 'react'
import { Crown, FolderOpen, Save } from 'lucide-react'
import { WorkspaceUserMenu } from './WorkspaceUserMenu'
import { UpgradeModal } from '@/components/pricing/UpgradeModal'
import { WorkspaceDocumentsPanel } from './WorkspaceDocumentsPanel'
import { useEditorStore } from '@/store/editorStore'
import { editorService } from '@/lib/api'
import { toast } from 'sonner'

interface WorkspaceHeaderProps {
  /** 创作工作台标题 */
  title?: string
}

export function WorkspaceHeader({ title = '创作工作台' }: WorkspaceHeaderProps) {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const { content, templateBinding, setCurrentDocumentId } = useEditorStore()

  async function quickSave() {
    if (!content.trim()) {
      toast.error('请先输入内容再保存')
      return
    }
    try {
      const res = await editorService.saveDocument({
        content,
        title: '',
        template: templateBinding?.templateId,
        templateBinding: templateBinding ?? undefined,
      })
      setCurrentDocumentId(res.id)
      toast.success('已保存')
    } catch (e: any) {
      const code = e?.response?.data?.code
      toast.error(code === 'AUTH_REQUIRED' ? '请先登录后使用文档功能' : '保存失败')
    }
  }

  return (
    <>
      <header className="flex-shrink-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
        {/* 左侧：标题 */}
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-slate-700">{title}</h2>
        </div>

        {/* 右侧：文档 + 会员 + 用户菜单 */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDocsOpen(true)}
            className="mr-1 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            title="打开文档"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>文档</span>
          </button>
          <button
            type="button"
            onClick={quickSave}
            className="mr-2 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
            title="快速保存"
          >
            <Save className="h-3.5 w-3.5" />
            <span>保存</span>
          </button>
          <button
            type="button"
            onClick={() => setUpgradeModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:border-indigo-300 hover:bg-indigo-100"
          >
            <Crown className="h-3.5 w-3.5" />
            <span>会员</span>
          </button>

          <div className="ml-1">
            <WorkspaceUserMenu />
          </div>
        </div>
      </header>

      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        initialTab="member"
      />

      <WorkspaceDocumentsPanel open={docsOpen} onClose={() => setDocsOpen(false)} />
    </>
  )
}
