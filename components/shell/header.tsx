'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  Search,
  Sun,
} from 'lucide-react'
import { Alert, getAlerts } from '@/lib/api-client'
import { StatusDot } from '@/components/ui/status-badge'
import { useTheme } from '@/lib/theme-provider'

const DATE_PRESETS = ['Last 24h', 'Last 7 days', 'Last 30 days', 'Last 90 days']

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const [dateRange, setDateRange] = useState('Last 7 days')
  const [dateOpen, setDateOpen] = useState(false)
  const [notiOpen, setNotiOpen] = useState(false)
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([])

  useEffect(() => {
    getAlerts()
      .then(next => setLiveAlerts(Array.isArray(next) ? next : []))
      .catch(() => setLiveAlerts([]))
  }, [])

  const criticalAlerts = liveAlerts.filter(a => a.severity === 'critical' && a.status === 'active')
  const unreadCount = criticalAlerts.length

  return (
    <header className="fixed inset-x-0 top-0 z-20 h-14 flex items-center gap-4 border-b border-border bg-card px-4">
      <div className="flex h-14 w-60 shrink-0 items-center pr-4">
        <img
          src={theme === 'dark' ? '/Risq Dark.png' : '/Risq Light.png'}
          alt="Risq"
          className="h-9 w-auto object-contain"
        />
      </div>

      <div className="relative w-64 shrink-0">
        <Search size={14} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search"
          aria-label="Search"
          className="h-8 w-full rounded-full border border-border bg-surface-hover pl-9 pr-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-brand focus:ring-1 focus:ring-brand/30"
        />
      </div>

      <div className="flex-1" />

      {/* Date Range */}
      <div className="relative">
        <button
          onClick={() => { setDateOpen(!dateOpen); setNotiOpen(false) }}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-full text-[13px] text-black hover:text-black hover:bg-surface-hover transition-colors border border-border"
        >
          <img src="/calendar.png" alt="" width={13} height={13} className="object-contain dark:invert" />
          <span>{dateRange}</span>
          <ChevronDown size={12} strokeWidth={2} />
        </button>
        {dateOpen && (
          <div className="absolute top-full right-0 mt-1 w-44 bg-surface-elevated border border-border rounded-md shadow-lg z-50 overflow-hidden py-1">
            {DATE_PRESETS.map(preset => (
              <button
                key={preset}
                onClick={() => { setDateRange(preset); setDateOpen(false) }}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-[13px] hover:bg-surface-hover transition-colors',
                  preset === dateRange ? 'text-brand font-medium' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {preset}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Theme Toggle */}
      <button
        onClick={() => toggleTheme()}
        className="relative w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-surface-hover transition-colors text-black hover:text-black"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <img src="/night-mode.png" alt="" width={15} height={15} className="object-contain dark:invert" />
        ) : (
          <Sun size={15} strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setNotiOpen(!notiOpen); setDateOpen(false) }}
          className="relative w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-surface-hover transition-colors text-muted-foreground hover:text-foreground"
        >
          <img src="/notifications.png" alt="" width={15} height={15} className="object-contain dark:invert" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-status-critical rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none">
              {unreadCount}
            </span>
          )}
        </button>
        {notiOpen && (
          <div className="absolute top-full right-0 mt-1 w-96 bg-surface-elevated border border-border rounded-md shadow-lg z-50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-[13px] font-semibold text-foreground">Alerts</span>
              <span className="text-[11px] text-muted-foreground">{unreadCount} unread</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {liveAlerts.length === 0 ? (
                <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">No alerts yet</div>
              ) : (
                liveAlerts.slice(0, 6).map(alert => (
                  <div key={alert.id} className="flex gap-3 px-3 py-2.5 border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                    <StatusDot status={alert.severity} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-foreground leading-snug">{alert.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-3 py-2 border-t border-border">
              <button className="text-[12px] text-brand hover:text-brand/80 transition-colors">View all alerts</button>
            </div>
          </div>
        )}
      </div>

      {/* Click outside overlay */}
      {(dateOpen || notiOpen) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => { setDateOpen(false); setNotiOpen(false) }}
        />
      )}
    </header>
  )
}
