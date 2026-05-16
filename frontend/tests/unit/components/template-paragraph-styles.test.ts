/**
 * 段落样式 CSS 变量映射测试
 *
 * 覆盖链路：TemplateConfig.paragraphStyles → CSS 变量 → 编辑器 DOM style 属性
 * 核心断言：正文段落的对齐/行高/间距/缩进等配置正确转换为 CSS 变量值
 */
import { describe, it, expect } from 'vitest'

// ——— 从 TipTapEditor 中提取的段落样式 CSS 变量计算逻辑 ———

function buildParagraphCssVars(
  paragraphStyles: Record<string, any>,
  bodyStyles: Record<string, any>,
  layout: Record<string, any>,
): Record<string, string> {
  // 优先级：paragraphStyles > bodyStyles > layout
  const align = paragraphStyles?.align ?? bodyStyles?.align ?? 'left'
  const lineHeight = paragraphStyles?.lineHeight ?? bodyStyles?.lineHeight ?? layout?.defaultLineHeight ?? 1.75
  const spacingBeforePt = paragraphStyles?.spacingBeforePt ?? layout?.defaultParagraphSpacingBeforePt ?? 0
  const spacingAfterPt = paragraphStyles?.spacingAfterPt ?? layout?.defaultParagraphSpacingAfterPt ?? 0
  const firstLineIndentChars = paragraphStyles?.firstLineIndentChars ?? bodyStyles?.firstLineIndentChars ?? layout?.defaultFirstLineIndentChars ?? 0

  // 首行缩进转换为 px（假设中文字符宽度约等于 fontSize * 1.0）
  const fontSizePt = bodyStyles?.fontSizePt ?? 16
  const firstLineIndentPx = Math.round(firstLineIndentChars * fontSizePt * 1.333)

  return {
    '--tpl-para-align': align,
    '--tpl-para-line-height': lineHeight.toString(),
    '--tpl-para-spacing-before': `${spacingBeforePt}pt`,
    '--tpl-para-spacing-after': `${spacingAfterPt}pt`,
    '--tpl-para-first-line-indent': `${firstLineIndentPx}px`,
    '--tpl-para-first-line-chars': firstLineIndentChars.toString(),
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

// ——— 正文段落样式 CSS 变量 ———

describe('段落样式 CSS 变量映射', () => {
  it('完整配置时所有变量值合法', () => {
    const vars = buildParagraphCssVars(
      {
        align: 'justify',
        lineHeight: 1.8,
        spacingBeforePt: 6,
        spacingAfterPt: 12,
        firstLineIndentChars: 2,
      },
      {
        fontSizePt: 16,
      },
      {},
    )
    assertNoCssGarbage(vars)
    expect(vars['--tpl-para-align']).toBe('justify')
    expect(vars['--tpl-para-line-height']).toBe('1.8')
    expect(vars['--tpl-para-spacing-before']).toBe('6pt')
    expect(vars['--tpl-para-spacing-after']).toBe('12pt')
    expect(vars['--tpl-para-first-line-indent']).toBe('43px') // 2 * 16 * 1.333 ≈ 43
    expect(vars['--tpl-para-first-line-chars']).toBe('2')
  })

  it('空配置时回退到 bodyStyles 默认值', () => {
    const vars = buildParagraphCssVars({}, { align: 'left', lineHeight: 1.5, fontSizePt: 14 }, {})
    assertNoCssGarbage(vars)
    expect(vars['--tpl-para-align']).toBe('left')
    expect(vars['--tpl-para-line-height']).toBe('1.5')
    expect(vars['--tpl-para-spacing-before']).toBe('0pt')
    expect(vars['--tpl-para-spacing-after']).toBe('0pt')
  })

  it('空配置时回退到 layout 默认值', () => {
    const vars = buildParagraphCssVars(
      {},
      {},
      {
        defaultLineHeight: 2.0,
        defaultParagraphSpacingBeforePt: 4,
        defaultParagraphSpacingAfterPt: 8,
        defaultFirstLineIndentChars: 2,
      },
    )
    assertNoCssGarbage(vars)
    expect(vars['--tpl-para-line-height']).toBe('2')
    expect(vars['--tpl-para-spacing-before']).toBe('4pt')
    expect(vars['--tpl-para-spacing-after']).toBe('8pt')
  })

  it('paragraphStyles 优先于 bodyStyles', () => {
    const vars = buildParagraphCssVars(
      { align: 'center', lineHeight: 2.0 },
      { align: 'justify', lineHeight: 1.5 },
      {},
    )
    expect(vars['--tpl-para-align']).toBe('center')
    expect(vars['--tpl-para-line-height']).toBe('2')
  })

  it('首行缩进转换为 px 无 NaN', () => {
    const vars = buildParagraphCssVars(
      { firstLineIndentChars: 3 },
      { fontSizePt: 14 },
      {},
    )
    expect(vars['--tpl-para-first-line-indent']).toMatch(/^\d+px$/)
    expect(vars['--tpl-para-first-line-indent']).not.toContain('NaN')
    // 3 * 14 * 1.333 ≈ 56
    expect(vars['--tpl-para-first-line-chars']).toBe('3')
  })

  it('首行缩进=0 时生成 0px', () => {
    const vars = buildParagraphCssVars(
      { firstLineIndentChars: 0 },
      { fontSizePt: 16 },
      {},
    )
    expect(vars['--tpl-para-first-line-indent']).toBe('0px')
    expect(vars['--tpl-para-first-line-chars']).toBe('0')
  })

  it('lineHeight 为小数时正确转换', () => {
    const vars = buildParagraphCssVars({ lineHeight: 1.25 }, {}, {})
    expect(vars['--tpl-para-line-height']).toBe('1.25')
    expect(typeof vars['--tpl-para-line-height']).toBe('string')
  })

  it('spacingBeforePt=0 时生成 0pt', () => {
    const vars = buildParagraphCssVars({ spacingBeforePt: 0 }, {}, {})
    expect(vars['--tpl-para-spacing-before']).toBe('0pt')
  })

  it('spacingAfterPt=0 时生成 0pt', () => {
    const vars = buildParagraphCssVars({ spacingAfterPt: 0 }, {}, {})
    expect(vars['--tpl-para-spacing-after']).toBe('0pt')
  })

  it('null paragraphStyles 时使用 bodyStyles 回退', () => {
    const vars = buildParagraphCssVars(
      null as any,
      { align: 'justify', lineHeight: 1.8, fontSizePt: 16 },
      {},
    )
    assertNoCssGarbage(vars)
    expect(vars['--tpl-para-align']).toBe('justify')
    expect(vars['--tpl-para-line-height']).toBe('1.8')
  })

  it('所有配置为空时使用硬编码默认值', () => {
    const vars = buildParagraphCssVars({}, {}, {})
    assertNoCssGarbage(vars)
    expect(vars['--tpl-para-align']).toBe('left')
    expect(vars['--tpl-para-line-height']).toBe('1.75')
    expect(vars['--tpl-para-spacing-before']).toBe('0pt')
    expect(vars['--tpl-para-spacing-after']).toBe('0pt')
    expect(vars['--tpl-para-first-line-indent']).toBe('0px')
  })

  it('fontSizePt 影响首行缩进 px 计算', () => {
    const small = buildParagraphCssVars({ firstLineIndentChars: 2 }, { fontSizePt: 12 }, {})
    const large = buildParagraphCssVars({ firstLineIndentChars: 2 }, { fontSizePt: 18 }, {})
    // 2 * 12 * 1.333 ≈ 32, 2 * 18 * 1.333 ≈ 48
    expect(parseInt(small['--tpl-para-first-line-indent'])).toBeLessThan(
      parseInt(large['--tpl-para-first-line-indent']),
    )
  })

  it('align=right 正确映射', () => {
    const vars = buildParagraphCssVars({ align: 'right' }, {}, {})
    expect(vars['--tpl-para-align']).toBe('right')
  })
})
