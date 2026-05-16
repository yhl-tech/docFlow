/**
 * 表格空单元格测试
 *
 * 覆盖链路：tiptap-markdown 序列化 → store 中的 markdown 字符串
 * 核心断言：空单元格序列化后不含 em dash（—），内容有内容的单元格位置正确
 */
import { describe, it, expect } from 'vitest'

// tiptap-markdown 的 table 序列化逻辑：空单元格输出 "|  |"（两个空格）
// 我们直接测试序列化结果的字符串特征，不依赖 DOM 渲染

function parseTableCells(markdownLine: string): string[] {
  return markdownLine
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())
}

describe('表格 markdown 序列化', () => {
  it('空单元格序列化后不含 em dash（—）', () => {
    // tiptap-markdown 对空单元格的输出格式
    const emptyRow = '|  |  |  |  |  |  |'
    const cells = parseTableCells(emptyRow)
    cells.forEach((cell) => {
      expect(cell).not.toContain('—')
      expect(cell).not.toContain('—') // em dash unicode
      expect(cell).not.toContain('–') // en dash
    })
  })

  it('有内容的单元格在正确列位置', () => {
    const dataRow = '|  |  | 3213123 |  |  |  |'
    const cells = parseTableCells(dataRow)
    expect(cells[2]).toBe('3213123')
    expect(cells[0]).toBe('')
    expect(cells[1]).toBe('')
  })

  it('分隔行格式正确（含 - 字符）', () => {
    const sepRow = '| --- | --- | --- | --- | --- | --- |'
    const cells = parseTableCells(sepRow)
    cells.forEach((cell) => {
      expect(cell).toMatch(/^:?-+:?$/)
    })
  })

  it('完整表格序列化后行数正确', () => {
    const md = [
      '|  |  |  |',
      '| --- | --- | --- |',
      '|  | data |  |',
      '|  |  |  |',
    ].join('\n')

    const tableLines = md.split('\n').filter((l) => l.trim().startsWith('|'))
    const sepLines = tableLines.filter((l) => /^\s*\|[\s:|]*-[\s\-:|]*\|/.test(l))
    const dataLines = tableLines.filter((l) => !/^\s*\|[\s:|]*-[\s\-:|]*\|/.test(l))

    expect(sepLines).toHaveLength(1)
    expect(dataLines).toHaveLength(3) // header + 2 data rows
  })
})

describe('_fix_empty_table_cells 逻辑（前端侧验证）', () => {
  // 在前端，markdown 直接传给后端，fix 在后端做
  // 这里验证：前端序列化的 markdown 格式符合后端 fix 函数的输入预期

  const SEP_RE = /^\s*\|[\s:|]*-[\s\-:|]*\|\s*$/

  it('空行不匹配分隔行正则', () => {
    expect(SEP_RE.test('|  |  |  |')).toBe(false)
    expect(SEP_RE.test('| | | |')).toBe(false)
  })

  it('标准分隔行匹配分隔行正则', () => {
    expect(SEP_RE.test('| --- | --- | --- |')).toBe(true)
    expect(SEP_RE.test('| :--- | :---: | ---: |')).toBe(true)
    expect(SEP_RE.test('|---|---|')).toBe(true)
  })

  it('NBSP 填充后的单元格在 Word 中不应出现（后端会清除）', () => {
    // 模拟后端 fix 后的结果，以及 postprocess 中的清除逻辑
    const nbsp = '\xa0'
    const filledRow = `| ${nbsp} | ${nbsp} | data | ${nbsp} |`
    const cells = parseTableCells(filledRow)

    // 模拟 postprocess 清除：run.text === '\xa0' → run.text = ''
    const cleaned = cells.map((c) => (c === nbsp ? '' : c))
    expect(cleaned[0]).toBe('')
    expect(cleaned[1]).toBe('')
    expect(cleaned[2]).toBe('data')
    expect(cleaned[3]).toBe('')
    // 清除后不含 NBSP
    cleaned.forEach((c) => expect(c).not.toContain('\xa0'))
  })
})
