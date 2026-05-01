'use client'

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    styleKey: {
      /** 触发 style-key 重绘 */
      startTracking: () => ReturnType
    }
  }
}

/** 从节点文本内容推断标题层级 */
function inferHeadingLevel(node: any): number | null {
  const text = node.textBetween(0, node.content.size, ' ', ' ')
  if (!text.trim()) return null

  // 二级标题序号：(1)(2) （1）（2）
  if (/^[（(]?\d[）)]/.test(text)) return 2
  // 二级中文序号：(一)(二) （一）（二）
  if (/^[（(][一二三四五六七八九十百千零]+[）)]/.test(text)) return 2
  // 二级罗马数字：(ⅠⅡⅢⅣ)(ⅰⅱⅲⅳ)
  if (/^[（(][ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅰⅱⅲⅳⅴⅵⅶⅷⅸⅹ]+[）)]/.test(text)) return 2
  // 二级英文字母：(a)(b) （A）（B）
  if (/^[（(][a-zA-Z][）)]/.test(text)) return 2
  // 三级 1.1 / 1.1.1
  if (/^\d+\.\d+/.test(text)) return 3
  // 四级 1.1.1.1
  if (/^\d+\.\d+\.\d+/.test(text)) return 4
  // 五级 1.1.1.1.1
  if (/^\d+\.\d+\.\d+\.\d+/.test(text)) return 5

  return null
}

/** 判断是否为页码节点 */
function isPageNumberNode(node: any): boolean {
  // 1. 节点名含 page / footer / header
  const name = node.type.name.toLowerCase()
  if (/page|footer|header/i.test(name)) return true

  // 2. attrs 里明确有 pageNumber
  const attrs = node.attrs as any
  if (attrs && (attrs.pageNumber !== undefined || attrs.page_number !== undefined)) return true

  return false
}

/**
 * StyleKey Extension
 *
 * 使用 ProseMirror Decoration 给所有块级元素打 data-style-key 属性。
 * Decoration 随 DOM 重建自动恢复。
 *
 * 标记规则：
 *   - 文档第一个块级元素   → data-style-key="document_title"
 *   - 文档第二个段落（非标题）→ data-style-key="subject_info"
 *   - 页码节点            → data-style-key="page_number"
 *   - h1-h6 (含中文序号)  → data-style-key="heading_<level>"
 *   - 其他段落             → data-style-key="body"
 */
const styleKeyPluginKey = new PluginKey('styleKey')

const StyleKeyExtension = Extension.create({
  name: 'styleKey',

  addCommands() {
    return {
      startTracking:
        () =>
        ({ editor }) => {
          editor.view.dispatch(editor.state.tr.setMeta(styleKeyPluginKey, { update: true }))
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: styleKeyPluginKey,

        props: {
          decorations(state) {
            const decorations: Decoration[] = []
            const { doc } = state

            let blockIndex = 0

            doc.forEach((node, offset) => {
              const nodeType = node.type.name
              const nodeSize = node.nodeSize

              const isHeading = nodeType === 'heading'
              const isParagraph = nodeType === 'paragraph'

              if (!isHeading && !isParagraph) return

              let styleKey: string

              if (blockIndex === 0) {
                styleKey = 'document_title'
              } else if (isPageNumberNode(node)) {
                styleKey = 'page_number'
              } else {
                if (isHeading) {
                  const tiptapLevel: number = (node.attrs as any).level ?? 1
                  const inferredLevel = inferHeadingLevel(node)
                  const level = inferredLevel ?? tiptapLevel
                  styleKey = `heading_${level}`
                } else {
                  // 第二个段落（非标题）标记为 subject_info
                  if (blockIndex === 1) {
                    styleKey = 'subject_info'
                  } else {
                    styleKey = 'body'
                  }
                }
              }

              decorations.push(
                Decoration.node(offset, offset + nodeSize, {
                  'data-style-key': styleKey,
                }),
              )

              blockIndex++
            })

            return DecorationSet.create(doc, decorations)
          },
        },
      }),
    ]
  },
})

export default StyleKeyExtension
