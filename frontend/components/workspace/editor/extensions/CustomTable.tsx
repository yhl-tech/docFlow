import { Table } from '@tiptap/extension-table'

export interface TableNodeAttributes {
  tableAlign: 'left' | 'center' | 'right'
  tableWidth: number
  borderColor: string
  borderWidthPt: number
  borderStyle: string
  shadingFill: string
  cellPadTop: number
  cellPadRight: number
  cellPadBottom: number
  cellPadLeft: number
  headerBg: string
  headerFontSizePt: number
  headerBold: boolean
  dataRowBg: string
  dataRowFontSizePt: number
  dataRowBold: boolean
}

/**
 * 自定义 Table 扩展
 * 存储完整的表格样式属性，支持同步更新
 */
const CustomTable = Table.extend({
  name: 'table',

  addAttributes() {
    return {
      ...this.parent?.(),
      tableAlign: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-table-align') || 'left',
        renderHTML: attributes => ({ 'data-table-align': attributes.tableAlign }),
      },
      tableWidth: {
        default: 100,
        parseHTML: element => parseFloat(element.getAttribute('data-table-width') || '100'),
        renderHTML: attributes => ({ 'data-table-width': String(attributes.tableWidth) }),
      },
      borderColor: {
        default: '#000000',
        parseHTML: element => element.getAttribute('data-border-color') || '#000000',
        renderHTML: attributes => ({ 'data-border-color': attributes.borderColor }),
      },
      borderWidthPt: {
        default: 0.5,
        parseHTML: element => parseFloat(element.getAttribute('data-border-width') || '0.5'),
        renderHTML: attributes => ({ 'data-border-width': String(attributes.borderWidthPt) }),
      },
      borderStyle: {
        default: 'solid',
        parseHTML: element => element.getAttribute('data-border-style') || 'solid',
        renderHTML: attributes => ({ 'data-border-style': attributes.borderStyle }),
      },
      shadingFill: {
        default: 'transparent',
        parseHTML: element => element.getAttribute('data-shading-fill') || 'transparent',
        renderHTML: attributes => ({ 'data-shading-fill': attributes.shadingFill }),
      },
      cellPadTop: {
        default: 0.14,
        parseHTML: element => parseFloat(element.getAttribute('data-cell-pad-top') || '0.14'),
        renderHTML: attributes => ({ 'data-cell-pad-top': String(attributes.cellPadTop) }),
      },
      cellPadRight: {
        default: 0,
        parseHTML: element => parseFloat(element.getAttribute('data-cell-pad-right') || '0'),
        renderHTML: attributes => ({ 'data-cell-pad-right': String(attributes.cellPadRight) }),
      },
      cellPadBottom: {
        default: 0.14,
        parseHTML: element => parseFloat(element.getAttribute('data-cell-pad-bottom') || '0.14'),
        renderHTML: attributes => ({ 'data-cell-pad-bottom': String(attributes.cellPadBottom) }),
      },
      cellPadLeft: {
        default: 0,
        parseHTML: element => parseFloat(element.getAttribute('data-cell-pad-left') || '0'),
        renderHTML: attributes => ({ 'data-cell-pad-left': String(attributes.cellPadLeft) }),
      },
      headerBg: {
        default: '#f0f0f0',
        parseHTML: element => element.getAttribute('data-header-bg') || '#f0f0f0',
        renderHTML: attributes => ({ 'data-header-bg': attributes.headerBg }),
      },
      headerFontSizePt: {
        default: 0,
        parseHTML: element => parseFloat(element.getAttribute('data-header-font-size') || '0'),
        renderHTML: attributes => ({ 'data-header-font-size': String(attributes.headerFontSizePt) }),
      },
      headerBold: {
        default: true,
        parseHTML: element => element.getAttribute('data-header-bold') !== 'false',
        renderHTML: attributes => ({ 'data-header-bold': String(attributes.headerBold) }),
      },
      dataRowBg: {
        default: 'transparent',
        parseHTML: element => element.getAttribute('data-datarow-bg') || 'transparent',
        renderHTML: attributes => ({ 'data-datarow-bg': attributes.dataRowBg }),
      },
      dataRowFontSizePt: {
        default: 0,
        parseHTML: element => parseFloat(element.getAttribute('data-datarow-font-size') || '0'),
        renderHTML: attributes => ({ 'data-datarow-font-size': String(attributes.dataRowFontSizePt) }),
      },
      dataRowBold: {
        default: false,
        parseHTML: element => element.getAttribute('data-datarow-bold') === 'true',
        renderHTML: attributes => ({ 'data-datarow-bold': String(attributes.dataRowBold) }),
      },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setTableAlign:
        (align: 'left' | 'center' | 'right') =>
        ({ commands }: { commands: any }) => {
          return commands.updateAttributes('table', { tableAlign: align })
        },
    }
  },

})

export default CustomTable
