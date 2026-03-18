'use client'

interface ToolEditorProps {
  exportFormats: ('docx' | 'pdf')[]
}

export function ToolEditor({ exportFormats }: ToolEditorProps) {
  return (
    <div className="border rounded-xl p-6 bg-gray-50 text-center text-muted-foreground">
      编辑器区域（待实现）— 支持格式：{exportFormats.join(' / ')}
    </div>
  )
}
