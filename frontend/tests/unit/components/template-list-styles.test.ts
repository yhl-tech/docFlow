/**
 * 列表样式 CSS 变量映射测试
 *
 * 覆盖链路：TemplateConfig.listStyles → CSS 变量 → 编辑器 DOM style 属性
 * 核心断言：无序列表/有序列表的符号/颜色/缩进/间距等配置正确转换为 CSS 变量值
 */
import { describe, it, expect } from 'vitest'

// ——— 从 TipTapEditor 中提取的列表样式 CSS 变量计算逻辑 ———

function buildListStyleCssVars(
  listStyles: Record<string, any>,
): Record<string, string> {
  const bullet = listStyles?.bullet ?? {}
  const ordered = listStyles?.ordered ?? {}

  // 无序列表符号映射
  const bulletCharMap: Record<string, string> = {
    '●': '●',
    '■': '■',
    '▼': '▼',
    '☐': '☐',
    '☑': '☑',
  }
  const bulletChar = bulletCharMap[bullet.character ?? ''] ?? bullet.character ?? '●'
  const bulletColor = bullet.color ?? 'inherit'
  const bulletFontFamily = bullet.fontFamily ?? 'inherit'
  const bulletFontSizePt = bullet.fontSizePt ?? 16
  const bulletFontSizePx = Math.round(bulletFontSizePt * 1.333)
  const bulletBold = bullet.bold ?? false
  const bulletIndentCm = bullet.indentCm ?? 0.5
  const bulletSpacingBefore = bullet.spacingBeforeLines ?? 0
  const bulletSpacingAfter = bullet.spacingAfterLines ?? 0
  const bulletLineSpacing = bullet.lineSpacing ?? 1.5

  // 有序列表格式映射
  const orderedFormatMap: Record<string, string> = {
    '1.': 'decimal',
    '2.': 'decimal',
    '3.': 'decimal',
    'a.': 'lower-alpha',
    'A.': 'upper-alpha',
    '(1)': 'decimal',
    '一.': 'cjk-wiping',
    '一、': 'cjk-wiping',
    '第': 'cjk-wiping',
  }
  const orderedFormat = orderedFormatMap[ordered.format ?? ''] ?? 'decimal'
  const orderedAlign = ordered.align ?? 'left'
  const orderedColor = ordered.color ?? 'inherit'
  const orderedFontFamily = ordered.fontFamily ?? 'inherit'
  const orderedFontSizePt = ordered.fontSizePt ?? 16
  const orderedFontSizePx = Math.round(orderedFontSizePt * 1.333)
  const orderedBold = ordered.bold ?? false
  const orderedIndentCm = ordered.indentCm ?? 0.5
  const orderedSpacingBefore = ordered.spacingBeforeLines ?? 0
  const orderedSpacingAfter = ordered.spacingAfterLines ?? 0
  const orderedLineSpacing = ordered.lineSpacing ?? 1.5

  return {
    // 无序列表
    '--tpl-bullet-char': bulletChar,
    '--tpl-bullet-color': bulletColor,
    '--tpl-bullet-font': bulletFontFamily,
    '--tpl-bullet-size': `${bulletFontSizePx}px`,
    '--tpl-bullet-size-pt': `${bulletFontSizePt}pt`,
    '--tpl-bullet-weight': bulletBold ? '700' : '400',
    '--tpl-bullet-indent': `${bulletIndentCm}cm`,
    '--tpl-bullet-spacing-before': `${bulletSpacingBefore}em`,
    '--tpl-bullet-spacing-after': `${bulletSpacingAfter}em`,
    '--tpl-bullet-line-height': bulletLineSpacing.toString(),
    // 有序列表
    '--tpl-ordered-format': orderedFormat,
    '--tpl-ordered-align': orderedAlign,
    '--tpl-ordered-color': orderedColor,
    '--tpl-ordered-font': orderedFontFamily,
    '--tpl-ordered-size': `${orderedFontSizePx}px`,
    '--tpl-ordered-size-pt': `${orderedFontSizePt}pt`,
    '--tpl-ordered-weight': orderedBold ? '700' : '400',
    '--tpl-ordered-indent': `${orderedIndentCm}cm`,
    '--tpl-ordered-spacing-before': `${orderedSpacingBefore}em`,
    '--tpl-ordered-spacing-after': `${orderedSpacingAfter}em`,
    '--tpl-ordered-line-height': orderedLineSpacing.toString(),
  }
}

// ——— 校验工具 ———

function assertNoCssGarbage(vars: Record<string, string>) {
  for (const [key, val] of Object.entries(vars)) {
    expect(val, `${key} 不应为 undefined`).not.toBe('undefined')
    expect(val, `${key} 不应为 null`).not.toBe('null')
    expect(val, `${key} 不应为 NaN`).not.toContain('NaN')
  }
}

// ——— 无序列表样式 CSS 变量 ———

