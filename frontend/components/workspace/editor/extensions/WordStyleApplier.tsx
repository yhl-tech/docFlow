'use client'

import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Extension } from '@tiptap/core'

export interface WordStyleRun {
  start: number
  end: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  font_family?: string | null
}

export const wordStyleApplierPluginKey = new PluginKey('wordStyleApplier')

/**
 * WordStyleApplier Plugin
 *
 * 在 TipTap 编辑器中重放 Word 文档的字符级样式（加粗、斜体、下划线、字体）。
 * 通过 transaction meta 注入 style_runs：
 *   editor.view.dispatch(tr.setMeta('applyWordStyles', styleRuns))
 *
 * 原理：遍历文档所有文字节点，建立"绝对字符位置 → [docPos, text]" 映射，
 * 然后将 style_runs 中的绝对位置映射回 TipTap doc 位置并应用 mark。
 */
const WordStyleApplierCore = new Plugin({
  key: wordStyleApplierPluginKey,

  appendTransaction(transactions, _oldState, newState) {
    const tx = transactions.find(t => t.getMeta('applyWordStyles'))
    if (!tx) return null

    const styleRuns: WordStyleRun[] = tx.getMeta('applyWordStyles')
    if (!styleRuns?.length) return null

    const tr = newState.tr
    let docCharOffset = 0

    newState.doc.descendants((node, pos) => {
      if (node.isText) {
        const text = node.text ?? ''
        const nodeStart = docCharOffset
        const nodeEnd = docCharOffset + text.length

        for (const run of styleRuns) {
          if (run.start >= nodeEnd || run.end <= nodeStart) continue

          const from = pos + Math.max(0, run.start - nodeStart)
          const to = pos + Math.min(text.length, run.end - nodeStart)

          if (from >= to) continue

          if (run.bold) {
            const mark = newState.schema.marks.bold
            if (mark) tr.addMark(from, to, mark.create())
          }
          if (run.italic) {
            const mark = newState.schema.marks.em
            if (mark) tr.addMark(from, to, mark.create())
          }
          if (run.underline) {
            const mark = newState.schema.marks.underline
            if (mark) tr.addMark(from, to, mark.create())
          }
          if (run.font_family) {
            const ff = newState.schema.marks.fontFamily
            if (ff) tr.addMark(from, to, ff.create({ fontFamily: run.font_family }))
          }
        }

        docCharOffset += text.length
      } else if (node.isBlock && !node.isTextblock) {
        docCharOffset += 1
      }
    })

    return tr.steps.length > 0 ? tr : null
  },
})

// 包装成 TipTap Extension，兼容 useEditor 的 extensions 数组类型
export const WordStyleApplierPlugin = Extension.create({
  name: 'wordStyleApplier',
  addProseMirrorPlugins() {
    return [WordStyleApplierCore]
  },
})
