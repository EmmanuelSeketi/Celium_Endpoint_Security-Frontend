'use client'

import { SidebarProvider, useSidebar } from '@/lib/sidebar-context'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { cn } from '@/lib/utils'

function Shell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className={cn('pt-14 min-h-screen transition-all duration-200', collapsed ? 'ml-16' : 'ml-60')}>
        <div className="p-4">{children}</div>
      </main>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Shell>{children}</Shell>
    </SidebarProvider>
  )
}
