'use client'

import { X } from 'lucide-react'
import type { TemplateMarketItem } from '@/types/templateMarket'

interface TemplateUsageConfirmProps {
  template: TemplateMarketItem
  onApplyCurrent: () => void   // 应用到当前文档
  onNewDocument: () => void    // 新建文档并使用
  onCancel: () => void
}

export function TemplateUsageConfirm({
  template,
  onApplyCurrent,
  onNewDocument,
  onCancel,
}: TemplateUsageConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative w-96 rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <span className="font-medium text-gray-800">使用模板「{template.name}」</span>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="mb-4 text-sm text-gray-500">
            当前文档已有内容，请选择如何应用此模板：
          </p>

          <div className="space-y-2">
            <button
              onClick={onApplyCurrent}
              className="flex w-full flex-col items-start rounded-lg border-2 border-transparent px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
            >
              <span className="font-medium text-gray-800">应用到当前文档</span>
              <span className="mt-0.5 text-xs text-gray-400">保留当前内容，仅更换排版格式</span>
            </button>

            <button
              onClick={onNewDocument}
              className="flex w-full flex-col items-start rounded-lg border-2 border-transparent px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
            >
              <span className="font-medium text-gray-800">新建文档并使用</span>
              <span className="mt-0.5 text-xs text-gray-400">创建空白文档并应用此模板</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t px-5 py-3">
          <button
            onClick={onCancel}
            className="rounded-md px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
