'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export interface Column<T> {
  key: string
  label: string
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  emptyMessage?: string
  className?: string
  rowKey?: (row: T) => string
  compact?: boolean
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available.',
  className,
  rowKey,
  compact = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0
    const av = a[sortKey]
    const bv = b[sortKey]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av
    }
    const as = String(av).toLowerCase()
    const bs = String(bv).toLowerCase()
    if (as < bs) return sortDir === 'asc' ? -1 : 1
    if (as > bs) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-border">
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  'py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap select-none',
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                  col.sortable && 'cursor-pointer hover:text-foreground transition-colors'
                )}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    <span className="text-muted-foreground/60">
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />
                      ) : (
                        <ChevronsUpDown size={12} strokeWidth={2} />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-[13px] text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row) : i}
                className={cn(
                  'border-b border-border transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-surface-hover',
                  compact ? 'h-9' : 'h-10'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-3',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    )}
                  >
                    {col.render ? col.render(row) : (row[col.key] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

interface TableSummaryProps {
  showing: number
  total: number
  className?: string
}

export function TableSummary({ showing, total, className }: TableSummaryProps) {
  return (
    <p className={cn('text-[12px] text-muted-foreground', className)}>
      Showing {showing.toLocaleString()}–{Math.min(showing + 19, total).toLocaleString()} of{' '}
      {total.toLocaleString()} entries
    </p>
  )
}
