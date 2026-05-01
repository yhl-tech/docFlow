import { create } from "zustand"
import type { Editor } from "@tiptap/react"
import type {
  FontInfo,
  TemplateBinding,
  TemplateConfig,
  TemplateDefinition,
} from "@/types/editor-template"

import type { WordStyleRun } from "@/lib/api/editor"

export type ExportFormat = "docx" | "pdf" | "excel" | "image"
export type ExportStatus = "idle" | "loading" | "success" | "error"
export type UploadStatus = "idle" | "loading" | "success" | "error"

interface EditorState {
  // 编辑器内容
  content: string
  setContent: (content: string) => void
  currentDocumentId: string | null
  setCurrentDocumentId: (documentId: string | null) => void

  // 全屏编辑模式
  isFullscreen: boolean
  setFullscreen: (isFullscreen: boolean) => void
  toggleFullscreen: () => void

  // 导出状态
  exportStatus: ExportStatus
  exportMessage: string
  setExportStatus: (status: ExportStatus, message?: string) => void

  // 文件上传状态
  uploadStatus: UploadStatus
  uploadMessage: string
  setUploadStatus: (status: UploadStatus, message?: string) => void

  // 模板相关状态
  templates: TemplateDefinition[]
  availableFonts: FontInfo[]
  currentTemplate: TemplateDefinition | null
  templateBinding: TemplateBinding | null
  draftTemplateConfig: TemplateConfig | null
  templatePanelOpen: boolean
  setTemplates: (templates: TemplateDefinition[]) => void
  setAvailableFonts: (fonts: FontInfo[]) => void
  setCurrentTemplate: (template: TemplateDefinition | null) => void
  setTemplateBinding: (binding: TemplateBinding | null) => void
  setDraftTemplateConfig: (config: TemplateConfig | null) => void
  updateDraftStyle: (styleKey: string, patch: Record<string, unknown>) => void
  updateDraftLayout: (field: string, value: unknown) => void
  updateDraftRule: (field: string, value: unknown) => void
  openTemplatePanel: () => void
  closeTemplatePanel: () => void
  resetDraftFromCurrent: () => void
  applyDraftTemplate: () => void
  getPreviewTemplateConfig: () => TemplateConfig | null

  // 字数统计模式：含空格 / 不含空格
  countWithSpaces: boolean
  toggleCountMode: () => void

  // 待应用的 Word 文档样式（上传后由 API 返回，前端通过 WordStyleApplier 插件消费）
  pendingWordStyles: WordStyleRun[] | null
  setPendingWordStyles: (styles: WordStyleRun[] | null) => void

  // 清空内容（返回旧内容，供撤销用）
  clearContent: () => string

  // 编辑器实例引用（用于模板面板直接操作编辑器）
  editorInstance: Editor | null
  setEditorInstance: (editor: Editor | null) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  content: "",
  setContent: (content) => set({ content }),
  currentDocumentId: null,
  setCurrentDocumentId: (currentDocumentId) => set({ currentDocumentId }),

