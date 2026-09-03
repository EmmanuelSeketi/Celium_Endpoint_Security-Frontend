'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCategoryLabel } from '@/lib/theme'
import { PageHeader } from '@/components/ui/page-header'
import { KpiCard } from '@/components/ui/kpi-card'
import { SectionCard } from '@/components/ui/section-card'
import { OSComplianceBarChart, FailingChecksPieChart, RiskHeatmap } from '@/components/ui/charts'
import { Alert, ComplianceCheck, ComplianceSummary, ManagedDevice, getAlerts, getComplianceChecks, getComplianceSummary, getDevices } from '@/lib/api-client'

function OSIcon({ os, className }: { os: string; className?: string }) {
  if (os === 'Windows') {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" className={className} fill="none">
        <rect x="3" y="3" width="8" height="8" rx="1" fill="#F25022"/>
        <rect x="13" y="3" width="8" height="8" rx="1" fill="#7FBA00"/>
        <rect x="3" y="13" width="8" height="8" rx="1" fill="#00A4EF"/>
        <rect x="13" y="13" width="8" height="8" rx="1" fill="#FFB900"/>
      </svg>
    )
  }
  if (os === 'Mac') {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" className={className} fill="none">
        <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.56 2.93 11.3 4.7 7.72C5.57 5.94 7.36 4.86 9.28 4.84C10.56 4.81 11.78 5.72 12.58 5.72C13.38 5.72 14.88 4.62 16.4 4.81C16.96 4.82 18.92 5.08 20.13 6.82C19.93 6.9 18.2 8.15 18.21 10.72C18.22 13.76 20.78 14.83 20.8 14.84C20.78 14.94 20.34 16.54 19.33 18.23" fill="#A3AAAE" stroke="#A3AAAE"/>
      </svg>
    )
  }
  if (os === 'Linux') {
    return <img src="/Linux.svg" width="16" height="16" className={className} alt="Linux" />
  }
  return null
}