describe('无序列表样式 CSS 变量映射', () => {
  it('完整配置时所有变量值合法', () => {
    const vars = buildListStyleCssVars({
      bullet: {
        character: '●',
        color: '#FF0000',
        fontFamily: 'SimSun',
        fontSizePt: 14,
        bold: true,
        indentCm: 0.75,
        spacingBeforeLines: 0.5,
        spacingAfterLines: 0.25,
        lineSpacing: 1.8,
      },
    })
    assertNoCssGarbage(vars)
    expect(vars['--tpl-bullet-char']).toBe('●')
    expect(vars['--tpl-bullet-color']).toBe('#FF0000')
    expect(vars['--tpl-bullet-font']).toBe('SimSun')
    expect(vars['--tpl-bullet-size']).toBe('19px')
    expect(vars['--tpl-bullet-size-pt']).toBe('14pt')
    expect(vars['--tpl-bullet-weight']).toBe('700')
    expect(vars['--tpl-bullet-indent']).toBe('0.75cm')
    expect(vars['--tpl-bullet-spacing-before']).toBe('0.5em')
    expect(vars['--tpl-bullet-spacing-after']).toBe('0.25em')
    expect(vars['--tpl-bullet-line-height']).toBe('1.8')
  })

  it('空配置时回退到合理默认值（无 undefined）', () => {
    const vars = buildListStyleCssVars({})
    assertNoCssGarbage(vars)
    expect(vars['--tpl-bullet-char']).toBe('●')
    expect(vars['--tpl-bullet-color']).toBe('inherit')
    expect(vars['--tpl-bullet-font']).toBe('inherit')
    expect(vars['--tpl-bullet-size']).toBe('21px')
    expect(vars['--tpl-bullet-weight']).toBe('400')
    expect(vars['--tpl-bullet-indent']).toBe('0.5cm')
    expect(vars['--tpl-bullet-spacing-before']).toBe('0em')
    expect(vars['--tpl-bullet-spacing-after']).toBe('0em')
    expect(vars['--tpl-bullet-line-height']).toBe('1.5')
  })

  it('字符 ■ 映射正确', () => {
    const vars = buildListStyleCssVars({ bullet: { character: '■' } })
    expect(vars['--tpl-bullet-char']).toBe('■')
  })

  it('字符 ▼ 映射正确', () => {
    const vars = buildListStyleCssVars({ bullet: { character: '▼' } })
    expect(vars['--tpl-bullet-char']).toBe('▼')
  })

  it('字符 ☐ 映射正确', () => {
    const vars = buildListStyleCssVars({ bullet: { character: '☐' } })
    expect(vars['--tpl-bullet-char']).toBe('☐')
  })

  it('字符 ☑ 映射正确', () => {
    const vars = buildListStyleCssVars({ bullet: { character: '☑' } })
    expect(vars['--tpl-bullet-char']).toBe('☑')
  })

  it('未知字符原样输出', () => {
    const vars = buildListStyleCssVars({ bullet: { character: '→' } })
    expect(vars['--tpl-bullet-char']).toBe('→')
  })

  it('fontSizePt 转换为 px 无 NaN', () => {
    const vars = buildListStyleCssVars({ bullet: { fontSizePt: 12.5 } })
    expect(vars['--tpl-bullet-size']).toMatch(/^\d+px$/)
    expect(vars['--tpl-bullet-size']).not.toContain('NaN')
  })

  it('bold=true 生成 weight=700', () => {
    const vars = buildListStyleCssVars({ bullet: { bold: true } })
    expect(vars['--tpl-bullet-weight']).toBe('700')
  })

  it('indentCm 转换为 cm 单位', () => {
    const vars = buildListStyleCssVars({ bullet: { indentCm: 1.0 } })
    expect(vars['--tpl-bullet-indent']).toBe('1cm')
  })

  it('spacingBeforeLines=0 正确输出', () => {
    const vars = buildListStyleCssVars({ bullet: { spacingBeforeLines: 0 } })
    expect(vars['--tpl-bullet-spacing-before']).toBe('0em')
  })

  it('lineSpacing=1.0 正确输出', () => {
    const vars = buildListStyleCssVars({ bullet: { lineSpacing: 1.0 } })
    expect(vars['--tpl-bullet-line-height']).toBe('1')
  })

  it('null listStyles 时使用默认值', () => {
    const vars = buildListStyleCssVars(null as any)
    assertNoCssGarbage(vars)
    expect(vars['--tpl-bullet-char']).toBe('●')
  })
})

// ——— 有序列表样式 CSS 变量 ———