  isFullscreen: false,
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),

  exportStatus: "idle",
  exportMessage: "",
  setExportStatus: (exportStatus, exportMessage = "") => {
    set({ exportStatus, exportMessage })
    if (exportStatus === "success" || exportStatus === "error") {
      setTimeout(() => set({ exportStatus: "idle", exportMessage: "" }), 2000)
    }
  },

  uploadStatus: "idle",
  uploadMessage: "",
  setUploadStatus: (uploadStatus, uploadMessage = "") =>
    set({ uploadStatus, uploadMessage }),

  templates: [],
  availableFonts: [],
  currentTemplate: null,
  templateBinding: null,
  draftTemplateConfig: null,
  templatePanelOpen: false,
  setTemplates: (templates) => set({ templates }),
  setAvailableFonts: (availableFonts) => set({ availableFonts }),
  setCurrentTemplate: (currentTemplate) =>
    set({
      currentTemplate,
      draftTemplateConfig: currentTemplate
        ? structuredClone(currentTemplate.config)
        : null,
    }),
  setTemplateBinding: (templateBinding) => set({ templateBinding }),
  setDraftTemplateConfig: (draftTemplateConfig) => set({ draftTemplateConfig }),
  updateDraftStyle: (styleKey, patch) => {
    set((state) => {
      // 如果没有草稿配置，初始化一个基于当前模板或默认的配置
      let baseConfig = state.draftTemplateConfig
      if (!baseConfig) {
        baseConfig =
          state.templateBinding?.configSnapshot ??
          state.currentTemplate?.config ??
          null
      }
      if (!baseConfig) {
        return state
      }

      const newConfig = {
        ...structuredClone(baseConfig),
        styles: {
          ...structuredClone(baseConfig.styles),
          [styleKey]: {
            ...structuredClone(baseConfig.styles[styleKey]),
            ...patch,
          },
        },
      }

      // 如果已有 templateBinding，更新它
      if (state.templateBinding) {
        return {
          draftTemplateConfig: newConfig,
          templateBinding: {
            ...state.templateBinding,
            configSnapshot: newConfig,
          },
        }
      }

      // 如果没有 templateBinding 但有 currentTemplate，创建一个新的
      if (!state.templateBinding && state.currentTemplate) {
        return {
          draftTemplateConfig: newConfig,
          templateBinding: {
            id: state.currentTemplate.id,
            name: state.currentTemplate.name,
            configSnapshot: newConfig,
            appliedAt: new Date().toISOString(),
          },
        }
      }

      // 都不存在时只更新 draft
      return {
        draftTemplateConfig: newConfig,
      }
    })
  },
  updateDraftLayout: (field, value) =>
    set((state) => {
      if (!state.draftTemplateConfig) return state
      return {
        draftTemplateConfig: {
          ...state.draftTemplateConfig,
          layout: {
            ...state.draftTemplateConfig.layout,
            [field]: value,
          },
        },
      }
    }),
  updateDraftRule: (field, value) =>
    set((state) => {
      if (!state.draftTemplateConfig) return state
      return {
        draftTemplateConfig: {
          ...state.draftTemplateConfig,
          documentRules: {
            ...(state.draftTemplateConfig.documentRules ?? {}),
            [field]: value,
          },
        },
      }
    }),
  openTemplatePanel: () => {
    return set((state) => {
      return {
        templatePanelOpen: true,
        draftTemplateConfig: state.templateBinding?.configSnapshot
          ? structuredClone(state.templateBinding.configSnapshot)
          : state.currentTemplate
            ? structuredClone(state.currentTemplate.config)
            : null,
      }
    })
  },
  closeTemplatePanel: () => set({ templatePanelOpen: false }),
  resetDraftFromCurrent: () =>
    set((state) => ({
      draftTemplateConfig: state.currentTemplate
        ? structuredClone(state.currentTemplate.config)
        : state.templateBinding?.configSnapshot
          ? structuredClone(state.templateBinding.configSnapshot)
          : null,
    })),
  applyDraftTemplate: () =>
    set((state) => {
      if (!state.currentTemplate || !state.draftTemplateConfig) return state
      return {
        templateBinding: {
          templateId: state.currentTemplate.id,
          appliedAt: new Date().toISOString(),
          configSnapshot: structuredClone(state.draftTemplateConfig),
        },
        templatePanelOpen: false,
      }
    }),
  getPreviewTemplateConfig: () => {
    const state = get()
    // 优先使用模板面板中的草稿配置（即使面板已关闭，草稿仍保留）
    if (state.draftTemplateConfig) {
      return state.draftTemplateConfig
    }
    // 其次使用已应用的模板绑定快照
    const config =
      state.templateBinding?.configSnapshot ??
      state.currentTemplate?.config ??
      null
    if (config) return config

    // 默认模板配置（当没有绑定模板时使用）
    return {
      styles: {
        document_title: {
          label: "课题标题",
          role: "document_title",
          fontFamily: "SimHei",
          fontSizePt: 16,
          bold: true,
          align: "center",
        },
        body: {
          label: "正文",
          role: "body",
          fontFamily: "SimHei",
          fontSizePt: 16,
          bold: false,
          align: "left",
          lineHeight: 1.5,
          firstLineIndentChars: 2,
        },
        heading_1: {
          label: "一级标题",
          role: "heading_1",
          fontFamily: "SimHei",
          fontSizePt: 16,
          bold: true,
          align: "left",
        },
        heading_2: {
          label: "二级标题",
          role: "heading_2",
          fontFamily: "KaiTi_GB2312",
          fontSizePt: 16,
          bold: true,
          align: "left",
        },
        heading_3: {
          label: "三级标题",
          role: "heading_3",
          fontFamily: "FangSong_GB2312",
          fontSizePt: 16,
          bold: true,
          align: "left",
        },
        heading_4: {
          label: "四级标题",
          role: "heading_4",
          fontFamily: "FangSong_GB2312",
          fontSizePt: 16,
          bold: true,
          align: "left",
        },
        heading_5: {
          label: "五级标题",
          role: "heading_5",
          fontFamily: "FangSong_GB2312",
          fontSizePt: 16,
          bold: true,
          align: "left",
        },
      },
      layout: {
        paperSize: "A4",
        marginTopMm: 25,
        marginBottomMm: 25,
        marginLeftMm: 20,
        marginRightMm: 20,
        defaultLineHeight: 1.5,
        defaultParagraphSpacingBeforePt: 6,
        defaultParagraphSpacingAfterPt: 0,
        defaultFirstLineIndentChars: 2,
      },
      documentRules: { datePlacement: "none", signaturePlacement: "none" },
    }
  },

  countWithSpaces: true,
  toggleCountMode: () => set((s) => ({ countWithSpaces: !s.countWithSpaces })),

  pendingWordStyles: null,
  setPendingWordStyles: (pendingWordStyles) => set({ pendingWordStyles }),

  clearContent: () => {
    const prev = get().content
    set({ content: "" })
    return prev
  },

  editorInstance: null,
  setEditorInstance: (editorInstance) => set({ editorInstance }),
}))

// 派生计算：字符数、行数
export function getEditorStats(content: string, withSpaces: boolean) {
  const charCount = withSpaces
    ? content.length
    : content.replace(/\s/g, "").length
  const lineCount = content ? content.split("\n").length : 0
  return { charCount, lineCount }
}
