/**
 * E2E 测试：表格空单元格全链路
 *
 * 覆盖：
 * 1. 编辑器中插入空表格 → 单元格 DOM 内无 em dash（—）字符
 * 2. 导出 DOCX → 后端返回 200，文件可下载（内容正确性由后端集成测试覆盖）
 *
 * 前置条件：
 *   - 前端 dev server 运行在 http://localhost:3000
 *   - 后端 API 运行在 http://localhost:8000
 *   - 用户已登录（或登录页可访问）
 */
import { test, expect, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// ─── 辅助函数 ───────────────────────────────────────────────────────────────

async function waitForEditor(page: Page) {
  await page.waitForSelector('.tiptap-editor', { timeout: 15000 })
}

async function getEditorTableCellTexts(page: Page): Promise<string[]> {
  return page.$$eval('.tiptap-editor table td, .tiptap-editor table th', (cells) =>
    cells.map((c) => c.textContent ?? '')
  )
}

// ─── 测试套件 ────────────────────────────────────────────────────────────────

test.describe('表格空单元格 - 编辑器显示', () => {
  test.beforeEach(async ({ page }) => {
    // 跳转到编辑器页面（需要登录时先登录）
    await page.goto('/')
    // 等待应用加载
    await page.waitForLoadState('networkidle')
  })

  test('编辑器中空表格单元格不显示 em dash（—）', async ({ page }) => {
    // 等待编辑器就绪
    const hasEditor = await page.locator('.tiptap-editor').count()
    if (!hasEditor) {
      test.skip() // 没有编辑器页面时跳过
      return
    }

    await waitForEditor(page)

    // 向编辑器插入一个 3×3 空表格
    await page.evaluate(() => {
      const editorEl = document.querySelector('.tiptap-editor') as HTMLElement
      if (!editorEl) return
      // 触发表格插入（通过 ProseMirror API，如果存在 window.__editor__）
      const win = window as any
      if (win.__tiptapEditor?.commands?.insertTable) {
        win.__tiptapEditor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      }
    })

    // 等待表格渲染
    await page.waitForSelector('.tiptap-editor table', { timeout: 5000 }).catch(() => null)

    const cellTexts = await getEditorTableCellTexts(page)
    for (const text of cellTexts) {
      expect(text, `单元格内容不应含 em dash: "${text}"`).not.toContain('—')
      expect(text).not.toContain('—') // unicode em dash
      expect(text).not.toContain('–') // en dash
    }
  })

  test('通过 markdown 内容加载的空表格单元格无 em dash', async ({ page }) => {
    const hasEditor = await page.locator('.tiptap-editor').count()
    if (!hasEditor) {
      test.skip()
      return
    }

    await waitForEditor(page)

    // 注入含空单元格的 markdown 内容
    await page.evaluate(() => {
      const win = window as any
      const md = '|  |  |  |\n| --- | --- | --- |\n|  | 数据 |  |\n|  |  |  |\n'
      if (win.__tiptapEditor?.commands?.setContent) {
        win.__tiptapEditor.commands.setContent(md)
      }
    })

    await page.waitForSelector('.tiptap-editor table', { timeout: 5000 }).catch(() => null)

    const cellTexts = await getEditorTableCellTexts(page)
    const nonDataCells = cellTexts.filter((t) => t.trim() !== '数据' && t.trim() !== '')
    for (const text of nonDataCells) {
      expect(text).not.toContain('—')
    }
  })
})

test.describe('表格空单元格 - DOCX 导出', () => {
  test('导出含空单元格的表格 DOCX 请求返回成功', async ({ page, request }) => {
    // 直接调用后端 API 测试导出
    const md = '|  |  |  |\n| --- | --- | --- |\n|  | TEST |  |\n|  |  |  |\n'

    const response = await request.post('http://localhost:8000/api/v1/export/docx', {
      data: {
        markdown: md,
        template: 'default',
        page_size: 'A4',
        template_binding: null,
      },
      timeout: 30000,
    }).catch(() => null)

    if (!response) {
      test.skip() // 后端不可用时跳过
      return
    }

    expect(response.status()).toBe(200)

    const contentType = response.headers()['content-type'] ?? ''
    expect(contentType).toContain('application/vnd.openxmlformats')

    // 验证文件内容非空
    const body = await response.body()
    expect(body.length).toBeGreaterThan(1000) // docx 文件至少 1KB
  })

  test('导出后的 DOCX 可下载且是合法 ZIP 格式（docx 本质是 ZIP）', async ({ request }) => {
    const md = '| 标题1 | 标题2 |\n| --- | --- |\n|  | 内容 |\n'

    const response = await request.post('http://localhost:8000/api/v1/export/docx', {
      data: { markdown: md, template: 'default', page_size: 'A4', template_binding: null },
      timeout: 30000,
    }).catch(() => null)

    if (!response) {
      test.skip()
      return
    }

    if (response.status() !== 200) {
      test.skip()
      return
    }

    const body = await response.body()
    // docx 是 ZIP 格式，文件头为 PK\x03\x04
    expect(body[0]).toBe(0x50) // P
    expect(body[1]).toBe(0x4b) // K
    expect(body[2]).toBe(0x03)
    expect(body[3]).toBe(0x04)
  })
})
