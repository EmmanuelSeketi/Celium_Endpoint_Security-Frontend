'use client'

import { useMemo, useState, useEffect } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Search, ShieldAlert, AlertCircle, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { devices as mockDevices, missingPatches as mockMissingPatches, getFleetStats } from '@/lib/mock-data'
import type { Device, MissingPatch } from '@/lib/types'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import { KpiCard } from '@/components/ui/kpi-card'
import { ComplianceBar } from '@/components/ui/compliance-bar'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { cn } from '@/lib/utils'
import { CHART_GRID, STATUS_COLORS } from '@/lib/theme'
import { useDataMode } from '@/lib/data-mode-provider'
import { getDevices, getMissingPatches, getPatchStats, type ManagedDevice, type MissingPatch as MissingPatchApi } from '@/lib/api-client'

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: { fill: string } }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-md px-3 py-2 text-[12px] shadow-lg">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="text-foreground font-mono font-semibold">{payload[0].value} device{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

function OSIcon({ os }: { os: 'Windows' | 'Mac' | 'Linux' }) {
  if (os === 'Windows') {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-label="Windows">
        <rect x="3" y="3" width="8" height="8" rx="1" fill="#F25022" />
        <rect x="13" y="3" width="8" height="8" rx="1" fill="#7FBA00" />
        <rect x="3" y="13" width="8" height="8" rx="1" fill="#00A4EF" />
        <rect x="13" y="13" width="8" height="8" rx="1" fill="#FFB900" />
      </svg>
    )
  }

  if (os === 'Mac') {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-label="macOS">
        <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 16.56 2.93 11.3 4.7 7.72C5.57 5.94 7.36 4.86 9.28 4.84C10.56 4.81 11.78 5.72 12.58 5.72C13.38 5.72 14.88 4.62 16.4 4.81C16.96 4.82 18.92 5.08 20.13 6.82C19.93 6.9 18.2 8.15 18.21 10.72C18.22 13.76 20.78 14.83 20.8 14.84C20.78 14.94 20.34 16.54 19.33 18.23" fill="#A3AAAE" stroke="#A3AAAE" />
      </svg>
    )
  }

  return <img src="/Linux.svg" width="16" height="16" alt="Linux" />
}

function getUpdateState(device: Device) {
  if (device.patchStatus.osEol) return { label: 'End of support', color: STATUS_COLORS.critical, icon: AlertTriangle }
  if (device.patchStatus.pendingReboot) return { label: 'Restart required', color: STATUS_COLORS.warning, icon: Clock }
  if (device.patchStatus.missingCritical > 0) return { label: 'Security updates missing', color: STATUS_COLORS.critical, icon: ShieldAlert }
  if (device.patchStatus.missingTotal > 0) return { label: 'Updates available', color: STATUS_COLORS.warning, icon: AlertCircle }
  return { label: 'Up to date', color: STATUS_COLORS.compliant, icon: CheckCircle2 }
}

function getApiUpdateState(patchStatus: ManagedDevice['patch_status']) {
  if (!patchStatus) return { label: 'Up to date', color: STATUS_COLORS.compliant, icon: CheckCircle2 }
  if (patchStatus.os_eol) return { label: 'End of support', color: STATUS_COLORS.critical, icon: AlertTriangle }
  if (patchStatus.pending_reboot) return { label: 'Restart required', color: STATUS_COLORS.warning, icon: Clock }
  if (patchStatus.missing_critical > 0) return { label: 'Security updates missing', color: STATUS_COLORS.critical, icon: ShieldAlert }
  if (patchStatus.missing_total > 0) return { label: 'Updates available', color: STATUS_COLORS.warning, icon: AlertCircle }
  return { label: 'Up to date', color: STATUS_COLORS.compliant, icon: CheckCircle2 }
}

