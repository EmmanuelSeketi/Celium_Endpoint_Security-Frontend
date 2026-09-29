'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/lib/sidebar-context'
import { useAuth } from '@/lib/auth-provider'
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
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  Users,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Endpoints', href: '/devices', icon: Laptop },
  { label: 'Malware Protection', href: '/malware-protection', icon: ShieldAlert },
  { label: 'Active Directory', href: '/active-directory', icon: Network },
  { label: 'OS Updates', href: '/patch-compliance', icon: RefreshCw },
  { label: 'Checks', href: '/checks', icon: ListChecks },
  { label: 'Reports', href: '/reports', icon: FileText },
]

const PLATFORM_ITEMS = [
  { label: 'Platform dashboard', href: '/platform', icon: Building2 },
  { label: 'Organizations', href: '/platform/organizations', icon: Network },
  { label: 'Platform admins', href: '/platform/admins', icon: Users },
]

const BOTTOM_ITEMS = [
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const { collapsed, setCollapsed } = useSidebar()
  const pathname = usePathname()
  const { admin } = useAuth()

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
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isActive(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md text-[12px] font-medium transition-colors',
                    collapsed ? 'h-9 px-2 justify-center' : 'h-9 px-2.5',
                    active
                      ? 'bg-brand text-white'
                      : 'text-foreground hover:bg-surface-hover hover:text-foreground'
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon
                    size={16}
                    strokeWidth={1.5}
                    className={cn(
                      'shrink-0',
                      active ? 'text-white' : 'text-foreground group-hover:text-foreground'
                    )}
                  />
                  {!collapsed && (
                    <span>{label}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
        {admin?.is_platform_admin && (
          <>
            {!collapsed && <p className="px-2.5 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Platform</p>}
            <ul className="space-y-0.5">
              {PLATFORM_ITEMS.map(({ label, href, icon: Icon }) => {
                const active = isActive(href)
                return <li key={href}><Link href={href} className={cn('flex items-center gap-2.5 rounded-md text-[12px] font-medium transition-colors', collapsed ? 'h-9 px-2 justify-center' : 'h-9 px-2.5', active ? 'bg-brand text-white' : 'text-foreground hover:bg-surface-hover')} title={collapsed ? label : undefined}><Icon size={16} strokeWidth={1.5} />{!collapsed && <span>{label}</span>}</Link></li>
              })}
            </ul>
          </>
        )}
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
                'flex items-center gap-2.5 rounded-md text-[12px] font-medium transition-colors',
                collapsed ? 'h-9 px-2 justify-center' : 'h-9 px-2.5',
                active
                  ? 'bg-brand text-white'
                  : 'text-foreground hover:bg-surface-hover hover:text-foreground'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon
                size={16}
                strokeWidth={1.5}
                className={cn(
                  'shrink-0',
                  active ? 'text-white' : 'text-foreground group-hover:text-foreground'
                )}
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
            <PanelLeftOpen size={16} strokeWidth={1.5} className="shrink-0" />
          ) : (
            <>
              <PanelLeftClose size={16} strokeWidth={1.5} className="shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
