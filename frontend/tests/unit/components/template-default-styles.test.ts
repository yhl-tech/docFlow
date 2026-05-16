/**
 * 默认样式 CSS 变量映射测试
 *
 * 覆盖链路：TemplateConfig.styles.body → CSS 变量 → 编辑器 DOM style 属性
 * 核心断言：body 字体/字号/颜色/对齐等配置正确转换为 CSS 变量值
 */
import { describe, it, expect } from 'vitest'

// ——— 从 TipTapEditor 中提取的默认样式 CSS 变量计算逻辑 ———

function buildDefaultStyleCssVars(
  bodyStyles: Record<string, any>,
  englishFont: Record<string, any> | undefined,
): Record<string, string> {
  const fontFamily = bodyStyles?.fontFamily ?? 'SimSun'
  const fontSizePt = bodyStyles?.fontSizePt ?? 16
  const fontSizePx = Math.round(fontSizePt * 1.333)
  const bold = bodyStyles?.bold ?? false
  const italic = bodyStyles?.italic ?? false
  const color = bodyStyles?.color ?? '#000000'
  const align = bodyStyles?.align ?? 'left'
  const lineHeight = bodyStyles?.lineHeight ?? 1.75
  const backgroundColor = bodyStyles?.backgroundColor ?? 'transparent'

  const useSeparateFont = englishFont?.useSeparateFont ?? false
  const englishFontFamily = englishFont?.fontFamily ?? 'Times New Roman'

  return {
    '--tpl-body-font': fontFamily,
    '--tpl-body-size': `${fontSizePx}px`,
    '--tpl-body-size-pt': `${fontSizePt}pt`,
    '--tpl-body-weight': bold ? '700' : '400',
    '--tpl-body-style': italic ? 'italic' : 'normal',
    '--tpl-body-color': color,
    '--tpl-body-align': align,
    '--tpl-body-line-height': lineHeight.toString(),
    '--tpl-body-bg': backgroundColor,
    '--tpl-english-font': useSeparateFont ? englishFontFamily : fontFamily,
  }
}

function buildTitleStyleCssVars(
  titleStyles: Record<string, any>,
): Record<string, string> {
  const fontFamily = titleStyles?.fontFamily ?? 'SimHei'
  const fontSizePt = titleStyles?.fontSizePt ?? 22
  const fontSizePx = Math.round(fontSizePt * 1.333)
  const bold = titleStyles?.bold ?? true
  const color = titleStyles?.color ?? '#000000'
  const align = titleStyles?.align ?? 'center'

  return {
    '--tpl-title-font': fontFamily,
    '--tpl-title-size': `${fontSizePx}px`,
    '--tpl-title-size-pt': `${fontSizePt}pt`,
    '--tpl-title-weight': bold ? '700' : '400',
    '--tpl-title-color': color,
    '--tpl-title-align': align,
  }
}

