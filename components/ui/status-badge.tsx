'use client'

import { cn } from '@/lib/utils'
import { getStatusColor, getCategoryColor, getCategoryLabel } from '@/lib/theme'
import type { DeviceStatus, Severity, CheckCategory } from '@/lib/types'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Minus,
  Info,
} from 'lucide-react'

interface StatusDotProps {
  status: DeviceStatus | Severity | 'offline' | 'stale' | 'unknown'
  label?: string
  className?: string
}

const STATUS_ICONS = {
  compliant: CheckCircle2,
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: XCircle,
  info: Info,
  unknown: Minus,
  offline: Minus,
  stale: Minus,
}

export function StatusDot({ status, label, className }: StatusDotProps) {
  const color = getStatusColor(status)
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className="inline-block w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label && <span className="text-[13px]">{label}</span>}
    </span>
  )
}

interface StatusBadgeProps {
  status: DeviceStatus | Severity | string
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, label, className, size = 'md' }: StatusBadgeProps) {
  const color = getStatusColor(status)
  const Icon = STATUS_ICONS[status as keyof typeof STATUS_ICONS] ?? Minus
  const displayLabel = label ?? (status === 'compliant' ? 'Healthy' : status.charAt(0).toUpperCase() + status.slice(1))

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-[12px]',
        className
      )}
      style={{
        color,
        backgroundColor: `${color}18`,
        border: `1px solid ${color}30`,
      }}
    >
      <Icon size={size === 'sm' ? 10 : 12} strokeWidth={2} />
      {displayLabel}
    </span>
  )
}

interface CategoryBadgeProps {
  category: CheckCategory | string
  className?: string
  size?: 'sm' | 'md'
}

export function CategoryBadge({ category, className, size = 'md' }: CategoryBadgeProps) {
  const color = getCategoryColor(category)
  const label = getCategoryLabel(category)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded font-medium tracking-wide uppercase',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        className
      )}
      style={{
        color,
        backgroundColor: `${color}18`,
        border: `1px solid ${color}30`,
      }}
    >
      {label}
    </span>
  )
}

interface SeverityBadgeProps {
  severity: Severity
  className?: string
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return <StatusBadge status={severity} className={className} />
}
