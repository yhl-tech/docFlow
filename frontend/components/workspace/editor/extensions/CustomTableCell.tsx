import { TableCell } from '@tiptap/extension-table'

/**
 * 自定义 TableCell 扩展
 * 继承官方 TableCell，保留 colspan/rowspan/colwidth 的完整支持。
 * 视觉样式（边框、padding、背景色、字体）全部由 CSS 变量（_template.css）控制，
 * 不输出内联 style，避免与 !important CSS 规则冲突。
 */
const CustomTableCell = TableCell.extend({
  name: 'tableCell',
})

export default CustomTableCell
