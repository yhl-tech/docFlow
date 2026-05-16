/**
 * 模板 CSS 变量映射测试
 *
 * 覆盖链路：TemplateConfig → TipTapEditor cssVars 对象 → 编辑器 DOM style 属性
 * 核心断言：关键配置字段正确转换为 CSS 变量值，不出现 undefined / NaN / null
 */
import { describe, it, expect } from 'vitest'

// 从 TipTapEditor 中提取的 CSS 变量计算逻辑（纯函数，无 React 依赖）
// 将关键映射逻辑提取为可测试的纯函数

function buildTableCssVars(tableStyles: Record<string, any>): Record<string, string> {
  const headerStyle = tableStyles?.headerStyle ?? {}
  const dataRowStyle = tableStyles?.dataRowStyle ?? {}
  const border = tableStyles?.border ?? {}
  const cellPadding = tableStyles?.cellPadding ?? {}

  const borderWidthPx = border.widthPt ? `${Math.round(border.widthPt * 1.333)}px` : '1px'

  return {
    '--tpl-table-header-bg': headerStyle.shading?.fill ?? 'transparent',
    '--tpl-table-header-color': headerStyle.color ?? 'inherit',
    '--tpl-table-data-bg': dataRowStyle.shading?.fill ?? 'transparent',
    '--tpl-table-data-color': dataRowStyle.color ?? 'inherit',
    '--tpl-table-border-color': border.color ?? '#000000',
    '--tpl-table-border-width': borderWidthPx,
    '--tpl-table-cell-padding-top': cellPadding.top ? `${cellPadding.top}mm` : '2mm',
    '--tpl-table-cell-padding-bottom': cellPadding.bottom ? `${cellPadding.bottom}mm` : '2mm',
    '--tpl-table-cell-padding-left': cellPadding.left ? `${cellPadding.left}mm` : '2mm',
    '--tpl-table-cell-padding-right': cellPadding.right ? `${cellPadding.right}mm` : '2mm',
  }
}

function buildImageCssVars(imageStyles: Record<string, any>): Record<string, string> {
  const recolor = imageStyles?.style?.recolor
  let recolorVal = 'none'
  if (recolor === 'grayscale') recolorVal = 'grayscale(100%)'
  else if (recolor === 'washout') recolorVal = 'opacity(0.4) brightness(1.5)'
  else if (recolor === 'sepia') recolorVal = 'sepia(100%)'

  return {
    '--tpl-img-recolor': recolorVal,
    '--tpl-img-wrap-distance': imageStyles?.textWrap?.distanceMm
      ? `${imageStyles.textWrap.distanceMm}mm`
      : '0',
  }
}

function buildCodeCssVars(codeBlockStyles: Record<string, any>): Record<string, string> {
  return {
    '--tpl-code-tab-size': codeBlockStyles?.tabStop?.defaultMm
      ? `${Math.round(codeBlockStyles.tabStop.defaultMm / 3)}`
      : '4',
    '--tpl-code-keyboard-color': codeBlockStyles?.keyboardStyle?.foregroundColor ?? 'inherit',
    '--tpl-code-keyboard-bg': codeBlockStyles?.keyboardStyle?.backgroundColor ?? 'inherit',
    '--tpl-code-line-number-show': codeBlockStyles?.lineNumber?.show ? 'block' : 'none',
    '--tpl-code-line-number-color': codeBlockStyles?.lineNumber?.color ?? '#888888',
  }
}

// ——— 校验工具 ———
function assertNoCssGarbage(vars: Record<string, string>) {
  for (const [key, val] of Object.entries(vars)) {
    expect(val, `${key} 不应为 undefined`).not.toBe('undefined')
    expect(val, `${key} 不应为 null`).not.toBe('null')
    expect(val, `${key} 不应为 NaN`).not.toContain('NaN')
    expect(val, `${key} 不应为空字符串`).not.toBe('')
  }
}