export function PatchCompliancePage() {
  const { mode } = useDataMode()
  const [apiDevices, setApiDevices] = useState<ManagedDevice[]>([])
  const [apiMissingPatches, setApiMissingPatches] = useState<MissingPatchApi[]>([])
  const [apiStats, setApiStats] = useState<{ total: number; patch_compliance: number; pending_reboot: number; eol_devices: number; critical_patches: number; missing_critical: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deviceSearch, setDeviceSearch] = useState('')
  const [updateStateFilter, setUpdateStateFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

  useEffect(() => {
    if (mode === 'demo') {
      setApiDevices([])
      setApiMissingPatches([])
      setApiStats(null)
      setLoadError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.all([getDevices(), getMissingPatches(), getPatchStats()])
      .then(([devicesData, patchesData, statsData]) => {
        if (cancelled) return
        setApiDevices(Array.isArray(devicesData) ? devicesData : [])
        setApiMissingPatches(Array.isArray(patchesData) ? patchesData : [])
        setApiStats(statsData)
      })
      .catch(error => {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : 'Unable to load patch data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [mode])

  const devices = useMemo(() => {
    if (mode === 'demo') return mockDevices
    return apiDevices.map<Device>(device => ({
      id: device.id,
      name: device.hostname,
      assetType: 'laptop',
      os: device.os === 'windows' ? 'Windows' : device.os === 'macos' ? 'Mac' : 'Linux',
      osVersion: device.os_version,
      department: '',
      ip: device.ip_address,
      mac: '',
      username: '',
      complianceScore: 0,
      status: device.status === 'active' ? 'compliant' : device.status === 'inactive' ? 'warning' : 'critical',
      failedChecks: 0,
      passedChecks: 0,
      lastSeen: device.last_checkin ?? '',
      lastScanned: '',
      malwareStatus: {
        engineVersion: device.malware?.engine_version ?? '',
        securityIntelligenceVersion: device.malware?.security_intelligence_version,
        securityIntelligenceUpdatedAt: device.malware?.security_intelligence_updated_at,
        definitionAge: device.malware?.definition_age ?? 0,
        realtimeProtection: device.malware?.realtime_protection ?? false,
        lastScanResult: (device.malware?.last_scan_result ?? 'clean') as Device['malwareStatus']['lastScanResult'],
        lastScanAt: device.malware?.last_scan_at,
        lastScanType: device.malware?.last_scan_type as Device['malwareStatus']['lastScanType'],
        lastScanDurationSeconds: device.malware?.last_scan_duration_seconds,
        lastScanFiles: device.malware?.last_scan_files,
        tamperProtection: device.malware?.tamper_protection ?? false,
        quarantineCount: device.malware?.quarantine_count ?? 0,
      },
      patchStatus: {
        missingCritical: device.patch_status?.missing_critical ?? 0,
        missingTotal: device.patch_status?.missing_total ?? 0,
        pendingReboot: device.patch_status?.pending_reboot ?? false,
        lastUpdateCheck: device.patch_status?.last_update_check ?? '',
        osEol: device.patch_status?.os_eol ?? false,
        eolDate: device.patch_status?.eol_date,
      },
      domainJoined: false,
    }))
  }, [mode, apiDevices])

  const missingPatches = useMemo(() => {
    if (mode === 'demo') return mockMissingPatches
    return apiMissingPatches.map<MissingPatch>(patch => ({
      id: patch.id,
      kbId: patch.kb_id,
      title: patch.title,
      severity: patch.severity as MissingPatch['severity'],
      affectedDevices: patch.affected_devices,
      daysAvailable: patch.days_available,
      cveReference: patch.cve_reference,
    }))
  }, [mode, apiMissingPatches])

  const stats = useMemo(() => {
    if (mode === 'demo') return getFleetStats()
    if (!apiStats) return { total: 0, patchCompliance: 0, pendingReboot: 0, eolDevices: 0, criticalPatches: 0, missingCritical: 0 }
    return {
      total: apiStats.total,
      patchCompliance: apiStats.patch_compliance,
      pendingReboot: apiStats.pending_reboot,
      eolDevices: apiStats.eol_devices,
      criticalPatches: apiStats.critical_patches,
      missingCritical: apiStats.missing_critical,
    }
  }, [mode, apiStats])

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
  const filteredDevices = useMemo(() => {
    const query = deviceSearch.trim().toLowerCase()
    return devicesSorted.filter(device => {
      const updateState = getUpdateState(device).label
      const matchesSearch = !query
        || device.name.toLowerCase().includes(query)
        || device.osVersion.toLowerCase().includes(query)
      return matchesSearch && (!updateStateFilter || updateState === updateStateFilter)
    })
  }, [deviceSearch, updateStateFilter, devicesSorted])
  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / pageSize))
  const pagedDevices = filteredDevices.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const platformSummaries = (['Windows', 'Mac', 'Linux'] as const).map(os => {
    const platformDevices = devices.filter(device => device.os === os)
    const current = platformDevices.filter(device => device.patchStatus.missingTotal === 0 && !device.patchStatus.pendingReboot).length
    return { os, total: platformDevices.length, current, pending: platformDevices.filter(device => device.patchStatus.pendingReboot).length }
  })

  return (
    <div className="space-y-4">
      <PageHeader
        title="OS Updates"
        description="Update coverage, operating system lifecycle, and device update posture."
      />

      {loading && (
        <div className="flex items-center justify-center py-10 text-[13px] text-muted-foreground">Loading patch data...</div>
      )}
      {loadError && (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-[13px] text-status-critical">
          <p>{loadError}</p>
          <button type="button" onClick={() => mode !== 'demo' && window.location.reload()} className="rounded-md border border-border px-3 py-1.5 text-[12px] transition-colors hover:bg-surface-hover">Retry</button>
        </div>
      )}

      {!loading && !loadError && (
        <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: 'Update Compliance',
            value: `${stats.patchCompliance}%`,
            description: `${stats.total - fullyPatched} devices have missing patches`,
            color: stats.patchCompliance >= 85 ? STATUS_COLORS.compliant : stats.patchCompliance >= 70 ? STATUS_COLORS.warning : STATUS_COLORS.critical,
          },
          {
            label: 'Critical Missing',
            value: criticalPatches.reduce((s, p) => s + p.affectedDevices, 0),
            description: `Across ${criticalPatches.length} critical patch${criticalPatches.length !== 1 ? 'es' : ''}`,
            color: criticalPatches.length > 0 ? STATUS_COLORS.critical : STATUS_COLORS.compliant,
          },
          {
            label: 'Pending Reboot',
            value: pendingReboot,
            description: 'Awaiting restart to apply patches',
            color: pendingReboot > 0 ? STATUS_COLORS.warning : STATUS_COLORS.compliant,
          },
          {
            label: 'EOL Devices',
            value: eolDevices.length,
            description: 'Operating systems past end-of-life',
            color: eolDevices.length > 0 ? STATUS_COLORS.critical : STATUS_COLORS.compliant,
          },
        ].map(({ label, value, description, color }) => (
          <KpiCard
            key={label}
            label={label}
            value={value}
            description={description}
            accentColor={color}
          />
        ))}
      </div>

      {/* Platform posture */}
      <SectionCard title="Update posture by platform" description="A quick view of update readiness across the fleet.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {platformSummaries.map(({ os, total, current, pending }) => {
            const percentage = total === 0 ? 0 : Math.round((current / total) * 100)
            return (
              <div key={os} className="rounded-md border border-border bg-surface px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <OSIcon os={os} />
                    <span className="text-[13px] font-semibold text-foreground">{os}</span>
                  </div>
                  <span className="font-mono text-[13px] font-semibold text-foreground">{percentage}%</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percentage}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{current} of {total} ready</span>
                  <span>{pending} restart{pending === 1 ? '' : 's'} required</span>
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

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
        <SectionCard title="Priority updates" className="lg:col-span-2">
          <div className="overflow-x-auto rounded-md border border-border bg-surface">
            <table className="w-full min-w-[680px] table-fixed text-left text-[12px]">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[38%]" />
                <col className="w-[22%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wider text-black dark:text-white">
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Patch</th>
                  <th className="px-3 py-2">CVE</th>
                  <th className="px-3 py-2 text-right">Devices</th>
                  <th className="px-3 py-2 text-right">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {missingPatches.map(p => (
                  <tr key={p.id} className="transition-colors hover:bg-surface-hover">
                    <td className="px-3 py-2.5">
                      <span className={cn('font-semibold uppercase', p.severity === 'critical' ? 'text-[#F04438]' : 'text-[#F79009]')}>
                        {p.severity === 'critical' ? 'Crit' : 'Warn'}
                      </span>
                    </td>
                    <td className="max-w-0 px-3 py-2.5">
                      <p className="truncate text-[13px] font-medium text-black dark:text-white">{p.title}</p>
                      <p className="truncate font-mono text-[11px] text-black dark:text-white">{p.kbId}</p>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[#5B7FFF]">{p.cveReference ?? '—'}</td>
                    <td className={cn('px-3 py-2.5 text-right font-mono font-semibold text-[13px]', p.affectedDevices > 8 ? 'text-[#F04438]' : p.affectedDevices > 4 ? 'text-[#F79009]' : 'text-black dark:text-white')}>
                      {p.affectedDevices}
                    </td>
                    <td className={cn('px-3 py-2.5 text-right font-mono text-[12px]', p.daysAvailable > 30 ? 'text-[#F04438]' : p.daysAvailable > 14 ? 'text-[#F79009]' : 'text-black dark:text-white')}>
                      {p.daysAvailable}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      <SectionCard title="Device update status" description="All managed devices sorted by update exposure.">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1">
            <Search size={13} strokeWidth={1.5} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search devices or operating systems..."
              value={deviceSearch}
              onChange={event => { setDeviceSearch(event.target.value); setCurrentPage(1) }}
              className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-brand/60"
            />
          </div>
          <select
            value={updateStateFilter}
            onChange={event => { setUpdateStateFilter(event.target.value); setCurrentPage(1) }}
            aria-label="Filter by update state"
            className="h-8 rounded-md border border-border bg-surface px-2.5 text-[12px] text-foreground outline-none focus:border-brand/60"
          >
            <option value="">All update states</option>
            {['Up to date', 'Updates available', 'Security updates missing', 'Restart required', 'End of support'].map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          {(deviceSearch || updateStateFilter) && (
            <button
              type="button"
              onClick={() => { setDeviceSearch(''); setUpdateStateFilter(''); setCurrentPage(1) }}
              className="flex items-center gap-1 text-[12px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
            >
              Clear filters
              <X size={11} strokeWidth={2} />
            </button>
          )}
        </div>
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-12 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-black dark:text-white border-b border-border">
              <span className="col-span-3">Device</span>
              <span className="col-span-2">OS</span>
              <span className="col-span-2 text-center">Missing Critical</span>
              <span className="col-span-2 text-center">Missing Total</span>
              <span className="col-span-3">Update State</span>
            </div>
            <div className="divide-y divide-border">
              {pagedDevices.map(d => (
                <div key={d.id} className="grid grid-cols-12 items-center px-3 py-2 text-[13px] transition-colors hover:bg-surface-hover">
                  <div className="col-span-3">
                    <span className="truncate font-mono text-[12px] text-black dark:text-white">{d.name}</span>
                  </div>
                  <span className="col-span-2 truncate text-[12px] text-black dark:text-white">{d.osVersion.split(' (')[0]}</span>
                  <span className={cn('col-span-2 text-center font-mono font-semibold', d.patchStatus.missingCritical > 0 ? 'text-[#F04438]' : 'text-[#16A34A]')}>
                    {d.patchStatus.missingCritical}
                  </span>
                  <span className={cn('col-span-2 text-center font-mono', d.patchStatus.missingTotal > 5 ? 'text-[#F79009]' : 'text-black dark:text-white')}>
                    {d.patchStatus.missingTotal}
                  </span>
                  <span className="col-span-3">
                    {(() => {
                      const state = getUpdateState(d)
                      const Icon = state.icon
                      return (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium"
                          style={{ color: state.color, backgroundColor: `${state.color}1A` }}
                        >
                          <Icon size={12} strokeWidth={1.75} className="shrink-0" />
                          {state.label}
                        </span>
                      )
                    })()}
                  </span>
                </div>
              ))}
              {pagedDevices.length === 0 && (
                <div className="py-10 text-center text-[13px] text-muted-foreground">No devices match the current filters.</div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <p className="text-[12px] text-muted-foreground">
            Showing {filteredDevices.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredDevices.length)} of {filteredDevices.length} devices
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={currentPage === 1} aria-label="Previous page" className="flex h-7 w-7 items-center justify-center rounded border border-border text-black dark:text-white transition-colors hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-40">
              <ChevronLeft size={14} strokeWidth={1.75} />
            </button>
            <span className="min-w-16 text-center text-[12px] font-medium text-black dark:text-white">Page {currentPage} of {totalPages}</span>
            <button type="button" onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} aria-label="Next page" className="flex h-7 w-7 items-center justify-center rounded border border-border text-black dark:text-white transition-colors hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-40">
              <ChevronRight size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </SectionCard>
       </>
    )}
  </div>
)
}