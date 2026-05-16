'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronDown, ChevronRight, Copy, Check, Monitor, Box, ImageIcon, Ruler, Info, Terminal } from 'lucide-react'
import { useEditorDebug } from '@/hooks/useEditorDebug'
import { useEditorStore } from '@/store/editorStore'

interface DebugInfo {
  timestamp: string
  config: {
    imageStyles?: any
    headingStyles?: any
    layout?: any
    tableStyles?: any
  }
  binding?: {
    templateId?: string
    configSnapshot?: any
  }
  requestPayload?: any
  response?: any
}

// 表格插入日志
interface TableInsertLog {
  timestamp: string
  tableNumber: number
  tableNumberingEnabled: boolean
  tableNumberingConfig: any
  prefix: string
  suffix: string
  rows: number
  cols: number
  tableStyles: any
  configSource: string
  configSnapshot: {
    hasTableStyles: boolean
    tableStylesKeys: string[]
    hasTableNumbering: boolean
  } | null
}

interface EditorDebugInfo {
  imageStyles?: any
  headingStyles?: any
  layout?: any
  paragraphStyles?: any
  tableStyles?: any
  templatePanelOpen?: boolean
  previewConfig?: any
}

// 编辑器元素信息
interface EditorElementInfo {
  element: HTMLElement | null
  tagName: string
  className: string
  id: string
  width: number
  height: number
  computedStyles: {
    width: string
    height: string
    maxWidth: string
    marginLeft: string
    marginRight: string
    paddingLeft: string
    paddingRight: string
    borderLeftWidth: string
    borderRightWidth: string
  }
  children: EditorElementInfo[]
}

// 分析元素结构
function analyzeElement(element: HTMLElement | null, depth = 0): EditorElementInfo | null {
  if (!element) return null

  const computed = window.getComputedStyle(element)
  const info: EditorElementInfo = {
    element,
    tagName: element.tagName.toLowerCase(),
    className: element.className,
    id: element.id,
    width: element.offsetWidth,
    height: element.offsetHeight,
    computedStyles: {
      width: computed.width,
      height: computed.height,
      maxWidth: computed.maxWidth,
      marginLeft: computed.marginLeft,
      marginRight: computed.marginRight,
      paddingLeft: computed.paddingLeft,
      paddingRight: computed.paddingRight,
      borderLeftWidth: computed.borderLeftWidth,
      borderRightWidth: computed.borderRightWidth,
    },
    children: [],
  }

  // 只深入分析关键元素，避免过度嵌套
  // editor-root 结构: editor-root > tpl-paper > tiptap-editor > img (4层)
  const maxDepth = 5
  if (depth < maxDepth) {
    const children = Array.from(element.children)
    // 优先显示 img, div, p, section 等关键元素
    const importantTags = ['IMG', 'DIV', 'P', 'SECTION', 'ARTICLE', 'MAIN', 'ASIDE', 'HEADER', 'FOOTER', 'FIGURE', 'FIGCAPTION']
    const sorted = [...children].sort((a, b) => {
      const aImportant = importantTags.includes(a.tagName)
      const bImportant = importantTags.includes(b.tagName)
      if (aImportant && !bImportant) return -1
      if (!aImportant && bImportant) return 1
      return 0
    })

    for (const child of sorted.slice(0, 10)) { // 限制每个层级最多10个子元素
      const childInfo = analyzeElement(child as HTMLElement, depth + 1)
      if (childInfo) {
        info.children.push(childInfo)
      }
    }
  }

  return info
}

