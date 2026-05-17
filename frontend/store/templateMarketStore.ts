import { create } from 'zustand'
import type { TemplateMarketItem, TemplateCategory, TemplateSortBy } from '@/types/templateMarket'

interface TemplateMarketState {
  items: TemplateMarketItem[]
  isLoading: boolean
  searchQuery: string
  activeCategory: TemplateCategory
  sortBy: TemplateSortBy
  previewId: string | null

  setItems: (items: TemplateMarketItem[]) => void
  setLoading: (v: boolean) => void
  setSearchQuery: (q: string) => void
  setCategory: (c: TemplateCategory) => void
  setSortBy: (s: TemplateSortBy) => void
  setPreviewId: (id: string | null) => void
}

export const useTemplateMarketStore = create<TemplateMarketState>((set) => ({
  items: [],
  isLoading: false,
  searchQuery: '',
  activeCategory: 'all',
  sortBy: 'latest',
  previewId: null,

  setItems: (items) => set({ items }),
  setLoading: (isLoading) => set({ isLoading }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setCategory: (activeCategory) => set({ activeCategory }),
  setSortBy: (sortBy) => set({ sortBy }),
  setPreviewId: (previewId) => set({ previewId }),
}))
