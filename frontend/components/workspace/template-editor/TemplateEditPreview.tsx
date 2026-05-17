'use client'

import { useRef, useState, useEffect } from 'react'
import type { TemplateConfig } from '@/types/editor-template'
import { TemplatePreview } from '@/components/workspace/editor/template/TemplatePreview'

interface TemplateEditPreviewProps {
  config: TemplateConfig
}

const A4_WIDTH_PX = 794
const PAD = 16

export function TemplateEditPreview({ config }: TemplateEditPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [paperHeight, setPaperHeight] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // 监听纸张内容高度变化
  useEffect(() => {
    if (!paperRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      setPaperHeight(entry.contentRect.height)
    })
    observer.observe(paperRef.current)
    return () => observer.disconnect()
  }, [])

  const scale = containerWidth > 0 ? Math.min(1, (containerWidth - PAD * 2) / A4_WIDTH_PX) : 1
  // 缩放后的实际占用高度，用来撑开滚动容器
  const scaledHeight = paperHeight * scale + PAD * 2

  return (
    <div className="flex flex-1 flex-col overflow-hidden border-l border-slate-100">
      <div className="shrink-0 border-b border-slate-100 px-3 py-2">
        <span className="text-xs font-medium text-slate-500">实时预览</span>
      </div>
      <div ref={containerRef} className="relative flex-1 overflow-y-auto overflow-x-hidden bg-gray-100">
        {/* 占位 div 撑开正确的滚动高度 */}
        <div style={{ height: scaledHeight || undefined }} />
        <div
          style={{
            position: 'absolute',
            top: PAD,
            left: '50%',
            transform: `translateX(-50%) scale(${scale})`,
            transformOrigin: 'top center',
            width: A4_WIDTH_PX,
          }}
        >
          <div ref={paperRef}>
            <TemplatePreview config={config as any} />
          </div>
        </div>
      </div>
    </div>
  )
}
