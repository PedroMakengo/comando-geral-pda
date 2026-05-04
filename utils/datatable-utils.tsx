// ── datatable-utils.tsx ───────────────────────────────────────
// Utilitários partilhados para todas as tabelas do sistema
// Importar onde necessário:
//   import { SortHeader, useSortState, Pagination } from '@/components/datatable-utils'

import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────
export type SortDirection = 'asc' | 'desc'
export interface SortState<K extends string> {
  key: K | null
  direction: SortDirection
}

// ── Hook ──────────────────────────────────────────────────────
export function nextSort<K extends string>(
  prev: SortState<K>,
  key: K,
): SortState<K> {
  if (prev.key === key) {
    return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
  }
  return { key, direction: 'asc' }
}

export function sortBy<T>(
  list: T[],
  key: string | null,
  direction: SortDirection,
  getValue: (item: T, key: string) => string | number,
): T[] {
  if (!key) return list
  return [...list].sort((a, b) => {
    const aVal = getValue(a, key)
    const bVal = getValue(b, key)
    const cmp =
      typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal)
            .toLowerCase()
            .localeCompare(String(bVal).toLowerCase(), 'pt')
    return direction === 'asc' ? cmp : -cmp
  })
}

// ── SortHeader ────────────────────────────────────────────────
export function SortHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className = '',
}: {
  label: string
  sortKey: K
  sort: SortState<K>
  onSort: (key: K) => void
  className?: string
}) {
  const isActive = sort.key === sortKey
  return (
    <th
      className={`text-left px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide ${className}`}
    >
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 hover:text-zinc-800 transition-colors group select-none"
      >
        {label}
        <span className="flex flex-col gap-[1px]">
          <ChevronUp
            className={`h-2.5 w-2.5 transition-colors ${
              isActive && sort.direction === 'asc'
                ? 'text-zinc-800'
                : 'text-zinc-300 group-hover:text-zinc-400'
            }`}
          />
          <ChevronDown
            className={`h-2.5 w-2.5 transition-colors ${
              isActive && sort.direction === 'desc'
                ? 'text-zinc-800'
                : 'text-zinc-300 group-hover:text-zinc-400'
            }`}
          />
        </span>
      </button>
    </th>
  )
}

// ── Pagination ────────────────────────────────────────────────
export function Pagination({
  page,
  totalPages,
  limit,
  total,
  onChange,
}: {
  page: number
  totalPages: number
  limit: number
  total: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50/50">
      <p className="text-xs text-zinc-400">
        {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-md hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-zinc-600 px-2">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-1.5 rounded-md hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