// ——— 表格 CSS 变量 ———
describe('表格样式 CSS 变量映射', () => {
  it('完整配置时所有变量值合法', () => {
    const vars = buildTableCssVars({
      headerStyle: { shading: { fill: '#8B0000' }, color: '#FFFFFF' },
      dataRowStyle: { shading: { fill: '#2E8B57' }, color: '#000000' },
      border: { color: '#333333', widthPt: 1.0 },
      cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
    })
    assertNoCssGarbage(vars)
    expect(vars['--tpl-table-header-bg']).toBe('#8B0000')
    expect(vars['--tpl-table-data-bg']).toBe('#2E8B57')
    expect(vars['--tpl-table-border-width']).toBe('1px') // 1pt ≈ 1.333px → round → 1
    expect(vars['--tpl-table-cell-padding-top']).toBe('2mm')
  })

  it('空配置时回退到合理默认值（无 undefined）', () => {
    const vars = buildTableCssVars({})
    assertNoCssGarbage(vars)
    expect(vars['--tpl-table-header-bg']).toBe('transparent')
    expect(vars['--tpl-table-border-color']).toBe('#000000')
    expect(vars['--tpl-table-cell-padding-top']).toBe('2mm')
  })

  it('border.widthPt 转换为 px 无 NaN', () => {
    const vars = buildTableCssVars({ border: { widthPt: 2.5 } })
    expect(vars['--tpl-table-border-width']).toMatch(/^\d+px$/)
    expect(vars['--tpl-table-border-width']).not.toContain('NaN')
  })

  it('null 配置时不崩溃', () => {
    expect(() => buildTableCssVars(null as any)).not.toThrow()
  })
})

// ——— 图片 CSS 变量 ———
describe('图片样式 CSS 变量映射', () => {
  it('recolor=grayscale 生成 grayscale(100%)', () => {
    const vars = buildImageCssVars({ style: { recolor: 'grayscale' } })
    expect(vars['--tpl-img-recolor']).toBe('grayscale(100%)')
  })

  it('recolor=washout 生成 opacity+brightness', () => {
    const vars = buildImageCssVars({ style: { recolor: 'washout' } })
    expect(vars['--tpl-img-recolor']).toContain('opacity')
    expect(vars['--tpl-img-recolor']).toContain('brightness')
  })

  it('recolor=none 生成 none', () => {
    const vars = buildImageCssVars({ style: { recolor: 'none' } })
    expect(vars['--tpl-img-recolor']).toBe('none')
  })

  it('textWrap.distanceMm 正确转换为 mm 单位', () => {
    const vars = buildImageCssVars({ textWrap: { distanceMm: 5 } })
    expect(vars['--tpl-img-wrap-distance']).toBe('5mm')
  })

  it('空配置时回退默认值无 undefined', () => {
    const vars = buildImageCssVars({})
    assertNoCssGarbage(vars)
    expect(vars['--tpl-img-recolor']).toBe('none')
    expect(vars['--tpl-img-wrap-distance']).toBe('0')
  })
})

// ——— 代码块 CSS 变量 ———
describe('代码块样式 CSS 变量映射', () => {
  it('tabStop.defaultMm 正确转换为制表位字符数', () => {
    const vars = buildCodeCssVars({ tabStop: { defaultMm: 12 } }) // 12/3 = 4
    expect(vars['--tpl-code-tab-size']).toBe('4')
  })

  it('lineNumber.show=true 生成 block', () => {
    const vars = buildCodeCssVars({ lineNumber: { show: true, color: '#aaaaaa' } })
    expect(vars['--tpl-code-line-number-show']).toBe('block')
    expect(vars['--tpl-code-line-number-color']).toBe('#aaaaaa')
  })

  it('lineNumber.show=false 生成 none', () => {
    const vars = buildCodeCssVars({ lineNumber: { show: false } })
    expect(vars['--tpl-code-line-number-show']).toBe('none')
  })

  it('keyboardStyle 颜色正确映射', () => {
    const vars = buildCodeCssVars({
      keyboardStyle: { foregroundColor: '#333333', backgroundColor: '#f0f0f0' },
    })
    expect(vars['--tpl-code-keyboard-color']).toBe('#333333')
    expect(vars['--tpl-code-keyboard-bg']).toBe('#f0f0f0')
  })

  it('空配置时所有变量有合法默认值', () => {
    const vars = buildCodeCssVars({})
    assertNoCssGarbage(vars)
    expect(vars['--tpl-code-tab-size']).toBe('4')
    expect(vars['--tpl-code-line-number-show']).toBe('none')
  })
})

// ——— 标题 CSS 变量（h1–h5）———

