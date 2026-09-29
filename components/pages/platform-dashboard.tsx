'use client'

import { useEffect, useState } from 'react'
import { Building2, Laptop, Bell, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { KpiCard } from '@/components/ui/kpi-card'
import { SectionCard } from '@/components/ui/section-card'
import { useDataMode } from '@/lib/data-mode-provider'
import { getPlatformStats, type PlatformStats } from '@/lib/api-client'
import { platformStats as demoStats } from '@/lib/platform-mock'

export function PlatformDashboardPage() {
  const { mode } = useDataMode()
  const [stats, setStats] = useState<PlatformStats>(demoStats)
  useEffect(() => { if (mode === 'demo') { setStats(demoStats); return }; getPlatformStats().then(setStats).catch(() => setStats(demoStats)) }, [mode])
  const health = stats.total_devices ? Math.round(stats.health_summary.compliant_devices / stats.total_devices * 100) : 0
  return <div className="space-y-4">
    <PageHeader title="Platform dashboard" description="Cross-tenant health and operational posture." />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard label="Organizations" value={stats.total_orgs} description={`${stats.active_orgs} active, ${stats.inactive_orgs} inactive`} accentColor="#5B7FFF" />
      <KpiCard label="Managed devices" value={stats.total_devices.toLocaleString()} description={`${stats.active_devices.toLocaleString()} reporting now`} accentColor="#008080" />
      <KpiCard label="Open alerts" value={stats.total_alerts} description="Across all organizations" accentColor="#F79009" />
      <KpiCard label="Fleet health" value={`${health}%`} description={`${stats.health_summary.compliant_devices.toLocaleString()} compliant devices`} accentColor="#12B76A" />
    </div>
    <SectionCard title="Tenant activity" description="A quick read of the platform footprint.">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Active organizations', value: stats.active_orgs, icon: Building2 },
          { label: 'Reporting devices', value: stats.active_devices, icon: Laptop },
          { label: 'Compliant devices', value: stats.health_summary.compliant_devices, icon: ShieldCheck },
        ].map(({ label, value, icon: Icon }) => <div key={label} className="flex items-center gap-3 border border-border rounded-md p-4"><Icon size={18} className="text-brand" /><div><p className="text-[12px] text-muted-foreground">{label}</p><p className="text-xl font-semibold tabular-nums">{value.toLocaleString()}</p></div></div>)}
      </div>
    </SectionCard>
    <SectionCard title="Attention required"><div className="flex items-center gap-3 text-[13px] text-muted-foreground"><Bell size={16} className="text-status-warning" />{stats.total_alerts} unresolved alerts need review across the tenant fleet.</div></SectionCard>
  </div>
}
