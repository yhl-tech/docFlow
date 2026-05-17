import { create } from 'zustand'

export type NavPanelId = 'files' | 'templates'

export interface TemplateEditMeta {
  title: string
  isBuiltin: boolean
  isSaving: boolean
  onSave: () => void
}

interface WorkspaceNavState {
  activeNavId: NavPanelId
  panelOpen: boolean
  editingTemplateId: string | null   // 非 null 时全屏显示模板编辑页
  templateEditMeta: TemplateEditMeta | null
  setActiveNavId: (id: NavPanelId) => void
  setPanelOpen: (open: boolean) => void
  togglePanel: () => void
  openTemplateEditor: (templateId: string) => void
  closeTemplateEditor: () => void
  setTemplateEditMeta: (meta: TemplateEditMeta | null) => void
}

export const useWorkspaceNavStore = create<WorkspaceNavState>((set) => ({
  activeNavId: 'files',
  panelOpen: true,
  editingTemplateId: null,
  templateEditMeta: null,
  setActiveNavId: (activeNavId) => set({ activeNavId }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  openTemplateEditor: (templateId) => set({ editingTemplateId: templateId, templateEditMeta: null }),
  closeTemplateEditor: () => set({ editingTemplateId: null, templateEditMeta: null }),
  setTemplateEditMeta: (templateEditMeta) => set({ templateEditMeta }),
}))
