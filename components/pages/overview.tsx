'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, Network, ShieldAlert, RefreshCw, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react'
import {
  devices,
  alerts,
  scanActivity,
  complianceTrend,
  complianceChecks,
  getFleetStats,
} from '@/lib/mock-data'
import { CATEGORY_COLORS, getComplianceScoreColor } from '@/lib/theme'
import { PageHeader } from '@/components/ui/page-header'
import { KpiCard } from '@/components/ui/kpi-card'
import { SectionCard } from '@/components/ui/section-card'
import { StatusDot, CategoryBadge, StatusBadge } from '@/components/ui/status-badge'
import { ComplianceBar, StackedFleetBar, ComplianceDonut } from '@/components/ui/compliance-bar'
import { ComplianceLineChart, OSComplianceBarChart } from '@/components/ui/charts'

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
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          label="Avg Compliance Score"
          value={`${stats.avgScore}%`}
          delta={+3}
          deltaLabel="% vs last period"
          trend="up"
          trendGood={true}
        >
          <ComplianceLineChart data={complianceTrend} height={48} />
        </KpiCard>

        <KpiCard
          label="Total Devices"
          value={stats.total}
          description={`${stats.compliant} compliant, ${stats.warning} warning, ${stats.critical} critical`}
        >
          <div className="flex items-center gap-4">
            <ComplianceDonut
              compliant={stats.compliant}
              warning={stats.warning}
              critical={stats.critical}
              total={stats.total}
              size={100}
            />
            <div className="space-y-1.5 text-[12px]">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-[#008080]" />
                Compliant <span className="font-mono text-foreground font-medium">{stats.compliant}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-[#F79009]" />
                Warning <span className="font-mono text-foreground font-medium">{stats.warning}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-[#F04438]" />
                Critical <span className="font-mono text-foreground font-medium">{stats.critical}</span>
              </div>
            </div>
          </div>
        </KpiCard>

        <KpiCard
          label="Devices Needing Attention"
          value={stats.needingAttention}
          delta={-2}
          deltaLabel=" vs last period"
          trend="down"
          trendGood={true}
          description={`${stats.warning} warning · ${stats.critical} critical`}
        />

        <KpiCard
          label="Avg MTTR"
          value="4.2h"
          delta={-0.8}
          deltaLabel="h vs last period"
          trend="down"
          trendGood={true}
          description="Mean time to remediate critical findings"
        />
      </div>

      {/* Category Health Row */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/active-directory" className="block group">
          <div className="bg-card border border-border rounded-md p-4 hover:border-[#8B7FE8]/40 hover:bg-surface-hover transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: `${CATEGORY_COLORS.active_directory}18` }}>
                  <Network size={15} strokeWidth={1.5} style={{ color: CATEGORY_COLORS.active_directory }} />
                </div>
                <span className="text-[13px] font-semibold text-foreground">Active Directory</span>
              </div>
              <ArrowRight size={14} strokeWidth={1.5} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Domain Controllers</span>
                <span className="font-semibold text-[#008080] font-mono">3/3 healthy</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Failed logons (24h)</span>
                <span className="font-mono text-[#F79009]">47</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Stale accounts</span>
                <span className="font-mono text-foreground">11</span>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/malware-protection" className="block group">
          <div className="bg-card border border-border rounded-md p-4 hover:border-[#E87F9B]/40 hover:bg-surface-hover transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: `${CATEGORY_COLORS.malware_protection}18` }}>
                  <ShieldAlert size={15} strokeWidth={1.5} style={{ color: CATEGORY_COLORS.malware_protection }} />
                </div>
                <span className="text-[13px] font-semibold text-foreground">Malware Protection</span>
              </div>
              <ArrowRight size={14} strokeWidth={1.5} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">RTP coverage</span>
                <span className={`font-semibold font-mono ${stats.rtpCoverage >= 95 ? 'text-[#008080]' : 'text-[#F79009]'}`}>
                  {stats.rtpCoverage}%
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Definitions up to date</span>
                <span className={`font-mono ${stats.defCompliance >= 90 ? 'text-[#008080]' : 'text-[#F79009]'}`}>
                  {stats.defCompliance}%
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Active detections</span>
                <span className={`font-mono ${stats.activeDetections > 0 ? 'text-[#F04438]' : 'text-[#008080]'}`}>
                  {stats.activeDetections}
                </span>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/patch-compliance" className="block group">
          <div className="bg-card border border-border rounded-md p-4 hover:border-[#7FC4E8]/40 hover:bg-surface-hover transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: `${CATEGORY_COLORS.os_updates}18` }}>
                  <RefreshCw size={15} strokeWidth={1.5} style={{ color: CATEGORY_COLORS.os_updates }} />
                </div>
                <span className="text-[13px] font-semibold text-foreground">Patch Compliance</span>
              </div>
              <ArrowRight size={14} strokeWidth={1.5} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Fully patched</span>
                <span className={`font-semibold font-mono ${stats.patchCompliance >= 85 ? 'text-[#008080]' : 'text-[#F79009]'}`}>
                  {stats.patchCompliance}%
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Missing critical (fleet)</span>
                <span className={`font-mono ${stats.missingCriticalTotal > 0 ? 'text-[#F04438]' : 'text-[#008080]'}`}>
                  {stats.missingCriticalTotal}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Pending reboot</span>
                <span className={`font-mono ${stats.pendingReboot > 2 ? 'text-[#F79009]' : 'text-foreground'}`}>
                  {stats.pendingReboot}
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-2 gap-4">
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
                  <StatusBadge status={s.status} size="sm" />
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
          {/* Compliance Distribution */}
          <SectionCard title="Compliance Distribution">
            <div className="flex items-center gap-6">
              <ComplianceDonut
                compliant={stats.compliant}
                warning={stats.warning}
                critical={stats.critical}
                total={stats.total}
                size={160}
              />
              <div className="space-y-3 text-[13px]">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#008080]" />
                  Compliant <span className="font-mono text-foreground font-medium">{stats.compliant}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F79009]" />
                  Warning <span className="font-mono text-foreground font-medium">{stats.warning}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F04438]" />
                  Critical <span className="font-mono text-foreground font-medium">{stats.critical}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Compliance by OS */}
          <SectionCard title="Compliance by OS">
            <OSComplianceBarChart data={osByScore} height={130} />
          </SectionCard>

          {/* Top Failing Checks */}
          <SectionCard title="Top Failing Checks">
            <div className="space-y-2">
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
            <div className="overflow-x-auto">
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
              {['Status', 'Device', 'IP', 'User', 'Score', 'Checks', 'Last Seen'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devices.slice(0, 10).map(d => (
              <tr key={d.id} className="border-b border-border h-10 hover:bg-surface-hover transition-colors">
                <td className="px-3"><StatusDot status={d.status} /></td>
                <td className="px-3">
                  <span className="font-mono text-[12px] text-foreground">{d.name}</span>
                  <span className="ml-2 text-[11px] text-muted-foreground">{d.os}</span>
                </td>
                <td className="px-3"><span className="font-mono text-[12px] text-muted-foreground">{d.ip}</span></td>
                <td className="px-3 text-muted-foreground">{d.username}</td>
                <td className="px-3">
                  <div className="flex items-center gap-2">
                    <ComplianceBar score={d.complianceScore} height={4} className="w-16" />
                    <span className="font-mono text-[12px]" style={{ color: getComplianceScoreColor(d.complianceScore) }}>{d.complianceScore}%</span>
                  </div>
                </td>
                <td className="px-3 text-right font-mono text-[12px]">
                  <span className="text-[#F04438]">{d.failedChecks}</span>
                  <span className="text-muted-foreground"> / {d.passedChecks + d.failedChecks}</span>
                </td>
                <td className="px-3 text-muted-foreground text-[12px]">
                  {formatDistanceToNow(new Date(d.lastSeen), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  )
}
