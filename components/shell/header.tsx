'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/lib/sidebar-context'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  User,
  LogOut,
  UserCircle2,
} from 'lucide-react'
import { alerts } from '@/lib/mock-data'
import { StatusDot } from '@/components/ui/status-badge'
import { useTheme } from '@/lib/theme-provider'

const DATE_PRESETS = ['Last 24h', 'Last 7 days', 'Last 30 days', 'Last 90 days']

const PAGE_DETAILS: Record<string, string> = {
  '/': 'Dashboard',
  '/devices': 'Devices',
  '/active-directory': 'Active Directory',
  '/malware-protection': 'Malware Protection',
  '/patch-compliance': 'Patch Compliance',
  '/checks': 'Checks',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

export function Header() {
  const { collapsed } = useSidebar()
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const [dateRange, setDateRange] = useState('Last 7 days')
  const [dateOpen, setDateOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [notiOpen, setNotiOpen] = useState(false)

  const criticalAlerts = alerts.filter(a => a.severity === 'critical')
  const unreadCount = criticalAlerts.length
  const pageTitle = PAGE_DETAILS[pathname] ?? 'Fleet Compliance'

  return (
    <header className={cn('fixed top-0 right-0 z-20 h-14 flex items-center gap-4 px-4 border-b border-border bg-card transition-all duration-200', collapsed ? 'left-16' : 'left-60')}>
      <h1 className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-[20px] font-semibold text-foreground text-balance leading-tight">{pageTitle}</h1>

      <div className="flex-1" />

      {/* Date Range */}
      <div className="relative">
        <button
          onClick={() => { setDateOpen(!dateOpen); setUserOpen(false); setNotiOpen(false) }}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-full text-[13px] text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors border border-border"
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

      {/* Divider */}
      <div className="w-px h-5 bg-border" />

      {/* Theme Toggle */}
      <button
        onClick={() => toggleTheme()}
        className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover transition-colors text-muted-foreground hover:text-foreground"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        <img src="/night-mode.png" alt="" width={15} height={15} className="object-contain dark:invert" />
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setNotiOpen(!notiOpen); setDateOpen(false); setUserOpen(false) }}
          className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-hover transition-colors text-muted-foreground hover:text-foreground"
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
              {alerts.slice(0, 6).map(alert => (
                <div key={alert.id} className="flex gap-3 px-3 py-2.5 border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                  <StatusDot status={alert.severity} className="mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-foreground leading-snug">{alert.message}</p>
                    {alert.deviceName && (
                      <span className="text-[11px] font-mono text-muted-foreground">{alert.deviceName}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-border">
              <button className="text-[12px] text-brand hover:text-brand/80 transition-colors">View all alerts</button>
            </div>
          </div>
        )}
      </div>

      {/* User */}
      <div className="relative">
        <button
          onClick={() => { setUserOpen(!userOpen); setDateOpen(false); setNotiOpen(false) }}
          className="flex items-center gap-2 h-8 rounded-full hover:bg-surface-hover transition-colors px-1.5"
        >
          <div className="w-6 h-6 rounded-full bg-brand/20 flex items-center justify-center text-[11px] font-semibold text-brand">
            JS
          </div>
          <ChevronDown size={12} strokeWidth={2} className="text-muted-foreground" />
        </button>
        {userOpen && (
          <div className="absolute top-full right-0 mt-1 w-48 bg-surface-elevated border border-border rounded-md shadow-lg z-50 overflow-hidden py-1">
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-[13px] font-medium text-foreground">John Smith</p>
              <p className="text-[12px] text-muted-foreground">j.smith@acme.com</p>
            </div>
            <button className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
              <UserCircle2 size={14} strokeWidth={1.5} />
              Profile
            </button>
            <div className="border-t border-border mt-1 pt-1">
              <button className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-status-critical hover:bg-surface-hover transition-colors">
                <LogOut size={14} strokeWidth={1.5} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Click outside overlay */}
      {(dateOpen || userOpen || notiOpen) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => { setDateOpen(false); setUserOpen(false); setNotiOpen(false) }}
        />
      )}
    </header>
  )
}
