'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/lib/sidebar-context'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Laptop,
  Network,
  ShieldAlert,
  RefreshCw,
  ListChecks,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Devices', href: '/devices', icon: Laptop },
  { label: 'Active Directory', href: '/active-directory', icon: Network },
  { label: 'Malware Protection', href: '/malware-protection', icon: ShieldAlert },
  { label: 'Patch Compliance', href: '/patch-compliance', icon: RefreshCw },
  { label: 'Checks', href: '/checks', icon: ListChecks },
  { label: 'Reports', href: '/reports', icon: FileText },
]

const BOTTOM_ITEMS = [
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const { collapsed, setCollapsed } = useSidebar()
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col z-30 transition-all duration-200',
        'border-r border-border bg-sidebar',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 border-b border-border shrink-0',
        collapsed ? 'px-4 justify-center' : 'px-4'
      )}>
        {!collapsed ? (
          <img
            src="/logo.png"
            alt="Fleet Compliance"
            className="h-7 w-auto object-contain"
          />
        ) : (
          <div className="w-7 h-7 rounded bg-brand/15 flex items-center justify-center shrink-0">
            <span className="text-brand font-semibold text-[11px]">FC</span>
          </div>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isActive(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md text-[13px] transition-colors relative group',
                    collapsed ? 'h-9 px-2 justify-center' : 'h-9 px-2.5',
                    active
                      ? 'bg-surface-hover text-foreground'
                      : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                  )}
                  title={collapsed ? label : undefined}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-brand" />
                  )}
                  <Icon
                    size={16}
                    strokeWidth={1.5}
                    className={cn(
                      'shrink-0',
                      active ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  {!collapsed && (
                    <span className={cn(active && 'font-medium')}>{label}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-2 py-2 space-y-0.5">
        {BOTTOM_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-md text-[13px] transition-colors relative',
                collapsed ? 'h-9 px-2 justify-center' : 'h-9 px-2.5',
                active
                  ? 'bg-surface-hover text-foreground'
                  : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
              )}
              title={collapsed ? label : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-brand" />
              )}
              <Icon
                size={16}
                strokeWidth={1.5}
                className={cn(active ? 'text-brand' : 'text-muted-foreground')}
              />
              {!collapsed && <span className={cn(active && 'font-medium')}>{label}</span>}
            </Link>
          )
        })}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-2.5 rounded-md text-[13px] transition-colors text-muted-foreground hover:text-foreground hover:bg-surface-hover w-full',
            collapsed ? 'h-9 px-2 justify-center' : 'h-9 px-2.5'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight size={16} strokeWidth={1.5} />
          ) : (
            <>
              <ChevronLeft size={16} strokeWidth={1.5} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
