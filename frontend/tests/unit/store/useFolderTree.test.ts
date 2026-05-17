import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFileManagerStore } from '@/store/fileManagerStore'
import { useFolderTree } from '@/hooks/useFolderTree'
import type { FolderNode } from '@/types/fileManager'

const { mockGetTree } = vi.hoisted(() => ({ mockGetTree: vi.fn() }))

vi.mock('@/lib/api/folderService', () => ({
  folderService: {
    getTree: mockGetTree,
  },
}))

function resetStore() {
  useFileManagerStore.setState({ tree: [], isLoading: false })
}

const sampleTree: FolderNode[] = [
  { id: 'f1', name: 'Folder 1', parentId: null, sortOrder: 0, children: [], documents: [] },
]

describe('useFolderTree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  it('sets tree in store after successful load', async () => {
    mockGetTree.mockResolvedValue(sampleTree)

    renderHook(() => useFolderTree())

    await waitFor(() => {
      expect(useFileManagerStore.getState().tree).toEqual(sampleTree)
    })
  })

  it('sets isLoading=false after successful load', async () => {
    mockGetTree.mockResolvedValue(sampleTree)

    renderHook(() => useFolderTree())

    await waitFor(() => {
      expect(useFileManagerStore.getState().isLoading).toBe(false)
    })
  })

  it('sets isLoading=false when getTree throws', async () => {
    mockGetTree.mockRejectedValue(new Error('network error'))

    renderHook(() => useFolderTree())

    await waitFor(() => {
      expect(useFileManagerStore.getState().isLoading).toBe(false)
    })
  })

  it('tree remains empty when getTree throws', async () => {
    mockGetTree.mockRejectedValue(new Error('network error'))

    renderHook(() => useFolderTree())

    await waitFor(() => {
      expect(useFileManagerStore.getState().isLoading).toBe(false)
    })
    expect(useFileManagerStore.getState().tree).toHaveLength(0)
  })

  it('reload re-calls getTree', async () => {
    mockGetTree.mockResolvedValue(sampleTree)

    const { result } = renderHook(() => useFolderTree())

    await waitFor(() => {
      expect(mockGetTree).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      await result.current.reload()
    })

    expect(mockGetTree).toHaveBeenCalledTimes(2)
  })

  it('reload updates the tree with new data', async () => {
    const secondTree: FolderNode[] = [
      { id: 'f2', name: 'Folder 2', parentId: null, sortOrder: 0, children: [], documents: [] },
    ]
    mockGetTree.mockResolvedValueOnce(sampleTree).mockResolvedValueOnce(secondTree)

    const { result } = renderHook(() => useFolderTree())

    await waitFor(() => {
      expect(useFileManagerStore.getState().tree).toEqual(sampleTree)
    })

    await act(async () => {
      await result.current.reload()
    })

    expect(useFileManagerStore.getState().tree).toEqual(secondTree)
  })
})
