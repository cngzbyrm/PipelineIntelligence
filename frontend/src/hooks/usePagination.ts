import { useState, useMemo } from 'react'

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1)

  // Reset to page 1 when items change (filter/search)
  const total = items.length

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  function setPageSafe(p: number) {
    const max = Math.max(1, Math.ceil(total / pageSize))
    setPage(Math.min(Math.max(1, p), max))
  }

  function reset() { setPage(1) }

  return { page, paged, total, setPage: setPageSafe, reset }
}