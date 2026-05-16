/**
 * 页码 CSS 变量映射测试
 *
 * 覆盖链路：TemplateConfig.layout.pageNumber → CSS 变量 → 编辑器 DOM style 属性
 * 核心断言：页码位置/格式/字体/颜色等配置正确转换为 CSS 变量值
 */
import { describe, it, expect } from 'vitest'

// ——— 从 TipTapEditor 中提取的页码 CSS 变量计算逻辑 ———

function buildPageNumberCssVars(
  pageNumberConfig: Record<string, any>,
  headerFooterConfig: Record<string, any>,
): Record<string, string> {
  const pn = pageNumberConfig ?? {}
  const hf = headerFooterConfig ?? {}

  // 页码启用状态
  const enabled = pn.enabled ?? true

  // 页码位置
  const position = pn.position ?? 'footer-top'

  // 页码对齐
  const align = pn.align ?? 'center'

  // 页码格式
  const formatMap: Record<string, string> = {
    'arabic': 'decimal',
    'lowercaseRoman': 'lower-roman',
    'uppercaseRoman': 'upper-roman',
  }
  const format = formatMap[pn.format ?? 'arabic'] ?? 'decimal'

  // 起始页码
  const startValue = pn.startValue ?? 1

  // 首页显示
  const showOnFirstPage = pn.showOnFirstPage ?? true

  // 章节编号
  const includeChapterNumber = pn.includeChapterNumber ?? false
  const chapterStyle = pn.chapterStyle ?? 'heading1'
  const chapterSeparator = pn.chapterSeparator ?? '-'

  // 标签模板
  const labelTemplate = pn.labelTemplate ?? '{page}'

  // 页码字体样式（来自 pageNumber 配置）
  const fontFamily = pn.fontFamily ?? 'SimSun'
  const fontSizePt = pn.fontSizePt ?? 10
  const fontSizePx = Math.round(fontSizePt * 1.333)
  const color = pn.color ?? '#000000'
  const bold = pn.bold ?? false
  const italic = pn.italic ?? false

  // 页眉页脚配置中的页码样式（优先级更高）
  const hfFontFamily = hf.pageNumberFontFamily ?? fontFamily
  const hfFontSizePt = hf.pageNumberFontSizePt ?? fontSizePt
  const hfFontSizePx = Math.round(hfFontSizePt * 1.333)
  const hfColor = hf.pageNumberColor ?? color
  const hfBold = hf.pageNumberBold ?? bold
  const hfItalic = hf.pageNumberItalic ?? italic

  return {
    '--tpl-pn-enabled': enabled ? '1' : '0',
    '--tpl-pn-position': position,
    '--tpl-pn-align': align,
    '--tpl-pn-format': format,
    '--tpl-pn-start': startValue.toString(),
    '--tpl-pn-show-first': showOnFirstPage ? '1' : '0',
    '--tpl-pn-chapter': includeChapterNumber ? '1' : '0',
    '--tpl-pn-chapter-style': chapterStyle,
    '--tpl-pn-chapter-sep': chapterSeparator,
    '--tpl-pn-label': labelTemplate,
    '--tpl-pn-font': hfFontFamily,
    '--tpl-pn-size': `${hfFontSizePx}px`,
    '--tpl-pn-size-pt': `${hfFontSizePt}pt`,
    '--tpl-pn-color': hfColor,
    '--tpl-pn-weight': hfBold ? '700' : '400',
    '--tpl-pn-style': hfItalic ? 'italic' : 'normal',
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

// ——— 页码 CSS 变量 ———

describe('页码 CSS 变量映射', () => {
  it('完整配置时所有变量值合法', () => {
    const vars = buildPageNumberCssVars(
      {
        enabled: true,
        position: 'footer-top',
        align: 'right',
        format: 'arabic',
        startValue: 1,
        showOnFirstPage: true,
        includeChapterNumber: false,
        labelTemplate: '{page}',
        fontFamily: 'SimSun',
        fontSizePt: 10,
        color: '#333333',
        bold: false,
        italic: false,
      },
      {},
    )
    assertNoCssGarbage(vars)
    expect(vars['--tpl-pn-enabled']).toBe('1')
    expect(vars['--tpl-pn-position']).toBe('footer-top')
    expect(vars['--tpl-pn-align']).toBe('right')
    expect(vars['--tpl-pn-format']).toBe('decimal')
    expect(vars['--tpl-pn-start']).toBe('1')
    expect(vars['--tpl-pn-show-first']).toBe('1')
    expect(vars['--tpl-pn-chapter']).toBe('0')
    expect(vars['--tpl-pn-label']).toBe('{page}')
    expect(vars['--tpl-pn-font']).toBe('SimSun')
    expect(vars['--tpl-pn-size']).toBe('13px')
    expect(vars['--tpl-pn-size-pt']).toBe('10pt')
    expect(vars['--tpl-pn-color']).toBe('#333333')
    expect(vars['--tpl-pn-weight']).toBe('400')
    expect(vars['--tpl-pn-style']).toBe('normal')
  })

  it('空配置时回退到合理默认值（无 undefined）', () => {
    const vars = buildPageNumberCssVars({}, {})
    assertNoCssGarbage(vars)
    expect(vars['--tpl-pn-enabled']).toBe('1')
    expect(vars['--tpl-pn-position']).toBe('footer-top')
    expect(vars['--tpl-pn-align']).toBe('center')
    expect(vars['--tpl-pn-format']).toBe('decimal')
    expect(vars['--tpl-pn-start']).toBe('1')
    expect(vars['--tpl-pn-show-first']).toBe('1')
    expect(vars['--tpl-pn-chapter']).toBe('0')
    expect(vars['--tpl-pn-font']).toBe('SimSun')
    expect(vars['--tpl-pn-size']).toBe('13px')
    expect(vars['--tpl-pn-color']).toBe('#000000')
    expect(vars['--tpl-pn-weight']).toBe('400')
    expect(vars['--tpl-pn-style']).toBe('normal')
  })

  it('enabled=false 生成 enabled=0', () => {
    const vars = buildPageNumberCssVars({ enabled: false }, {})
    expect(vars['--tpl-pn-enabled']).toBe('0')
  })

  it('position=header-bottom 正确映射', () => {
    const vars = buildPageNumberCssVars({ position: 'header-bottom' }, {})
    expect(vars['--tpl-pn-position']).toBe('header-bottom')
  })

  it('position=footer-top 正确映射', () => {
    const vars = buildPageNumberCssVars({ position: 'footer-top' }, {})
    expect(vars['--tpl-pn-position']).toBe('footer-top')
  })

  it('align=center 正确映射', () => {
    const vars = buildPageNumberCssVars({ align: 'center' }, {})
    expect(vars['--tpl-pn-align']).toBe('center')
  })

  it('align=left 正确映射', () => {
    const vars = buildPageNumberCssVars({ align: 'left' }, {})
    expect(vars['--tpl-pn-align']).toBe('left')
  })

  it('align=right 正确映射', () => {
    const vars = buildPageNumberCssVars({ align: 'right' }, {})
    expect(vars['--tpl-pn-align']).toBe('right')
  })

  it('format=arabic 映射为 decimal', () => {
    const vars = buildPageNumberCssVars({ format: 'arabic' }, {})
    expect(vars['--tpl-pn-format']).toBe('decimal')
  })

  it('format=lowercaseRoman 映射为 lower-roman', () => {
    const vars = buildPageNumberCssVars({ format: 'lowercaseRoman' }, {})
    expect(vars['--tpl-pn-format']).toBe('lower-roman')
  })

  it('format=uppercaseRoman 映射为 upper-roman', () => {
    const vars = buildPageNumberCssVars({ format: 'uppercaseRoman' }, {})
    expect(vars['--tpl-pn-format']).toBe('upper-roman')
  })

  it('未知 format 回退为 decimal', () => {
    const vars = buildPageNumberCssVars({ format: 'unknown' }, {})
    expect(vars['--tpl-pn-format']).toBe('decimal')
  })

  it('startValue=5 正确映射', () => {
    const vars = buildPageNumberCssVars({ startValue: 5 }, {})
    expect(vars['--tpl-pn-start']).toBe('5')
  })

  it('showOnFirstPage=false 生成 show-first=0', () => {
    const vars = buildPageNumberCssVars({ showOnFirstPage: false }, {})
    expect(vars['--tpl-pn-show-first']).toBe('0')
  })

  it('includeChapterNumber=true 生成 chapter=1', () => {
    const vars = buildPageNumberCssVars({ includeChapterNumber: true }, {})
    expect(vars['--tpl-pn-chapter']).toBe('1')
  })

  it('chapterStyle=heading2 正确映射', () => {
    const vars = buildPageNumberCssVars({ chapterStyle: 'heading2' }, {})
    expect(vars['--tpl-pn-chapter-style']).toBe('heading2')
  })

  it('chapterSeparator=. 正确映射', () => {
    const vars = buildPageNumberCssVars({ chapterSeparator: '.' }, {})
    expect(vars['--tpl-pn-chapter-sep']).toBe('.')
  })

  it('labelTemplate=第 {page} 页 正确映射', () => {
    const vars = buildPageNumberCssVars({ labelTemplate: '第 {page} 页' }, {})
    expect(vars['--tpl-pn-label']).toBe('第 {page} 页')
  })

  it('fontSizePt 转换为 px 无 NaN', () => {
    const vars = buildPageNumberCssVars({ fontSizePt: 12 }, {})
    expect(vars['--tpl-pn-size']).toMatch(/^\d+px$/)
    expect(vars['--tpl-pn-size']).not.toContain('NaN')
  })

  it('bold=true 生成 weight=700', () => {
    const vars = buildPageNumberCssVars({ bold: true }, {})
    expect(vars['--tpl-pn-weight']).toBe('700')
  })

  it('italic=true 生成 style=italic', () => {
    const vars = buildPageNumberCssVars({ italic: true }, {})
    expect(vars['--tpl-pn-style']).toBe('italic')
  })

  it('null pageNumberConfig 时使用默认值', () => {
    const vars = buildPageNumberCssVars(null as any, {})
    assertNoCssGarbage(vars)
    expect(vars['--tpl-pn-enabled']).toBe('1')
    expect(vars['--tpl-pn-position']).toBe('footer-top')
  })

  it('pageNumberConfig 和 headerFooterConfig 都为 null', () => {
    const vars = buildPageNumberCssVars(null as any, null as any)
    assertNoCssGarbage(vars)
    expect(vars['--tpl-pn-font']).toBe('SimSun')
  })
})

// ——— 页眉页脚中的页码样式优先级 ———

describe('页眉页脚页码样式优先级', () => {
  it('headerFooter 页码样式覆盖 pageNumber 样式', () => {
    const vars = buildPageNumberCssVars(
      { fontFamily: 'SimSun', fontSizePt: 10, color: '#000000', bold: false },
      { pageNumberFontFamily: 'SimHei', pageNumberFontSizePt: 12, pageNumberColor: '#FF0000', pageNumberBold: true },
    )
    expect(vars['--tpl-pn-font']).toBe('SimHei')
    expect(vars['--tpl-pn-size']).toBe('16px')
    expect(vars['--tpl-pn-color']).toBe('#FF0000')
    expect(vars['--tpl-pn-weight']).toBe('700')
  })

  it('headerFooter 部分覆盖 pageNumber 样式', () => {
    const vars = buildPageNumberCssVars(
      { fontFamily: 'SimSun', fontSizePt: 10, color: '#000000', bold: false },
      { pageNumberBold: true },
    )
    expect(vars['--tpl-pn-font']).toBe('SimSun') // 未覆盖，使用 pageNumber 的
    expect(vars['--tpl-pn-size']).toBe('13px') // 未覆盖
    expect(vars['--tpl-pn-weight']).toBe('700') // 覆盖了
  })

  it('headerFooter 优先级高于 pageNumber 全部字段', () => {
    const vars = buildPageNumberCssVars(
      { fontFamily: 'SimSun', fontSizePt: 10, color: '#000000', bold: false, italic: false },
      { pageNumberFontFamily: 'KaiTi', pageNumberFontSizePt: 14, pageNumberColor: '#00FF00', pageNumberBold: true, pageNumberItalic: true },
    )
    expect(vars['--tpl-pn-font']).toBe('KaiTi')
    expect(vars['--tpl-pn-size']).toBe('19px')
    expect(vars['--tpl-pn-size-pt']).toBe('14pt')
    expect(vars['--tpl-pn-color']).toBe('#00FF00')
    expect(vars['--tpl-pn-weight']).toBe('700')
    expect(vars['--tpl-pn-style']).toBe('italic')
  })
})
