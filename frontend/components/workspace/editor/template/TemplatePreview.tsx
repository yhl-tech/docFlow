'use client'

import { useMemo } from 'react'
import type { TemplateConfig } from '@/types/editor-template'
import { generateTemplateCSS, generatePageCSS } from '@/lib/utils/css-generator'

/** 预览示例内容 */
const SAMPLE_CONTENT = {
  title: '通用教案模板',
  heading_1: '一、基本教学信息',
  heading_2: '（一）教学目标',
  body: '本节课主要讲解相关知识点，通过案例分析和实践操作，帮助学生掌握基本概念和技能。教学方法采用讲授与互动相结合，注重培养学生的实践能力。',
  date: '2026年5月2日',
}

interface TemplatePreviewProps {
  config: TemplateConfig
  sampleContent?: Partial<typeof SAMPLE_CONTENT>
}

/**
 * 模板实时预览组件
 * 根据模板配置生成 CSS 样式，在浏览器中实时预览效果
 */
export function TemplatePreview({ config, sampleContent }: TemplatePreviewProps) {
  const css = useMemo(() => {
    return generatePageCSS(config.layout) + '\n' + generateTemplateCSS(config)
  }, [config])

  const content = { ...SAMPLE_CONTENT, ...sampleContent }

  return (
    <div className="preview-container overflow-auto p-4 bg-gray-100">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="preview-page">
        <div className="preview-title">{content.title}</div>
        <div className="preview-h1">{content.heading_1}</div>
        <div className="preview-h2">{content.heading_2}</div>
        <div className="preview-body">{content.body}</div>
        <div className="preview-date">{content.date}</div>
      </div>
      {/* 纸张信息标签 */}
      <div className="mt-2 text-center text-xs text-slate-400">
        {config.layout.paperSize} · 上{config.layout.marginTopMm}mm 下{config.layout.marginBottomMm}mm
        左{config.layout.marginLeftMm}mm 右{config.layout.marginRightMm}mm
      </div>
    </div>
  )
}
