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
import { getComplianceScoreColor, getStatusColor } from '@/lib/theme'
import { PageHeader } from '@/components/ui/page-header'
import { KpiCard } from '@/components/ui/kpi-card'
import { SectionCard } from '@/components/ui/section-card'
import { StatusDot, CategoryBadge } from '@/components/ui/status-badge'
import { ComplianceBar, StackedFleetBar, ComplianceDonut, ScoreBar, LastSeenIndicator } from '@/components/ui/compliance-bar'
import { OSComplianceBarChart } from '@/components/ui/charts'

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
    if (pct === 0) return 'bg-[#008080]/10'
    if (pct < 15) return 'bg-[#F79009]/15'
    if (pct < 40) return 'bg-[#F79009]/40'
    return 'bg-[#F04438]/50'
  }
  function riskText(pct: number) {
    if (pct === 0) return 'text-[#008080]/70'
    if (pct < 15) return 'text-[#F79009]'
    if (pct < 40) return 'text-[#F79009]'
    return 'text-[#F04438]'
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
          label="Avg Compliance Score"
          value={`${stats.avgScore}%`}
          delta={+3}
          deltaLabel=" pts vs last period"
          trend="up"
          trendGood={true}
          description="Good · Improving"
        />

        <KpiCard
          label="Total Devices"
          value={stats.total}
        >
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <ComplianceDonut
                compliant={stats.compliant}
                warning={stats.warning}
                critical={stats.critical}
                total={stats.total}
                size={96}
                showTotal={false}
              />
            </div>
            <div className="flex flex-col gap-1.5 text-[11px] min-w-0 ml-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-status-success shrink-0" />
                <span className="truncate">Compliant</span>
                <span className="font-mono text-foreground font-medium">{stats.compliant}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-status-warning shrink-0" />
                <span className="truncate">Warning</span>
                <span className="font-mono text-foreground font-medium">{stats.warning}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-status-critical shrink-0" />
                <span className="truncate">Critical</span>
                <span className="font-mono text-foreground font-medium">{stats.critical}</span>
              </div>
            </div>
          </div>
        </KpiCard>

        <KpiCard
          label="Devices Needing Attention"
          value={stats.needingAttention}
          delta={-2}
          deltaText="2 fewer vs last period"
          trend="down"
          trendGood={true}
          description="Devices requiring remediation"
          accentColor="#F79009"
        >
          <div className="flex items-center gap-3 text-[12px] font-medium">
            <span className="text-status-warning">{stats.warning} Warning</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-status-critical">{stats.critical} Critical</span>
          </div>
        </KpiCard>

        <KpiCard
          label="Avg MTTR"
          value="4.2h"
          delta={-0.8}
          deltaText="0.8h faster vs last period"
          trend="down"
          trendGood={true}
          description="Improving · Lower is better"
        />
      </div>

      {/* Category Health Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Link href="/active-directory" className="block group">
          <div className="bg-card border border-border rounded-md shadow-sm p-4 hover:border-brand/50 hover:bg-surface-hover transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-surface-hover flex items-center justify-center">
                  <span
                    aria-hidden="true"
                    className="h-5 w-5 bg-foreground"
                    style={{
                      maskImage: 'url(/active-directory.png)',
                      WebkitMaskImage: 'url(/active-directory.png)',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                      maskPosition: 'center',
                      WebkitMaskPosition: 'center',
                      maskSize: '130%',
                      WebkitMaskSize: '130%',
                    }}
                  />
                </div>
                <span className="text-[13px] font-semibold text-foreground">Active Directory</span>
              </div>
              <ArrowRight size={14} strokeWidth={1.5} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Domain Controllers</span>
                <span className="font-semibold text-status-success font-mono">3/3 healthy</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Failed logons (24h)</span>
                <span className="font-mono text-status-warning">47</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Stale accounts</span>
                <span className="font-mono text-foreground">11</span>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/malware-protection" className="block group">
          <div className="bg-card border border-border rounded-md shadow-sm p-4 hover:border-brand/50 hover:bg-surface-hover transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-surface-hover flex items-center justify-center">
                  <span
                    aria-hidden="true"
                    className="h-5 w-5 bg-foreground"
                    style={{
                      maskImage: 'url(/malware.png)',
                      WebkitMaskImage: 'url(/malware.png)',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                      maskPosition: 'center',
                      WebkitMaskPosition: 'center',
                      maskSize: '130%',
                      WebkitMaskSize: '130%',
                    }}
                  />
                </div>
                <span className="text-[13px] font-semibold text-foreground">Malware Protection</span>
              </div>
              <ArrowRight size={14} strokeWidth={1.5} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">RTP coverage</span>
                  <span className={`font-semibold font-mono ${stats.rtpCoverage >= 95 ? 'text-status-success' : 'text-status-warning'}`}>
                  {stats.rtpCoverage}%
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Definitions up to date</span>
                  <span className={`font-mono ${stats.defCompliance >= 90 ? 'text-status-success' : 'text-status-warning'}`}>
                  {stats.defCompliance}%
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Active detections</span>
                  <span className={`font-mono ${stats.activeDetections > 0 ? 'text-status-critical' : 'text-status-success'}`}>
                  {stats.activeDetections}
                </span>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/patch-compliance" className="block group">
          <div className="bg-card border border-border rounded-md shadow-sm p-4 hover:border-brand/50 hover:bg-surface-hover transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-surface-hover flex items-center justify-center">
                  <span
                    aria-hidden="true"
                    className="h-5 w-5 bg-foreground"
                    style={{
                      maskImage: 'url(/software-patch.png)',
                      WebkitMaskImage: 'url(/software-patch.png)',
                      maskRepeat: 'no-repeat',
                      WebkitMaskRepeat: 'no-repeat',
                      maskPosition: 'center',
                      WebkitMaskPosition: 'center',
                      maskSize: '130%',
                      WebkitMaskSize: '130%',
                    }}
                  />
                </div>
                <span className="text-[13px] font-semibold text-foreground">Patch Compliance</span>
              </div>
              <ArrowRight size={14} strokeWidth={1.5} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Fully patched</span>
                  <span className={`font-semibold font-mono ${stats.patchCompliance >= 85 ? 'text-status-success' : 'text-status-warning'}`}>
                  {stats.patchCompliance}%
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Missing critical (fleet)</span>
                  <span className={`font-mono ${stats.missingCriticalTotal > 0 ? 'text-status-critical' : 'text-status-success'}`}>
                  {stats.missingCriticalTotal}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Pending reboot</span>
                  <span className={`font-mono ${stats.pendingReboot > 2 ? 'text-status-warning' : 'text-foreground'}`}>
                  {stats.pendingReboot}
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
              <Link href="/devices" className="text-[12px] text-brand hover:text-brand/80 transition-colors flex items-center gap-1">
                View all <ArrowRight size={11} strokeWidth={2} />
              </Link>
            }
            noPadding
          >
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <AlertCircle size={20} className="text-muted-foreground" strokeWidth={1.5} />
                <p className="text-[13px] text-muted-foreground">No alerts in the selected range</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {alerts.slice(0, 7).map(alert => (
                  <div key={alert.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors">
                    <StatusDot status={alert.severity} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-foreground leading-snug">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {alert.deviceName && (
                          <span className="text-[11px] font-mono text-muted-foreground">{alert.deviceName}</span>
                        )}
                        <CategoryBadge category={alert.category} size="sm" />
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                      {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Recent Scan Activity */}
          <SectionCard title="Recent Scan Activity" noPadding>
            <div className="divide-y divide-border">
              {scanActivity.map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors">
                  <span className="font-mono text-[13px] text-foreground w-28 truncate shrink-0">{s.deviceName}</span>
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="font-mono text-[12px]" style={{ color: getComplianceScoreColor(s.previousScore) }}>{s.previousScore}%</span>
                    {s.score > s.previousScore ? (
                      <TrendingUp size={12} strokeWidth={2} className="text-[#008080]" />
                    ) : (
                      <TrendingDown size={12} strokeWidth={2} className="text-[#F04438]" />
                    )}
                    <span className="font-mono text-[12px]" style={{ color: getComplianceScoreColor(s.score) }}>{s.score}%</span>
                  </div>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: getStatusColor(s.status) }} />
                    <span className="text-[12px] font-medium capitalize text-foreground">{s.status}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(s.timestamp), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Compliance by OS */}
          <SectionCard title="Compliance by OS">
            <OSComplianceBarChart data={osByScore} height={180} />
          </SectionCard>

          {/* Top Failing Checks */}
          <SectionCard title="Top Failing Checks">
            <div className="space-y-2 pb-6">
              {topFailingChecks.length === 0 ? (
                <p className="text-[13px] text-muted-foreground py-4 text-center">No failing checks found.</p>
              ) : (
                topFailingChecks.map(check => (
                  <div key={check.id} className="flex items-center gap-3">
                    <CategoryBadge category={check.category} size="sm" className="shrink-0 w-16 justify-center" />
                    <span className="flex-1 text-[12px] text-foreground truncate" title={check.name}>{check.name}</span>
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <div className="flex-1 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(check.failingDeviceCount / devices.length) * 100}%`,
                            backgroundColor: check.severity === 'critical' ? '#F04438' : '#F79009',
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground w-8 text-right">{check.failingDeviceCount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          {/* Risk Heatmap */}
          <SectionCard title="Risk Heatmap" description="Departments × check category">
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-[11px]">
                <thead>
                  <tr>
                    <th className="text-left text-muted-foreground font-medium pb-2 pr-3">Dept</th>
                    {categories.map(cat => (
                      <th key={cat} className="text-center text-muted-foreground font-medium pb-2 px-1">
                        <CategoryBadge category={cat} size="sm" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map(row => (
                    <tr key={row.dept}>
                      <td className="text-muted-foreground py-1 pr-3 whitespace-nowrap">{row.dept}</td>
                      {row.scores.map((score, ci) => (
                        <td key={ci} className="px-1 py-1 text-center">
                          <span className={`inline-flex items-center justify-center w-10 h-7 rounded text-[11px] font-mono font-medium ${riskColor(score)} ${riskText(score)}`}>
                            {score > 0 ? `${score}%` : '—'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
        <table className="w-full text-[13px]">
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
                <th key={h.label} className={cn('px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground', h.align === 'right' ? 'text-right' : 'text-left')}>
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
                  <span className="inline-flex items-center gap-2">
                    <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: getStatusColor(d.status) }} />
                    <span className="text-[12px] font-medium capitalize text-foreground">{d.status}</span>
                  </span>
                </td>
                <td className="px-3">
                  <span className="font-mono text-[12px] text-foreground">{d.name}</span>
                </td>
                <td className="px-3">
                  <div className="flex items-center gap-2">
                    <OSIcon os={d.os} />
                    <span className="text-[12px] text-muted-foreground">{d.os}</span>
                  </div>
                </td>
                <td className="px-3"><span className="font-mono text-[12px] text-muted-foreground">{d.ip}</span></td>
                <td className="px-3 text-muted-foreground">{d.username}</td>
                <td className="px-3 text-muted-foreground">{d.department}</td>
                <td className="px-3">
                  <ScoreBar score={d.complianceScore} severity={d.status} />
                </td>
                <td className="px-3 text-right">
                  <span className="font-mono text-[12px] text-status-critical">{d.failedChecks}</span>
                  <span className="font-mono text-[12px] text-muted-foreground"> / {d.failedChecks + d.passedChecks}</span>
                </td>
                <td className="px-3">
                  <LastSeenIndicator date={d.lastSeen} />
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
