'use client'

import { formatDistanceToNow, format } from 'date-fns'
import { Network, CheckCircle2, XCircle, AlertTriangle, ArrowUpRight, ArrowDownRight, Users, Clock } from 'lucide-react'
import { adDomainStatus, authActivityTrend } from '@/lib/mock-data'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import { KpiCard } from '@/components/ui/kpi-card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cn } from '@/lib/utils'

const ANOMALY_LABELS = {
  kerberoasting: 'Kerberoasting',
  golden_ticket: 'Golden Ticket',
  silver_ticket: 'Silver Ticket',
  as_rep_roasting: 'AS-REP Roasting',
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-md px-3 py-2 text-[12px] shadow-lg">
      <p className="text-muted-foreground mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="text-foreground font-mono font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function ActiveDirectoryPage() {
  const { domainControllers, failedLogons24h, successfulLogons24h, privilegedGroupChanges, kerberosAnomalies, staleAccounts } = adDomainStatus
  const allDcsHealthy = domainControllers.every(dc => dc.online && dc.replicationHealthy)
  const failRate = Math.round((failedLogons24h / (failedLogons24h + successfulLogons24h)) * 100 * 10) / 10

  const trendData = authActivityTrend.map(d => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Active Directory"
        description="Domain controller health, authentication activity, and privileged access monitoring."
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Domain Controllers"
          value={`${domainControllers.filter(d => d.online).length}/${domainControllers.length}`}
          description={allDcsHealthy ? 'All controllers healthy' : 'Replication issue detected'}
          accentColor={allDcsHealthy ? '#008080' : '#F04438'}
          trend={allDcsHealthy ? 'up' : 'down'}
          trendGood={true}
        />
        <KpiCard
          label="Failed Logons (24h)"
          value={failedLogons24h}
          description={`${failRate}% failure rate`}
          accentColor={failedLogons24h > 40 ? '#F79009' : '#008080'}
          trend={failedLogons24h > 40 ? 'up' : 'flat'}
          trendGood={false}
        />
        <KpiCard
          label="Kerberos Anomalies"
          value={kerberosAnomalies.length}
          description="Suspicious Kerberos events"
          accentColor={kerberosAnomalies.length > 0 ? '#F04438' : '#008080'}
          trend={kerberosAnomalies.length > 0 ? 'up' : 'flat'}
          trendGood={false}
        />
        <KpiCard
          label="Stale Accounts"
          value={staleAccounts}
          description="Inactive for 90+ days"
          accentColor={staleAccounts > 5 ? '#F79009' : '#008080'}
          trend={staleAccounts > 5 ? 'up' : 'flat'}
          trendGood={false}
        />
      </div>

      {/* Domain Controllers */}
      <SectionCard title="Domain Controllers">
        <div className="space-y-2">
          {domainControllers.map(dc => (
            <div key={dc.name} className="flex items-center justify-between bg-surface border border-border rounded-md px-4 py-3">
              <div className="flex items-center gap-3">
                <Network size={16} strokeWidth={1.5} className={dc.online ? 'text-[#008080]' : 'text-[#F04438]'} />
                <div>
                  <p className="font-mono text-[13px] font-medium text-foreground">{dc.name}</p>
                  <p className="text-[11px] text-muted-foreground">{dc.site}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5">
                  {dc.online
                    ? <CheckCircle2 size={13} strokeWidth={2} className="text-[#008080]" />
                    : <XCircle size={13} strokeWidth={2} className="text-[#F04438]" />}
                  <span className={cn('text-[12px]', dc.online ? 'text-[#008080]' : 'text-[#F04438]')}>
                    {dc.online ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {dc.replicationHealthy
                    ? <CheckCircle2 size={13} strokeWidth={2} className="text-[#008080]" />
                    : <AlertTriangle size={13} strokeWidth={2} className="text-[#F79009]" />}
                  <span className={cn('text-[12px]', dc.replicationHealthy ? 'text-[#008080]' : 'text-[#F79009]')}>
                    {dc.replicationHealthy ? 'Replication OK' : 'Replication Issue'}
                  </span>
                </div>
                <div className="text-[12px] text-muted-foreground hidden md:block">
                  Last replicated {formatDistanceToNow(new Date(dc.lastReplication), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Auth Activity Chart + Kerberos side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Chart */}
        <SectionCard title="Authentication Activity (14d)" className="lg:col-span-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barGap={2} barSize={8}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#9AA3AF', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9AA3AF', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(v) => <span style={{ color: '#9AA3AF', fontSize: 11 }}>{v}</span>}
                />
                <Bar dataKey="successful" name="Successful" fill="#008080" radius={[2, 2, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill="#F04438" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Kerberos Anomalies */}
        <SectionCard title="Kerberos Anomalies">
          {kerberosAnomalies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <CheckCircle2 size={20} strokeWidth={1.5} className="text-[#008080]" />
              <p className="text-[13px] text-muted-foreground">No anomalies detected</p>
            </div>
          ) : (
            <div className="space-y-2">
              {kerberosAnomalies.map((a, i) => (
                <div key={i} className="bg-surface border border-border rounded-md px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide',
                          a.severity === 'critical' ? 'bg-[#F04438]/15 text-[#F04438]' : 'bg-[#F79009]/15 text-[#F79009]'
                        )}
                      >
                        {a.severity}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-[13px] text-foreground font-medium mt-1.5">
                    {ANOMALY_LABELS[a.type] ?? a.type}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{a.account}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Privileged Group Changes */}
      <SectionCard title="Privileged Group Changes" description="Recent modifications to high-privilege AD groups.">
        <div className="space-y-0">
          <div className="grid grid-cols-4 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            <span>Time</span>
            <span>Account</span>
            <span>Group</span>
            <span>Action</span>
          </div>
          {privilegedGroupChanges.map((change, i) => (
            <div key={i} className="grid grid-cols-4 px-3 py-2.5 text-[13px] border-b border-border last:border-0 hover:bg-surface-hover transition-colors items-center">
              <span className="text-muted-foreground text-[12px]">
                {formatDistanceToNow(new Date(change.timestamp), { addSuffix: true })}
              </span>
              <span className="font-mono text-foreground text-[12px]">{change.account}</span>
              <span className="text-muted-foreground text-[12px]">{change.group}</span>
              <div className="flex items-center gap-1.5">
                {change.action === 'added'
                  ? <ArrowUpRight size={13} strokeWidth={2} className="text-[#F04438]" />
                  : <ArrowDownRight size={13} strokeWidth={2} className="text-[#008080]" />}
                <span className={cn('text-[12px] font-medium capitalize', change.action === 'added' ? 'text-[#F04438]' : 'text-[#008080]')}>
                  {change.action}
                </span>
                {change.source && (
                  <span className="text-[11px] text-muted-foreground ml-1">via {change.source}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="bg-card border border-border rounded-md p-4 col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Logon Summary (24h)</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} strokeWidth={1.5} className="text-[#008080]" />
              <div>
                <p className="text-[22px] font-semibold tabular-nums text-[#008080]">{successfulLogons24h.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">Successful</p>
              </div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex items-center gap-2">
              <XCircle size={16} strokeWidth={1.5} className="text-[#F04438]" />
              <div>
                <p className="text-[22px] font-semibold tabular-nums text-[#F04438]">{failedLogons24h}</p>
                <p className="text-[11px] text-muted-foreground">Failed ({failRate}%)</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-md p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Stale Accounts</p>
          <div className="flex items-center gap-2">
            <Users size={16} strokeWidth={1.5} className="text-[#F79009]" />
            <span className="text-[30px] font-semibold tabular-nums text-[#F79009]">{staleAccounts}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">No login in 90+ days</p>
        </div>
        <div className="bg-card border border-border rounded-md p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Group Changes (7d)</p>
          <div className="flex items-center gap-2">
            <Clock size={16} strokeWidth={1.5} className="text-brand" />
            <span className="text-[30px] font-semibold tabular-nums text-brand">{privilegedGroupChanges.length}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Privileged group changes</p>
        </div>
      </div>
    </div>
  )
}
