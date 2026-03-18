declare module 'mammoth' {
  interface RawTextResult {
    value: string
  }

  interface HtmlResult {
    value: string
  }

  interface ConvertOptions {
    arrayBuffer: ArrayBuffer
  }

  export function extractRawText(options: ConvertOptions): Promise<RawTextResult>
  export function convertToHtml(options: ConvertOptions): Promise<HtmlResult>

  export default {
    extractRawText,
    convertToHtml,
  }
}
