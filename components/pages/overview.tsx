'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  devices,
  alerts,
  scanActivity,
  complianceChecks,
  getFleetStats,
} from '@/lib/mock-data'
import { getComplianceScoreColor, getStatusColor, getCategoryLabel, STATUS_COLORS } from '@/lib/theme'
import { PageHeader } from '@/components/ui/page-header'
import { KpiCard } from '@/components/ui/kpi-card'
import { SectionCard } from '@/components/ui/section-card'
import { CategoryBadge } from '@/components/ui/status-badge'
import { ScoreBar, LastSeenIndicator } from '@/components/ui/compliance-bar'
import { OSComplianceBarChart, FailingChecksPieChart, RiskHeatmap } from '@/components/ui/charts'

function OSIcon({ os, className }: { os: string; className?: string }) {
  if (os === 'Windows') {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" className={className} fill="none" stroke="#0078D4" strokeWidth="1.5">
        <rect x="3" y="3" width="8" height="8" rx="1" fill="#0078D4" stroke="#0078D4"/>
        <rect x="13" y="3" width="8" height="8" rx="1" fill="#0078D4" stroke="#0078D4"/>
        <rect x="3" y="13" width="8" height="8" rx="1" fill="#0078D4" stroke="#0078D4"/>
        <rect x="13" y="13" width="8" height="8" rx="1" fill="#0078D4" stroke="#0078D4"/>
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
  const stats = getFleetStats()

  const osByScore = [
    { os: 'Windows', score: stats.byOS.Windows.avg },
    { os: 'macOS', score: stats.byOS.Mac.avg },
    { os: 'Linux', score: stats.byOS.Linux.avg },
  ]

  const topFailingChecks = [...complianceChecks]
    .sort((a, b) => b.failingDeviceCount - a.failingDeviceCount)
    .slice(0, 5)
    .map(check => ({ name: check.name, value: check.failingDeviceCount }))

  // Risk heatmap: departments × category
  const departments = ['Engineering', 'Finance', 'Sales', 'HR', 'IT', 'Marketing', 'Design']
  const categories = ['malware_protection', 'os_updates', 'active_directory', 'other'] as const
  const heatmapData = departments.map(dept => {
    const deptDevices = devices.filter(d => d.department === dept)
    return {
      dept,
      scores: categories.map(cat => {
        const checks = complianceChecks.filter(c => c.category === cat)
        const failing = checks.reduce((s, c) => s + (deptDevices.length > 0 ? Math.floor((c.failingDeviceCount / devices.length) * deptDevices.length) : 0), 0)
        const total = checks.length * deptDevices.length
        const risk = total > 0 ? Math.min(100, Math.round((failing / total) * 100)) : 0
        return risk
      }),
    }
  })

  function riskColor(pct: number) {
    if (pct === 0) return 'bg-[#495afb]/10'
    if (pct < 15) return 'bg-[#ffc758]/15'
    if (pct < 40) return 'bg-[#ffc758]/40'
    return 'bg-[#f35865]/50'
  }
  function riskText(pct: number) {
    if (pct === 0) return 'text-[#495afb]/70'
    if (pct < 15) return 'text-[#ffc758]'
    if (pct < 40) return 'text-[#ffc758]'
    return 'text-[#f35865]'
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description="Fleet compliance summary."
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          label="Average Fleet Score"
          value={`${stats.avgScore}%`}
          className="pt-9"
          description={
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#495afb] shrink-0" />
              Healthy
            </span>
          }
        />

        <KpiCard
          label="Total Devices"
        >
          <FailingChecksPieChart
            data={[
              { name: 'Healthy', value: stats.compliant },
              { name: 'Warning', value: stats.warning },
              { name: 'Critical', value: stats.critical },
            ]}
            height={96}
            showArcLabels={false}
            showTotal
            totalOverride={24}
            colors={['#495afb', '#ffc758', '#f35865']}
          />
        </KpiCard>

        <KpiCard
          label="Devices Needing Attention"
          className="pt-9"
          childrenClassName="mt-0"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="text-[30px] font-semibold leading-none tabular-nums text-black dark:text-white">
              {stats.needingAttention}
            </span>
            <div className="flex flex-col gap-1.5 pt-6 text-[12px] font-medium text-black dark:text-white">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-warning shrink-0" />
                Warning ({stats.warning})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-status-critical shrink-0" />
                Critical ({stats.critical})
              </span>
            </div>
          </div>
        </KpiCard>

        <KpiCard
          label="Avg MTTR"
          value="4.2h"
          className="pt-9"
          description="Improving · Lower is better"
        />
      </div>

      {/* Category Health Row */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Link href="/active-directory" className="block group">
          <div className="relative h-full min-h-[160px] bg-card border border-border rounded-md shadow-sm px-4 pb-4 pt-8 hover:border-brand/50 hover:bg-surface-hover transition-colors">
            <div className="absolute left-1/2 -top-3 -translate-x-1/2 z-10 bg-card border border-border rounded-full px-5 py-1 text-center whitespace-nowrap">
              <span className="text-[12px] font-semibold text-black dark:text-white">Active Directory</span>
            </div>
            <div className="space-y-2 text-[12px] font-medium text-black dark:text-white">
              <div className="flex justify-between text-[12px]">
                <span className="text-black dark:text-white">Domain Controllers</span>
                <span className="text-black dark:text-white tabular-nums">healthy (3/3)</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-black dark:text-white">Failed logons (24h)</span>
                <span className="text-black dark:text-white tabular-nums">(47)</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-black dark:text-white">Stale accounts</span>
                <span className="text-black dark:text-white tabular-nums">(11)</span>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/malware-protection" className="block group">
          <div className="relative h-full min-h-[160px] bg-card border border-border rounded-md shadow-sm px-4 pb-4 pt-8 hover:border-brand/50 hover:bg-surface-hover transition-colors">
            <div className="absolute left-1/2 -top-3 -translate-x-1/2 z-10 bg-card border border-border rounded-full px-5 py-1 text-center whitespace-nowrap">
              <span className="text-[12px] font-semibold text-black dark:text-white">Malware Protection</span>
            </div>
            <div className="space-y-2 text-[12px] font-medium text-black dark:text-white">
              <div className="flex justify-between text-[12px]">
                <span className="text-black dark:text-white">RTP coverage</span>
                  <span className="text-black dark:text-white tabular-nums">
                  ({stats.rtpCoverage}%)
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-black dark:text-white">Definitions up to date</span>
                  <span className="text-black dark:text-white tabular-nums">
                  ({stats.defCompliance}%)
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-black dark:text-white">Active detections</span>
                  <span className="text-black dark:text-white tabular-nums">
                  ({stats.activeDetections})
                </span>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/patch-compliance" className="block group">
          <div className="relative h-full min-h-[160px] bg-card border border-border rounded-md shadow-sm px-4 pb-4 pt-8 hover:border-brand/50 hover:bg-surface-hover transition-colors">
            <div className="absolute left-1/2 -top-3 -translate-x-1/2 z-10 bg-card border border-border rounded-full px-5 py-1 text-center whitespace-nowrap">
              <span className="text-[12px] font-semibold text-black dark:text-white">Patch Compliance</span>
            </div>
            <div className="space-y-2 text-[12px] font-medium text-black dark:text-white">
              <div className="flex justify-between text-[12px]">
                <span className="text-black dark:text-white">Fully patched</span>
                  <span className="text-black dark:text-white tabular-nums">
                  ({stats.patchCompliance}%)
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-black dark:text-white">Missing critical (fleet)</span>
                  <span className="text-black dark:text-white tabular-nums">
                  ({stats.missingCriticalTotal})
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-black dark:text-white">Pending reboot</span>
                  <span className="text-black dark:text-white tabular-nums">
                  ({stats.pendingReboot})
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Alerts Feed */}
          <SectionCard
            title="Recent Alerts"
            action={
              <Link href="/devices" className="text-[12px] text-black dark:text-white hover:text-black/70 dark:hover:text-white/70 transition-colors flex items-center gap-1">
                View all <ArrowRight size={11} strokeWidth={2} />
              </Link>
            }
            noPadding
          >
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <AlertCircle size={20} className="text-muted-foreground" strokeWidth={1.5} />
                <p className="text-[12px] text-muted-foreground">No alerts in the selected range</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-[12px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-[44%] px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-black dark:text-white">Threat</th>
                      <th className="w-[22%] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-black dark:text-white">Device</th>
                      <th className="w-[18%] px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-black dark:text-white">Category</th>
                      <th className="w-[16%] px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-black dark:text-white">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.slice(0, 7).map(alert => (
                      <tr key={alert.id} className="h-10 border-b border-border font-medium last:border-b-0 hover:bg-surface-hover transition-colors">
                        <td className="max-w-0 px-4 py-2">
                          <span className="block truncate text-foreground" title={alert.message}>{alert.message}</span>
                        </td>
                        <td className="max-w-0 px-2 py-2 text-black dark:text-white">
                          <span className="block truncate font-mono">{alert.deviceName ?? '—'}</span>
                        </td>
                        <td className="px-2 py-2 text-foreground">{getCategoryLabel(alert.category)}</td>
                        <td className="px-4 py-2 text-right text-black dark:text-white whitespace-nowrap">
                          {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Recent Scan Activity */}
          <SectionCard title="Recent Scan Activity" titleClassName="text-black dark:text-white" noPadding>
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
                  {scanActivity.map((s, i) => (
                    <tr key={i} className="h-10 border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors">
                      <td className="max-w-0 px-4 py-2">
                        <span className="block truncate font-mono" title={s.deviceName}>{s.deviceName}</span>
                      </td>
                      <td className="px-2 py-2">
                        <span>{s.status === 'compliant' ? 'Healthy' : s.status.charAt(0).toUpperCase() + s.status.slice(1)}</span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {formatDistanceToNow(new Date(s.timestamp), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Compliance by OS */}
          <SectionCard title="Compliance by OS" titleClassName="text-black dark:text-white">
            <OSComplianceBarChart data={osByScore} height={180} />
          </SectionCard>

          {/* Top Failing Checks */}
          <SectionCard title="Top Failing Checks" titleClassName="text-black dark:text-white">
            {topFailingChecks.length === 0 ? (
              <p className="text-[12px] text-muted-foreground py-4 text-center">No failing checks found.</p>
            ) : (
              <FailingChecksPieChart data={topFailingChecks} height={180} />
            )}
          </SectionCard>

          {/* Risk Heatmap */}
          <SectionCard title="Risk Heatmap" titleClassName="text-black dark:text-white">
            <RiskHeatmap
              categories={categories.map(category => getCategoryLabel(category))}
              departments={departments}
              values={heatmapData.map(row => row.scores)}
              height={260}
            />
          </SectionCard>
        </div>
      </div>

      {/* Device table snippet */}
      <SectionCard
        title="Devices"
        action={
          <Link href="/devices" className="text-[12px] text-brand hover:text-brand/80 flex items-center gap-1 transition-colors">
            View all devices <ArrowRight size={11} strokeWidth={2} />
          </Link>
        }
        noPadding
      >
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-border">
              {[
                { label: 'Status', align: 'left' },
                { label: 'Device', align: 'left' },
                { label: 'OS', align: 'left' },
                { label: 'IP', align: 'left' },
                { label: 'User', align: 'left' },
                { label: 'Dept', align: 'left' },
                { label: 'Score', align: 'right' },
                { label: 'Checks', align: 'right' },
                { label: 'Last Seen', align: 'left' },
              ].map(h => (
                <th key={h.label} className={cn('px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground align-middle', h.align === 'right' ? 'text-right' : 'text-left')}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devices.slice(0, 10).map(d => (
              <tr
                key={d.id}
                className="border-b border-border h-10 hover:bg-surface-hover transition-colors"
              >
                <td className="px-3">
                  <span className="text-[12px] font-semibold text-black dark:text-white">{d.status === 'compliant' ? 'Healthy' : d.status.charAt(0).toUpperCase() + d.status.slice(1)}</span>
                </td>
                <td className="px-3">
                  <span className="font-mono text-[12px] font-medium text-black dark:text-white">{d.name}</span>
                </td>
                <td className="px-3">
                  <div className="flex items-center gap-2">
                    <OSIcon os={d.os} />
                    <span className="text-[12px] font-medium text-black dark:text-white">{d.os}</span>
                  </div>
                </td>
                <td className="px-3"><span className="font-mono text-[12px] font-medium text-black dark:text-white">{d.ip}</span></td>
                <td className="px-3 text-[12px] font-medium text-black dark:text-white">{d.username}</td>
                <td className="px-3 text-[12px] font-medium text-black dark:text-white">{d.department}</td>
                <td className="px-3 align-middle text-right">
                  <span className="inline-block text-[12px] font-semibold leading-none tabular-nums text-black dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {d.complianceScore}%
                  </span>
                </td>
                <td className="px-3 text-right align-middle">
                  <span className="font-mono text-[12px] font-semibold text-black dark:text-white">{d.failedChecks}</span>
                  <span className="font-mono text-[12px] font-medium text-black dark:text-white"> / {d.failedChecks + d.passedChecks}</span>
                </td>
                <td className="px-3">
                  <span className="text-[12px] font-medium text-black dark:text-white">{formatDistanceToNow(new Date(d.lastSeen), { addSuffix: true })}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3 py-2 border-t border-border flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">
            Showing 1–{Math.min(devices.length, 10)} of {devices.length} devices
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
