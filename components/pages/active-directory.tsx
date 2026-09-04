'use client'

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Network, CheckCircle2, XCircle, AlertTriangle, ArrowUpRight, ArrowDownRight, Users, Clock, Eye, X } from 'lucide-react'
import { adDomainStatus, authActivityTrend } from '@/lib/mock-data'
import type { ADAccountRecord, KerberosEventRecord } from '@/lib/types'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import { KpiCard } from '@/components/ui/kpi-card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cn } from '@/lib/utils'
import { STATUS_COLORS } from '@/lib/theme'

const ANOMALY_LABELS = {
  kerberoasting: 'Kerberoasting',
  golden_ticket: 'Golden Ticket',
  silver_ticket: 'Silver Ticket',
  as_rep_roasting: 'AS-REP Roasting',
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-md px-3 py-2 text-[12px] font-medium shadow-lg">
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

function ADDetailDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-[520px] flex-col overflow-y-auto border-l border-border bg-card">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close details" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-surface-hover hover:text-foreground">
            <X size={15} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </aside>
    </div>
  )
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-b border-border py-2.5 last:border-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-[12px] text-foreground', mono && 'font-mono')}>{value}</p>
    </div>
  )
}

export function ActiveDirectoryPage() {
  const { domainControllers, failedLogons24h, successfulLogons24h, privilegedGroupChanges, kerberosAnomalies, staleAccounts } = adDomainStatus
  const [selectedStaleAccount, setSelectedStaleAccount] = useState<ADAccountRecord | null>(null)
  const [selectedKerberosEvent, setSelectedKerberosEvent] = useState<KerberosEventRecord | null>(null)
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
          accentColor={allDcsHealthy ? STATUS_COLORS.compliant : STATUS_COLORS.critical}
          trend={allDcsHealthy ? 'up' : 'down'}
          trendGood={true}
        />
        <KpiCard
          label="Failed Logons (24h)"
          value={failedLogons24h}
          description={`${failRate}% failure rate`}
          accentColor={failedLogons24h > 40 ? STATUS_COLORS.warning : STATUS_COLORS.compliant}
          trend={failedLogons24h > 40 ? 'up' : 'flat'}
          trendGood={false}
        />
        <KpiCard
          label="Kerberos Anomalies"
          value={kerberosAnomalies.length}
          description="Suspicious Kerberos events"
          accentColor={kerberosAnomalies.length > 0 ? STATUS_COLORS.critical : STATUS_COLORS.compliant}
          trend={kerberosAnomalies.length > 0 ? 'up' : 'flat'}
          trendGood={false}
        />
        <KpiCard
          label="Stale Accounts"
          value={staleAccounts}
          description="Inactive for 90+ days"
          accentColor={staleAccounts > 5 ? STATUS_COLORS.warning : STATUS_COLORS.compliant}
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
                  <p className="font-mono text-[12px] font-semibold text-foreground">{dc.name}</p>
                  <p className="text-[12px] text-muted-foreground">{dc.site}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5">
                  {dc.online
                    ? <CheckCircle2 size={13} strokeWidth={2} className="text-[#008080]" />
                    : <XCircle size={13} strokeWidth={2} className="text-[#F04438]" />}
                  <span className={cn('text-[12px] font-medium', dc.online ? 'text-[#008080]' : 'text-[#F04438]')}>
                    {dc.online ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {dc.replicationHealthy
                    ? <CheckCircle2 size={13} strokeWidth={2} className="text-[#008080]" />
                    : <AlertTriangle size={13} strokeWidth={2} className="text-[#F79009]" />}
                  <span className={cn('text-[12px] font-medium', dc.replicationHealthy ? 'text-[#008080]' : 'text-[#F79009]')}>
                    {dc.replicationHealthy ? 'Replication OK' : 'Replication Issue'}
                  </span>
                </div>
                <div className="text-[12px] font-medium text-muted-foreground hidden md:block">
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
              <p className="text-[12px] font-medium text-muted-foreground">No anomalies detected</p>
            </div>
          ) : (
            <div className="space-y-2">
              {kerberosAnomalies.map((a, i) => (
                <button type="button" key={i} onClick={() => setSelectedKerberosEvent(adDomainStatus.kerberosEvents[i])} className="block w-full bg-surface border border-border rounded-md px-3 py-2.5 text-left transition-colors hover:bg-surface-hover">
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
                    <span className="text-[12px] font-medium text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-[12px] text-foreground font-semibold mt-1.5">
                    {ANOMALY_LABELS[a.type] ?? a.type}
                  </p>
                  <p className="font-mono text-[12px] font-medium text-muted-foreground mt-0.5">{a.account}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand"><Eye size={12} /> View event details</span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Backend-ready historical records */}
      <SectionCard title="Stale Accounts" description="Accounts with no successful logon for 90+ days. Select a record to inspect its directory source and account attributes.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Account</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Last logon</th><th className="px-3 py-2">Source DC</th><th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {adDomainStatus.staleAccountRecords.map(account => (
                <tr key={account.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-3 py-2.5 font-mono font-semibold text-foreground">{account.accountName}</td>
                  <td className="px-3 py-2.5 capitalize text-muted-foreground">{account.accountType}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{formatDistanceToNow(new Date(account.lastLogon), { addSuffix: true })}</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{account.sourceDomainController}</td>
                  <td className="px-3 py-2.5 text-right"><button type="button" onClick={() => setSelectedStaleAccount(account)} className="inline-flex items-center gap-1 text-brand hover:underline"><Eye size={13} /> Details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Kerberos Event History" description="Normalized domain-controller security events retained for investigation and correlation.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Time</th><th className="px-3 py-2">Event</th><th className="px-3 py-2">Account</th><th className="px-3 py-2">Client</th><th className="px-3 py-2">Source DC</th><th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {adDomainStatus.kerberosEvents.map(event => (
                <tr key={event.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold text-foreground">{event.eventId}</td>
                  <td className="px-3 py-2.5 font-mono text-foreground">{event.account}</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{event.clientHost}</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{event.sourceDomainController}</td>
                  <td className="px-3 py-2.5 text-right"><button type="button" onClick={() => setSelectedKerberosEvent(event)} className="inline-flex items-center gap-1 text-brand hover:underline"><Eye size={13} /> Details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Privileged Group Changes */}
      <SectionCard title="Privileged Group Changes" description="Recent modifications to high-privilege AD groups.">
        <div className="space-y-0">
          <div className="grid grid-cols-4 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground border-b border-border">
            <span>Time</span>
            <span>Account</span>
            <span>Group</span>
            <span>Action</span>
          </div>
          {privilegedGroupChanges.map((change, i) => (
            <div key={i} className="grid grid-cols-4 px-3 py-2.5 text-[12px] font-medium border-b border-border last:border-0 hover:bg-surface-hover transition-colors items-center">
              <span className="text-muted-foreground text-[12px]">
                {formatDistanceToNow(new Date(change.timestamp), { addSuffix: true })}
              </span>
              <span className="font-mono font-semibold text-foreground text-[12px]">{change.account}</span>
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
        <div className="bg-card border border-border rounded-md shadow-sm p-4 col-span-2">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-foreground mb-3">Logon Summary (24h)</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} strokeWidth={1.5} className="text-[#008080]" />
              <div>
                <p className="text-[30px] font-semibold leading-none tabular-nums text-[#008080]">{successfulLogons24h.toLocaleString()}</p>
                <p className="text-[12px] font-medium text-muted-foreground">Successful</p>
              </div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex items-center gap-2">
              <XCircle size={16} strokeWidth={1.5} className="text-[#F04438]" />
              <div>
                <p className="text-[30px] font-semibold leading-none tabular-nums text-[#F04438]">{failedLogons24h}</p>
                <p className="text-[12px] font-medium text-muted-foreground">Failed ({failRate}%)</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-md shadow-sm p-4">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-foreground mb-2">Stale Accounts</p>
          <div className="flex items-center gap-2">
            <Users size={16} strokeWidth={1.5} className="text-[#F79009]" />
            <span className="text-[30px] font-semibold tabular-nums text-[#F79009]">{staleAccounts}</span>
          </div>
          <p className="text-[12px] font-medium text-muted-foreground mt-1">No login in 90+ days</p>
        </div>
        <div className="bg-card border border-border rounded-md shadow-sm p-4">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-foreground mb-2">Group Changes (7d)</p>
          <div className="flex items-center gap-2">
            <Clock size={16} strokeWidth={1.5} className="text-brand" />
            <span className="text-[30px] font-semibold tabular-nums text-brand">{privilegedGroupChanges.length}</span>
          </div>
          <p className="text-[12px] font-medium text-muted-foreground mt-1">Privileged group changes</p>
        </div>
      </div>

      {selectedStaleAccount && (
        <ADDetailDrawer title={`Stale account: ${selectedStaleAccount.accountName}`} onClose={() => setSelectedStaleAccount(null)}>
          <div className="divide-y divide-border rounded-md border border-border bg-surface px-3">
            <DetailField label="Account" value={selectedStaleAccount.accountName} mono />
            <DetailField label="Display name" value={selectedStaleAccount.displayName ?? 'Not provided'} />
            <DetailField label="Account type" value={selectedStaleAccount.accountType} />
            <DetailField label="Last logon" value={format(new Date(selectedStaleAccount.lastLogon), 'MMM d, yyyy HH:mm')} />
            <DetailField label="Password last set" value={selectedStaleAccount.passwordLastSet ? format(new Date(selectedStaleAccount.passwordLastSet), 'MMM d, yyyy HH:mm') : 'Not provided'} />
            <DetailField label="Password never expires" value={selectedStaleAccount.passwordNeverExpires ? 'Yes' : 'No'} />
            <DetailField label="Organizational unit" value={selectedStaleAccount.organizationalUnit} mono />
            <DetailField label="Distinguished name" value={selectedStaleAccount.distinguishedName} mono />
            <DetailField label="Source domain controller" value={selectedStaleAccount.sourceDomainController} mono />
          </div>
        </ADDetailDrawer>
      )}

      {selectedKerberosEvent && (
        <ADDetailDrawer title={`Kerberos event ${selectedKerberosEvent.eventId}`} onClose={() => setSelectedKerberosEvent(null)}>
          <div className="divide-y divide-border rounded-md border border-border bg-surface px-3">
            <DetailField label="Activity" value={selectedKerberosEvent.activity.replace(/_/g, ' ')} />
            <DetailField label="Account" value={selectedKerberosEvent.account} mono />
            <DetailField label="Service principal name" value={selectedKerberosEvent.servicePrincipalName ?? 'Not applicable'} mono />
            <DetailField label="Client host" value={selectedKerberosEvent.clientHost} mono />
            <DetailField label="Client IP" value={selectedKerberosEvent.clientIp} mono />
            <DetailField label="Source domain controller" value={selectedKerberosEvent.sourceDomainController} mono />
            <DetailField label="Event timestamp" value={format(new Date(selectedKerberosEvent.timestamp), 'MMM d, yyyy HH:mm:ss')} />
            <DetailField label="Detection reason" value={selectedKerberosEvent.detectionReason ?? 'No anomaly reason recorded'} />
          </div>
        </ADDetailDrawer>
      )}
    </div>
  )
}
