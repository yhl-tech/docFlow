"use client"

import { useMemo } from "react"
import type { TemplateConfig, PageNumberConfig, HeaderFooterConfig } from "@/types/editor-template"
import { generateTemplateCSS, generatePageCSS, generateImageStylesCSS } from "@/lib/utils/css-generator"

interface TemplatePreviewProps {
  config: TemplateConfig
  pageHeightPx?: number
}

// A4 默认尺寸（mm）
const DEFAULT_W = 210
const DEFAULT_H = 297

/** 将页码 format 枚举转为预览显示字符串 */
function formatPageNumber(format: PageNumberConfig["format"], value: number): string {
  if (format === "lowercaseRoman") {
    const roman = ["", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"]
    return roman[value] ?? String(value)
  }
  if (format === "uppercaseRoman") {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]
    return roman[value] ?? String(value)
  }
  return String(value)
}

/** 根据 labelTemplate 生成页码文字 */
function buildPageLabel(pn: PageNumberConfig, pageValue: number): string {
  const tmpl = pn.labelTemplate ?? "- {page} -"
  const pageStr = formatPageNumber(pn.format, pageValue)
  return tmpl.replace("{page}", pageStr).replace("{total}", "5")
}

export function TemplatePreview({ config }: TemplatePreviewProps) {
  const css = useMemo(() => {
    return (
      generatePageCSS(config.layout) + "\n" +
      generateTemplateCSS(config) + "\n" +
      generateImageStylesCSS(config.imageStyles)
    )
  }, [config])

  const layout = config.layout ?? {}
  const {
    marginTopMm = 25,
    marginBottomMm = 25,
    marginLeftMm = 20,
    marginRightMm = 20,
    paperDirection,
    pageWidthMm,
    pageHeightMm,
    headerDistanceCm,
    footerDistanceCm,
  } = layout

  // [FIX] 纸张尺寸：支持横向和自定义尺寸
  const isLandscape = paperDirection === "landscape"
  const baseW = pageWidthMm ?? DEFAULT_W
  const baseH = pageHeightMm ?? DEFAULT_H
  const paperW = isLandscape ? Math.max(baseW, baseH) : Math.min(baseW, baseH)
  const paperH = isLandscape ? Math.min(baseW, baseH) : Math.max(baseW, baseH)

  // 页眉页脚配置（兼容旧版字段名）
  const hfRaw = layout.headerFooter as HeaderFooterConfig | undefined
  const hasHeader = hfRaw?.hasHeader !== false
  const hasFooter = hfRaw?.hasFooter !== false
  const headerContent = hfRaw?.headerContent?.center
    ?? (hfRaw as any)?.center?.content
    ?? "示例文档页眉"
  const footerContent = hfRaw?.footerContent?.center
    ?? (hfRaw as any)?.footerCenter?.content
    ?? ""

  // [FIX] 页眉页脚距离
  const headerMarginBottom = headerDistanceCm ? `${headerDistanceCm}cm` : "6pt"
  const footerMarginTop = footerDistanceCm ? `${footerDistanceCm}cm` : "6pt"

  // 页码配置（兼容 enabled 和 show 两种字段名）
  const pn = layout.pageNumber as PageNumberConfig | undefined
  // [FIX] enabled vs show 统一处理
  const showPageNumber = pn ? (pn.enabled !== false && (pn as any).show !== false) : true
  const pageNumberAlign = pn?.align ?? "center"
  // [FIX] startValue
  const startValue = pn?.startValue ?? 1
  const pageLabel = pn ? buildPageLabel(pn, startValue) : `- ${startValue} -`

  // [FIX] 页码字体：PageNumberEditor 存在 layout.pageNumber.*，HeaderFooterEditor 存在 layout.headerFooter.pageNumber*
  const pnFontStyle: React.CSSProperties = {
    fontFamily: pn?.fontFamily ? `"${pn.fontFamily}"` : hfRaw?.pageNumberFontFamily ? `"${hfRaw.pageNumberFontFamily}"` : undefined,
    fontSize: pn?.fontSizePt ? `${pn.fontSizePt}pt` : hfRaw?.pageNumberFontSizePt ? `${hfRaw.pageNumberFontSizePt}pt` : "9pt",
    color: pn?.color ?? hfRaw?.pageNumberColor ?? "#888",
    fontWeight: (pn?.bold ?? hfRaw?.pageNumberBold) ? "bold" : undefined,
    fontStyle: (pn?.italic ?? hfRaw?.pageNumberItalic) ? "italic" : undefined,
  }

  // [FIX] 页码位置：position 决定显示在页眉还是页脚
  const pageNumberInHeader = pn?.position === "header-bottom"
  const pageNumberInFooter = !pageNumberInHeader

  const footerJustify =
    pageNumberAlign === "left" ? "flex-start"
    : pageNumberAlign === "right" ? "flex-end"
    : "center"

  const pageStyle: React.CSSProperties = {
    width: `${paperW}mm`,
    minHeight: `${paperH}mm`,
    paddingTop: `${marginTopMm}mm`,
    paddingBottom: `${marginBottomMm}mm`,
    paddingLeft: `${marginLeftMm}mm`,
    paddingRight: `${marginRightMm}mm`,
    backgroundColor: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  }

  return (
    <div className="preview-container">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="tpl-paper preview-page" style={pageStyle}>

        {/* ── 页眉 ── */}
        {hasHeader && (
          <div style={{
            flexShrink: 0,
            borderBottom: "0.5pt solid #ccc",
            paddingBottom: "4pt",
            marginBottom: headerMarginBottom,
            display: "flex",
            justifyContent: "center",
            fontSize: "9pt",
            color: "#888",
          }}>
            <span>{headerContent || "页眉"}</span>
            {/* 页码显示在页眉时 */}
            {showPageNumber && pageNumberInHeader && (
              <span style={{ ...pnFontStyle, marginLeft: "auto" }}>{pageLabel}</span>
            )}
          </div>
        )}

        {/* ── 正文内容区 ── */}
        <div style={{ flex: 1 }}>

          {/* 文档标题 */}
          <div className="preview-title document-title" data-style-key="document_title">
            通用教案模板
          </div>

          {/* 副标题 / subject_info */}
          <div data-style-key="subject_info" style={{ marginBottom: "0.3em" }}>
            小学数学 · 四年级上册
          </div>

          {/* 一级标题 */}
          <div className="preview-h1" data-style-key="heading_1">
            一、基本教学信息
          </div>

          {/* 二级标题 */}
          <div className="preview-h2" data-style-key="heading_2">
            （一）教学目标
          </div>

          {/* 正文段落 */}
          <div className="preview-body tiptap" data-style-key="body">
            <p>本节课主要讲解相关知识点，通过案例分析和实践操作，帮助学生掌握基本概念和技能。</p>
          </div>

          {/* 三级标题 */}
          <div className="preview-h3" data-style-key="heading_3">
            1. 知识目标
          </div>

          {/* 无序列表 */}
          <div className="preview-ul">
            <ul>
              <li>掌握基本概念和理论知识</li>
              <li>理解核心原理和应用场景</li>
            </ul>
          </div>

          {/* 四级标题 */}
          <div className="preview-h4" data-style-key="heading_4">
            1.1 能力目标
          </div>

          {/* 有序列表 */}
          <div className="preview-ol">
            <ol>
              <li>独立分析问题并提出解决方案</li>
              <li>完成实践任务并撰写总结报告</li>
            </ol>
          </div>

          {/* 五级标题 */}
          <div className="preview-h5" data-style-key="heading_5">
            1.1.1 素养目标
          </div>

          {/* 六级标题 */}
          <div className="preview-h6" data-style-key="heading_6">
            1.1.1.1 实践目标
          </div>

          {/* 正文 */}
          <div className="preview-body tiptap" data-style-key="body">
            <p>培养学生严谨的学习态度与团队协作精神。</p>
          </div>

          {/* 二级标题 */}
          <div className="preview-h2" data-style-key="heading_2">
            （二）课时安排
          </div>

          {/* 表格 */}
          <div className="preview-table">
            {(() => {
              const tn = config.tableStyles?.tableNumbering
              if (tn?.enabled) {
                const prefix = tn.prefix ?? "表 "
                const suffix = tn.suffix ?? ""
                const start = tn.startNumber ?? 1
                let label = `${start}`
                if (tn.style === "roman") {
                  const romans = ["i","ii","iii","iv","v","vi","vii","viii","ix","x"]
                  label = romans[start - 1] ?? `${start}`
                }
                return (
                  <div style={{ fontSize: "9pt", color: "#555", marginBottom: "2pt", textAlign: "center" }}>
                    {prefix}{label}{suffix}
                  </div>
                )
              }
              return null
            })()}
            <table>
              <thead>
                <tr>
                  <th>课时</th>
                  <th>内容</th>
                  <th>时长</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>第一课时</td>
                  <td>基础知识讲解</td>
                  <td>40分钟</td>
                </tr>
                <tr>
                  <td>第二课时</td>
                  <td>实践操作练习</td>
                  <td>40分钟</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 二级标题 */}
          <div className="preview-h2" data-style-key="heading_2">
            （三）图片与代码示例
          </div>

          {/* 图片占位 */}
          <div className="preview-img" style={{ margin: "0.3em 0" }}>
            {(() => {
              const imgPos = config.imageStyles?.position
              const isMaxLimit = imgPos?.sizeMode === "maxLimit"
              const svgStyle: React.CSSProperties = {
                display: "inline-block",
                maxWidth: isMaxLimit && imgPos?.maxWidthCm ? `${imgPos.maxWidthCm}cm` : undefined,
                maxHeight: isMaxLimit && imgPos?.maxHeightCm ? `${imgPos.maxHeightCm}cm` : undefined,
                width: "160px",
                height: "80px",
              }
              return (
                <svg
                  viewBox="0 0 160 80"
                  xmlns="http://www.w3.org/2000/svg"
                  style={svgStyle}
                >
                  <rect width="160" height="80" fill="#e2e8f0" />
                  <text x="80" y="45" textAnchor="middle" fontSize="12" fill="#94a3b8">示例图片</text>
                </svg>
              )
            })()}
            {config.imageStyles?.numbering?.enabled && (
              <div className="preview-img-caption">图 1 示例图片说明</div>
            )}
          </div>

          {/* 代码块 */}
          {(() => {
            const showLineNumbers = config.codeBlockStyles?.lineNumber?.show
            const codeLines = [`function greet(name) {`, `\treturn "Hello, " + name;`, `}`]
            return (
              <div className="preview-code tiptap">
                <pre data-line-numbers={showLineNumbers ? "" : undefined}>
                  <code>
                    {showLineNumbers
                      ? codeLines.map((line, i) => (
                          <span key={i} className="line">{line}{i < codeLines.length - 1 ? "\n" : ""}</span>
                        ))
                      : codeLines.join("\n")
                    }
                  </code>
                </pre>
              </div>
            )
          })()}

          {/* 日期 */}
          <div className="preview-date" data-style-key="date" style={{ textAlign: "right", marginTop: "0.5em" }}>
            2026年5月2日
          </div>
        </div>

        {/* ── 页脚 ── */}
        {(hasFooter || (showPageNumber && pageNumberInFooter)) && (
          <div style={{
            flexShrink: 0,
            borderTop: "0.5pt solid #ccc",
            paddingTop: "4pt",
            marginTop: footerMarginTop,
            display: "flex",
            justifyContent: footerJustify,
            gap: "1em",
            alignItems: "center",
          }}>
            {hasFooter && footerContent && (
              <span style={{ fontSize: "9pt", color: "#888" }}>{footerContent}</span>
            )}
            {showPageNumber && pageNumberInFooter && (
              <span style={pnFontStyle}>{pageLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