// 元素树形展示组件
function ElementTree({ info, depth = 0 }: { info: EditorElementInfo | null; depth?: number }) {
  const [expanded, setExpanded] = useState(depth === 0)

  if (!info) return null

  const hasChildren = info.children.length > 0
  const isImage = info.tagName === 'img'

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div
        className="flex items-center gap-2 py-0.5 hover:bg-slate-50 rounded cursor-pointer"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />
        ) : (
          <span className="w-3" />
        )}
        <span className={`rounded px-1 text-xs font-mono ${
          isImage ? 'bg-amber-100 text-amber-700' :
          info.tagName === 'section' || info.tagName === 'main' ? 'bg-blue-100 text-blue-700' :
          'bg-slate-100 text-slate-600'
        }`}>
          {info.tagName}
        </span>
        {info.id && <span className="text-xs text-purple-500">#{info.id}</span>}
        <span className="text-xs text-slate-400 truncate max-w-[150px]">
          {info.className && typeof info.className === 'string' ? `.${info.className.split(' ').filter(Boolean).join('.')}` : ''}
        </span>
        <span className="text-xs text-slate-400">
          {info.width}×{info.height}
        </span>
        {isImage && (
          <span className="text-xs text-amber-600">
            max-width:{info.computedStyles.maxWidth || 'none'}
          </span>
        )}
      </div>

      {/* 详细样式信息 */}
      {expanded && (
        <div className="ml-5 mt-1 rounded bg-slate-50 p-2 text-xs font-mono">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-slate-500">width:</span><span className="text-slate-700">{info.computedStyles.width}</span>
            <span className="text-slate-500">height:</span><span className="text-slate-700">{info.computedStyles.height}</span>
            <span className="text-slate-500">max-width:</span><span className="text-slate-700">{info.computedStyles.maxWidth || 'none'}</span>
            <span className="text-slate-500">margin:</span><span className="text-slate-700">L:{info.computedStyles.marginLeft} R:{info.computedStyles.marginRight}</span>
            <span className="text-slate-500">padding:</span><span className="text-slate-700">L:{info.computedStyles.paddingLeft} R:{info.computedStyles.paddingRight}</span>
            <span className="text-slate-500">border:</span><span className="text-slate-700">L:{info.computedStyles.borderLeftWidth} R:{info.computedStyles.borderRightWidth}</span>
          </div>
          {isImage && (
            <div className="mt-2 rounded bg-amber-50 p-2 border border-amber-200">
              <span className="text-amber-600 font-semibold">⚠️ 图片边界分析</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                <span>图片实际宽度:</span><span className="font-bold">{info.width}px</span>
                <span>max-width限制:</span><span className="font-bold">{info.computedStyles.maxWidth || '无'}</span>
                <span>左边距:</span><span>{info.computedStyles.marginLeft}</span>
                <span>右边距:</span><span>{info.computedStyles.marginRight}</span>
                <span>左边框:</span><span>{info.computedStyles.borderLeftWidth}</span>
                <span>右边框:</span><span>{info.computedStyles.borderRightWidth}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {expanded && info.children.map((child, i) => (
        <ElementTree key={`${child.tagName}-${i}`} info={child} depth={depth + 1} />
      ))}
    </div>
  )
}

// 简单的 JSON 树形展示
function JsonTree({ data, depth = 0 }: { data: any; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2)

  if (data === null) return <span className="text-slate-400">null</span>
  if (data === undefined) return <span className="text-slate-400">undefined</span>
  if (typeof data === 'boolean') return <span className={data ? 'text-emerald-600' : 'text-red-500'}>{String(data)}</span>
  if (typeof data === 'number') return <span className="text-blue-600">{data}</span>
  if (typeof data === 'string') return <span className="text-amber-600">"{data}"</span>

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-slate-400">[]</span>
    return (
      <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          [{data.length} items]
        </button>
        {expanded && (
          <div>
            {data.map((item, i) => (
              <div key={i}>
                <span className="text-slate-400">{i}: </span>
                <JsonTree data={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data)
    if (entries.length === 0) return <span className="text-slate-400">{'{}'}</span>
    return (
      <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {'{'}...{'}'} ({entries.length} keys)
        </button>
        {expanded && (
          <div>
            {entries.map(([key, value]) => (
              <div key={key}>
                <span className="text-purple-600">{key}: </span>
                <JsonTree data={value} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return <span>{String(data)}</span>
}

// 主调试面板组件
export function ExportDebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'editor' | 'export' | 'elements' | 'logs'>('editor')
  const [history, setHistory] = useState<DebugInfo[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const [editorDebug, setEditorDebug] = useState<EditorDebugInfo | null>(null)
  const [elementTree, setElementTree] = useState<EditorElementInfo | null>(null)
  const [selectedImage, setSelectedImage] = useState<HTMLElement | null>(null)
  const [tableInsertLogs, setTableInsertLogs] = useState<TableInsertLog[]>([])
  const [allLogs, setAllLogs] = useState<string[]>([]) // 所有控制台日志

  // 捕获完整的编辑器快照
  const captureEditorSnapshot = useCallback(() => {
    const snapshot: any = {
      timestamp: new Date().toLocaleString(),
      editorDebug: editorDebug,
      tableInsertLogs: tableInsertLogs,
      allLogs: allLogs,
      elementTree: null,
      cssVariables: {},
      tableCssVariables: {},
      allCssVariables: {},
      computedStyles: {},
      tables: [],
    }

    if (typeof window === 'undefined') return snapshot

    const editorRoot = document.querySelector('#editor-root')
    if (editorRoot) {
      const extractElementInfo = (el: Element, depth: number): any => {
        if (depth > 3) return { tag: el.tagName.toLowerCase(), truncated: true }
        const computed = window.getComputedStyle(el as HTMLElement)
        const result: any = {
          tag: el.tagName.toLowerCase(),
          id: el.id || undefined,
          computed: {
            width: computed.width,
            height: computed.height,
            maxWidth: computed.maxWidth,
            display: computed.display,
          },
          children: [],
        }

        if (el.tagName === 'TABLE') {
          const rows = el.querySelectorAll('tr')
          result.tableInfo = { rows: rows.length }
          snapshot.tables.push(result)
        }

        Array.from(el.children).slice(0, 10).forEach((child: Element) => {
          result.children.push(extractElementInfo(child, depth + 1))
        })

        return result
      }

      snapshot.elementTree = extractElementInfo(editorRoot, 0)

      // 获取 .tpl-paper 元素的内联 CSS 变量（通过 style 属性设置）
      const paper = document.querySelector('.tpl-paper') as HTMLElement | null
      if (paper) {
        const allVars: Record<string, string> = {}
        const tableVars: Record<string, string> = {}
        const inlineStyle = paper.style
        for (const prop of inlineStyle) {
          const value = inlineStyle.getPropertyValue(prop)
          allVars[prop] = value
          if (prop.startsWith('--tpl-table')) {
            tableVars[prop] = value
          }
        }
        snapshot.cssVariables = allVars
        snapshot.tableCssVariables = tableVars
        snapshot.allCssVariables = allVars
        
        // 获取计算样式
        const computed = window.getComputedStyle(paper)
        snapshot.computedStyles['tpl-paper'] = {
          width: computed.width,
          maxWidth: computed.maxWidth,
        }
      }
    }

    return snapshot
  }, [editorDebug, tableInsertLogs, allLogs])

  // 扫描编辑器元素结构
  const scanEditorStructure = useCallback(() => {
    // 查找编辑器根元素 - editor-root 是整个编辑器的根元素
    const editorRoot = document.querySelector('#editor-root')
    const tiptapEditor = document.querySelector('.tiptap-editor')
    const editorContent = document.querySelector('.editor-document')

    // 优先使用 editor-root 作为扫描目标
    const target = (editorRoot || editorContent || tiptapEditor) as HTMLElement | null
    console.log('[Debug] 扫描结构目标:', {
      found: target ? {
        tagName: target.tagName.toLowerCase(),
        id: target.id || '(none)',
        className: target.className?.split(' ').slice(0, 3).join(' ') || '(none)',
        width: target.offsetWidth,
        height: target.offsetHeight,
      } : null,
      alternatives: {
        editorRoot: !!editorRoot,
        editorContent: !!editorContent,
        tiptapEditor: !!tiptapEditor,
      }
    })
    if (target) {
      const tree = analyzeElement(target)
      setElementTree(tree)

      // 打印 DOM 结构到控制台
      const printDOM = (el: Element, indent = 0): string => {
        const pad = '  '.repeat(indent)
        const tag = el.tagName.toLowerCase()
        const id = el.id ? `#${el.id}` : ''
        const cls = el.className && typeof el.className === 'string'
          ? '.' + el.className.split(' ').slice(0, 2).join('.')
          : ''
        const isImg = tag === 'img'
        const extra = isImg
          ? ` [wrap=${(el as HTMLElement).getAttribute('data-wrap-type')}, align=${(el as HTMLElement).getAttribute('data-img-align')}]`
          : ''
        let result = `${pad}${tag}${id}${cls}${extra}\n`
        for (const child of Array.from(el.children)) {
          result += printDOM(child, indent + 1)
        }
        return result
      }
      console.log('[Debug] DOM 结构:\n' + printDOM(target))
      console.log('[Debug] 目标元素样式:', {
        maxWidth: window.getComputedStyle(target).maxWidth,
        width: window.getComputedStyle(target).width,
      })

      // 查找所有图片
      const images = target.querySelectorAll('img[data-wrap-type]')
      console.log('[Debug] 扫描到图片:', images.length)
      images.forEach((img, i) => {
        const imgEl = img as HTMLElement
        const computed = window.getComputedStyle(imgEl)
        console.log(`[Debug] 图片${i + 1}:`, {
          wrapType: img.getAttribute('data-wrap-type'),
          imgAlign: img.getAttribute('data-img-align'),
          borderWidth: img.getAttribute('data-border-width'),
          showBorder: img.getAttribute('data-show-border'),
          marginTopCm: img.getAttribute('data-margin-top-cm'),
          marginBottomCm: img.getAttribute('data-margin-bottom-cm'),
          marginLeftCm: img.getAttribute('data-margin-left-cm'),
          marginRightCm: img.getAttribute('data-margin-right-cm'),
          offsetSize: `${imgEl.offsetWidth}×${imgEl.offsetHeight}`,
          computedStyle: {
            border: computed.border,
            marginTop: computed.marginTop,
            marginBottom: computed.marginBottom,
            marginLeft: computed.marginLeft,
            marginRight: computed.marginRight,
            position: computed.position,
            zIndex: computed.zIndex,
          }
        })
      })

      // 查找所有表格并打印详细样式信息
      const tables = target.querySelectorAll('table')
      console.log('[Debug] 扫描到表格:', tables.length)
      tables.forEach((table, i) => {
        const tableEl = table as HTMLElement
        const computed = window.getComputedStyle(tableEl)
        
        // 查找表头和数据行单元格
        const headers = tableEl.querySelectorAll('th')
        const cells = tableEl.querySelectorAll('td')
        
        // 获取 tpl-paper 容器的 CSS 变量
        const tplPaper = tableEl.closest('.tpl-paper') as HTMLElement | null
        const tplVars: Record<string, string> = {}
        if (tplPaper) {
          const paperStyle = tplPaper.style
          for (const prop of paperStyle) {
            if (prop.startsWith('--tpl-table')) {
              tplVars[prop] = paperStyle.getPropertyValue(prop)
            }
          }
        }
        
        console.log(`[Debug] === 表格${i + 1} 详情 ===`)
        console.log(`[Debug] 表格基础样式:`, {
          width: computed.width,
          maxWidth: computed.maxWidth,
          marginLeft: computed.marginLeft,
          marginRight: computed.marginRight,
          borderCollapse: computed.borderCollapse,
        })
        
        // 表头单元格样式
        if (headers.length > 0) {
          const headerComputed = window.getComputedStyle(headers[0] as HTMLElement)
          console.log(`[Debug] 表头单元格[0]样式:`, {
            fontWeight: headerComputed.fontWeight,
            fontFamily: headerComputed.fontFamily,
            fontSize: headerComputed.fontSize,
            color: headerComputed.color,
            fontStyle: headerComputed.fontStyle,
            textDecoration: headerComputed.textDecoration,
            backgroundColor: headerComputed.backgroundColor,
          })
          
          // 表头内段落样式
          const headerP = headers[0].querySelector('p')
          if (headerP) {
            const headerPComputed = window.getComputedStyle(headerP)
            console.log(`[Debug] 表头段落样式:`, {
              fontWeight: headerPComputed.fontWeight,
              fontFamily: headerPComputed.fontFamily,
              fontSize: headerPComputed.fontSize,
              color: headerPComputed.color,
            })
          }
        }
        
        // 数据行单元格样式
        if (cells.length > 0) {
          const cellComputed = window.getComputedStyle(cells[0] as HTMLElement)
          console.log(`[Debug] 数据行单元格[0]样式:`, {
            fontWeight: cellComputed.fontWeight,
            fontFamily: cellComputed.fontFamily,
            fontSize: cellComputed.fontSize,
            color: cellComputed.color,
            fontStyle: cellComputed.fontStyle,
            textDecoration: cellComputed.textDecoration,
            backgroundColor: cellComputed.backgroundColor,
            textAlign: cellComputed.textAlign,
            verticalAlign: cellComputed.verticalAlign,
          })
          
          // 数据行内段落样式
          const cellP = cells[0].querySelector('p')
          if (cellP) {
            const cellPComputed = window.getComputedStyle(cellP)
            console.log(`[Debug] 数据行段落样式:`, {
              fontWeight: cellPComputed.fontWeight,
              fontFamily: cellPComputed.fontFamily,
              fontSize: cellPComputed.fontSize,
              color: cellPComputed.color,
              fontStyle: cellPComputed.fontStyle,
              textDecoration: cellPComputed.textDecoration,
            })
          }
        }
        
        // CSS 变量
        console.log(`[Debug] tpl-paper CSS 变量 (表格相关):`, tplVars)
        
        // 表格 DOM 属性
        console.log(`[Debug] 表格 DOM 属性:`, {
          tableAlign: tableEl.getAttribute('data-table-align'),
          tableWidth: tableEl.getAttribute('data-table-width'),
          borderColor: tableEl.getAttribute('data-border-color'),
          borderWidthPt: tableEl.getAttribute('data-border-width-pt'),
          cellPadTop: tableEl.getAttribute('data-cell-pad-top'),
          cellPadBottom: tableEl.getAttribute('data-cell-pad-bottom'),
          cellPadLeft: tableEl.getAttribute('data-cell-pad-left'),
          cellPadRight: tableEl.getAttribute('data-cell-pad-right'),
          headerBg: tableEl.getAttribute('data-header-bg'),
          headerBold: tableEl.getAttribute('data-header-bold'),
          dataRowBg: tableEl.getAttribute('data-row-bg'),
          dataRowBold: tableEl.getAttribute('data-row-bold'),
        })
      })
      
      // 打印 .tpl-paper 容器的所有 CSS 变量
      const tplPaper2 = target.closest('.tpl-paper') as HTMLElement | null
      if (tplPaper2) {
        const allVars: Record<string, string> = {}
        const paperStyle = tplPaper2.style
        for (const prop of paperStyle) {
          allVars[prop] = paperStyle.getPropertyValue(prop)
        }
        console.log('[Debug] .tpl-paper 所有 CSS 变量:', allVars)
      }
      
    } else {
      console.log('[Debug] 未找到编辑器元素')
    }
  }, [])

  // 点击选中图片
  const handleImageClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'IMG') {
      setSelectedImage(target)

      // 获取父容器链信息
      const parentChain: any[] = []
      let parent = target.parentElement
      let depth = 0
      const maxDepth = 5

      while (parent && depth < maxDepth) {
        const computed = window.getComputedStyle(parent)
        parentChain.push({
          depth,
          tagName: parent.tagName.toLowerCase(),
          id: parent.id || undefined,
          className: parent.className ? parent.className.split(' ').filter(Boolean).slice(0, 3).join(' ') : undefined,
          offsetWidth: parent.offsetWidth,
          offsetHeight: parent.offsetHeight,
          clientWidth: parent.clientWidth,
          clientHeight: parent.clientHeight,
          scrollWidth: parent.scrollWidth,
          scrollHeight: parent.scrollHeight,
          styles: {
            width: computed.width,
            maxWidth: computed.maxWidth,
            paddingLeft: computed.paddingLeft,
            paddingRight: computed.paddingRight,
            marginLeft: computed.marginLeft,
            marginRight: computed.marginRight,
            borderLeftWidth: computed.borderLeftWidth,
            borderRightWidth: computed.borderRightWidth,
            boxSizing: computed.boxSizing,
            display: computed.display,
            position: computed.position,
            overflow: computed.overflow,
          }
        })
        parent = parent.parentElement
        depth++
      }

      const computed = window.getComputedStyle(target)
      console.log('[Debug] === 选中图片详情 ===')
      console.log('[Debug] 图片自身:', {
        src: (target as HTMLImageElement).src?.substring(0, 60) + '...',
        offsetWidth: target.offsetWidth,
        offsetHeight: target.offsetHeight,
        naturalWidth: (target as HTMLImageElement).naturalWidth,
        naturalHeight: (target as HTMLImageElement).naturalHeight,
        maxWidth: computed.maxWidth,
        computedWidth: computed.width,
        marginLeft: computed.marginLeft,
        marginRight: computed.marginRight,
        paddingLeft: computed.paddingLeft,
        paddingRight: computed.paddingRight,
        borderLeftWidth: computed.borderLeftWidth,
        borderRightWidth: computed.borderRightWidth,
      })
      console.log('[Debug] === 父容器链 ===')
      parentChain.forEach(p => {
        console.log(`[Debug] [L${p.depth}] ${p.tagName}${p.id ? '#' + p.id : ''}${p.className ? '.' + p.className : ''}`, {
          offsetSize: `${p.offsetWidth}×${p.offsetHeight}`,
          clientSize: `${p.clientWidth}×${p.clientHeight}`,
          scrollSize: `${p.scrollWidth}×${p.scrollHeight}`,
          boxSizing: p.styles.boxSizing,
          display: p.styles.display,
          maxWidth: p.styles.maxWidth,
          margin: `${p.styles.marginLeft}|${p.styles.marginRight}`,
          padding: `${p.styles.paddingLeft}|${p.styles.paddingRight}`,
          border: `${p.styles.borderLeftWidth}|${p.styles.borderRightWidth}`,
          overflow: p.styles.overflow,
        })
      })
      console.log('[Debug] === 边界计算 ===')
      console.log('[Debug] 父容器链边界 (可用于定位溢出):')
      let boundary = target
      parentChain.forEach((p, i) => {
        const parentEl = i === 0 ? target.parentElement : (i > 0 ? parentChain[i - 1] : null)
        if (parentEl) {
          const imgRect = boundary.getBoundingClientRect()
          const parentRect = parentEl.tagName === 'BODY'
            ? { left: 0, right: window.innerWidth }
            : parentEl.getBoundingClientRect()
          console.log(`[Debug]   图片右边界 vs ${p.tagName}: ${imgRect.right}px vs ${parentRect.right}px (溢出 ${(imgRect.right - parentRect.right).toFixed(1)}px)`)
        }
      })

      // 视口结构：从 editor-root 到 html
      console.log('[Debug] === 视口结构 (从 editor-root 到 html) ===')
      const viewportChain: any[] = []
      let editorRoot: HTMLElement | null = null
      let el: HTMLElement | null = target

      // 先找到 editor-root 或 tiptap-editor
      while (el && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
        const id = el.id || ''
        const className = el.className || ''
        if (id === 'editor-root' || className.includes('tiptap-editor') || className.includes('editor-document')) {
          editorRoot = el
          break
        }
        el = el.parentElement
      }

      // 从 editor-root 开始向上遍历到 html
      if (editorRoot) {
        let vp: HTMLElement | null = editorRoot as HTMLElement
        let vpDepth = 0
        while (vp && vpDepth < 10) {
          const computed = window.getComputedStyle(vp)
          const rect = vp.getBoundingClientRect()
          viewportChain.push({
            depth: vpDepth,
            tagName: vp.tagName.toLowerCase(),
            id: vp.id || undefined,
            className: vp.className ? vp.className.split(' ').filter(Boolean).slice(0, 2).join(' ') : undefined,
            rect: {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            },
            styles: {
              position: computed.position,
              top: computed.top,
              left: computed.left,
              width: computed.width,
              height: computed.height,
              overflow: computed.overflow,
              display: computed.display,
            }
          })
          vp = vp.parentElement
        }
      }

      viewportChain.forEach((v, i) => {
        console.log(`[Debug] [V${v.depth}] ${v.tagName}${v.id ? '#' + v.id : ''}${v.className ? '.' + v.className : ''}`, {
          rect: `top:${v.rect.top.toFixed(0)} left:${v.rect.left.toFixed(0)} size:${v.rect.width.toFixed(0)}×${v.rect.height.toFixed(0)}`,
          styles: `${v.styles.position || 'static'} top:${v.styles.top} left:${v.styles.left} overflow:${v.styles.overflow}`,
        })
      })

      // 视口信息
      console.log('[Debug] 视口信息:', {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollY: window.scrollY,
        editorRootTop: editorRoot?.getBoundingClientRect().top,
      })
    }
  }, [])

  // 注册/取消图片点击监听
  useEffect(() => {
    if (isOpen && activeTab === 'elements') {
      // 添加点击监听
      document.addEventListener('click', handleImageClick, true)
      // 立即扫描
      scanEditorStructure()

      return () => {
        document.removeEventListener('click', handleImageClick, true)
      }
    }
  }, [isOpen, activeTab, handleImageClick, scanEditorStructure])

  // 监听编辑器配置变化
  useEditorDebug((info) => {
    setEditorDebug(info)
  })

  // 监听控制台日志
  useEffect(() => {
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn

    const captureLog = (type: 'log' | 'error' | 'warn', args: any[]) => {
      const timestamp = new Date().toLocaleTimeString()
      let logText = ''

      try {
        logText = args.map(arg => {
          if (typeof arg === 'string') return arg
          if (arg === null) return 'null'
          if (arg === undefined) return 'undefined'
          return JSON.stringify(arg, null, 2)
        }).join(' ')

        const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${logText}`
        setAllLogs(prev => [...prev.slice(-499), logEntry]) // 保留最近500条

        // 同时处理特定类型的日志
        const firstArg = args[0]
        if (typeof firstArg === 'string') {
          if (firstArg.includes('[insertTable]')) {
            // 表格插入日志 - 更完善的捕获
            try {
              const tableData = args[1]
              const currentState = useEditorStore.getState()
              const previewConfig = currentState.getPreviewTemplateConfig()
              
              // 获取配置来源
              const configSource = currentState.draftTemplateConfig 
                ? 'draftTemplateConfig' 
                : currentState.templateBinding 
                  ? 'templateBinding' 
                  : currentState.currentTemplate 
                    ? 'currentTemplate' 
                    : 'default'
              
              const tableNumbering = previewConfig?.tableStyles?.tableNumbering
              
              // 创建更完整的日志记录
              const enhancedLog = {
                timestamp,
                tableNumber: tableData?.tableNumber ?? tableData?.newTableNumber ?? 1,
                tableNumberingEnabled: tableNumbering?.enabled ?? false,
                tableNumberingConfig: tableNumbering ?? null,
                prefix: tableNumbering?.prefix ?? '表 ',
                suffix: tableNumbering?.suffix ?? '  ',
                rows: tableData?.rows ?? 0,
                cols: tableData?.cols ?? 0,
                tableStyles: previewConfig?.tableStyles ?? null,
                configSource,
                configSnapshot: previewConfig ? {
                  hasTableStyles: !!previewConfig.tableStyles,
                  tableStylesKeys: previewConfig.tableStyles ? Object.keys(previewConfig.tableStyles) : [],
                  hasTableNumbering: !!previewConfig.tableStyles?.tableNumbering,
                } : null,
              }

              setTableInsertLogs(prev => [...prev.slice(-19), enhancedLog])
              
              // 同时记录到 allLogs 用于完整快照
              console.log('[DebugPanel] 捕获表格插入日志:', enhancedLog)
            } catch (e) {
              console.error('[DebugPanel] 捕获表格插入日志失败:', e)
            }
          }

          if (firstArg.includes('[useExport]')) {
            // 导出日志
            try {
              const debugInfo: DebugInfo = {
                timestamp,
                config: {},
                requestPayload: args[1],
              }
              const data = args[1]
              if (data) {
                debugInfo.config = {
                  imageStyles: data.imageStyles_preview || data.imageStyles_binding,
                  headingStyles: data.fullPreviewConfig?.headingStyles,
                  layout: data.fullPreviewConfig?.layout,
                  tableStyles: data.fullPreviewConfig?.tableStyles,
                }
                debugInfo.binding = data.fullBindingSnapshot ? {
                  templateId: data.templateId,
                  configSnapshot: data.fullBindingSnapshot,
                } : undefined
              }
              setHistory(prev => [debugInfo, ...prev.slice(0, 9)])
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

    console.log = (...args: any[]) => {
      originalLog.apply(console, args)
      captureLog('log', args)
    }
    console.error = (...args: any[]) => {
      originalError.apply(console, args)
      captureLog('error', args)
    }
    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args)
      captureLog('warn', args)
    }

    return () => {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
    }
  }, [])

  const current = history[selectedIndex]

  const copyToClipboard = () => {
    if (activeTab === 'editor' && editorDebug) {
      navigator.clipboard.writeText(JSON.stringify(editorDebug, null, 2))
    } else if (activeTab === 'elements' && elementTree) {
      const extractInfo = (info: EditorElementInfo): any => ({
        tagName: info.tagName,
        className: info.className,
        id: info.id,
        width: info.width,
        height: info.height,
        computedStyles: info.computedStyles,
        children: info.children.map(extractInfo),
      })
      navigator.clipboard.writeText(JSON.stringify(extractInfo(elementTree), null, 2))
    } else if (activeTab === 'export' && current) {
      navigator.clipboard.writeText(JSON.stringify(current, null, 2))
    } else if (activeTab === 'logs') {
      const snapshot = captureEditorSnapshot()
      const cssVars = snapshot.cssVariables && Object.keys(snapshot.cssVariables).length > 0
        ? Object.entries(snapshot.cssVariables).map(([k, v]) => k + ': ' + v).join('\n')
        : '无'
      const tableCssVars = snapshot.tableCssVariables && Object.keys(snapshot.tableCssVariables).length > 0
        ? Object.entries(snapshot.tableCssVariables).map(([k, v]) => k + ': ' + v).join('\n')
        : '无'
      const tablesInfo = snapshot.tables.length > 0
        ? snapshot.tables.map((t: any, i: number) => '表' + (i + 1) + ': ' + t.tableInfo.rows + '行').join('\n')
        : '无'
      const text = [
        '=== 完整调试快照 ===',
        '生成时间: ' + new Date().toLocaleString(),
        '',
        '--- 表格插入日志 ---',
        ...tableInsertLogs.map(log => JSON.stringify(log, null, 2)),
        '',
        '--- 编辑器配置 ---',
        editorDebug ? JSON.stringify(editorDebug, null, 2) : '无',
        '',
        '--- CSS 变量 (所有内联变量) ---',
        cssVars,
        '',
        '--- 表格相关 CSS 变量 (--tpl-table-*) ---',
        tableCssVars,
        '',
        '--- 关键元素计算样式 ---',
        JSON.stringify(snapshot.computedStyles, null, 2),
        '',
        '--- 编辑器 DOM 结构 ---',
        JSON.stringify(snapshot.elementTree, null, 2),
        '',
        '--- 表格详情 ---',
        tablesInfo,
        '',
        '--- 所有控制台日志 ---',
        ...allLogs,
      ].join('\n')
      navigator.clipboard.writeText(text)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs text-white shadow-lg hover:bg-slate-700"
      >
        <span className="font-mono">🐛</span>
        <span>调试面板</span>
        {history.length > 0 && (
          <span className="rounded-full bg-red-500 px-1.5 text-[10px]">{history.length}</span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[500px] rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
      {/* 标题栏 */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono">🐛</span>
          <h3 className="text-sm font-semibold text-slate-800">调试面板</h3>
          {history.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-500">
              {history.length} 条导出记录
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            disabled={activeTab === 'editor' ? !editorDebug : !current}
            className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 disabled:opacity-50"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? '已复制' : '复制'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'editor'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Monitor className="h-3.5 w-3.5" />
          编辑器配置
          {editorDebug?.imageStyles && (
            <span className="rounded-full bg-green-100 px-1.5 text-[10px] text-green-700">live</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'elements'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Box className="h-3.5 w-3.5" />
          元素结构
          {elementTree && (
            <span className="rounded-full bg-purple-100 px-1.5 text-[10px] text-purple-700">
              {elementTree.children.filter(c => c.tagName === 'img').length || 0} 图
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'export'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          导出调试
          {history.length > 0 && (
            <span className="rounded-full bg-slate-100 px-1.5 text-[10px]">{history.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'logs'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Terminal className="h-3.5 w-3.5" />
          日志
          {allLogs.length > 0 && (
            <span className="rounded-full bg-green-100 px-1.5 text-[10px] text-green-700">{allLogs.length}</span>
          )}
        </button>
      </div>

      {/* 内容区 */}
      <div className="max-h-[500px] overflow-y-auto p-4">
        {activeTab === 'editor' ? (
          // 编辑器配置 Tab
          editorDebug ? (
            <div className="space-y-4">
              {/* 状态指示 */}
              <div className="flex items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 ${editorDebug.templatePanelOpen ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                  {editorDebug.templatePanelOpen ? '模板面板已打开 (draft)' : '使用绑定模板'}
                </span>
              </div>

              {/* 图片样式 - 重点显示 */}
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">图片样式</span>
                  <span className="font-normal text-slate-400">
                    {editorDebug.imageStyles ? '✓ 有配置' : '✗ 无配置'}
                  </span>
                  {editorDebug.imageStyles?.position?.wrapType && (
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-purple-700">
                      wrapType: {editorDebug.imageStyles.position.wrapType}
                    </span>
                  )}
                  {editorDebug.imageStyles?.position?.horizontalAlign && (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">
                      align: {editorDebug.imageStyles.position.horizontalAlign}
                    </span>
                  )}
                </h4>
                <div className="rounded-lg bg-slate-50 p-3 font-mono text-xs">
                  <JsonTree data={editorDebug.imageStyles} />
                </div>
              </div>

              {/* 标题样式 */}
              <details className="group" open>
                <summary className="cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900">
                  标题样式 {editorDebug.headingStyles ? '' : '(无)'}
                </summary>
                <div className="mt-2 rounded-lg bg-slate-50 p-3 font-mono text-xs">
                  <JsonTree data={editorDebug.headingStyles} />
                </div>
              </details>

              {/* 段落样式 */}
              <details className="group">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900">
                  段落样式 {editorDebug.paragraphStyles ? '' : '(无)'}
                </summary>
                <div className="mt-2 rounded-lg bg-slate-50 p-3 font-mono text-xs">
                  <JsonTree data={editorDebug.paragraphStyles} />
                </div>
              </details>

              {/* 页面布局 */}
              <details className="group">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900">
                  页面布局 {editorDebug.layout ? '' : '(无)'}
                </summary>
                <div className="mt-2 rounded-lg bg-slate-50 p-3 font-mono text-xs">
                  <JsonTree data={editorDebug.layout} />
                </div>
              </details>

              {/* 表格样式 */}
              <details className="group">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900">
                  表格样式 {editorDebug.tableStyles ? '' : '(无)'}
                </summary>
                <div className="mt-2 rounded-lg bg-slate-50 p-3 font-mono text-xs">
                  <JsonTree data={editorDebug.tableStyles} />
                </div>
              </details>

              {/* 完整预览配置 */}
              <details className="group">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900">
                  完整预览配置 (点击展开)
                </summary>
                <div className="mt-2 rounded-lg bg-slate-900 p-3 font-mono text-xs text-green-400">
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(editorDebug.previewConfig, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">
              暂无编辑器配置信息
            </div>
          )
        ) : activeTab === 'elements' ? (
          // 元素结构 Tab
          <div className="space-y-4">
            {/* 操作提示 */}
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
              <p className="font-semibold flex items-center gap-1">
                <Info className="h-3 w-3" />
                使用说明
              </p>
              <ul className="mt-1 space-y-1 text-blue-600">
                <li>• 点击"刷新结构"扫描编辑器 DOM</li>
                <li>• 点击图片可查看详细信息</li>
                <li>• 控制台会输出详细日志</li>
              </ul>
            </div>

            {/* 刷新按钮 */}
            <button
              onClick={scanEditorStructure}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-xs text-slate-700 hover:bg-slate-200"
            >
              <Ruler className="h-3.5 w-3.5" />
              刷新结构
            </button>

            {/* 选中图片信息 */}
            {selectedImage && (
              <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-700">
                  <ImageIcon className="h-3.5 w-3.5" />
                  选中的图片
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="ml-auto text-amber-500 hover:text-amber-700"
                  >
                    清除
                  </button>
                </h4>

                {/* 图片自身信息 */}
                <div className="mb-3 text-xs font-semibold text-slate-600">图片自身</div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="rounded bg-white p-2">
                    <span className="text-slate-500">offsetWidth:</span>
                    <span className="ml-1 font-bold">{selectedImage.offsetWidth}px</span>
                  </div>
                  <div className="rounded bg-white p-2">
                    <span className="text-slate-500">offsetHeight:</span>
                    <span className="ml-1 font-bold">{selectedImage.offsetHeight}px</span>
                  </div>
                  <div className="rounded bg-white p-2">
                    <span className="text-slate-500">naturalWidth:</span>
                    <span className="ml-1">{(selectedImage as HTMLImageElement).naturalWidth}px</span>
                  </div>
                  <div className="rounded bg-white p-2">
                    <span className="text-slate-500">naturalHeight:</span>
                    <span className="ml-1">{(selectedImage as HTMLImageElement).naturalHeight}px</span>
                  </div>
                  <div className="col-span-2 rounded bg-white p-2">
                    <span className="text-slate-500">max-width:</span>
                    <span className="ml-1">{window.getComputedStyle(selectedImage).maxWidth}</span>
                  </div>
                  <div className="rounded bg-white p-2">
                    <span className="text-slate-500">margin-left:</span>
                    <span className="ml-1">{window.getComputedStyle(selectedImage).marginLeft}</span>
                  </div>
                  <div className="rounded bg-white p-2">
                    <span className="text-slate-500">margin-right:</span>
                    <span className="ml-1">{window.getComputedStyle(selectedImage).marginRight}</span>
                  </div>
                  <div className="col-span-2 rounded bg-white p-2">
                    <span className="text-slate-500">data-wrap-type:</span>
                    <span className="ml-1 text-purple-600">{selectedImage.getAttribute('data-wrap-type') || '无'}</span>
                  </div>
                  <div className="col-span-2 rounded bg-white p-2">
                    <span className="text-slate-500">data-img-align:</span>
                    <span className="ml-1 text-purple-600">{selectedImage.getAttribute('data-img-align') || '无'}</span>
                  </div>
                </div>

                {/* 父容器链 */}
                <div className="mt-4 mb-2 text-xs font-semibold text-slate-600 flex items-center gap-2">
                  <span>父容器链</span>
                  <span className="text-slate-400 font-normal">(从内到外)</span>
                </div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {((): JSX.Element[] => {
                    const chain: JSX.Element[] = []
                    let parent = selectedImage.parentElement
                    let depth = 0
                    while (parent && depth < 5) {
                      const computed = window.getComputedStyle(parent)
                      const imgRect = selectedImage.getBoundingClientRect()
                      const parentRect = parent.getBoundingClientRect()
                      const overflow = imgRect.right - parentRect.right
                      chain.push(
                        <div key={depth} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="rounded bg-slate-200 px-1 text-[10px]">L{depth}</span>
                            <span className="font-semibold text-slate-700">
                              {parent.tagName.toLowerCase()}
                            </span>
                            {parent.id && <span className="text-purple-500">#{parent.id}</span>}
                            {parent.className && (
                              <span className="text-slate-400 truncate max-w-[100px]">
                                .{parent.className.split(' ').filter(Boolean)[0]}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-[10px]">
                            <div>
                              <span className="text-slate-400">尺寸:</span>
                              <span className="ml-1">{parent.offsetWidth}×{parent.offsetHeight}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">box-sizing:</span>
                              <span className="ml-1">{computed.boxSizing}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">maxWidth:</span>
                              <span className="ml-1">{computed.maxWidth || '无'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">overflow:</span>
                              <span className="ml-1">{computed.overflow || 'visible'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">padding:</span>
                              <span className="ml-1">L:{computed.paddingLeft} R:{computed.paddingRight}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">border:</span>
                              <span className="ml-1">L:{computed.borderLeftWidth} R:{computed.borderRightWidth}</span>
                            </div>
                            <div className="col-span-2 mt-1">
                              <span className={`font-semibold ${overflow > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {overflow > 0 ? `⚠️ 溢出 ${overflow.toFixed(1)}px` : '✓ 正常'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                      parent = parent.parentElement
                      depth++
                    }
                    return chain
                  })()}
                </div>
              </div>
            )}

            {/* 视口结构：从 editor-root 到 html */}
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Monitor className="h-3.5 w-3.5" />
                视口结构
                <span className="ml-auto text-slate-400 font-normal text-[10px]">
                  从 editor-root 到 html
                </span>
              </h4>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {((): JSX.Element[] => {
                  const chain: JSX.Element[] = []

                  // 从图片开始向上查找 editor-root
                  let el: HTMLElement | null = selectedImage
                  while (el && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
                    const id = el.id || ''
                    const className = el.className || ''
                    if (id === 'editor-root' || className.includes('tiptap-editor') || className.includes('editor-document')) {
                      // 从这里开始向上遍历到 html
                      let vp: HTMLElement | null = el as HTMLElement
                      let vpDepth = 0
                      while (vp && vpDepth < 10) {
                        const computed = window.getComputedStyle(vp)
                        const rect = vp.getBoundingClientRect()
                        const isFixed = computed.position === 'fixed'
                        chain.push(
                          <div key={`vp-${vpDepth}`} className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="rounded bg-blue-100 px-1 text-[10px] text-blue-600">V{vpDepth}</span>
                              <span className="font-semibold text-slate-700">
                                {vp.tagName.toLowerCase()}
                              </span>
                              {vp.id && <span className="text-purple-500">#{vp.id}</span>}
                              {vp.className && (
                                <span className="text-slate-400 truncate max-w-[100px]">
                                  .{vp.className.split(' ').filter(Boolean)[0]}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-[10px]">
                              <div>
                                <span className="text-slate-400">rect:</span>
                                <span className="ml-1">{rect.top.toFixed(0)},{rect.left.toFixed(0)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">size:</span>
                                <span className="ml-1">{rect.width.toFixed(0)}×{rect.height.toFixed(0)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">position:</span>
                                <span className={`ml-1 ${computed.position !== 'static' ? 'text-blue-600 font-semibold' : ''}`}>
                                  {computed.position || 'static'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">top/left:</span>
                                <span className="ml-1">{computed.top}/{computed.left}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">overflow:</span>
                                <span className={`ml-1 ${computed.overflow !== 'visible' ? 'text-amber-600' : ''}`}>
                                  {computed.overflow || 'visible'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">scrollY:</span>
                                <span className="ml-1">{isFixed ? 'N/A' : window.scrollY + 'px'}</span>
                              </div>
                            </div>
                          </div>
                        )
                        vp = vp.parentElement
                        vpDepth++
                      }
                      break
                    }
                    el = el.parentElement
                  }
                  return chain.length > 0 ? chain : [
                    <div key="not-found" className="text-center text-sm text-slate-400 py-4">
                      未找到 editor-root
                    </div>
                  ]
                })()}
              </div>
              {/* 视口信息 */}
              <div className="mt-2 rounded bg-slate-100 p-2 text-xs">
                <div className="flex gap-4">
                  <div>
                    <span className="text-slate-400">视口:</span>
                    <span className="ml-1 font-mono">{window.innerWidth}×{window.innerHeight}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">滚动:</span>
                    <span className="ml-1 font-mono">{window.scrollY}px</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 元素树 */}
            {elementTree ? (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Box className="h-3.5 w-3.5" />
                  编辑器 DOM 结构
                  <span className="ml-auto text-slate-400 font-normal">
                    {elementTree.width}×{elementTree.height}
                  </span>
                </h4>
                <div className="max-h-[300px] overflow-y-auto font-mono text-xs">
                  <ElementTree info={elementTree} />
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-slate-400">
                点击"刷新结构"扫描编辑器
              </div>
            )}
          </div>
        ) : activeTab === 'export' ? (
          // 导出调试 Tab
          current ? (
            <div className="space-y-4">
              {/* 历史记录列表 */}
              {history.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {history.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedIndex(i)}
                      className={`rounded-md px-2 py-1 text-xs ${
                        selectedIndex === i
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      #{i + 1} {item.timestamp}
                    </button>
                  ))}
                </div>
              )}

              {/* 图片样式 */}
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">图片样式</span>
                  <span className="font-normal text-slate-400">
                    {current.config.imageStyles ? '✓ 有配置' : '✗ 无配置'}
                  </span>
                </h4>
                <div className="rounded-lg bg-slate-50 p-3 font-mono text-xs">
                  <JsonTree data={current.config.imageStyles} />
                </div>
              </div>

              {/* 其他样式（可折叠） */}
              <details className="group">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900">
                  其他配置 ({current.config.headingStyles ? 'headingStyles' : ''} {current.config.layout ? 'layout' : ''})
                </summary>
                <div className="mt-2 space-y-2">
                  {current.config.headingStyles && (
                    <div>
                      <p className="text-xs text-slate-500">标题样式</p>
                      <div className="rounded-lg bg-slate-50 p-3 font-mono text-xs">
                        <JsonTree data={current.config.headingStyles} />
                      </div>
                    </div>
                  )}
                  {current.config.layout && (
                    <div>
                      <p className="text-xs text-slate-500">页面布局</p>
                      <div className="rounded-lg bg-slate-50 p-3 font-mono text-xs">
                        <JsonTree data={current.config.layout} />
                      </div>
                    </div>
                  )}
                </div>
              </details>

              {/* 完整请求 Payload */}
              <details className="group">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900">
                  完整请求 Payload (点击展开)
                </summary>
                <div className="mt-2 rounded-lg bg-slate-900 p-3 font-mono text-xs text-green-400">
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(current.requestPayload, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">
              暂无导出记录
              <br />
              <span className="text-xs">执行导出操作后会显示调试信息</span>
            </div>
          )
        ) : activeTab === 'logs' ? (
          // 日志 Tab
          <div className="space-y-4">
            {/* 操作按钮 */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const snapshot = captureEditorSnapshot()
                  const allText = [
                    '=== 完整调试快照 ===',
                    `生成时间: ${new Date().toLocaleString()}`,
                    '',
                    '--- 表格插入日志 ---',
                    ...tableInsertLogs.map(log => JSON.stringify(log, null, 2)),
                    '',
                    '--- 编辑器配置 (store 状态) ---',
                    editorDebug ? JSON.stringify(editorDebug, null, 2) : '无',
                    '',
                    '--- CSS 变量 (生效的 CSS 自定义属性) ---',
                    snapshot.cssVariables && Object.keys(snapshot.cssVariables).length > 0
                      ? Object.entries(snapshot.cssVariables).map(([k, v]) => `${k}: ${v}`).join('\n')
                      : '无',
                    '',
                    '--- 表格相关 CSS 变量 (--tpl-table-*) ---',
                    snapshot.tableCssVariables && Object.keys(snapshot.tableCssVariables).length > 0
                      ? Object.entries(snapshot.tableCssVariables).map(([k, v]) => `${k}: ${v}`).join('\n')
                      : '无',
                    '',
                    '--- 所有 CSS 变量 ---',
                    snapshot.allCssVariables && Object.keys(snapshot.allCssVariables).length > 0
                      ? Object.keys(snapshot.allCssVariables).length + ' 个变量'
                      : '无',
                    '',
                    '--- 关键元素计算样式 ---',
                    JSON.stringify(snapshot.computedStyles, null, 2),
                    '',
                    '--- 编辑器 DOM 结构 ---',
                    JSON.stringify(snapshot.elementTree, null, 2),
                    '',
                    '--- 表格详情 ---',
                    snapshot.tables.length > 0
                      ? snapshot.tables.map((t: any, i: number) => `表${i + 1}: ${t.tableInfo.rows}行 ${t.tableInfo.cells}列`).join('\n')
                      : '无',
                    '',
                    '--- 所有控制台日志 ---',
                    ...allLogs,
                  ].join('\n')
                  navigator.clipboard.writeText(allText)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-xs text-white hover:bg-blue-600"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? '已复制全部日志' : '一键复制完整快照'}
              </button>
              <button
                onClick={() => setAllLogs([])}
                className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 hover:bg-slate-200"
              >
                清空
              </button>
            </div>

            {/* 表格插入日志 */}
            {tableInsertLogs.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">表格插入</span>
                  <span className="font-normal text-slate-400">({tableInsertLogs.length} 条)</span>
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {tableInsertLogs.map((log, i) => (
                    <div key={i} className="rounded-lg bg-slate-900 p-3 font-mono text-xs text-green-400">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-slate-500">#{i + 1}</span>
                        <span className="text-slate-400">{log.timestamp}</span>
                        {log.tableNumberingEnabled ? (
                          <span className="rounded bg-green-900 px-1 text-green-300">编号启用</span>
                        ) : (
                          <span className="rounded bg-red-900 px-1 text-red-300">编号禁用</span>
                        )}
                      </div>
                      <pre className="whitespace-pre-wrap">{JSON.stringify(log, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 实时日志流 */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="rounded bg-slate-100 px-1.5 py-0.5">控制台日志</span>
                <span className="font-normal text-slate-400">({allLogs.length} 条，保留最近500条)</span>
              </h4>
              <div className="rounded-lg bg-[#1e1e1e] p-3 font-mono text-xs text-green-400 max-h-[300px] overflow-y-auto">
                {allLogs.length === 0 ? (
                  <div className="text-slate-500">暂无日志，执行操作后会显示</div>
                ) : (
                  allLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`whitespace-pre-wrap ${
                        log.includes('[ERROR]') ? 'text-red-400' :
                        log.includes('[WARN]') ? 'text-yellow-400' :
                        'text-green-400'
                      }`}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-slate-400">
            无内容
          </div>
        )}
      </div>
    </div>
  )
}

export default ExportDebugPanel