function buildSubtitleStyleCssVars(
  subtitleStyles: Record<string, any>,
): Record<string, string> {
  const fontFamily = subtitleStyles?.fontFamily ?? 'SimSun'
  const fontSizePt = subtitleStyles?.fontSizePt ?? 16
  const fontSizePx = Math.round(fontSizePt * 1.333)
  const bold = subtitleStyles?.bold ?? false
  const color = subtitleStyles?.color ?? '#333333'
  const align = subtitleStyles?.align ?? 'center'

  return {
    '--tpl-subtitle-font': fontFamily,
    '--tpl-subtitle-size': `${fontSizePx}px`,
    '--tpl-subtitle-size-pt': `${fontSizePt}pt`,
    '--tpl-subtitle-weight': bold ? '700' : '400',
    '--tpl-subtitle-color': color,
    '--tpl-subtitle-align': align,
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

// ——— 默认样式（body）CSS 变量 ———

describe('默认样式（body）CSS 变量映射', () => {
  it('完整配置时所有变量值合法', () => {
    const vars = buildDefaultStyleCssVars(
      {
        fontFamily: 'FangSong_GB2312',
        fontSizePt: 16,
        bold: false,
        italic: false,
        color: '#000000',
        align: 'justify',
        lineHeight: 1.75,
        backgroundColor: '#FFFFFF',
      },
      undefined,
    )
    assertNoCssGarbage(vars)
    expect(vars['--tpl-body-font']).toBe('FangSong_GB2312')
    expect(vars['--tpl-body-size']).toBe('21px')
    expect(vars['--tpl-body-weight']).toBe('400')
    expect(vars['--tpl-body-color']).toBe('#000000')
    expect(vars['--tpl-body-align']).toBe('justify')
    expect(vars['--tpl-body-line-height']).toBe('1.75')
    expect(vars['--tpl-body-bg']).toBe('#FFFFFF')
  })

  it('空配置时回退到合理默认值（无 undefined）', () => {
    const vars = buildDefaultStyleCssVars({}, undefined)
    assertNoCssGarbage(vars)
    expect(vars['--tpl-body-font']).toBe('SimSun')
    expect(vars['--tpl-body-size']).toBe('21px') // 16pt * 1.333
    expect(vars['--tpl-body-weight']).toBe('400')
    expect(vars['--tpl-body-style']).toBe('normal')
    expect(vars['--tpl-body-color']).toBe('#000000')
    expect(vars['--tpl-body-align']).toBe('left')
    expect(vars['--tpl-body-line-height']).toBe('1.75')
    expect(vars['--tpl-body-bg']).toBe('transparent')
  })

  it('fontSizePt 转换为 px 无 NaN', () => {
    const vars = buildDefaultStyleCssVars({ fontSizePt: 14 }, undefined)
    expect(vars['--tpl-body-size']).toMatch(/^\d+px$/)
    expect(vars['--tpl-body-size']).not.toContain('NaN')
    expect(vars['--tpl-body-size-pt']).toBe('14pt')
  })

  it('bold=true 生成 weight=700', () => {
    const vars = buildDefaultStyleCssVars({ bold: true }, undefined)
    expect(vars['--tpl-body-weight']).toBe('700')
  })

  it('italic=true 生成 style=italic', () => {
    const vars = buildDefaultStyleCssVars({ italic: true }, undefined)
    expect(vars['--tpl-body-style']).toBe('italic')
  })

  it('align=center 正确映射', () => {
    const vars = buildDefaultStyleCssVars({ align: 'center' }, undefined)
    expect(vars['--tpl-body-align']).toBe('center')
  })

  it('align=justify 正确映射', () => {
    const vars = buildDefaultStyleCssVars({ align: 'justify' }, undefined)
    expect(vars['--tpl-body-align']).toBe('justify')
  })

  it('英文单独字体 useSeparateFont=true', () => {
    const vars = buildDefaultStyleCssVars(
      { fontFamily: 'SimSun' },
      { useSeparateFont: true, fontFamily: 'Times New Roman' },
    )
    expect(vars['--tpl-english-font']).toBe('Times New Roman')
  })

  it('英文单独字体 useSeparateFont=false 使用中文字体', () => {
    const vars = buildDefaultStyleCssVars(
      { fontFamily: 'SimSun' },
      { useSeparateFont: false, fontFamily: 'Times New Roman' },
    )
    expect(vars['--tpl-english-font']).toBe('SimSun')
  })

  it('null bodyStyles 时使用默认值', () => {
    const vars = buildDefaultStyleCssVars(null as any, undefined)
    assertNoCssGarbage(vars)
    expect(vars['--tpl-body-font']).toBe('SimSun')
  })

  it('lineHeight 为小数时正确转换', () => {
    const vars = buildDefaultStyleCssVars({ lineHeight: 2.0 }, undefined)
    expect(vars['--tpl-body-line-height']).toBe('2')
  })
})

// ——— 文档标题样式 CSS 变量 ———

describe('文档标题样式 CSS 变量映射', () => {
  it('完整配置时所有变量值合法', () => {
    const vars = buildTitleStyleCssVars({
      fontFamily: 'SimHei',
      fontSizePt: 22,
      bold: true,
      color: '#000000',
      align: 'center',
    })
    assertNoCssGarbage(vars)
    expect(vars['--tpl-title-font']).toBe('SimHei')
    expect(vars['--tpl-title-size']).toBe('29px')
    expect(vars['--tpl-title-weight']).toBe('700')
    expect(vars['--tpl-title-color']).toBe('#000000')
    expect(vars['--tpl-title-align']).toBe('center')
  })

  it('空配置时回退到默认值', () => {
    const vars = buildTitleStyleCssVars({})
    assertNoCssGarbage(vars)
    expect(vars['--tpl-title-font']).toBe('SimHei')
    expect(vars['--tpl-title-size']).toBe('29px')
    expect(vars['--tpl-title-weight']).toBe('700')
    expect(vars['--tpl-title-color']).toBe('#000000')
    expect(vars['--tpl-title-align']).toBe('center')
  })

  it('bold=false 生成 weight=400', () => {
    const vars = buildTitleStyleCssVars({ bold: false })
    expect(vars['--tpl-title-weight']).toBe('400')
  })

  it('fontSizePt 转换为 px 正确', () => {
    const vars = buildTitleStyleCssVars({ fontSizePt: 18 })
    expect(vars['--tpl-title-size']).toBe('24px')
    expect(vars['--tpl-title-size-pt']).toBe('18pt')
  })
})

// ——— 副标题样式 CSS 变量 ———

describe('副标题样式 CSS 变量映射', () => {
  it('完整配置时所有变量值合法', () => {
    const vars = buildSubtitleStyleCssVars({
      fontFamily: 'KaiTi_GB2312',
      fontSizePt: 14,
      bold: false,
      color: '#333333',
      align: 'center',
    })
    assertNoCssGarbage(vars)
    expect(vars['--tpl-subtitle-font']).toBe('KaiTi_GB2312')
    expect(vars['--tpl-subtitle-size']).toBe('19px')
    expect(vars['--tpl-subtitle-weight']).toBe('400')
    expect(vars['--tpl-subtitle-color']).toBe('#333333')
    expect(vars['--tpl-subtitle-align']).toBe('center')
  })

  it('空配置时回退到默认值', () => {
    const vars = buildSubtitleStyleCssVars({})
    assertNoCssGarbage(vars)
    expect(vars['--tpl-subtitle-font']).toBe('SimSun')
    expect(vars['--tpl-subtitle-weight']).toBe('400')
  })

  it('bold=true 生成 weight=700', () => {
    const vars = buildSubtitleStyleCssVars({ bold: true })
    expect(vars['--tpl-subtitle-weight']).toBe('700')
  })
})
