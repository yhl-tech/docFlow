import { useState, useEffect, useCallback } from 'react'
import { useEditorStore } from '@/store/editorStore'

export interface OutlineItem {
  id: string
  level: number
  text: string
  pos: number
}

export function useDocumentOutline() {
  const { editorInstance } = useEditorStore()
  const [headings, setHeadings] = useState<OutlineItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  // 从编辑器内容中提取 heading 节点
  useEffect(() => {
    if (!editorInstance) {
      setHeadings([])
      return
    }

    const extract = () => {
      const items: OutlineItem[] = []
      editorInstance.state.doc.forEach((node, offset) => {
        if (node.type.name === 'heading') {
          items.push({
            id: `h-${offset}`,
            level: node.attrs.level as number,
            text: node.textContent,
            pos: offset,
          })
        }
      })
      setHeadings(items)
    }

    editorInstance.on('update', extract)
    extract()

    return () => {
      editorInstance.off('update', extract)
    }
  }, [editorInstance])

  // IntersectionObserver 追踪当前可视标题
  useEffect(() => {
    if (!headings.length || !editorInstance) return

    const editorEl = editorInstance.view.dom
    const headingEls = editorEl.querySelectorAll('h1,h2,h3,h4')
    if (!headingEls.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const pos = editorInstance.view.posAtDOM(el, 0)
            const match = headings.find((h) => Math.abs(h.pos - pos) < 5)
            if (match) setActiveId(match.id)
            break
          }
        }
      },
      { threshold: 0.1 },
    )

    headingEls.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [headings, editorInstance])

  const scrollTo = useCallback(
    (pos: number) => {
      if (!editorInstance) return
      editorInstance.commands.focus()
      const node = editorInstance.view.nodeDOM(pos) as HTMLElement | null
      node?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [editorInstance],
  )

  return { headings, activeId, scrollTo }
}
