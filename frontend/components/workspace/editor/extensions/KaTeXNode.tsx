'use client'

import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    katex: {
      insertKaTeX: (latex: string, displayMode?: boolean) => ReturnType
    }
  }
}
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useEffect, useRef } from 'react'
import katex from 'katex'

/**
 * KaTeX 公式节点扩展
 *
 * 支持 tiptap-markdown 双向转换：
 *   - 行内公式：$E=mc^2$
 *   - 块级公式：$$E=mc^2$$  或多行 $$\n...\n$$
 */
export const KaTeXNode = Node.create({
  name: 'katex',

  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return {
      inline: true,
      /** 点击公式节点时的回调，用于打开编辑弹窗 */
      onEditFormula: undefined as
        | ((latex: string, displayMode: boolean, pos: number) => void)
        | undefined,
    }
  },

  addAttributes() {
    return {
      latex: { default: '' },
      displayMode: { default: false },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-katex]',
        getAttrs: (el) => {
          const elem = el as HTMLElement
          return {
            latex: elem.getAttribute('data-latex') ?? elem.textContent ?? '',
            displayMode: elem.getAttribute('data-katex') === 'block',
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { latex, displayMode, ...rest } = HTMLAttributes
    return [
      'span',
      mergeAttributes(rest, {
        'data-katex': displayMode ? 'block' : 'inline',
        'data-latex': latex,
      }),
      0,
    ]
  },

  /**
   * tiptap-markdown 集成：
   * - storage.markdown.serialize  → KaTeX 节点序列化为 $...$ 或 $$...$$
   * - storage.markdown.parse.setup → 注册 markdown-it 插件，将 $...$ 解析为 KaTeX 节点
   */
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const latex: string = node.attrs.latex ?? ''
          const displayMode: boolean = node.attrs.displayMode ?? false
          state.write(displayMode ? `$$${latex}$$` : `$${latex}$`)
        },
        parse: {
          setup(markdownit: any) {
            // ── 预处理：把各种 AI 输出的非标准公式定界符统一转为 $$...$$  ──
            // 在 markdownit.parse 入口处拦截，保证 block 规则运行前文本已规范化。
            // 不依赖规则优先级，比 block rule 更可靠。
            const _origParse = markdownit.parse.bind(markdownit)
            markdownit.parse = (src: string, env: any) => {
              // 1. 豆包 / 标准 LaTeX \[...\] 多行块级 → $$...$$
              //    匹配 \[ 紧跟换行，内容若干行，\] 紧跟换行或文末
              src = src.replace(/\\\[\n([\s\S]*?)\n\\\]/g, (_, c) => `$$\n${c}\n$$`)
              // 2. DeepSeek 风格：[ 独占一行，内容若干行，] 独占一行 → $$...$$
              //    使用 (?:^|\n) 确保 [ 在行首，] 在行尾
              src = src.replace(/(^|\n)\[\n([\s\S]*?)\n\](\n|$)/g,
                (_, pre, c, post) => `${pre}$$\n${c}\n$$${post}`)
              // 3. 单行 \[...\] → $$...$$（同行开闭，不含换行）
              src = src.replace(/\\\[([^\n]*?)\\\]/g, (_, c) => `$$${c}$$`)
              // 4. \(...\) 行内 → $...$
              src = src.replace(/\\\(([^\n]*?)\\\)/g, (_, c) => `$${c}$`)
              return _origParse(src, env)
            }

            // ── 行内规则：先匹配 $$...$$ 再匹配 $...$ ──────────────────────
            markdownit.inline.ruler.before(
              'escape',
              'math_block_inline',
              (state: any, silent: boolean) => {
                const src = state.src
                const start = state.pos
                if (src[start] !== '$' || src[start + 1] !== '$') return false
                const end = src.indexOf('$$', start + 2)
                if (end === -1) return false
                const content = src.slice(start + 2, end).trim()
                if (!silent) {
                  const token = state.push('math_block_inline', 'span', 0)
                  token.markup = '$$'
                  token.content = content
                }
                state.pos = end + 2
                return true
              },
            )

            markdownit.inline.ruler.before(
              'escape',
              'math_inline',
              (state: any, silent: boolean) => {
                const src = state.src
                const start = state.pos
                if (src[start] !== '$') return false
                if (src[start + 1] === '$') return false
                const end = src.indexOf('$', start + 1)
                if (end === -1) return false
                const content = src.slice(start + 1, end).trim()
                if (!content) return false
                if (!silent) {
                  const token = state.push('math_inline', 'span', 0)
                  token.markup = '$'
                  token.content = content
                }
                state.pos = end + 1
                return true
              },
            )

            // ── 块级规则：$$ 单独占行，内容跨多行，$$ 单独占行结束 ────────
            markdownit.block.ruler.before(
              'fence',
              'math_block',
              (state: any, startLine: number, endLine: number, silent: boolean) => {
                const pos = state.bMarks[startLine] + state.tShift[startLine]
                const max = state.eMarks[startLine]
                const src = state.src
                if (src[pos] !== '$' || src[pos + 1] !== '$') return false
                // 开头 $$ 后同行有内容 → 交给 inline 规则处理
                if (src.slice(pos + 2, max).trim().length > 0) return false

                let nextLine = startLine + 1
                let found = false
                const contentLines: string[] = []

                while (nextLine < endLine) {
                  const ls = state.bMarks[nextLine] + state.tShift[nextLine]
                  const le = state.eMarks[nextLine]
                  const line = src.slice(ls, le).trim()
                  if (line === '$$') { found = true; break }
                  contentLines.push(src.slice(ls, le))
                  nextLine++
                }

                if (!found) return false
                if (silent) return true

                const token = state.push('math_block', 'div', 0)
                token.markup = '$$'
                token.content = contentLines.join('\n').trim()
                token.map = [startLine, nextLine + 1]
                state.line = nextLine + 1
                return true
              },
            )

            // ── 块级规则：DeepSeek 风格 [ 单独占行 ... ] 单独占行 ──────────
            // DeepSeek 等 AI 输出的块级公式使用 [ ] 作为定界符，非标准但常见
            markdownit.block.ruler.before(
              'fence',
              'math_block_bracket',
              (state: any, startLine: number, endLine: number, silent: boolean) => {
                const src = state.src
                const pos = state.bMarks[startLine] + state.tShift[startLine]
                const max = state.eMarks[startLine]
                // 当前行必须只有一个 [
                if (src.slice(pos, max).trim() !== '[') return false

                let nextLine = startLine + 1
                let found = false
                const contentLines: string[] = []

                while (nextLine < endLine) {
                  const ls = state.bMarks[nextLine] + state.tShift[nextLine]
                  const le = state.eMarks[nextLine]
                  const line = src.slice(ls, le).trim()
                  if (line === ']') { found = true; break }
                  contentLines.push(src.slice(ls, le))
                  nextLine++
                }

                if (!found || contentLines.length === 0) return false
                if (silent) return true

                const token = state.push('math_block', 'div', 0)
                token.markup = '$$'
                token.content = contentLines.join('\n').trim()
                token.map = [startLine, nextLine + 1]
                state.line = nextLine + 1
                return true
              },
            )

            // ── 块级规则：标准 LaTeX \[ ... \] 多行块级公式 ─────────────────
            markdownit.block.ruler.before(
              'fence',
              'math_block_latex',
              (state: any, startLine: number, endLine: number, silent: boolean) => {
                const src = state.src
                const pos = state.bMarks[startLine] + state.tShift[startLine]
                const max = state.eMarks[startLine]
                const firstLine = src.slice(pos, max).trim()
                // 支持 \[ 单独占行，或 \[content（单行 \[...\]）
                if (!firstLine.startsWith('\\[')) return false

                // 单行情况：\[content\]
                if (firstLine.endsWith('\\]') && firstLine.length > 4) {
                  if (silent) return true
                  const content = firstLine.slice(2, -2).trim()
                  const token = state.push('math_block', 'div', 0)
                  token.markup = '$$'
                  token.content = content
                  token.map = [startLine, startLine + 1]
                  state.line = startLine + 1
                  return true
                }

                // 多行情况：\[ 单独占行
                if (firstLine !== '\\[') return false

                let nextLine = startLine + 1
                let found = false
                const contentLines: string[] = []

                while (nextLine < endLine) {
                  const ls = state.bMarks[nextLine] + state.tShift[nextLine]
                  const le = state.eMarks[nextLine]
                  const line = src.slice(ls, le).trim()
                  if (line === '\\]') { found = true; break }
                  contentLines.push(src.slice(ls, le))
                  nextLine++
                }

                if (!found || contentLines.length === 0) return false
                if (silent) return true

                const token = state.push('math_block', 'div', 0)
                token.markup = '$$'
                token.content = contentLines.join('\n').trim()
                token.map = [startLine, nextLine + 1]
                state.line = nextLine + 1
                return true
              },
            )

            // ── 行内规则：标准 LaTeX \(...\) 行内公式 ────────────────────────
            markdownit.inline.ruler.before(
              'escape',
              'math_latex_inline',
              (state: any, silent: boolean) => {
                const src = state.src
                const start = state.pos
                if (src[start] !== '\\' || src[start + 1] !== '(') return false
                const end = src.indexOf('\\)', start + 2)
                if (end === -1) return false
                const content = src.slice(start + 2, end).trim()
                if (!content) return false
                if (!silent) {
                  const token = state.push('math_inline', 'span', 0)
                  token.markup = '$'
                  token.content = content
                }
                state.pos = end + 2
                return true
              },
            )

            // ── 渲染器：输出 <span data-katex="..."> 供 TipTap parseHTML 识别 ──
            const esc = (s: string) =>
              s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

            markdownit.renderer.rules['math_inline'] = (tokens: any[], idx: number) =>
              `<span data-katex="inline" data-latex="${esc(tokens[idx].content)}"></span>`

            markdownit.renderer.rules['math_block_inline'] = (tokens: any[], idx: number) =>
              `<span data-katex="block" data-latex="${esc(tokens[idx].content)}"></span>`

            markdownit.renderer.rules['math_block'] = (tokens: any[], idx: number) =>
              `<p><span data-katex="block" data-latex="${esc(tokens[idx].content)}"></span></p>\n`
          },
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(
      ({ node, extension, getPos }: { node: any; extension: any; getPos: any }) => {
        const latex = node.attrs.latex as string
        const displayMode = node.attrs.displayMode as boolean
        const containerRef = useRef<HTMLSpanElement>(null)

        function handleClick(e: React.MouseEvent) {
          e.stopPropagation()
          const onEdit = extension.options?.onEditFormula
          if (onEdit && typeof getPos === 'function') {
            onEdit(latex, displayMode, getPos())
          }
        }

        useEffect(() => {
          if (!containerRef.current || !latex) return
          try {
            katex.render(latex, containerRef.current, {
              displayMode,
              throwOnError: false,
              errorColor: '#cc0000',
              trust: true,
              strict: false,
            })
          } catch (error) {
            console.error('KaTeX render error:', error)
            if (containerRef.current) {
              containerRef.current.textContent = latex
              containerRef.current.classList.add('text-red-500')
            }
          }
        }, [latex, displayMode])

        return (
          // as="span" 确保行内节点不产生块级 <div>，避免行内布局错乱
          <NodeViewWrapper
            as="span"
            className={displayMode ? 'katex-block-wrap' : 'katex-inline-wrap'}
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
          >
            <span
              ref={containerRef}
              className={displayMode ? 'block text-center my-3' : 'inline-block align-middle'}
            />
          </NodeViewWrapper>
        )
      },
    )
  },

  addCommands() {
    return {
      insertKaTeX:
        (latex: string, displayMode = false) =>
        ({ commands }: any) => {
          if (!latex.trim()) return false
          return commands.insertContent({
            type: this.name,
            attrs: { latex: latex.trim(), displayMode },
          })
        },
    }
  },
})