describe('有序列表样式 CSS 变量映射', () => {
  it('完整配置时所有变量值合法', () => {
    const vars = buildListStyleCssVars({
      ordered: {
        format: 'a.',
        align: 'center',
        color: '#333333',
        fontFamily: 'SimSun',
        fontSizePt: 14,
        bold: true,
        indentCm: 1.0,
        spacingBeforeLines: 0.5,
        spacingAfterLines: 0.25,
        lineSpacing: 1.8,
      },
    })
    assertNoCssGarbage(vars)
    expect(vars['--tpl-ordered-format']).toBe('lower-alpha')
    expect(vars['--tpl-ordered-align']).toBe('center')
    expect(vars['--tpl-ordered-color']).toBe('#333333')
    expect(vars['--tpl-ordered-font']).toBe('SimSun')
    expect(vars['--tpl-ordered-size']).toBe('19px')
    expect(vars['--tpl-ordered-size-pt']).toBe('14pt')
    expect(vars['--tpl-ordered-weight']).toBe('700')
    expect(vars['--tpl-ordered-indent']).toBe('1cm')
    expect(vars['--tpl-ordered-spacing-before']).toBe('0.5em')
    expect(vars['--tpl-ordered-spacing-after']).toBe('0.25em')
    expect(vars['--tpl-ordered-line-height']).toBe('1.8')
  })

  it('空配置时回退到合理默认值', () => {
    const vars = buildListStyleCssVars({})
    assertNoCssGarbage(vars)
    expect(vars['--tpl-ordered-format']).toBe('decimal')
    expect(vars['--tpl-ordered-align']).toBe('left')
    expect(vars['--tpl-ordered-color']).toBe('inherit')
    expect(vars['--tpl-ordered-font']).toBe('inherit')
    expect(vars['--tpl-ordered-size']).toBe('21px')
    expect(vars['--tpl-ordered-weight']).toBe('400')
    expect(vars['--tpl-ordered-indent']).toBe('0.5cm')
  })

  it('format=1. 映射为 decimal', () => {
    const vars = buildListStyleCssVars({ ordered: { format: '1.' } })
    expect(vars['--tpl-ordered-format']).toBe('decimal')
  })

  it('format=2. 映射为 decimal', () => {
    const vars = buildListStyleCssVars({ ordered: { format: '2.' } })
    expect(vars['--tpl-ordered-format']).toBe('decimal')
  })

  it('format=a. 映射为 lower-alpha', () => {
    const vars = buildListStyleCssVars({ ordered: { format: 'a.' } })
    expect(vars['--tpl-ordered-format']).toBe('lower-alpha')
  })

  it('format=A. 映射为 upper-alpha', () => {
    const vars = buildListStyleCssVars({ ordered: { format: 'A.' } })
    expect(vars['--tpl-ordered-format']).toBe('upper-alpha')
  })

  it('format=(1) 映射为 decimal', () => {
    const vars = buildListStyleCssVars({ ordered: { format: '(1)' } })
    expect(vars['--tpl-ordered-format']).toBe('decimal')
  })

  it('format=一. 映射为 cjk-wiping', () => {
    const vars = buildListStyleCssVars({ ordered: { format: '一.' } })
    expect(vars['--tpl-ordered-format']).toBe('cjk-wiping')
  })

  it('format=一、 映射为 cjk-wiping', () => {
    const vars = buildListStyleCssVars({ ordered: { format: '一、', indentCm: 1.0 } })
    expect(vars['--tpl-ordered-format']).toBe('cjk-wiping')
  })

  it('format=第 映射为 cjk-wiping', () => {
    const vars = buildListStyleCssVars({ ordered: { format: '第' } })
    expect(vars['--tpl-ordered-format']).toBe('cjk-wiping')
  })

  it('未知 format 回退为 decimal', () => {
    const vars = buildListStyleCssVars({ ordered: { format: 'xyz' } })
    expect(vars['--tpl-ordered-format']).toBe('decimal')
  })

  it('align=right 正确映射', () => {
    const vars = buildListStyleCssVars({ ordered: { align: 'right' } })
    expect(vars['--tpl-ordered-align']).toBe('right')
  })

  it('bold=true 生成 weight=700', () => {
    const vars = buildListStyleCssVars({ ordered: { bold: true } })
    expect(vars['--tpl-ordered-weight']).toBe('700')
  })

  it('fontSizePt 转换为 px 无 NaN', () => {
    const vars = buildListStyleCssVars({ ordered: { fontSizePt: 10 } })
    expect(vars['--tpl-ordered-size']).toMatch(/^\d+px$/)
    expect(vars['--tpl-ordered-size']).not.toContain('NaN')
  })
})

// ——— 无序+有序混合配置 ———

describe('无序+有序混合配置', () => {
  it('同时配置 bullet 和 ordered 时各自独立', () => {
    const vars = buildListStyleCssVars({
      bullet: { character: '■', color: '#FF0000', bold: true },
      ordered: { format: 'a.', color: '#00FF00', bold: false },
    })
    expect(vars['--tpl-bullet-char']).toBe('■')
    expect(vars['--tpl-bullet-color']).toBe('#FF0000')
    expect(vars['--tpl-bullet-weight']).toBe('700')
    expect(vars['--tpl-ordered-format']).toBe('lower-alpha')
    expect(vars['--tpl-ordered-color']).toBe('#00FF00')
    expect(vars['--tpl-ordered-weight']).toBe('400')
  })

  it('部分配置时未配置的样式使用默认值', () => {
    const vars = buildListStyleCssVars({
      bullet: { color: '#0000FF' },
    })
    expect(vars['--tpl-bullet-color']).toBe('#0000FF')
    expect(vars['--tpl-bullet-char']).toBe('●') // 使用默认值
    expect(vars['--tpl-ordered-color']).toBe('inherit') // 使用默认值
  })
})