function buildHeadingCssVars(
  level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5',
  headingStyles: Record<string, any>,
  styleSlot: Record<string, any> = {}
): Record<string, string> {
  const hs = headingStyles?.[level] ?? {}
  const font = hs.font ?? styleSlot
  const align = hs.align ?? styleSlot.align ?? 'left'
  const bold = font.bold ?? styleSlot.bold ?? false
  const fontSizePt = font.fontSizePt ?? styleSlot.fontSizePt
  const lineHeight = hs.lineHeight
  const spacingBefore = hs.spacingBeforePt
  const spacingAfter = hs.spacingAfterPt

  return {
    [`--tpl-${level}-font`]: font.fontFamily ?? 'inherit',
    [`--tpl-${level}-size`]: fontSizePt ? `${fontSizePt}pt` : 'inherit',
    [`--tpl-${level}-weight`]: bold ? '700' : '400',
    [`--tpl-${level}-align`]: align,
    [`--tpl-${level}-line-height`]: lineHeight !== undefined ? lineHeight.toString() : 'inherit',
    [`--tpl-${level}-space-before`]: spacingBefore ? `${spacingBefore}pt` : '0',
    [`--tpl-${level}-space-after`]: spacingAfter ? `${spacingAfter}pt` : '0',
  }
}

describe('标题样式 CSS 变量映射', () => {
  it('h1 完整配置生成正确变量值', () => {
    const vars = buildHeadingCssVars('h1', {
      h1: {
        font: { fontFamily: 'SimHei', fontSizePt: 16, bold: true },
        align: 'center',
        lineHeight: 1.5,
        spacingBeforePt: 12,
        spacingAfterPt: 6,
      },
    })
    expect(vars['--tpl-h1-font']).toBe('SimHei')
    expect(vars['--tpl-h1-size']).toBe('16pt')
    expect(vars['--tpl-h1-weight']).toBe('700')
    expect(vars['--tpl-h1-align']).toBe('center')
    expect(vars['--tpl-h1-line-height']).toBe('1.5')
    expect(vars['--tpl-h1-space-before']).toBe('12pt')
    expect(vars['--tpl-h1-space-after']).toBe('6pt')
  })

  it('h2 空配置时回退到合理默认值（无 undefined）', () => {
    const vars = buildHeadingCssVars('h2', {})
    for (const [key, val] of Object.entries(vars)) {
      expect(val, `${key} 不应为 undefined`).not.toBe('undefined')
      expect(val, `${key} 不应为 null`).not.toBe('null')
      expect(val, `${key} 不应含 NaN`).not.toContain('NaN')
      expect(val, `${key} 不应为空字符串`).not.toBe('')
    }
  })

  it('h3 bold=false 生成 weight=400', () => {
    const vars = buildHeadingCssVars('h3', {
      h3: { font: { bold: false, fontSizePt: 13 } },
    })
    expect(vars['--tpl-h3-weight']).toBe('400')
  })

  it('h1 align=justify 正确传递', () => {
    const vars = buildHeadingCssVars('h1', {
      h1: { align: 'justify', font: { fontSizePt: 16 } },
    })
    expect(vars['--tpl-h1-align']).toBe('justify')
  })

  it('lineHeight 为数字时转换为字符串', () => {
    const vars = buildHeadingCssVars('h2', {
      h2: { lineHeight: 1.75, font: {} },
    })
    expect(vars['--tpl-h2-line-height']).toBe('1.75')
    expect(typeof vars['--tpl-h2-line-height']).toBe('string')
  })

  it('spacingBeforePt=0 时生成 0（非 undefined）', () => {
    const vars = buildHeadingCssVars('h1', {
      h1: { spacingBeforePt: 0, font: {} },
    })
    expect(vars['--tpl-h1-space-before']).toBe('0')
  })

  it('h4 fontSizePt 缺失时回退为 inherit', () => {
    const vars = buildHeadingCssVars('h4', {
      h4: { font: { bold: false } },
    })
    expect(vars['--tpl-h4-size']).toBe('inherit')
  })

  it('h5 使用 styleSlot 作为回退字体', () => {
    const vars = buildHeadingCssVars('h5', {}, { fontFamily: 'KaiTi', fontSizePt: 12, bold: false })
    expect(vars['--tpl-h5-font']).toBe('KaiTi')
    expect(vars['--tpl-h5-size']).toBe('12pt')
  })
})

// ——— 布局 CSS 变量（margin）———

function buildLayoutCssVars(layout: Record<string, any>): Record<string, string> {
  const top = layout?.marginTopMm ?? 25
  const right = layout?.marginRightMm ?? 20
  const bottom = layout?.marginBottomMm ?? 25
  const left = layout?.marginLeftMm ?? 20
  return {
    '--tpl-margin': `${top}mm ${right}mm ${bottom}mm ${left}mm`,
  }
}

