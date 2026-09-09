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
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, iconSrc: '/SVG/sidebar/dashboard.svg' },
  { label: 'Endpoints', href: '/devices', icon: Laptop, iconSrc: '/SVG/sidebar/devices.svg' },
  { label: 'Malware Protection', href: '/malware-protection', icon: ShieldAlert, iconSrc: '/SVG/sidebar/malware.svg' },
  { label: 'Active Directory', href: '/active-directory', icon: Network, iconSrc: '/SVG/sidebar/active-directory.svg' },
  { label: 'OS Updates', href: '/patch-compliance', icon: RefreshCw, iconSrc: '/SVG/sidebar/software-patch.svg' },
  { label: 'Checks', href: '/checks', icon: ListChecks, iconSrc: '/SVG/sidebar/checks.svg' },
  { label: 'Reports', href: '/reports', icon: FileText, iconSrc: '/SVG/sidebar/report.svg' },
]

const BOTTOM_ITEMS = [
  { label: 'Settings', href: '/settings' },
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
        'fixed left-0 top-14 h-[calc(100vh-3.5rem)] flex flex-col z-30 transition-all duration-200',
        'border-r border-border bg-sidebar',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
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
                    'flex items-center gap-2.5 rounded-md text-[12px] font-medium text-black transition-colors relative group',
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
                        'w-7 shrink-0 bg-current text-black dark:text-white',
                        label === 'Malware Protection' ? 'h-7' : label === 'OS Updates' ? 'h-5' : label === 'Checks' || label === 'Dashboard' || label === 'Endpoints' ? 'h-4' : 'h-5'
                      )}
                      style={{
                        maskImage: `url(${iconSrc})`,
                        WebkitMaskImage: `url(${iconSrc})`,
                        maskRepeat: 'no-repeat',
                        WebkitMaskRepeat: 'no-repeat',
                        maskPosition: 'center',
                        WebkitMaskPosition: 'center',
                        maskSize: 'contain',
                        WebkitMaskSize: 'contain',
                        filter: 'drop-shadow(0 0 0.45px currentColor)',
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
                    <span>{label}</span>
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
                'flex items-center gap-2.5 rounded-md text-[12px] font-medium text-black transition-colors relative',
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
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-2.5 rounded-md text-[12px] font-medium text-black transition-colors hover:text-black hover:bg-surface-hover w-full',
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
