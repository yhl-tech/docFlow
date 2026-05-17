import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useFileManagerStore } from '@/store/fileManagerStore'
import type { FolderNode } from '@/types/fileManager'

// Mock documentService
const mockSearch = vi.fn()
vi.mock('@/lib/api/documentService', () => ({
  documentService: {
    search: mockSearch,
  },
}))

function resetStore() {
  useFileManagerStore.setState({ tree: [] })
}

function makeFolder(id: string, docs: { id: string; title: string }[] = []): FolderNode {
  return {
    id,
    name: id,
    parentId: null,
    sortOrder: 0,
    children: [],
    documents: docs.map((d) => ({ id: d.id, title: d.title, folderId: id, updatedAt: '', wordCount: 0 })),
  }
}

// Import the private localSearch/countDocs logic by testing through the hook behaviour
// For pure function tests, we extract via the hook's output at different tree sizes

describe('useDocumentSearch — pure logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  it('empty query returns no results (local path)', async () => {
    const { renderHook, act } = await import('@testing-library/react')
    const { useDocumentSearch } = await import('@/hooks/useDocumentSearch')

    useFileManagerStore.setState({
      tree: [makeFolder('f1', [{ id: 'd1', title: 'Report' }])],
    })

    const { result } = renderHook(() => useDocumentSearch())

    expect(result.current.results).toHaveLength(0)
  })

  it('returns matching documents from local tree when total <= 50', async () => {
    const { renderHook, act, waitFor } = await import('@testing-library/react')
    const { useDocumentSearch } = await import('@/hooks/useDocumentSearch')

    useFileManagerStore.setState({
      tree: [
        makeFolder('f1', [
          { id: 'd1', title: '项目报告' },
          { id: 'd2', title: '会议纪要' },
        ]),
      ],
    })

    const { result } = renderHook(() => useDocumentSearch())

    act(() => {
      result.current.setQuery('报告')
    })

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1)
      expect(result.current.results[0].id).toBe('d1')
    })
  })

  it('local search is case-insensitive', async () => {
    const { renderHook, act, waitFor } = await import('@testing-library/react')
    const { useDocumentSearch } = await import('@/hooks/useDocumentSearch')

    useFileManagerStore.setState({
      tree: [makeFolder('f1', [{ id: 'd1', title: 'Annual Report' }])],
    })

    const { result } = renderHook(() => useDocumentSearch())

    act(() => {
      result.current.setQuery('annual')
    })

    await waitFor(() => {
      expect(result.current.results[0].id).toBe('d1')
    })
  })

  it('local search sets isServerSearch=false', async () => {
    const { renderHook, act, waitFor } = await import('@testing-library/react')
    const { useDocumentSearch } = await import('@/hooks/useDocumentSearch')

    useFileManagerStore.setState({
      tree: [makeFolder('f1', [{ id: 'd1', title: 'test' }])],
    })

    const { result } = renderHook(() => useDocumentSearch())
    act(() => { result.current.setQuery('test') })

    await waitFor(() => {
      expect(result.current.isServerSearch).toBe(false)
    })
  })

  it('clearing query resets results', async () => {
    const { renderHook, act, waitFor } = await import('@testing-library/react')
    const { useDocumentSearch } = await import('@/hooks/useDocumentSearch')

    useFileManagerStore.setState({
      tree: [makeFolder('f1', [{ id: 'd1', title: 'Report' }])],
    })

    const { result } = renderHook(() => useDocumentSearch())

    act(() => { result.current.setQuery('Report') })
    await waitFor(() => { expect(result.current.results).toHaveLength(1) })

    act(() => { result.current.setQuery('') })
    await waitFor(() => { expect(result.current.results).toHaveLength(0) })
  })

  it('uses server search when total docs > 50', async () => {
    const { renderHook, act, waitFor } = await import('@testing-library/react')
    const { useDocumentSearch } = await import('@/hooks/useDocumentSearch')

    // Create 51 documents across folders
    const manyDocs = Array.from({ length: 51 }, (_, i) => ({
      id: `d${i}`,
      title: `Doc ${i}`,
    }))
    useFileManagerStore.setState({
      tree: [makeFolder('f1', manyDocs)],
    })

    const serverResults = [{ id: 'd0', title: 'Doc 0', folderId: 'f1', folderName: 'f1', updatedAt: '', wordCount: 0 }]
    mockSearch.mockResolvedValue(serverResults)

    const { result } = renderHook(() => useDocumentSearch())

    act(() => { result.current.setQuery('Doc 0') })

    await waitFor(() => {
      expect(result.current.isServerSearch).toBe(true)
    })

    // Server search is debounced (300ms), so we need to wait
    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith('Doc 0')
    }, { timeout: 500 })
  })

  it('results include folderName from local search', async () => {
    const { renderHook, act, waitFor } = await import('@testing-library/react')
    const { useDocumentSearch } = await import('@/hooks/useDocumentSearch')

    useFileManagerStore.setState({
      tree: [{
        id: 'f1',
        name: '项目文档',
        parentId: null,
        sortOrder: 0,
        children: [],
        documents: [{ id: 'd1', title: '需求分析', folderId: 'f1', updatedAt: '', wordCount: 100 }],
      }],
    })

    const { result } = renderHook(() => useDocumentSearch())
    act(() => { result.current.setQuery('需求') })

    await waitFor(() => {
      expect(result.current.results[0].folderName).toBe('项目文档')
    })
  })
})