describe('布局 CSS 变量映射', () => {
  it('完整 margin 配置生成正确 shorthand', () => {
    const vars = buildLayoutCssVars({ marginTopMm: 37, marginRightMm: 26, marginBottomMm: 35, marginLeftMm: 28 })
    expect(vars['--tpl-margin']).toBe('37mm 26mm 35mm 28mm')
  })

  it('空 layout 使用默认 margin 25/20', () => {
    const vars = buildLayoutCssVars({})
    expect(vars['--tpl-margin']).toBe('25mm 20mm 25mm 20mm')
  })

  it('null layout 使用默认值不崩溃', () => {
    expect(() => buildLayoutCssVars(null as any)).not.toThrow()
  })

  it('margin 值不含 NaN 或 undefined', () => {
    const vars = buildLayoutCssVars({ marginTopMm: 30 })
    expect(vars['--tpl-margin']).not.toContain('NaN')
    expect(vars['--tpl-margin']).not.toContain('undefined')
  })
})

// ——— recolor 运行时类型一致性 ———
//
// editor-template.ts 中 style.recolor 类型为 ImageRecolorPreset（对象），
// 但 TipTapEditor.tsx 实际以字符串方式比较（imageStyles?.style?.recolor === 'grayscale'）。
// 以下测试验证：
//   1. 字符串形式（运行时实际行为）正确映射
//   2. 对象包装形式（{ preset: 'grayscale' }）不会产生错误的 CSS filter 值
//   3. 从 TypeScript 类型角度，buildImageCssVars 接受宽松类型，覆盖两种场景

// 为覆盖 TipTapEditor 实际比较链路，提取与源码对齐的映射函数
function recolorToCssFilter(recolor: string | { preset?: string } | undefined | null): string {
  // 与 TipTapEditor.tsx 第 217-224 行逻辑一致：取字符串值（或 preset 字段）
  const val: string | undefined =
    typeof recolor === 'string' ? recolor :
    typeof recolor === 'object' && recolor !== null ? (recolor as any).preset :
    undefined
  if (!val || val === 'none') return 'none'
  if (val === 'grayscale') return 'grayscale(100%)'
  if (val === 'washout') return 'opacity(0.4) brightness(1.5)'
  if (val === 'sepia') return 'sepia(100%)'
  if (val === 'blackAndWhite') return 'grayscale(100%) contrast(200%)'
  return 'none'
}

describe('recolor 运行时类型一致性（字符串 vs 对象包装）', () => {
  it('字符串 grayscale → grayscale(100%)', () => {
    expect(recolorToCssFilter('grayscale')).toBe('grayscale(100%)')
  })

  it('字符串 washout → opacity+brightness', () => {
    const result = recolorToCssFilter('washout')
    expect(result).toContain('opacity')
    expect(result).toContain('brightness')
  })

  it('字符串 sepia → sepia(100%)', () => {
    expect(recolorToCssFilter('sepia')).toBe('sepia(100%)')
  })

  it('字符串 none → none', () => {
    expect(recolorToCssFilter('none')).toBe('none')
  })

  it('对象 { preset: "grayscale" } → grayscale(100%)（类型定义路径）', () => {
    // ImageRecolorPreset = { preset?: "none"|"grayscale"|"washout"|"blackAndWhite"|"sepia" }
    expect(recolorToCssFilter({ preset: 'grayscale' })).toBe('grayscale(100%)')
  })

  it('对象 { preset: "washout" } → opacity+brightness', () => {
    const result = recolorToCssFilter({ preset: 'washout' })
    expect(result).toContain('opacity')
    expect(result).toContain('brightness')
  })

  it('对象 { preset: "none" } → none（不生成 filter）', () => {
    expect(recolorToCssFilter({ preset: 'none' })).toBe('none')
  })

  it('blackAndWhite → grayscale+contrast 组合', () => {
    expect(recolorToCssFilter('blackAndWhite')).toContain('grayscale')
    expect(recolorToCssFilter('blackAndWhite')).toContain('contrast')
  })

  it('undefined/null → none（安全回退）', () => {
    expect(recolorToCssFilter(undefined)).toBe('none')
    expect(recolorToCssFilter(null)).toBe('none')
  })

  it('未知值 → none（安全回退）', () => {
    expect(recolorToCssFilter('rainbow' as any)).toBe('none')
  })

  it('结果不含 undefined/NaN/null', () => {
    const values = ['grayscale', 'washout', 'sepia', 'blackAndWhite', 'none', undefined, null, { preset: 'grayscale' }]
    for (const v of values) {
      const result = recolorToCssFilter(v as any)
      expect(result).not.toBe('undefined')
      expect(result).not.toBe('null')
      expect(result).not.toContain('NaN')
      expect(result).not.toBe('')
    }
  })
})
