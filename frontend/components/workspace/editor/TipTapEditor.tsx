"use client"

import React, { useEffect, useRef, useCallback, useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import CustomTable from "./extensions/CustomTable"
import CustomTableCell from "./extensions/CustomTableCell"
import CustomTableHeader from "./extensions/CustomTableHeader"
import TableRow from "@tiptap/extension-table-row"
import Placeholder from "@tiptap/extension-placeholder"
import { Markdown } from "tiptap-markdown"
import { toast } from "sonner"
import { Minimize2 } from "lucide-react"
import { useEditorStore } from "@/store/editorStore"
import { aiService } from "@/lib/api"
import { KaTeXNode } from "./extensions/KaTeXNode"
import StyleKeyExtension from "./extensions/StyleKeyExtension"
import { WordStyleApplierPlugin } from "./extensions/WordStyleApplier"
import FontFamily from "@tiptap/extension-font-family"
import { FloatingAIToolbar } from "./FloatingAIToolbar"
import CustomImage from "./extensions/CustomImage"

/**
 * style-key 标记逻辑已迁移到 StyleKeyExtension（MutationObserver 方案）。
 * 这里只保留工具函数。
 */
function preprocessMath(text: string): string {
  // 统一换行符（Windows 剪贴板可能是 CRLF）
  let s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  // 1. 豆包 / 标准 LaTeX 多行 \[...\]  →  $$...$$
  s = s.replace(/\\\[\n([\s\S]*?)\n\\\]/g, (_, c) => `$$\n${c}\n$$`)
  // 2. DeepSeek 风格：[ 独占一行 ... ] 独占一行  →  $$...$$
  s = s.replace(
    /(^|\n)\[\n([\s\S]*?)\n\](\n|$)/g,
    (_, pre, c, post) => `${pre}$$\n${c}\n$$${post}`,
  )
  // 3. 单行 \[...\]  →  $$...$$
  s = s.replace(/\\\[([^\n]*?)\\\]/g, (_, c) => `$$${c}$$`)
  // 4. \(...\) 行内公式  →  $...$
  s = s.replace(/\\\(([^\n]*?)\\\)/g, (_, c) => `$${c}$`)
  return s
}

/** 直接调用 startTracking */
function debounceStyleKey(editor: Editor) {
  editor.commands.startTracking()
}

interface TipTapEditorProps {
  /** 编辑器实例就绪时回调，供工具栏拿到 Editor 实例 */
  onReady?: (editor: Editor) => void
  /** 点击公式节点时回调，用于打开编辑弹窗 */
  onEditFormula?: (latex: string, displayMode: boolean, pos: number) => void
}

/* 将模板配置映射为编辑区 CSS 变量 */
function buildTemplateStyle(
  config: import("@/types/editor-template").TemplateConfig | null,
): React.CSSProperties {
  // 当 config 为 null 时，使用默认 CSS 变量
  // 注意：CSS border-width 不支持 pt 单位，使用 px（0.5pt ≈ 1px）
  if (!config) {
    return {
      "--tpl-title-size": "1.5rem",
      "--tpl-title-weight": "700",
      "--tpl-title-align": "center",
      "--tpl-h1-size": "1.25rem",
      "--tpl-h1-align": "left",
      "--tpl-h2-align": "left",
      "--tpl-h3-align": "left",
      "--tpl-h4-align": "left",
      "--tpl-h5-align": "left",
      "--tpl-body-weight": "400",
      "--tpl-body-align": "left",
      // 表格默认边框宽度（px，不是 pt）
      "--tpl-table-border-width": "1px",
      "--tpl-table-border-width-inner": "1px",
      // 表格默认背景色
      "--tpl-table-row-bg": "transparent",
    } as React.CSSProperties
  }
  const { styles, layout, headingStyles, paragraphStyles, imageStyles, tableStyles, listStyles, codeBlockStyles } = config
  const body = styles?.body ?? {}
  const h1 = styles?.heading_1 ?? {}
  const h2 = styles?.heading_2 ?? {}
  const h3 = styles?.heading_3 ?? {}
  const h4 = styles?.heading_4 ?? {}
  const h5 = styles?.heading_5 ?? {}
  const title = styles?.document_title ?? {}
  const subtitle = styles?.document_subtitle ?? styles?.subject_info ?? {}

  // headingStyles 优先级高于 styles.heading_N
  const hsH1 = headingStyles?.h1?.font ?? {}
  const hsH2 = headingStyles?.h2?.font ?? {}
  const hsH3 = headingStyles?.h3?.font ?? {}
  const hsH4 = headingStyles?.h4?.font ?? {}
  const hsH5 = headingStyles?.h5?.font ?? {}
  const h1Effective = { ...h1, ...hsH1 }
  const h2Effective = { ...h2, ...hsH2 }
  const h3Effective = { ...h3, ...hsH3 }
  const h4Effective = { ...h4, ...hsH4 }
  const h5Effective = { ...h5, ...hsH5 }

  // paragraphStyles 补充正文样式
  const bodyEffective = {
    ...body,
    align: paragraphStyles?.align ?? body.align,
    lineHeight: paragraphStyles?.lineHeight ?? body.lineHeight,
    firstLineIndentChars: paragraphStyles?.firstLineIndentChars ?? body.firstLineIndentChars,
  }

  const FONT_ID_MAP: Record<string, string> = {
    FangSong_GB2312: '"仿宋_GB2312", "FangSong", serif',
    FangSong: '"FangSong", "仿宋", serif',
    STFangsong: '"STFangsong", "华文仿宋", serif',
    SimHei: '"SimHei", "黑体", sans-serif',
    HuaWenHeiTi: '"HuaWenHeiTi", "华文黑体", "SimHei", "黑体", sans-serif',
    DengXian: '"DengXian", "等线", sans-serif',
    KaiTi_GB2312: '"KaiTi_GB2312", "KaiTi", "楷体", serif',
    KaiTi: '"KaiTi", "楷体", serif',
    STKaiti: '"STKaiti", "华文楷体", serif',
    FZXiaoBiaoSong: '"FZXiaoBiaoSong", "方正小标宋", serif',
    SimSun: '"SimSun", "宋体", serif',
    NSimSun: '"NSimSun", "新宋体", serif',
    STSong: '"STSong", "华文宋体", serif',
    STZhongsong: '"STZhongsong", "华文中宋", serif',
    "Microsoft YaHei": '"Microsoft YaHei", "微软雅黑", sans-serif',
  }
  const fontVar = (id?: string) => (id ? (FONT_ID_MAP[id] ?? id) : undefined)

  const result = {
    "--tpl-body-font": fontVar(bodyEffective.fontFamily ?? body.fontFamily) ?? "inherit",
    "--tpl-body-size": bodyEffective.fontSizePt ? `${bodyEffective.fontSizePt}pt` : undefined,
    "--tpl-body-weight": bodyEffective.bold ? "700" : "400",
    "--tpl-body-align": bodyEffective.align ?? "left",
    "--tpl-body-line-height":
      (layout?.defaultLineHeight ?? bodyEffective.lineHeight)?.toString() ?? undefined,
    "--tpl-body-indent": `${layout?.defaultFirstLineIndentChars ?? bodyEffective.firstLineIndentChars ?? 0}em`,
    "--tpl-paragraph-space-before": `${layout?.defaultParagraphSpacingBeforePt ?? 0}pt`,
    "--tpl-paragraph-space-after": `${layout?.defaultParagraphSpacingAfterPt ?? 0}pt`,
    "--tpl-title-font": fontVar(title.fontFamily) ?? "inherit",
    "--tpl-title-size": title.fontSizePt ? `${title.fontSizePt}pt` : undefined,
    "--tpl-title-align": title.align ?? "center",
    "--tpl-title-weight": title.bold ? "700" : "400",
    "--tpl-subtitle-font": fontVar(subtitle.fontFamily) ?? "inherit",
    "--tpl-subtitle-size": subtitle.fontSizePt
      ? `${subtitle.fontSizePt}pt`
      : undefined,
    "--tpl-subtitle-align": subtitle.align ?? "center",
    "--tpl-subtitle-weight": subtitle.bold ? "700" : "400",
    "--tpl-h1-font": fontVar(h1Effective.fontFamily) ?? "inherit",
    "--tpl-h1-size": h1Effective.fontSizePt ? `${h1Effective.fontSizePt}pt` : undefined,
    "--tpl-h1-weight": h1Effective.bold ? "700" : "400",
    "--tpl-h1-align": headingStyles?.h1?.align ?? h1Effective.align ?? "left",
    "--tpl-h1-line-height": headingStyles?.h1?.lineHeight?.toString() ?? undefined,
    "--tpl-h1-space-before": headingStyles?.h1?.spacingBeforePt ? `${headingStyles.h1.spacingBeforePt}pt` : undefined,
    "--tpl-h1-space-after": headingStyles?.h1?.spacingAfterPt ? `${headingStyles.h1.spacingAfterPt}pt` : undefined,
    "--tpl-h2-font": fontVar(h2Effective.fontFamily) ?? "inherit",
    "--tpl-h2-size": h2Effective.fontSizePt ? `${h2Effective.fontSizePt}pt` : undefined,
    "--tpl-h2-weight": h2Effective.bold ? "700" : "400",
    "--tpl-h2-align": headingStyles?.h2?.align ?? h2Effective.align ?? "left",
    "--tpl-h2-line-height": headingStyles?.h2?.lineHeight?.toString() ?? undefined,
    "--tpl-h2-space-before": headingStyles?.h2?.spacingBeforePt ? `${headingStyles.h2.spacingBeforePt}pt` : undefined,
    "--tpl-h2-space-after": headingStyles?.h2?.spacingAfterPt ? `${headingStyles.h2.spacingAfterPt}pt` : undefined,
    "--tpl-h3-font": fontVar(h3Effective.fontFamily) ?? "inherit",
    "--tpl-h3-size": h3Effective.fontSizePt ? `${h3Effective.fontSizePt}pt` : undefined,
    "--tpl-h3-weight": h3Effective.bold ? "700" : "400",
    "--tpl-h3-align": headingStyles?.h3?.align ?? h3Effective.align ?? "left",
    "--tpl-h3-line-height": headingStyles?.h3?.lineHeight?.toString() ?? undefined,
    "--tpl-h3-space-before": headingStyles?.h3?.spacingBeforePt ? `${headingStyles.h3.spacingBeforePt}pt` : undefined,
    "--tpl-h3-space-after": headingStyles?.h3?.spacingAfterPt ? `${headingStyles.h3.spacingAfterPt}pt` : undefined,
    "--tpl-h4-font": fontVar(h4Effective.fontFamily) ?? "inherit",
    "--tpl-h4-size": h4Effective.fontSizePt ? `${h4Effective.fontSizePt}pt` : undefined,
    "--tpl-h4-weight": h4Effective.bold ? "700" : "400",
    "--tpl-h4-align": headingStyles?.h4?.align ?? h4Effective.align ?? "left",
    "--tpl-h4-line-height": headingStyles?.h4?.lineHeight?.toString() ?? undefined,
    "--tpl-h4-space-before": headingStyles?.h4?.spacingBeforePt ? `${headingStyles.h4.spacingBeforePt}pt` : undefined,
    "--tpl-h4-space-after": headingStyles?.h4?.spacingAfterPt ? `${headingStyles.h4.spacingAfterPt}pt` : undefined,
    "--tpl-h5-font": fontVar(h5Effective.fontFamily) ?? "inherit",
    "--tpl-h5-size": h5Effective.fontSizePt ? `${h5Effective.fontSizePt}pt` : undefined,
    "--tpl-h5-weight": h5Effective.bold ? "700" : "400",
    "--tpl-h5-align": headingStyles?.h5?.align ?? h5Effective.align ?? "left",
    "--tpl-h5-line-height": headingStyles?.h5?.lineHeight?.toString() ?? undefined,
    "--tpl-h5-space-before": headingStyles?.h5?.spacingBeforePt ? `${headingStyles.h5.spacingBeforePt}pt` : undefined,
    "--tpl-h5-space-after": headingStyles?.h5?.spacingAfterPt ? `${headingStyles.h5.spacingAfterPt}pt` : undefined,
    "--tpl-margin": layout
      ? `${layout.marginTopMm ?? 25}mm ${layout.marginRightMm ?? 20}mm ${layout.marginBottomMm ?? 25}mm ${layout.marginLeftMm ?? 20}mm`
      : undefined,
    // 图片样式变量
    "--tpl-img-wrap-type": imageStyles?.position?.wrapType ?? 'inline',
    "--tpl-img-align": imageStyles?.position?.horizontalAlign ?? 'left',
    "--tpl-img-margin-top": imageStyles?.spacing?.marginTopCm ? `${imageStyles.spacing.marginTopCm}cm` : '0',
    "--tpl-img-margin-bottom": imageStyles?.spacing?.marginBottomCm ? `${imageStyles.spacing.marginBottomCm}cm` : '0',
    "--tpl-img-margin-left": imageStyles?.spacing?.marginLeftCm ? `${imageStyles.spacing.marginLeftCm}cm` : '0',
    "--tpl-img-margin-right": imageStyles?.spacing?.marginRightCm ? `${imageStyles.spacing.marginRightCm}cm` : '0',
    // 边框：优先从 border 读取，兼容 position.borderWidthPt
    "--tpl-img-border": (imageStyles?.border?.showBorder || imageStyles?.position?.borderWidthPt)
      ? `${imageStyles?.border?.widthPt ?? imageStyles?.position?.borderWidthPt ?? 5}pt solid ${imageStyles?.border?.color ?? imageStyles?.position?.borderColor ?? '#000000'}`
      : 'none',
    // 图片效果：亮度、对比度
    "--tpl-img-filter": (() => {
      const brightness = imageStyles?.style?.brightness ?? 0
      const contrast = imageStyles?.style?.contrast ?? 0
      if (brightness === 0 && contrast === 0) return 'none'
      const b = 1 + brightness / 100
      const c = 1 + contrast / 100
      return `brightness(${b}) contrast(${c})`
    })(),
    // 图片最大尺寸限制
    "--tpl-img-max-width": imageStyles?.position?.maxWidthCm ? `${imageStyles.position.maxWidthCm}cm` : undefined,
    "--tpl-img-max-height": imageStyles?.position?.maxHeightCm ? `${imageStyles.position.maxHeightCm}cm` : undefined,
    // 图片行间距
    "--tpl-img-line-spacing": imageStyles?.lineSpacing ? `${imageStyles.lineSpacing}` : undefined,
    // 图片颜色重置（灰度/冲淡/棕褐色）— CSS filter 实现预览效果
    "--tpl-img-recolor": (() => {
      const recolor = imageStyles?.style?.recolor
      if (!recolor || recolor.preset === 'none' || recolor.preset === undefined) return 'none'
      if (recolor.preset === 'grayscale') return 'grayscale(100%)'
      if (recolor.preset === 'washout') return 'opacity(0.4) brightness(1.5)'
      if (recolor.preset === 'sepia') return 'sepia(100%)'
      return 'none'
    })(),
    // 图片文字环绕距离（distanceMm）— CSS margin 预览
    "--tpl-img-wrap-distance": imageStyles?.textWrap?.distanceMm
      ? `${imageStyles.textWrap.distanceMm}mm` : '0',

    // 表格样式变量 — 必须写成 var() 字符串，才能让 CSS 规则中的 var() 正确引用
    // 直接写 computed 值（如 #000000）会使 CSS var() 引用失效
    // 注意：CSS border-width 不支持 pt 单位，需要转换为 px（1pt = 1.333px）
    "--tpl-table-align": tableStyles?.tableAlignment ?? 'left',
    "--tpl-table-width": tableStyles?.tableWidth ? `${tableStyles.tableWidth}%` : '100%',
    // 表格对齐 margin（直接计算，而不是依赖 CSS 规则匹配类名）
    "--tpl-table-ml": tableStyles?.tableAlignment === 'center' ? 'auto' : tableStyles?.tableAlignment === 'right' ? 'auto' : '0',
    "--tpl-table-mr": tableStyles?.tableAlignment === 'center' ? 'auto' : tableStyles?.tableAlignment === 'right' ? '0' : 'auto',
    // 表格边框（根据 preset 计算各边显隐）
    ...((() => {
      const border = tableStyles?.border
      const widthPx = border?.widthPt ? `${Math.round(border.widthPt * 1.333)}px` : '1px'
      const color = border?.color ?? '#000000'
      const style = border?.style === 'single' ? 'solid' : (border?.style ?? 'solid')
      const preset = border?.preset ?? 'all'
      const outerW = preset === 'none' ? '0px' : widthPx
      const innerW = (preset === 'none' || preset === 'outline') ? '0px' : widthPx
      return {
        "--tpl-table-border-color-inner": color,
        "--tpl-table-border-color": color,
        "--tpl-table-border-width-inner": innerW,
        "--tpl-table-border-width": innerW,
        "--tpl-table-border-outer-width": outerW,
        "--tpl-table-border-style": style,
      }
    })()),
    // 表格底纹
    // 表格底纹：applyTo="table" 时设整表背景，否则设单元格背景
    "--tpl-table-shading": tableStyles?.shading?.applyTo === 'table'
      ? (tableStyles.shading?.fill ?? 'transparent')
      : 'transparent',
    "--tpl-table-cell-shading": tableStyles?.shading?.applyTo !== 'table'
      ? (tableStyles?.shading?.fill ?? 'transparent')
      : 'transparent',
    // 表头底纹
    "--tpl-table-header-bg": tableStyles?.headerStyle?.shading?.fill ?? '#f0f0f0',
    "--tpl-table-header-bg-inner": tableStyles?.headerStyle?.shading?.fill ?? '#f0f0f0',
    // 全局字体回退（dataRowStyle 无字体时使用）
    "--tpl-table-global-font-family": tableStyles?.font?.fontFamily ?? 'inherit',
    "--tpl-table-global-font-size": tableStyles?.font?.fontSizePt ? `${tableStyles.font.fontSizePt}pt` : 'inherit',
    // 单元格内边距
    "--tpl-table-cell-padding": tableStyles?.cellPadding
      ? `var(--tpl-table-cell-pad-top, ${tableStyles.cellPadding.top ?? 0.14}cm) var(--tpl-table-cell-pad-right, ${tableStyles.cellPadding.right ?? 0}cm) var(--tpl-table-cell-pad-bottom, ${tableStyles.cellPadding.bottom ?? 0.14}cm) var(--tpl-table-cell-pad-left, ${tableStyles.cellPadding.left ?? 0}cm)`
      : 'var(--tpl-table-cell-pad-top, 0.14cm) var(--tpl-table-cell-pad-right, 0cm) var(--tpl-table-cell-pad-bottom, 0.14cm) var(--tpl-table-cell-pad-left, 0cm)',
    "--tpl-table-cell-pad-top": tableStyles?.cellPadding ? `${tableStyles.cellPadding.top ?? 0.14}cm` : '0.14cm',
    "--tpl-table-cell-pad-right": tableStyles?.cellPadding ? `${tableStyles.cellPadding.right ?? 0}cm` : '0cm',
    "--tpl-table-cell-pad-bottom": tableStyles?.cellPadding ? `${tableStyles.cellPadding.bottom ?? 0.14}cm` : '0.14cm',
    "--tpl-table-cell-pad-left": tableStyles?.cellPadding ? `${tableStyles.cellPadding.left ?? 0}cm` : '0cm',
    // 数据行字体样式
    "--tpl-table-font-family": tableStyles?.dataRowStyle?.font?.fontFamily ?? 'inherit',
    "--tpl-table-font-size": tableStyles?.dataRowStyle?.font?.fontSizePt
      ? `${tableStyles.dataRowStyle.font.fontSizePt}pt`
      : 'inherit',
    "--tpl-table-color": tableStyles?.dataRowStyle?.font?.color ?? 'inherit',
    "--tpl-table-font-italic": tableStyles?.dataRowStyle?.font?.italic ? 'italic' : 'inherit',
    "--tpl-table-font-bold": tableStyles?.dataRowStyle?.font?.bold ? '700' : 'inherit',
    "--tpl-table-text-decoration": tableStyles?.dataRowStyle?.font?.underline ? 'underline' : 'inherit',
    // 数据行底纹、对齐、行高
    "--tpl-table-row-bg": tableStyles?.dataRowStyle?.shading?.fill ?? 'transparent',
    "--tpl-table-td-align": tableStyles?.dataRowStyle?.align ?? 'left',
    "--tpl-table-td-valign": tableStyles?.dataRowStyle?.valign ?? 'middle',
    "--tpl-table-line-height": tableStyles?.dataRowStyle?.lineHeight ?? 1.5,
    // 表头字体样式
    "--tpl-table-th-font-family": tableStyles?.headerStyle?.font?.fontFamily ?? 'inherit',
    "--tpl-table-th-font-size": tableStyles?.headerStyle?.font?.fontSizePt
      ? `${tableStyles.headerStyle.font.fontSizePt}pt`
      : 'inherit',
    "--tpl-table-th-color": tableStyles?.headerStyle?.font?.color ?? 'inherit',
    "--tpl-table-th-font-bold": tableStyles?.headerStyle?.font?.bold === true ? '700' : 'inherit',
    "--tpl-table-th-font-italic": tableStyles?.headerStyle?.font?.italic ? 'italic' : 'inherit',
    "--tpl-table-th-text-decoration": tableStyles?.headerStyle?.font?.underline ? 'underline' : 'inherit',
    // 表头对齐和行高
    "--tpl-table-th-align": tableStyles?.headerStyle?.align ?? 'left',
    "--tpl-table-th-valign": tableStyles?.headerStyle?.valign ?? 'middle',
    "--tpl-table-th-line-height": tableStyles?.headerStyle?.lineHeight ?? 'inherit',
    // 表格行高预览（CSS min-height 实现）
    "--tpl-table-header-min-height": tableStyles?.rowHeight?.headerHeightCm
      ? `${tableStyles.rowHeight.headerHeightCm}cm` : undefined,
    "--tpl-table-row-min-height": tableStyles?.rowHeight?.dataRowHeightCm
      ? `${tableStyles.rowHeight.dataRowHeightCm}cm` : undefined,

    // 无序列表样式
    "--tpl-ul-marker": listStyles?.bullet?.character ?? '●',
    "--tpl-ul-marker-color": listStyles?.bullet?.color ?? 'inherit',
    "--tpl-ul-marker-font": fontVar(listStyles?.bullet?.fontFamily) ?? 'inherit',
    "--tpl-ul-indent": listStyles?.bullet?.indentCm ? `${listStyles.bullet.indentCm}cm` : '1.5em',
    "--tpl-ul-space-before": listStyles?.bullet?.spacingBeforeLines ? `${listStyles.bullet.spacingBeforeLines}em` : '0',
    "--tpl-ul-space-after": listStyles?.bullet?.spacingAfterLines ? `${listStyles.bullet.spacingAfterLines}em` : '0',
    "--tpl-ul-line-height": listStyles?.bullet?.lineSpacing?.toString() ?? 'inherit',

    // 有序列表样式
    "--tpl-ol-marker-color": listStyles?.ordered?.color ?? 'inherit',
    "--tpl-ol-marker-font": fontVar(listStyles?.ordered?.fontFamily) ?? 'inherit',
    "--tpl-ol-indent": listStyles?.ordered?.indentCm ? `${listStyles.ordered.indentCm}cm` : '1.5em',
    "--tpl-ol-space-before": listStyles?.ordered?.spacingBeforeLines ? `${listStyles.ordered.spacingBeforeLines}em` : '0',
    "--tpl-ol-space-after": listStyles?.ordered?.spacingAfterLines ? `${listStyles.ordered.spacingAfterLines}em` : '0',
    "--tpl-ol-line-height": listStyles?.ordered?.lineSpacing?.toString() ?? 'inherit',

    // 代码块（pre）样式
    "--tpl-code-font": fontVar(codeBlockStyles?.font?.fontFamily) ?? '"JetBrains Mono", "Fira Code", Consolas, monospace',
    "--tpl-code-size": codeBlockStyles?.font?.fontSizePt ? `${codeBlockStyles.font.fontSizePt}pt` : '0.8125rem',
    "--tpl-code-color": codeBlockStyles?.font?.color ?? '#e2e8f0',
    "--tpl-code-bg": codeBlockStyles?.shading?.fill ?? '#1e293b',
    "--tpl-code-line-height": codeBlockStyles?.lineSpacing?.toString() ?? '1.65',
    "--tpl-code-border": (() => {
      const b = codeBlockStyles?.border
      if (!b || !b.color) return 'none'
      const w = b.widthPt ? `${Math.round(b.widthPt * 1.333)}px` : '1px'
      return `${w} solid ${b.color}`
    })(),
    // 代码块内边距：统一使用 pt 单位（默认 12pt ≈ 1rem，16pt ≈ 1.25rem）
    "--tpl-code-padding-top": codeBlockStyles?.padding?.topPt ? `${codeBlockStyles.padding.topPt}pt` : '12pt',
    "--tpl-code-padding-bottom": codeBlockStyles?.padding?.bottomPt ? `${codeBlockStyles.padding.bottomPt}pt` : '12pt',
    "--tpl-code-padding-left": codeBlockStyles?.padding?.leftPt ? `${codeBlockStyles.padding.leftPt}pt` : '16pt',
    "--tpl-code-padding-right": codeBlockStyles?.padding?.rightPt ? `${codeBlockStyles.padding.rightPt}pt` : '16pt',
    // 代码块对齐
    "--tpl-code-align": codeBlockStyles?.alignment ?? 'left',
    // 代码块内联键盘样式（kbd 元素，编辑器中用 CSS 变量高亮显示）
    "--tpl-code-keyboard-color": codeBlockStyles?.keyboardStyle?.foregroundColor ?? 'inherit',
    "--tpl-code-keyboard-bg": codeBlockStyles?.keyboardStyle?.backgroundColor ?? 'inherit',
    // 代码块行号显示
    "--tpl-code-line-number-show": codeBlockStyles?.lineNumber?.show ? 'block' : 'none',
    "--tpl-code-line-number-color": codeBlockStyles?.lineNumber?.color ?? '#888888',
    // 代码块制表位宽度（tab-size CSS 属性，单位：字符数）
    "--tpl-code-tab-size": codeBlockStyles?.tabStop?.defaultMm
      ? `${Math.round(codeBlockStyles.tabStop.defaultMm / 3)}` : '4',

    // 纸张尺寸预览（编辑器宽度跟随纸张配置）
    ...((() => {
      if (!layout) return {}
      const PAPER_WIDTH: Record<string, string> = {
        A4: '210mm', A3: '297mm', B5: '176mm',
        Letter: '215.9mm', Legal: '215.9mm', '16K': '185mm', '8K': '270mm',
      }
      const isLandscape = layout.paperDirection === 'landscape'
      const paperSize = layout.paperSize ?? 'A4'
      // 自定义尺寸优先
      let paperWidthMm = layout.pageWidthMm
      let paperHeightMm = layout.pageHeightMm
      if (!paperWidthMm) {
        const stdW = PAPER_WIDTH[paperSize]
        paperWidthMm = stdW ? parseFloat(stdW) : 210
      }
      if (isLandscape && paperHeightMm) {
        // 横向：宽高互换
        const tmp = paperWidthMm
        paperWidthMm = paperHeightMm
        paperHeightMm = tmp
      }
      return {
        "--tpl-paper-width": `${paperWidthMm}mm`,
        "--tpl-paper-padding": layout
          ? `${layout.marginTopMm ?? 25}mm ${layout.marginRightMm ?? 20}mm ${layout.marginBottomMm ?? 25}mm ${layout.marginLeftMm ?? 20}mm`
          : undefined,
      }
    })()),
  } as unknown as React.CSSProperties

  return result
}

export function TipTapEditor({ onReady, onEditFormula }: TipTapEditorProps) {
  const {
    content,
    setContent,
    isFullscreen,
    setFullscreen,
    templatePanelOpen,
    draftTemplateConfig,
    templateBinding,
    setEditorInstance,
    pendingWordStyles,
    setPendingWordStyles,
    updateDraftStyle,
  } = useEditorStore()
  // 使用 useMemo 确保响应式更新
  const previewConfig = useMemo(() => {
    if (templatePanelOpen && draftTemplateConfig) {
      return draftTemplateConfig
    }
    return templateBinding?.configSnapshot ?? null
  }, [templatePanelOpen, draftTemplateConfig, templateBinding])
  const [isRewriting, setIsRewriting] = useState(false)
  // 防止外部更新 content 时触发死循环
  const skipUpdate = useRef(false)
  // 用 ref 稳定持有回调，避免 useEditor extensions 重新初始化
  const onEditFormulaRef = useRef(onEditFormula)
  useEffect(() => {
    onEditFormulaRef.current = onEditFormula
  }, [onEditFormula])
  const stableEditCallback = useCallback(
    (latex: string, displayMode: boolean, pos: number) => {
      onEditFormulaRef.current?.(latex, displayMode, pos)
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // 编辑器引用，供 handleAIAction 访问最新实例
  const editorRef = useRef<Editor | null>(null)

  const handleAIAction = useCallback(
    async (action: string, option?: string) => {
      const editor = editorRef.current
      if (!editor) return

      const { from, to } = editor.state.selection
      const selectedText = editor.state.doc.textBetween(from, to, " ")
      if (!selectedText.trim()) return

      const params: Parameters<typeof aiService.rewrite>[0] = {
        text: selectedText,
        type: action as any,
        ...(action === "扩写" && option
          ? { expandSubType: option as any }
          : {}),
        ...(action === "改变语气" && option
          ? { toneSubType: option as any }
          : {}),
        ...(action === "翻译" && option
          ? { translateSubType: option as any }
          : {}),
      }

      setIsRewriting(true)
      const toastId = toast.loading(`${action}中…`)
      try {
        const res = await aiService.rewrite(params)
        editor
          .chain()
          .focus()
          .deleteRange({ from, to })
          .insertContentAt(from, res.result)
          .run()
        toast.success("已替换选中内容", { id: toastId })
      } catch {
        toast.error("AI 处理失败，请重试", { id: toastId })
      } finally {
        setIsRewriting(false)
      }
    },
    [],
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // 关闭 StarterKit 内置的 heading，保留默认配置（支持 H1-H6）
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      CustomTable.configure({ resizable: false }),
      TableRow,
      CustomTableHeader,
      CustomTableCell,
      CustomImage,
      Placeholder.configure({
        placeholder: "",
      }),
      Markdown.configure({
        html: false, // 不允许 HTML 输入（安全）
        transformPastedText: true, // 粘贴 Markdown 时自动转为富文本
        transformCopiedText: false,
      }),
      // KaTeX 公式扩展 - 支持在编辑器中实时渲染 LaTeX 公式
      KaTeXNode.configure({
        inline: true,
        onEditFormula: stableEditCallback,
      }),
      FontFamily,
      StyleKeyExtension,
      WordStyleApplierPlugin,
    ],
    editorProps: {
      attributes: {
        class: "tiptap-editor outline-none",
      },
    },
    onUpdate({ editor }) {
      if (skipUpdate.current) return
      const mdStorage = (editor?.storage as any)?.markdown
      if (!mdStorage?.getMarkdown) return
      try {
        const md = mdStorage.getMarkdown()
        setContent(md)
        debounceStyleKey(editor)
      } catch {
        // getMarkdown 内部调用 editor.state.doc.textContent，
        // 编辑器销毁竞态时 state 为 null，直接吞掉即可
      }
    },
    onCreate({ editor }) {
      // 为文档标题段落添加 class（支持 p 和 h1）
      // 为副标题添加 class（第二个段落）
      // 必须放在 setContent 之前，因为 setContent 之后可能延迟渲染
      const markDocumentTitle = () => {
        const dom = editor.view.dom as HTMLElement
        if (!dom) return
        // 优先查找 h1（Markdown # 标题格式）
        const firstH1 = dom.querySelector("h1:first-of-type")
        if (firstH1) {
          firstH1.classList.add("document-title")
        } else {
          const firstP = dom.querySelector("p:first-of-type")
          if (firstP) {
            firstP.classList.add("document-title")
          }
        }
        // 标记副标题（第二个段落）
        const blocks = dom.querySelectorAll(
          ":scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6",
        )
        if (blocks.length >= 2) {
          const secondBlock = blocks[1]
          if (!secondBlock.classList.contains("document-title")) {
            secondBlock.classList.add("document-subtitle")
          }
        }
      }

      // 初始化时从 store 加载内容
      if (content) {
        skipUpdate.current = true
        editor.commands.setContent(content)
        skipUpdate.current = false
        // 内容加载后计算 style-key 并标记
        setTimeout(() => {
          markDocumentTitle()
        }, 100)
      } else {
        // 无内容时直接标记
        setTimeout(() => {
          markDocumentTitle()
        }, 100)
      }

      editorRef.current = editor
      setEditorInstance(editor)
      onReady?.(editor)
    },
  })

  // 同步 editorRef，确保 handleAIAction 始终持有最新实例
  useEffect(() => {
    if (editor) editorRef.current = editor
  }, [editor])

  // 监听用户在文档标题上的加粗操作，同步到模板设置
  useEffect(() => {
    if (!editor || !previewConfig) return

    let prevBoldState: boolean | null = null

    const updateBold = () => {
      const dom = editor.view.dom as HTMLElement
      const titleEl = dom.querySelector('[data-style-key="document_title"]')
      if (!titleEl) return

      const hasStrong = titleEl.querySelector("strong") !== null
      const templateBold = previewConfig?.styles?.document_title?.bold

      if (prevBoldState !== null && prevBoldState !== hasStrong) {
        updateDraftStyle("document_title", { bold: hasStrong })
      }
      prevBoldState = hasStrong
    }

    // 监听选区变化
    const handleSelectionUpdate = () => {
      updateBold()
    }

    editor.on("selectionUpdate", handleSelectionUpdate)

    // 初始检测
    updateBold()

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor, previewConfig?.styles?.document_title?.bold, updateDraftStyle])

  // 监听 headingStyles 变化：切换到标题时应用对应样式
  useEffect(() => {
    if (!editor || !previewConfig?.headingStyles) return

    const headingStyles = previewConfig.headingStyles

    const updateHeadingStyle = () => {
      const { from, to } = editor.state.selection
      const $from = editor.state.doc.resolve(from)
      const depth = $from.depth

      // 向上查找最近的 heading 节点
      let headingNode = null
      let level = 0
      for (let d = depth; d >= 1; d--) {
        const node = $from.node(d)
        if (node.type.name === 'heading') {
          headingNode = node
          level = node.attrs.level
          break
        }
      }

      if (!headingNode) return

      const hs = headingStyles[`h${level}`]
      if (!hs?.font) return

      const font = hs.font
      const marks: Record<string, string> = {}
      if (font.fontFamily) {
        marks['fontFamily'] = font.fontFamily
      }
      if (font.fontSizePt) {
        marks['fontSize'] = `${font.fontSizePt}pt`
      }
      if (font.color) {
        marks['color'] = font.color
      }
      if (font.bold) {
        marks['fontWeight'] = 'bold'
      } else if (font.bold === false) {
        marks['fontWeight'] = 'normal'
      }
      if (font.italic) {
        marks['fontStyle'] = 'italic'
      } else if (font.italic === false) {
        marks['fontStyle'] = 'normal'
      }

      if (Object.keys(marks).length > 0) {
        editor.chain().focus().updateAttributes('textStyle', marks).run()
      }
    }

    editor.on('selectionUpdate', updateHeadingStyle)
    editor.on('transaction', updateHeadingStyle)

    return () => {
      editor.off('selectionUpdate', updateHeadingStyle)
      editor.off('transaction', updateHeadingStyle)
    }
  }, [editor, previewConfig?.headingStyles])

  // 响应外部 content 变化（如 AI 对话填入内容）
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const mdStorage = (editor.storage as any)?.markdown
    if (!mdStorage?.getMarkdown) return
    try {
      const current = mdStorage.getMarkdown()
      if (current !== content) {
        skipUpdate.current = true
        editor.commands.setContent(content)
        skipUpdate.current = false
        // 内容加载后等待渲染完成再标记
        setTimeout(() => {
          const dom = editor.view.dom as HTMLElement
          if (!dom) return
          const firstH1 = dom.querySelector("h1:first-of-type")
          if (firstH1) {
            firstH1.classList.add("document-title")
          } else {
            const firstP = dom.querySelector("p:first-of-type")
            if (firstP) {
              firstP.classList.add("document-title")
            }
          }
          // 标记副标题（第二个段落）
          const blocks = dom.querySelectorAll(
            ":scope > p, :scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6",
          )
          if (blocks.length >= 2) {
            const secondBlock = blocks[1]
            if (!secondBlock.classList.contains("document-title")) {
              secondBlock.classList.add("document-subtitle")
            }
          }
        }, 100)
      }
    } catch {
      // getMarkdown 竞态时 editor.state 为 null，忽略即可
    }
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  // Word 样式应用：content 加载后触发 WordStyleApplier 插件
  // 监听 content 和 pendingWordStyles 两者，确保样式在内容稳定后应用
  useEffect(() => {
    if (!editor || editor.isDestroyed || !pendingWordStyles?.length) return

    // 等待一小段时间确保 setContent 已经完全应用
    const timer = setTimeout(() => {
      // 再次检查 editor 状态和 style 数据
      if (!editor || editor.isDestroyed) return

      // 获取当前文档文本，验证内容已稳定
      const currentDoc = editor.state.doc
      const docText = currentDoc.textContent

      // 如果文档为空或非常短（内容可能还没加载完），跳过本次
      // 内容太短可能是 setContent 还在进行中
      if (docText.length < 10 && content.length > 10) {
        return
      }

      const tr = editor.state.tr.setMeta("applyWordStyles", pendingWordStyles)
      editor.view.dispatch(tr)
      // 消费后清空，防止重复应用
      setPendingWordStyles(null)
    }, 200) // 200ms 延迟确保 setContent 完全应用

    return () => clearTimeout(timer)
  }, [content, pendingWordStyles, editor, setPendingWordStyles])

  // 拦截粘贴事件：把非标准公式定界符（\[...\]、[...]等）预处理为 $$...$$
  // 在 capture 阶段运行，早于 tiptap-markdown 的粘贴插件。
  // 构造只含 text/plain 的合成事件，防止 tiptap-markdown 优先消费 text/html
  useEffect(() => {
    if (!editor) return
    const dom = editor.view.dom
    let handling = false

    const onPaste = (e: ClipboardEvent) => {
      if (handling) return
      const text = e.clipboardData?.getData("text/plain")
      if (!text) return
      const converted = preprocessMath(text)
      if (converted === text) return // 无需转换，交给默认流程

      e.preventDefault()
      e.stopImmediatePropagation()

      // 构造只含 text/plain 的新事件，tiptap-markdown 拿不到 text/html
      // 从而走纯文本 Markdown 解析路径
      const dt = new DataTransfer()
      dt.setData("text/plain", converted)
      const synthetic = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      })
      handling = true
      dom.dispatchEvent(synthetic)
      handling = false
    }

    dom.addEventListener("paste", onPaste, true)
    return () => dom.removeEventListener("paste", onPaste, true)
  }, [editor])

  const containerRef = useRef<HTMLDivElement>(null)

  // 监听插入图片事件
  useEffect(() => {
    if (!editor) return
    const onInsertImage = (e: Event) => {
      const { base64 } = (e as CustomEvent).detail
      
      if (!base64 || !editor) return
      
      // 从模板配置读取图片样式
      const config = useEditorStore.getState().draftTemplateConfig 
        ?? useEditorStore.getState().templateBinding?.configSnapshot 
        ?? null
      const imageStyles = config?.imageStyles
      const position = imageStyles?.position ?? {}
      const spacing = imageStyles?.spacing ?? {}
      const border = imageStyles?.border ?? {}
      const style = imageStyles?.style ?? {}
      // 兼容 border.widthPt 和 position.borderWidthPt
      const borderWidthPt = border.widthPt ?? position.borderWidthPt ?? 0
      const showBorder = border.showBorder || borderWidthPt > 0
      const borderColor = border.color ?? position.borderColor ?? '#000000'
      
      editor.chain().focus().setImage({
        src: base64,
        wrapType: position.wrapType ?? 'inline',
        imgAlign: position.horizontalAlign ?? 'left',
        borderWidthPt,
        showBorder,
        borderColor,
        marginTopCm: spacing.marginTopCm ?? 0,
        marginBottomCm: spacing.marginBottomCm ?? 0,
        marginLeftCm: spacing.marginLeftCm ?? 0,
        marginRightCm: spacing.marginRightCm ?? 0,
        brightness: style.brightness ?? 0,
        contrast: style.contrast ?? 0,
        sizeMode: position.sizeMode ?? 'original',
        maxWidthCm: position.maxWidthCm,
        maxHeightCm: position.maxHeightCm,
        keepAspectRatio: position.keepAspectRatio ?? true,
        lineSpacing: imageStyles?.lineSpacing ?? 1.0,
      } as any).run()
    }
    window.addEventListener("editor-insert-image", onInsertImage)
    return () =>
      window.removeEventListener("editor-insert-image", onInsertImage)
  }, [editor])

  // 监听模板配置变化，更新现有图片的属性
  useEffect(() => {
    if (!editor) {
      console.log('[TipTapEditor] 图片同步跳过: editor 未就绪')
      return
    }
    if (!previewConfig) {
      console.log('[TipTapEditor] 图片同步跳过: previewConfig 为空')
      return
    }
    const imageStyles = previewConfig.imageStyles
    if (!imageStyles) {
      console.log('[TipTapEditor] 图片同步跳过: imageStyles 为空')
      return
    }

    const position = imageStyles.position ?? {}
    const spacing = imageStyles.spacing ?? {}
    const border = imageStyles.border ?? {}
    const style = imageStyles.style ?? {}
    const { wrapType, horizontalAlign, sizeMode, maxWidthCm, maxHeightCm, keepAspectRatio } = position
    // 兼容两种格式：border.widthPt 和 position.borderWidthPt
    const borderWidthPt = border.widthPt ?? position.borderWidthPt
    const showBorder = border.showBorder ?? (borderWidthPt !== undefined && borderWidthPt > 0)
    const borderColor = border.color ?? position.borderColor ?? '#000000'
    console.log('[TipTapEditor] 图片同步触发:', { wrapType, horizontalAlign, border, position, borderWidthPt, showBorder, style })

    // 遍历所有图片，按配置更新属性
    const result = editor.chain().command(({ tr, state }) => {
      let modified = false
      let count = 0
      state.doc.descendants((node, pos) => {
        if (node.type.name === 'image') {
          count++
          const newAttrs: Record<string, any> = { ...node.attrs }
          // 位置属性
          if (wrapType) newAttrs.wrapType = wrapType
          if (horizontalAlign) newAttrs.imgAlign = horizontalAlign
          // 边框属性
          if (borderWidthPt !== undefined) newAttrs.borderWidthPt = borderWidthPt
          if (showBorder !== undefined) newAttrs.showBorder = showBorder
          if (borderColor) newAttrs.borderColor = borderColor
          // 间距属性
          if (spacing.marginTopCm !== undefined) newAttrs.marginTopCm = spacing.marginTopCm
          if (spacing.marginBottomCm !== undefined) newAttrs.marginBottomCm = spacing.marginBottomCm
          if (spacing.marginLeftCm !== undefined) newAttrs.marginLeftCm = spacing.marginLeftCm
          if (spacing.marginRightCm !== undefined) newAttrs.marginRightCm = spacing.marginRightCm
          // 效果属性
          if (style.brightness !== undefined) newAttrs.brightness = style.brightness
          if (style.contrast !== undefined) newAttrs.contrast = style.contrast
          // 基础设置
          if (sizeMode) newAttrs.sizeMode = sizeMode
          if (maxWidthCm !== undefined) newAttrs.maxWidthCm = maxWidthCm
          if (maxHeightCm !== undefined) newAttrs.maxHeightCm = maxHeightCm
          if (keepAspectRatio !== undefined) newAttrs.keepAspectRatio = keepAspectRatio
          // 行间距
          if (imageStyles.lineSpacing !== undefined) newAttrs.lineSpacing = imageStyles.lineSpacing
          tr.setNodeMarkup(pos, undefined, newAttrs)
          modified = true
        }
      })
      console.log(`[TipTapEditor] 找到 ${count} 张图片，已更新`)
      return modified
    }).run()

    console.log('[TipTapEditor] 图片样式同步完成')
  }, [editor, previewConfig?.imageStyles])

  // 暴露强制刷新图片样式的方法到全局
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__refreshImageStyles = () => {
        if (!editor || !previewConfig?.imageStyles) return
        const { wrapType, horizontalAlign } = previewConfig.imageStyles.position ?? {}
        if (!wrapType && !horizontalAlign) return
        
        editor.chain().command(({ tr, state }) => {
          let count = 0
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'image') {
              count++
              if (wrapType) tr.setNodeMarkup(pos, undefined, { ...node.attrs, wrapType })
              if (horizontalAlign) tr.setNodeMarkup(pos, undefined, { ...node.attrs, imgAlign: horizontalAlign })
            }
          })
          console.log(`[手动刷新] 更新了 ${count} 张图片`)
          return count > 0
        }).run()
      }
    }
  }, [editor, previewConfig?.imageStyles])

  // 监听表格样式配置变化，同步更新所有现有表格节点的属性
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (!previewConfig?.tableStyles) return

    const ts = previewConfig.tableStyles
    const cellPad = ts.cellPadding ?? {}
    const rowH = ts.rowHeight ?? {}

    console.log('[TipTapEditor] 表格样式同步触发:', ts)

    editor.chain().command(({ tr, state }) => {
      let count = 0
      state.doc.descendants((node, pos) => {
        if (node.type.name === 'table') {
          count++
          const newAttrs = {
            ...node.attrs,
            tableAlign: ts.tableAlignment ?? node.attrs.tableAlign ?? 'left',
            tableWidth: ts.tableWidth ?? node.attrs.tableWidth ?? 100,
            borderColor: ts.border?.color ?? node.attrs.borderColor ?? '#000000',
            borderWidthPt: ts.border?.widthPt ?? node.attrs.borderWidthPt ?? 0.5,
            borderStyle: ts.border?.style ?? node.attrs.borderStyle ?? 'solid',
            shadingFill: ts.shading?.fill ?? node.attrs.shadingFill ?? 'transparent',
            cellPadTop: cellPad.top ?? node.attrs.cellPadTop ?? 0.14,
            cellPadRight: cellPad.right ?? node.attrs.cellPadRight ?? 0,
            cellPadBottom: cellPad.bottom ?? node.attrs.cellPadBottom ?? 0.14,
            cellPadLeft: cellPad.left ?? node.attrs.cellPadLeft ?? 0,
            headerBg: ts.headerStyle?.shading?.fill ?? node.attrs.headerBg ?? '#f0f0f0',
            headerFontSizePt: ts.headerStyle?.font?.fontSizePt ?? node.attrs.headerFontSizePt ?? 0,
            headerBold: ts.headerStyle?.font?.bold ?? node.attrs.headerBold ?? true,
            dataRowBg: ts.dataRowStyle?.shading?.fill ?? node.attrs.dataRowBg ?? 'transparent',
            dataRowFontSizePt: ts.dataRowStyle?.font?.fontSizePt ?? node.attrs.dataRowFontSizePt ?? 0,
            dataRowBold: ts.dataRowStyle?.font?.bold ?? node.attrs.dataRowBold ?? false,
          }
          tr.setNodeMarkup(pos, undefined, newAttrs)
        }
      })
      console.log(`[TipTapEditor] 同步了 ${count} 个表格`)
      return count > 0
    }).run()
  }, [editor, previewConfig?.tableStyles])

  // ESC 退出全屏
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setFullscreen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isFullscreen, setFullscreen])

  // 全屏层内容（当 isFullscreen 为 true 时通过 Portal 渲染到 body）
  const templateStyle = buildTemplateStyle(previewConfig)

  // 追踪标题的实际样式（当没有模板时，跟踪用户手动设置的样式）
  const [titleActualBold, setTitleActualBold] = useState<boolean>(true)

  // 当没有模板绑定时，监听标题的实际样式
  useEffect(() => {
    if (!editor) return

    const updateTitleBold = () => {
      const dom = editor.view.dom as HTMLElement
      const titleEl = dom.querySelector('[data-style-key="document_title"]')
      if (!titleEl) return
      const hasStrong = titleEl.querySelector("strong") !== null
      setTitleActualBold(hasStrong)
    }

    // 监听选区变化（Bold 切换会触发这个）
    editor.on("selectionUpdate", updateTitleBold)
    // 监听内容变化
    editor.on("update", updateTitleBold)

    // 初始检测
    updateTitleBold()

    return () => {
      editor.off("selectionUpdate", updateTitleBold)
      editor.off("update", updateTitleBold)
    }
  }, [editor])

  // 当没有模板时，使用标题的实际样式
  const finalStyle = useMemo(() => {
    if (previewConfig) {
      // 有模板时，使用模板配置
      console.log('[TipTapEditor] buildTemplateStyle 输入 - previewConfig.tableStyles:', previewConfig.tableStyles)
      console.log('[TipTapEditor] buildTemplateStyle 输入 - tableStyles.headerStyle:', previewConfig.tableStyles?.headerStyle)
      return templateStyle
    }
    // 没有模板时，根据标题的实际加粗状态设置 CSS 变量
    return {
      ...templateStyle,
      "--tpl-title-weight": titleActualBold ? "700" : "400",
    }
  }, [templateStyle, previewConfig, titleActualBold])

  // 调试：打印 finalStyle 中的表格 CSS 变量
  useEffect(() => {
    console.log('[TipTapEditor] finalStyle 中的表格 CSS 变量:', {
      '--tpl-table-th-font-bold': (finalStyle as any)['--tpl-table-th-font-bold'],
      '--tpl-table-header-bg': (finalStyle as any)['--tpl-table-header-bg'],
      '--tpl-table-font-bold': (finalStyle as any)['--tpl-table-font-bold'],
    })
  }, [finalStyle])

  // 追踪模板设置的变化（只在模板面板主动修改时触发）
  const lastTemplateBoldRef = useRef<boolean | undefined>(undefined)
  const lastUserBoldRef = useRef<boolean | undefined>(undefined)

  // 当模板设置改变加粗时，同步标题上的 strong 标签
  useEffect(() => {
    if (!editor || !previewConfig) return
    const templateBold = previewConfig.styles?.document_title?.bold
    const dom = editor.view.dom as HTMLElement
    const titleEl = dom.querySelector('[data-style-key="document_title"]')
    if (!titleEl) return

    const titleText = titleEl.textContent?.trim() || ""
    const hasStrong = titleEl.querySelector("strong") !== null

    // 检测是否是模板设置主动变化（与上次记录的值不同）
    const templateChanged = lastTemplateBoldRef.current !== templateBold
    if (templateChanged) {
      lastTemplateBoldRef.current = templateBold
      lastUserBoldRef.current = hasStrong

      if (templateBold === false && hasStrong) {
        // 模板要求不加粗，但标题被加粗了 → 取消加粗
        const pos = editor.view.posAtDOM(titleEl, 0)
        if (pos >= 0) {
          editor
            .chain()
            .focus()
            .setTextSelection({ from: pos, to: pos + titleText.length })
            .toggleBold()
            .run()
        }
      } else if (templateBold === true && !hasStrong) {
        // 模板要求加粗，但标题没加粗 → 添加加粗
        const pos = editor.view.posAtDOM(titleEl, 0)
        if (pos >= 0) {
          editor
            .chain()
            .focus()
            .setTextSelection({ from: pos, to: pos + titleText.length })
            .toggleBold()
            .run()
        }
      }
    }
  }, [previewConfig?.styles?.document_title?.bold, editor])

  const fullscreenLayer = (
    <div className="fixed inset-0 z-[9999] bg-white">
      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-white border-b flex items-center justify-between px-4 z-10">
        <span className="text-sm font-medium text-gray-600">全屏编辑</span>
        <button
          onClick={() => setFullscreen(false)}
          className="text-sm text-gray-500 hover:text-primary flex items-center gap-1"
        >
          <Minimize2 className="w-4 h-4" />
          退出全屏
        </button>
      </div>

      <div className="h-full flex items-center justify-center p-8 pt-16">
        <div
          ref={containerRef}
          id="editor-root"
          className="max-w-4xl w-full h-full rounded-lg border border-slate-200/80 bg-white shadow-lg p-8 tpl-paper"
          style={finalStyle}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* AI 浮动工具栏（仅编辑器内选中时出现） */}
      <FloatingAIToolbar
        onAction={handleAIAction}
        isLoading={isRewriting}
        scopeRef={containerRef}
      />
    </div>
  )

  // 非全屏时的普通编辑区
  const normalEditor = (
    <div
      ref={containerRef}
      id="editor-root"
      className="editor-scroll relative h-full overflow-y-auto bg-slate-100/60 px-6 py-6"
    >
      <div
        className="mx-auto min-h-full max-w-[680px] rounded-sm border border-slate-200/80 bg-white shadow-sm tpl-paper"
        style={finalStyle}
      >
        <EditorContent editor={editor} />
      </div>
      <FloatingAIToolbar
        onAction={handleAIAction}
        isLoading={isRewriting}
        scopeRef={containerRef}
      />
    </div>
  )

  // 全屏时用 Portal 渲染到 body，脱离 overflow-hidden 裁剪
  if (isFullscreen && typeof document !== "undefined") {
    return createPortal(fullscreenLayer, document.body)
  }

  return normalEditor
}
