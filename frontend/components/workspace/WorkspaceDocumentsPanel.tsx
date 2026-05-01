'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { FileText, Trash2, X, Plus, Save, RefreshCw } from 'lucide-react'
import { editorService } from '@/lib/api'
import { useEditorStore } from '@/store/editorStore'
import type { DocumentMeta } from '@/lib/api'
import type { TemplateBinding } from '@/types/editor-template'

function deriveTitleFromMarkdown(md: string) {
  const lines = md.split('\n').map((l) => l.trim()).filter(Boolean)
  const h1 = lines.find((l) => l.startsWith('# '))
  if (h1) return h1.replace(/^#\s+/, '').slice(0, 50)
  return '未命名文档'
}

export function WorkspaceDocumentsPanel({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const {
    content,
    setContent,
    currentDocumentId,
    setCurrentDocumentId,
    templateBinding,
    setTemplateBinding,
    setTemplates,
    setCurrentTemplate,
  } = useEditorStore()

  const [docs, setDocs] = useState<DocumentMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!open) return
    // 初始化标题
    setTitle((prev) => prev || deriveTitleFromMarkdown(content))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await editorService.listDocuments()
      setDocs(list)
    } catch (e: any) {
      const code = e?.response?.data?.code
      toast.error(code === 'AUTH_REQUIRED' ? '请先登录后使用文档功能' : '获取文档列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void refresh()
  }, [open, refresh])

  const currentDoc = useMemo(
    () => docs.find((d) => d.id === currentDocumentId) ?? null,
    [docs, currentDocumentId],
  )

  useEffect(() => {
    if (!open) return
    if (currentDoc?.title) setTitle(currentDoc.title)
  }, [open, currentDoc?.title])

  const handleNew = useCallback(() => {
    setCurrentDocumentId(null)
    setTemplateBinding(null)
    setTitle(deriveTitleFromMarkdown(content))
    toast.success('已切换到新文档')
  }, [setCurrentDocumentId, setTemplateBinding, content])

  const handleLoad = useCallback(async (docId: string) => {
    setLoading(true)
    try {
      const res = await editorService.loadDocument(docId)
      setContent(res.content)
      setCurrentDocumentId(res.meta.id)
      setTemplateBinding((res.templateBinding ?? null) as TemplateBinding | null)
      setTitle(res.meta.title)

      // 恢复模板（可选：列表里已有就不用再拉）
      if (res.templateBinding?.templateId) {
        const templates = await editorService.getTemplates()
        setTemplates(templates as any)
        const matched = templates.find((t) => t.id === res.templateBinding?.templateId) ?? null
        setCurrentTemplate(matched as any)
      }

      toast.success('文档已打开')
      onClose()
    } catch (e: any) {
      const code = e?.response?.data?.code
      toast.error(code === 'AUTH_REQUIRED' ? '请先登录后使用文档功能' : '打开文档失败')
    } finally {
      setLoading(false)
    }
  }, [setContent, setCurrentDocumentId, setTemplateBinding, setTemplates, setCurrentTemplate, onClose])

  const handleDelete = useCallback(async (docId: string) => {
    try {
      await editorService.deleteDocument(docId)
      setDocs((prev) => prev.filter((d) => d.id !== docId))
      if (currentDocumentId === docId) {
        setCurrentDocumentId(null)
        setTemplateBinding(null)
      }
      toast.success('文档已删除')
    } catch (e: any) {
      const code = e?.response?.data?.code
      toast.error(code === 'AUTH_REQUIRED' ? '请先登录后使用文档功能' : '删除失败')
    }
  }, [currentDocumentId, setCurrentDocumentId, setTemplateBinding])

  const handleSave = useCallback(async () => {
    if (!content.trim()) {
      toast.error('请先输入内容再保存')
      return
    }
    setSaving(true)
    try {
      const finalTitle = title.trim() || deriveTitleFromMarkdown(content)
      const res = await editorService.saveDocument({
        content,
        title: finalTitle,
        template: templateBinding?.templateId,
        templateBinding: templateBinding ?? undefined,
      })
      setCurrentDocumentId(res.id)
      toast.success('已保存')
      await refresh()
    } catch (e: any) {
      const code = e?.response?.data?.code
      toast.error(code === 'AUTH_REQUIRED' ? '请先登录后使用文档功能' : '保存失败')
    } finally {
      setSaving(false)
    }
  }, [content, title, templateBinding, setCurrentDocumentId, refresh])

  if (!open) return null

  const panel = (
    <div className="fixed inset-0 z-[9500] flex">
      <div className="w-[420px] bg-white shadow-2xl border-r border-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">我的文档</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Title + actions */}
        <div className="px-4 py-3 border-b border-slate-100">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">当前文档标题</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="未命名文档"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? '保存中…' : '保存'}
            </button>
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              新建
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              title="刷新列表"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
          {currentDocumentId && (
            <p className="mt-2 text-[11px] text-slate-400">
              当前文档：{currentDoc?.title ?? currentDocumentId}
            </p>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {docs.length === 0 ? (
            <div className="px-3 py-10 text-center text-xs text-slate-400">
              暂无文档。点击“保存”即可创建第一份文档。
            </div>
          ) : (
            <div className="space-y-1">
              {docs.map((d) => {
                const active = d.id === currentDocumentId
                return (
                  <div
                    key={d.id}
                    className={`group flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                      active ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
                    }`}
                  >
                    <button
                      onClick={() => void handleLoad(d.id)}
                      className="min-w-0 flex-1 text-left"
                      title="打开文档"
                    >
                      <p className={`truncate text-xs font-medium ${active ? 'text-white' : 'text-slate-800'}`}>
                        {d.title}
                      </p>
                      <p className={`truncate text-[10px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>
                        更新：{new Date(d.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        {' · '}
                        {d.wordCount} 字
                      </p>
                    </button>
                    <button
                      onClick={() => void handleDelete(d.id)}
                      className={`ml-2 rounded p-1 transition-colors ${
                        active ? 'text-slate-300 hover:text-white' : 'text-slate-300 hover:text-red-500'
                      }`}
                      title="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      <div className="flex-1 bg-black/20" onClick={onClose} />
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(panel, document.body)
}

