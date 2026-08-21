'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/lib/sidebar-context'
import { useTheme } from '@/lib/theme-provider'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Laptop,
  Network,
  ShieldAlert,
  RefreshCw,
  ListChecks,
  FileText,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, iconSrc: '/dashboard.png' },
  { label: 'Devices', href: '/devices', icon: Laptop, iconSrc: '/devices.png' },
  { label: 'Active Directory', href: '/active-directory', icon: Network, iconSrc: '/active-directory.png' },
  { label: 'Malware Protection', href: '/malware-protection', icon: ShieldAlert, iconSrc: '/malware.png' },
  { label: 'Patch Compliance', href: '/patch-compliance', icon: RefreshCw, iconSrc: '/software-patch.png' },
  { label: 'Checks', href: '/checks', icon: ListChecks, iconSrc: '/checks.png' },
  { label: 'Reports', href: '/reports', icon: FileText, iconSrc: '/report.png' },
]

const BOTTOM_ITEMS = [
  { label: 'Settings', href: '/settings' },
]

export function Sidebar() {
  const { collapsed, setCollapsed } = useSidebar()
  const { theme } = useTheme()
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
            src={theme === 'dark' ? '/Risq Dark.png' : '/Risq Light.png'}
            alt="Risq"
            className="h-9 w-auto object-contain"
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
          {NAV_ITEMS.map(({ label, href, icon: Icon, iconSrc }) => {
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
                      : 'text-foreground hover:bg-surface-hover hover:text-foreground'
                  )}
                  title={collapsed ? label : undefined}
                >
                  {iconSrc ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 bg-current',
                        active ? 'text-brand' : 'text-foreground group-hover:text-foreground'
                      )}
                      style={{
                        maskImage: `url(${iconSrc})`,
                        WebkitMaskImage: `url(${iconSrc})`,
                        maskRepeat: 'no-repeat',
                        WebkitMaskRepeat: 'no-repeat',
                        maskPosition: 'center',
                        WebkitMaskPosition: 'center',
                        maskSize: '140%',
                        WebkitMaskSize: '140%',
                      }}
                    />
                  ) : (
                    <Icon
                      size={14}
                      strokeWidth={1.5}
                      className={cn(
                        'shrink-0',
                        active ? 'text-brand' : 'text-foreground group-hover:text-foreground'
                      )}
                    />
                  )}
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
        {BOTTOM_ITEMS.map(({ label, href }) => {
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
                  : 'text-foreground hover:bg-surface-hover hover:text-foreground'
              )}
              title={collapsed ? label : undefined}
            >
              <img
                src="/settings.png"
                alt=""
                width={14}
                height={14}
                className="object-contain dark:invert"
              />
              {!collapsed && <span className={cn(active && 'font-medium')}>{label}</span>}
            </Link>
          )
        })}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-2.5 rounded-md text-[13px] transition-colors text-foreground hover:text-foreground hover:bg-surface-hover w-full',
            collapsed ? 'h-9 px-2 justify-center' : 'h-9 px-2.5'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <img src="/sidebar-expand.png" alt="" width={14} height={14} className="object-contain dark:invert" />
          ) : (
            <>
              <img src="/sidebar-collapse.png" alt="" width={14} height={14} className="object-contain dark:invert" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
