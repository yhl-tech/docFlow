import { useState, useEffect, useMemo, useCallback } from 'react'
import { useFileManagerStore } from '@/store/fileManagerStore'
import { documentService } from '@/lib/api/documentService'
import type { SearchResult, FolderNode } from '@/types/fileManager'

const SERVER_SEARCH_THRESHOLD = 50

export function useDocumentSearch() {
  const { tree } = useFileManagerStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isServerSearch, setIsServerSearch] = useState(false)

  const totalDocs = useMemo(() => countDocs(tree), [tree])

  const debouncedServerSearch = useDebouncedSearch(setResults)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setIsServerSearch(false)
      return
    }

    if (totalDocs <= SERVER_SEARCH_THRESHOLD) {
      setIsServerSearch(false)
      setResults(localSearch(tree, query))
    } else {
      setIsServerSearch(true)
      debouncedServerSearch(query)
    }
  }, [query, tree, totalDocs, debouncedServerSearch])

  return { query, setQuery, results, isServerSearch }
}

function countDocs(nodes: FolderNode[]): number {
  let count = 0
  for (const node of nodes) {
    if ('documents' in node) {
      count += node.documents.length
      count += countDocs(node.children)
    }
  }
  return count
}

function localSearch(nodes: FolderNode[], query: string): SearchResult[] {
  const q = query.toLowerCase()
  const results: SearchResult[] = []

  function traverse(nodes: FolderNode[], folderName = '') {
    for (const node of nodes) {
      if (!('documents' in node)) {
        // 根级文档
        const doc = node as unknown as SearchResult
        if (doc.title?.toLowerCase().includes(q)) {
          results.push({ ...doc, folderName: '' })
        }
        continue
      }
      for (const doc of node.documents) {
        if (doc.title.toLowerCase().includes(q)) {
          results.push({
            id: doc.id,
            title: doc.title,
            folderId: doc.folderId,
            folderName: node.name,
            updatedAt: doc.updatedAt,
            wordCount: doc.wordCount,
          })
        }
      }
      traverse(node.children, node.name)
    }
  }

  traverse(nodes)
  return results
}

function useDebouncedSearch(setResults: (r: SearchResult[]) => void) {
  return useCallback(
    debounce(async (query: string) => {
      try {
        const data = await documentService.search(query)
        setResults(data)
      } catch {
        setResults([])
      }
    }, 300),
    [setResults],
  )
}

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}
