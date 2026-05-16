import { generateTemplateCSS, generatePageCSS, generatePreviewCSS } from '../../lib/utils/css-generator'
import type { TemplateConfig } from '@/types/editor-template'
/// <reference types="vitest/globals" />

describe('generateTemplateCSS', () => {
  it('生成 headingStyles.h1 的 CSS', () => {
    const config: TemplateConfig = {
      styles: {},
      layout: {},
      headingStyles: {
        h1: {
          font: { fontFamily: 'SimHei', fontSizePt: 16, bold: true, color: '#000000' },
          align: 'left',
          lineHeight: 1.5,
        },
      },
    }
    const css = generateTemplateCSS(config)
    expect(css).toContain('.preview-h1')
    expect(css).toContain('font-family')
    expect(css).toContain('font-size')
    expect(css).toContain('font-weight: bold')
    expect(css).toContain('text-align')
  })

  it('headingStyles.h2 配置了斜体时，CSS 包含 font-style: italic', () => {
    const config: TemplateConfig = {
      styles: {},
      layout: {},
      headingStyles: {
        h2: {
          font: { fontFamily: 'KaiTi', fontSizePt: 14, italic: true },
        },
      },
    }
    const css = generateTemplateCSS(config)
    expect(css).toContain('.preview-h2')
    expect(css).toContain('font-style: italic')
  })

  it('headingStyles 未配置时，不生成 h1~h6 的 CSS', () => {
    const config: TemplateConfig = { styles: {}, layout: {} }
    const css = generateTemplateCSS(config)
    expect(css).not.toContain('.preview-h1')
    expect(css).not.toContain('.preview-h2')
    expect(css).not.toContain('.preview-h3')
  })

  it('headingStyles.h3 配置颜色时，CSS 包含 color', () => {
    const config: TemplateConfig = {
      styles: {},
      layout: {},
      headingStyles: {
        h3: {
          font: { fontFamily: 'SimSun', fontSizePt: 13, color: '#FF0000' },
        },
      },
    }
    const css = generateTemplateCSS(config)
    expect(css).toContain('.preview-h3')
    expect(css).toContain('color')
  })

  it('headingStyles.h4 配置间距时，CSS 包含 margin-top 和 margin-bottom', () => {
    const config: TemplateConfig = {
      styles: {},
      layout: {},
      headingStyles: {
        h4: {
          font: { fontFamily: 'SimHei', fontSizePt: 12 },
          spacingBeforePt: 10,
          spacingAfterPt: 5,
        },
      },
    }
    const css = generateTemplateCSS(config)
    expect(css).toContain('.preview-h4')
    expect(css).toContain('margin-top: 10pt')
    expect(css).toContain('margin-bottom: 5pt')
  })

  it('paragraphStyles 生成 .preview-body CSS', () => {
    const config: TemplateConfig = {
      styles: {},
      layout: {},
      paragraphStyles: {
        align: 'justify',
        lineHeight: 1.8,
        spacingBeforePt: 0,
        spacingAfterPt: 6,
        firstLineIndentChars: 2,
      },
    }
    const css = generateTemplateCSS(config)
    expect(css).toContain('.preview-body')
    expect(css).toContain('text-align: justify')
    expect(css).toContain('line-height: 1.8')
    expect(css).toContain('text-indent: 2em')
  })

  it('同时配置 headingStyles 和旧版 styles 时都生成 CSS', () => {
    const config: TemplateConfig = {
      styles: {
        body: { label: '正文', role: 'body', fontFamily: 'SimSun', fontSizePt: 14 },
      },
      layout: {},
      headingStyles: {
        h1: { font: { fontFamily: 'SimHei', fontSizePt: 16, bold: true } },
      },
    }
    const css = generateTemplateCSS(config)
    expect(css).toContain('.preview-body')
    expect(css).toContain('.preview-h1')
  })
})

describe('generatePageCSS', () => {
  it('生成带纸张大小的 @page CSS', () => {
    const css = generatePageCSS({ paperSize: 'A4' })
    expect(css).toContain('@page')
    expect(css).toContain('size: A4')
  })

  it('生成带页边距的 @page CSS', () => {
    const css = generatePageCSS({
      paperSize: 'A4',
      marginTopMm: 20,
      marginBottomMm: 20,
      marginLeftMm: 15,
      marginRightMm: 15,
    })
    expect(css).toContain('margin: 20mm 15mm 20mm 15mm')
  })

  it('使用默认页边距', () => {
    const css = generatePageCSS({})
    expect(css).toContain('margin: 25mm 20mm 25mm 20mm')
  })
})

describe('generatePreviewCSS', () => {
  it('生成完整预览 CSS（页面 + 模板）', () => {
    const config: TemplateConfig = {
      styles: {},
      layout: { paperSize: 'A4', marginTopMm: 25, marginBottomMm: 25, marginLeftMm: 20, marginRightMm: 20 },
      headingStyles: {
        h1: { font: { fontFamily: 'SimHei', fontSizePt: 16, bold: true } },
      },
    }
    const css = generatePreviewCSS(config)
    expect(css).toContain('@page')
    expect(css).toContain('.preview-h1')
  })
})