export function OverviewPage() {
  const [summary, setSummary] = useState<ComplianceSummary>({ total_devices: 0, active_devices: 0, compliant_count: 0, non_compliant: 0, error_count: 0 })
  const [liveDevices, setLiveDevices] = useState<ManagedDevice[]>([])
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([])
  const [liveChecks, setLiveChecks] = useState<ComplianceCheck[]>([])
  const totalDevices = summary.total_devices
  const activeDevices = summary.active_devices
  const devicesNeedingAttention = summary.non_compliant
  const errors = summary.error_count

  useEffect(() => {
    Promise.all([getComplianceSummary(), getDevices(), getAlerts(), getComplianceChecks()])
      .then(([nextSummary, nextDevices, nextAlerts, nextChecks]) => {
        setSummary(nextSummary)
        setLiveDevices(Array.isArray(nextDevices) ? nextDevices : [])
        setLiveAlerts(Array.isArray(nextAlerts) ? nextAlerts : [])
        setLiveChecks(Array.isArray(nextChecks) ? nextChecks : [])
      })
      .catch(() => undefined)
  }, [])

  const osByScore = [
    { os: 'Windows', score: 0 },
    { os: 'macOS', score: 0 },
    { os: 'Linux', score: 0 },
  ]

  const topFailingChecks = liveChecks.slice(0, 5).map(check => ({ name: check.title, value: 0 }))

  // Risk heatmap: departments × category
  const departments = ['Engineering', 'Finance', 'Sales', 'HR', 'IT', 'Marketing', 'Design']
  const categories = ['malware_protection', 'os_updates', 'active_directory', 'other'] as const
  const heatmapData = departments.map(() => categories.map(() => 0))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description="Fleet compliance summary."
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          label="Active Devices"
          value={`${activeDevices}/${totalDevices}`}
          accentColor="var(--category-1)"
          description={
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--category-1)] opacity-75 animate-ping" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--category-1)]" />
              </span>
              Reporting
            </span>
          }
        />

        <KpiCard
          label="Total Devices"
        >
          <FailingChecksPieChart
            data={[
              { name: 'Healthy', value: summary.compliant_count },
              { name: 'Warning', value: summary.non_compliant },
              { name: 'Critical', value: summary.error_count },
            ]}
            height={96}
            showArcLabels={false}
            showTotal
            totalOverride={totalDevices}
            colors={['var(--category-1)', 'var(--status-warning)', 'var(--status-critical)']}
          />
        </KpiCard>

        <KpiCard
          label="Devices Needing Attention"
          childrenClassName="mt-0"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="text-[30px] font-semibold leading-none tabular-nums text-black dark:text-white">
              {devicesNeedingAttention}
            </span>
            <div className="flex w-[54%] min-w-0 flex-col gap-2 pt-1 text-[12px] font-medium text-black dark:text-white">
              {[
                { label: 'Failed', count: devicesNeedingAttention, color: 'bg-status-warning', width: `${Math.max((devicesNeedingAttention / Math.max(devicesNeedingAttention + errors, 1)) * 100, 8)}%` },
                { label: 'Errors', count: errors, color: 'bg-status-critical', width: `${Math.max((errors / Math.max(devicesNeedingAttention + errors, 1)) * 100, 8)}%` },
              ].map(item => (
                <div key={item.label} className="min-w-0">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span>{item.label}</span>
                    <span className="font-mono">{item.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </KpiCard>

        <KpiCard
          label="Avg MTTR"
          value="0h"
          description="No remediation data"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
        {/* Category Health Row */}
        <div className="order-3 grid grid-cols-1 gap-3 xl:col-span-2 lg:grid-cols-3">
          <Link href="/active-directory" className="block group">
            <div className="relative h-full min-h-[160px] bg-card border border-border rounded-md shadow-card px-4 pb-4 pt-0 hover:border-brand/50 hover:bg-surface-hover transition-colors">
              <div className="-mx-4 mb-3 flex items-center justify-between border-b border-border px-4 py-3"><span className="text-[12px] font-semibold uppercase tracking-wider text-foreground">Active Directory</span><ArrowRight size={14} strokeWidth={1.75} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" /></div>
              <div className="space-y-2 text-[12px] font-medium text-black dark:text-white">
                <div className="flex justify-between text-[12px]"><span className="text-black dark:text-white">Domain Controllers</span><span className="text-black dark:text-white tabular-nums">healthy (0/0)</span></div>
                <div className="flex justify-between text-[12px]"><span className="text-black dark:text-white">Failed logons (24h)</span><span className="text-black dark:text-white tabular-nums">(0)</span></div>
                <div className="flex justify-between text-[12px]"><span className="text-black dark:text-white">Stale accounts</span><span className="text-black dark:text-white tabular-nums">(0)</span></div>
              </div>
            </div>
          </Link>

          <Link href="/malware-protection" className="block group">
            <div className="relative h-full min-h-[160px] bg-card border border-border rounded-md shadow-card px-4 pb-4 pt-0 hover:border-brand/50 hover:bg-surface-hover transition-colors">
              <div className="-mx-4 mb-3 flex items-center justify-between border-b border-border px-4 py-3"><span className="text-[12px] font-semibold uppercase tracking-wider text-foreground">Malware Protection</span><ArrowRight size={14} strokeWidth={1.75} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" /></div>
              <div className="space-y-2 text-[12px] font-medium text-black dark:text-white">
                <div className="flex justify-between text-[12px]"><span className="text-black dark:text-white">RTP coverage</span><span className="text-black dark:text-white tabular-nums">(0%)</span></div>
                <div className="flex justify-between text-[12px]"><span className="text-black dark:text-white">Definitions up to date</span><span className="text-black dark:text-white tabular-nums">(0%)</span></div>
                <div className="flex justify-between text-[12px]"><span className="text-black dark:text-white">Active detections</span><span className="text-black dark:text-white tabular-nums">(0)</span></div>
              </div>
            </div>
          </Link>

          <Link href="/patch-compliance" className="block group">
            <div className="relative h-full min-h-[160px] bg-card border border-border rounded-md shadow-card px-4 pb-4 pt-0 hover:border-brand/50 hover:bg-surface-hover transition-colors">
              <div className="-mx-4 mb-3 flex items-center justify-between border-b border-border px-4 py-3"><span className="text-[12px] font-semibold uppercase tracking-wider text-foreground">Patch Compliance</span><ArrowRight size={14} strokeWidth={1.75} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" /></div>
              <div className="space-y-2 text-[12px] font-medium text-black dark:text-white">
                <div className="flex justify-between text-[12px]"><span className="text-black dark:text-white">Fully patched</span><span className="text-black dark:text-white tabular-nums">(0%)</span></div>
                <div className="flex justify-between text-[12px]"><span className="text-black dark:text-white">Missing critical (fleet)</span><span className="text-black dark:text-white tabular-nums">(0)</span></div>
                <div className="flex justify-between text-[12px]"><span className="text-black dark:text-white">Pending reboot</span><span className="text-black dark:text-white tabular-nums">(0)</span></div>
              </div>
            </div>
          </Link>
        </div>

        {/* Left Column */}
        <div className="contents">
          {/* Alerts Feed */}
          <SectionCard
            title="Recent Alerts"
            titleClassName="text-[13px] text-black dark:text-white"
            className="order-6 h-full"
            action={
              <Link href="/devices" className="text-[12px] text-black dark:text-white hover:text-black/70 dark:hover:text-white/70 transition-colors flex items-center gap-1">
                View all <ArrowRight size={11} strokeWidth={2} />
              </Link>
            }
            noPadding
          >
            {liveAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <AlertCircle size={20} className="text-muted-foreground" strokeWidth={1.5} />
                <p className="text-[12px] text-muted-foreground">No alerts in the selected range</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-[12px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-[62%] px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-black dark:text-white">Threat</th>
                      <th className="w-[22%] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-black dark:text-white">Device</th>
                      <th className="w-[16%] px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-black dark:text-white">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveAlerts.slice(0, 4).map(alert => (
                      <tr key={alert.id} className="h-10 border-b border-border font-medium last:border-b-0 hover:bg-surface-hover transition-colors">
                        <td className="max-w-0 px-4 py-2">
                          <span className="block truncate text-foreground" title={alert.message}>{alert.message}</span>
                        </td>
                        <td className="max-w-0 px-2 py-2 text-black dark:text-white">
                          <span className="block truncate font-mono">—</span>
                        </td>
                        <td className="px-4 py-2 text-right text-black dark:text-white whitespace-nowrap">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Recent Scan Activity */}
          <SectionCard title="Recent Scan Activity" titleClassName="text-[13px] text-black dark:text-white" noPadding className="order-5 h-full">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-[12px] font-medium text-black dark:text-white">
                <thead>
                  <tr className="border-b border-border">
                    <th className="w-[40%] px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-black dark:text-white">Device</th>
                    <th className="w-[32%] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-black dark:text-white">Status</th>
                    <th className="w-[28%] px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-black dark:text-white">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {liveDevices.slice(0, 4).map(device => (
                    <tr key={device.id} className="h-10 border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors">
                      <td className="max-w-0 px-4 py-2">
                        <span className="block truncate font-mono" title={device.hostname}>{device.hostname}</span>
                      </td>
                      <td className="px-2 py-2">
                        <span>{device.status === 'active' ? 'Active' : device.status.charAt(0).toUpperCase() + device.status.slice(1)}</span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {device.last_checkin ? formatDistanceToNow(new Date(device.last_checkin), { addSuffix: true }) : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Right Column */}
        <div className="contents">
          {/* Compliance by OS */}
          <SectionCard title="Compliance by OS" titleClassName="text-[13px] text-black dark:text-white" className="order-1 h-full">
            <OSComplianceBarChart data={osByScore} height={180} />
          </SectionCard>

          {/* Top Failing Checks */}
          <SectionCard title="Top Failing Checks" titleClassName="text-[13px] text-black dark:text-white" className="order-2 h-full">
            {topFailingChecks.length === 0 ? (
              <p className="text-[12px] text-muted-foreground py-4 text-center">No failing checks found.</p>
            ) : (
              <FailingChecksPieChart data={topFailingChecks} height={180} />
            )}
          </SectionCard>

        </div>
      </div>

      {/* Risk Heatmap */}
      <SectionCard title="Risk Heatmap" titleClassName="text-[13px] text-black dark:text-white">
        <RiskHeatmap
          categories={categories.map(category => getCategoryLabel(category))}
          departments={departments}
          values={heatmapData}
          height={340}
        />
      </SectionCard>

      {/* Device table snippet */}
      <SectionCard
        title="Devices"
        titleClassName="text-[13px] text-black dark:text-white"
        action={
          <Link href="/devices" className="text-[12px] text-black dark:text-white hover:text-black/80 dark:hover:text-white/80 flex items-center gap-1 transition-colors">
            View all devices <ArrowRight size={11} strokeWidth={2} />
          </Link>
        }
        noPadding
      >
        <table className="w-full table-fixed text-[12px]">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[13%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[15%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border">
              {[
                { label: 'Device', align: 'left' },
                { label: 'OS', align: 'left' },
                { label: 'IP', align: 'left' },
                { label: 'Score', align: 'right' },
                { label: 'Checks', align: 'right' },
                { label: 'Status', align: 'left' },
                { label: 'Last Seen', align: 'left' },
              ].map(h => (
                <th key={h.label} className={cn('px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground align-middle', h.align === 'right' ? 'text-right' : 'text-left', h.label === 'Checks' && 'pr-8', h.label === 'Status' && 'pl-8')}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {liveDevices.slice(0, 10).map(d => (
              <tr
                key={d.id}
                className="border-b border-border h-10 hover:bg-surface-hover transition-colors"
              >
                <td className="px-3">
                  <span className="font-mono text-[12px] font-medium text-black dark:text-white">{d.hostname}</span>
                </td>
                <td className="px-3">
                  <div className="flex items-center gap-2">
                    <OSIcon os={d.os === 'macos' ? 'Mac' : d.os.charAt(0).toUpperCase() + d.os.slice(1)} />
                    <span className="text-[12px] font-medium text-black dark:text-white">{d.os}</span>
                  </div>
                </td>
                <td className="px-3"><span className="font-mono text-[12px] font-medium text-black dark:text-white">{d.ip_address}</span></td>
                <td className="px-3 align-middle text-right">
                  <span className="inline-block text-[12px] font-semibold leading-none tabular-nums text-black dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    0%
                  </span>
                </td>
                <td className="px-3 pr-8 text-right align-middle">
                  <span className="font-mono text-[12px] font-semibold text-black dark:text-white">0</span>
                  <span className="font-mono text-[12px] font-medium text-black dark:text-white"> / 0</span>
                </td>
                <td className="px-3 pl-8">
                  <span className="text-[12px] font-semibold text-foreground">{d.status.charAt(0).toUpperCase() + d.status.slice(1)}</span>
                </td>
                <td className="px-3">
                  <span className="text-[12px] font-medium text-black dark:text-white">{d.last_checkin ? formatDistanceToNow(new Date(d.last_checkin), { addSuffix: true }) : 'Never'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3 py-2 border-t border-border flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">
            Showing {liveDevices.length === 0 ? 0 : 1}–{Math.min(liveDevices.length, 10)} of {liveDevices.length} devices
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
