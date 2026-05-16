import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
})

// Mock document.body.scrollTo
Object.defineProperty(document.body, 'scrollTo', {
  value: vi.fn(),
  writable: true,
})

// Mock Next.js 路由
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => {
    return React.createElement('img', props)
  },
}))

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

// Mock zustand store
vi.mock('@/store/editorStore', () => {
  const actual = vi.importActual('@/store/editorStore')
  return {
    ...actual,
    useEditorStore: vi.fn(() => ({
      content: '',
      templates: [],
      currentTemplate: null,
      templateBinding: null,
      draftTemplateConfig: null,
      templatePanelOpen: false,
      availableFonts: [],
      pendingWordStyles: null,
      exportStatus: 'idle',
      exportMessage: '',
      editorInstance: null,
      setContent: vi.fn(),
      setTemplates: vi.fn(),
      setAvailableFonts: vi.fn(),
      setCurrentTemplate: vi.fn(),
      updateDraftStyle: vi.fn(),
      updateDraftLayout: vi.fn(),
      applyDraftTemplate: vi.fn(),
      openTemplatePanel: vi.fn(),
      closeTemplatePanel: vi.fn(),
      resetDraftFromCurrent: vi.fn(),
      getPreviewTemplateConfig: vi.fn(),
      setExportStatus: vi.fn(),
    })),
  }
})

// Mock axios instance
vi.mock('@/lib/api/instance', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  },
}))
