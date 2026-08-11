'use client'

import { format } from 'date-fns'
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, ExternalLink } from 'lucide-react'
import { devices, missingPatches, getFleetStats } from '@/lib/mock-data'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import { ComplianceBar } from '@/components/ui/compliance-bar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { cn } from '@/lib/utils'
import { CHART_GRID } from '@/lib/theme'

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: { fill: string } }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-md px-3 py-2 text-[12px] shadow-lg">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="text-foreground font-mono font-semibold">{payload[0].value} device{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

export function PatchCompliancePage() {
  const stats = getFleetStats()

  const pendingReboot = devices.filter(d => d.patchStatus.pendingReboot).length
  const eolDevices = devices.filter(d => d.patchStatus.osEol)
  const criticalPatches = missingPatches.filter(p => p.severity === 'critical')
  const fullyPatched = devices.filter(d => d.patchStatus.missingCritical === 0 && d.patchStatus.missingTotal === 0).length

  // Distribution chart data — bucket by missingTotal
  const buckets = [
    { label: '0', count: devices.filter(d => d.patchStatus.missingTotal === 0).length },
    { label: '1–2', count: devices.filter(d => d.patchStatus.missingTotal >= 1 && d.patchStatus.missingTotal <= 2).length },
    { label: '3–5', count: devices.filter(d => d.patchStatus.missingTotal >= 3 && d.patchStatus.missingTotal <= 5).length },
    { label: '6–10', count: devices.filter(d => d.patchStatus.missingTotal >= 6 && d.patchStatus.missingTotal <= 10).length },
    { label: '11+', count: devices.filter(d => d.patchStatus.missingTotal > 10).length },
  ]

  const bucketColors = ['#008080', '#5B7FFF', '#F79009', '#F04438', '#F04438']

  // Per-device patch status sorted by missingCritical desc
  const devicesSorted = [...devices].sort((a, b) => b.patchStatus.missingCritical - a.patchStatus.missingCritical || b.patchStatus.missingTotal - a.patchStatus.missingTotal)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Patch Compliance"
        description="Missing patch inventory, OS lifecycle status, and device patch distributions."
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: 'Patch Compliance',
            value: `${stats.patchCompliance}%`,
            description: `${stats.total - fullyPatched} devices have missing patches`,
            color: stats.patchCompliance >= 85 ? '#008080' : stats.patchCompliance >= 70 ? '#F79009' : '#F04438',
          },
          {
            label: 'Critical Missing',
            value: criticalPatches.reduce((s, p) => s + p.affectedDevices, 0),
            description: `Across ${criticalPatches.length} critical patch${criticalPatches.length !== 1 ? 'es' : ''}`,
            color: criticalPatches.length > 0 ? '#F04438' : '#008080',
          },
          {
            label: 'Pending Reboot',
            value: pendingReboot,
            description: 'Awaiting restart to apply patches',
            color: pendingReboot > 0 ? '#F79009' : '#008080',
          },
          {
            label: 'EOL Devices',
            value: eolDevices.length,
            description: 'Operating systems past end-of-life',
            color: eolDevices.length > 0 ? '#F04438' : '#008080',
          },
        ].map(({ label, value, description, color }) => (
          <div key={label} className="bg-card border border-border rounded-md p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
            <p className="text-[30px] font-semibold leading-none tabular-nums mb-1" style={{ color }}>{value}</p>
            <p className="text-[12px] text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>

      {/* Distribution chart + critical patches */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Missing Patch Distribution">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} barSize={28}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#9AA3AF', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Missing patches', position: 'insideBottom', offset: -2, fill: '#9AA3AF', fontSize: 10 }}
                />
                <YAxis
                  tick={{ fill: '#9AA3AF', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-hover)', stroke: CHART_GRID, strokeWidth: 1 }} />
                <Bar dataKey="count" name="Devices" radius={[3, 3, 0, 0]}>
                  {buckets.map((_, i) => (
                    <Cell key={i} fill={bucketColors[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Critical patches */}
        <SectionCard title="Critical Missing Patches" className="lg:col-span-2">
          <div className="space-y-0">
            <div className="grid grid-cols-12 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              <span className="col-span-1">Sev</span>
              <span className="col-span-5">Patch</span>
              <span className="col-span-3">CVE</span>
              <span className="col-span-2 text-right">Devices</span>
              <span className="col-span-1 text-right">Days</span>
            </div>
            {missingPatches.map(p => (
              <div key={p.id} className="grid grid-cols-12 px-3 py-2.5 items-center border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                <span className="col-span-1">
                  <span
                    className={cn(
                      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase',
                      p.severity === 'critical' ? 'bg-[#F04438]/15 text-[#F04438]' : 'bg-[#F79009]/15 text-[#F79009]'
                    )}
                  >
                    {p.severity === 'critical' ? 'Crit' : 'Warn'}
                  </span>
                </span>
                <div className="col-span-5">
                  <p className="text-[13px] font-medium text-foreground leading-snug">{p.title}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{p.kbId}</p>
                </div>
                <span className="col-span-3 font-mono text-[11px] text-[#5B7FFF]">
                  {p.cveReference ?? '—'}
                </span>
                <span className={cn('col-span-2 text-right font-mono font-semibold text-[13px]', p.affectedDevices > 8 ? 'text-[#F04438]' : p.affectedDevices > 4 ? 'text-[#F79009]' : 'text-foreground')}>
                  {p.affectedDevices}
                </span>
                <span className={cn('col-span-1 text-right font-mono text-[12px]', p.daysAvailable > 30 ? 'text-[#F04438]' : p.daysAvailable > 14 ? 'text-[#F79009]' : 'text-muted-foreground')}>
                  {p.daysAvailable}d
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* EOL devices */}
      {eolDevices.length > 0 && (
        <SectionCard title="End-of-Life Devices" description="These devices are running operating systems no longer receiving security updates.">
          <div className="space-y-2">
            {eolDevices.map(d => (
              <div key={d.id} className="flex items-center justify-between bg-[#F04438]/5 border border-[#F04438]/20 rounded-md px-4 py-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={15} strokeWidth={1.5} className="text-[#F04438] shrink-0" />
                  <div>
                    <p className="font-mono text-[13px] font-medium text-foreground">{d.name}</p>
                    <p className="text-[11px] text-muted-foreground">{d.osVersion}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-semibold text-[#F04438]">EOL{d.patchStatus.eolDate ? `: ${d.patchStatus.eolDate}` : ''}</p>
                  <p className="text-[11px] text-muted-foreground">{d.patchStatus.missingCritical} critical missing</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Device patch table */}
      <SectionCard title="Device Patch Status" description="All managed devices sorted by patch exposure.">
        <div className="space-y-0">
          <div className="grid grid-cols-12 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            <span className="col-span-3">Device</span>
            <span className="col-span-3">OS</span>
            <span className="col-span-2 text-center">Missing Critical</span>
            <span className="col-span-2 text-center">Missing Total</span>
            <span className="col-span-2 text-right">Last Check</span>
          </div>
          {devicesSorted.map(d => (
            <div key={d.id} className="grid grid-cols-12 px-3 py-2.5 items-center border-b border-border last:border-0 hover:bg-surface-hover transition-colors text-[13px]">
              <div className="col-span-3 flex items-center gap-2">
                {d.patchStatus.pendingReboot && (
                  <Clock size={12} strokeWidth={1.5} className="text-[#F79009] shrink-0" />
                )}
                {d.patchStatus.osEol && (
                  <AlertTriangle size={12} strokeWidth={1.5} className="text-[#F04438] shrink-0" />
                )}
                <span className="font-mono text-[12px] text-foreground truncate">{d.name}</span>
              </div>
              <span className="col-span-3 text-muted-foreground text-[12px] truncate">{d.osVersion.split(' (')[0]}</span>
              <span
                className={cn(
                  'col-span-2 text-center font-mono font-semibold',
                  d.patchStatus.missingCritical > 0 ? 'text-[#F04438]' : 'text-[#008080]'
                )}
              >
                {d.patchStatus.missingCritical}
              </span>
              <span
                className={cn(
                  'col-span-2 text-center font-mono',
                  d.patchStatus.missingTotal > 5 ? 'text-[#F79009]' : 'text-muted-foreground'
                )}
              >
                {d.patchStatus.missingTotal}
              </span>
              <span className="col-span-2 text-right text-muted-foreground text-[11px]">
                {format(new Date(d.patchStatus.lastUpdateCheck), 'MMM d, HH:mm')}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
