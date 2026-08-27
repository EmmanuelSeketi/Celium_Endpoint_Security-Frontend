/**
 * Single source of truth for all semantic color mappings.
 * No hex codes anywhere else in components — import from here.
 */

export const STATUS_COLORS = {
  critical: 'var(--status-critical)',
  warning: 'var(--status-warning)',
  compliant: 'var(--status-good)',
  success: 'var(--status-good)',
  info: '#3B82F6',
  unknown: '#6B7280',
  offline: '#6B7280',
  stale: '#6B7280',
} as const

export const CATEGORY_COLORS = {
  active_directory: 'var(--category-2)',
  malware_protection: 'var(--category-1)',
  os_updates: 'var(--category-3)',
  other: '#6B7280',
} as const

export const CATEGORY_LABELS = {
  active_directory: 'Active Directory',
  malware_protection: 'Malware',
  os_updates: 'Patch',
  other: 'Other',
} as const

export const BRAND = '#008080'
export const CHART_GRID = 'var(--border)'

export type StatusKey = keyof typeof STATUS_COLORS
export type CategoryKey = keyof typeof CATEGORY_COLORS

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    compliant: STATUS_COLORS.compliant,
    warning: STATUS_COLORS.warning,
    critical: STATUS_COLORS.critical,
    info: STATUS_COLORS.info,
    unknown: STATUS_COLORS.unknown,
    offline: STATUS_COLORS.offline,
    stale: STATUS_COLORS.stale,
    success: STATUS_COLORS.success,
  }
  return map[status] ?? STATUS_COLORS.unknown
}

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category as CategoryKey] ?? CATEGORY_COLORS.other
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category as CategoryKey] ?? 'Other'
}

export function getDefinitionAgeColor(days: number): string {
  if (days <= 1) return STATUS_COLORS.compliant
  if (days <= 3) return STATUS_COLORS.warning
  return STATUS_COLORS.critical
}

export function getComplianceScoreColor(score: number): string {
  if (score >= 85) return STATUS_COLORS.compliant
  if (score >= 65) return STATUS_COLORS.warning
  return STATUS_COLORS.critical
}
