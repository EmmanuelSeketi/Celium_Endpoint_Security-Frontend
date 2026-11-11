const TIMEZONE_STORAGE_KEY = 'fleet-organization-timezone'

export function setOrganizationTimezone(timezone: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TIMEZONE_STORAGE_KEY, timezone)
  }
}

export function getOrganizationTimezone() {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(TIMEZONE_STORAGE_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  }
  return 'UTC'
}

export function formatOrganizationDate(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
) {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: getOrganizationTimezone() }).format(date)
}
