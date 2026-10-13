'use client'

import { useMemo, useState, useEffect } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { AlertTriangle, CheckCircle2, Clock, Search, ShieldAlert, AlertCircle, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { devices as mockDevices } from '@/lib/mock-data'
import type { Device } from '@/lib/types'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import { KpiCard } from '@/components/ui/kpi-card'
import { FailingChecksPieChart } from '@/components/ui/charts'
import { cn } from '@/lib/utils'
import { STATUS_COLORS } from '@/lib/theme'
import { useDataMode } from '@/lib/data-mode-provider'
import { getDevices, getDeviceCommandStatus, queueUpdateCommand, waitForDeviceCommand, type ManagedDevice } from '@/lib/api-client'

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
  if (device.patchStatus.updateScanStatus === 'failed') return { label: 'Update scan failed', color: STATUS_COLORS.critical, icon: AlertTriangle }
  if (isInventoryStale(device)) return { label: 'Inventory stale', color: '#64748B', icon: RefreshCw }
  if (device.patchStatus.pendingReboot) return { label: 'Restart required', color: STATUS_COLORS.warning, icon: Clock }
  if (device.patchStatus.missingCritical > 0) return { label: 'Security updates missing', color: STATUS_COLORS.critical, icon: ShieldAlert }
  if (device.patchStatus.missingTotal > 0) return { label: 'Updates available', color: STATUS_COLORS.warning, icon: AlertCircle }
  return { label: "You're up to date", color: STATUS_COLORS.compliant, icon: CheckCircle2 }
}

const INVENTORY_STALE_AFTER_MS = 60 * 60 * 1000

function isInventoryStale(device: Device, now = Date.now()) {
  const lastCheck = Date.parse(device.patchStatus.lastUpdateCheck)
  const unknownScanStatus = device.patchStatus.updateScanStatus !== undefined && device.patchStatus.updateScanStatus !== 'succeeded'
  return unknownScanStatus || !Number.isFinite(lastCheck) || now - lastCheck > INVENTORY_STALE_AFTER_MS
}

function getInventoryAge(lastUpdateCheck: string) {
  const lastCheck = Date.parse(lastUpdateCheck)
  if (!Number.isFinite(lastCheck)) return 'Never scanned'
  return formatDistanceToNow(new Date(lastCheck), { addSuffix: true })
}

function getRiskRank(device: Device, now: number) {
  if (device.patchStatus.osEol) return 5
  if (!isInventoryStale(device, now) && device.patchStatus.missingCritical > 0) return 4
  if (!isInventoryStale(device, now) && device.patchStatus.pendingReboot) return 3
  if (!isInventoryStale(device, now) && device.patchStatus.missingTotal > 0) return 2
  if (isInventoryStale(device, now)) return 1
  return 0
}

function getRemediationState(device: Device, now: number) {
  const stale = isInventoryStale(device, now)
  if (device.patchStatus.osEol) return 'End-of-support OS'
  if (device.patchStatus.updateScanStatus === 'failed') return 'Update scan failed'
  if (!stale && device.patchStatus.missingCritical > 0) return 'Critical / important missing'
  if (stale) return 'Inventory stale (> 60m)'
  if (device.patchStatus.pendingReboot) return 'Restart required'
  if (device.patchStatus.missingTotal > 0) return 'Other updates missing'
  return "You're up to date"
}

export function PatchCompliancePage() {
  const { mode } = useDataMode()
  const [apiDevices, setApiDevices] = useState<ManagedDevice[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deviceSearch, setDeviceSearch] = useState('')
  const [updateStateFilter, setUpdateStateFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeCommands, setActiveCommands] = useState<Record<string, { command: 'check_updates' | 'install_updates'; phase: 'queued' | 'running' }>>({})
  const [commandError, setCommandError] = useState<string | null>(null)
  const pageSize = 8

  useEffect(() => {
    if (mode === 'demo') {
      setApiDevices([])
      setLoadError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    const refreshInterval = window.setInterval(() => {
      void getDevices()
        .then(devicesData => {
          if (!cancelled) setApiDevices(Array.isArray(devicesData) ? devicesData : [])
        })
        .catch(() => undefined)
    }, 30_000)
    getDevices()
      .then(devicesData => {
        if (cancelled) return
        setApiDevices(Array.isArray(devicesData) ? devicesData : [])
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
      window.clearInterval(refreshInterval)
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
      osCaption: device.os_caption,
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
        definitionAge: device.malware?.definition_age ?? 0,
        realtimeProtection: device.malware?.realtime_protection ?? false,
        lastScanResult: device.malware?.last_scan_result ?? 'scan_failed',
        tamperProtection: device.malware?.tamper_protection ?? false,
        quarantineCount: device.malware?.quarantine_count ?? 0,
      },
      patchStatus: {
        missingCritical: device.patch_status?.missing_critical ?? 0,
        missingTotal: device.patch_status?.missing_total ?? 0,
        pendingReboot: device.patch_status?.pending_reboot ?? false,
        lastUpdateCheck: device.patch_status?.last_update_check ?? '',
        updateScanStatus: device.patch_status?.update_scan_status ?? 'unknown',
        updateScanError: device.patch_status?.update_scan_error,
        osEol: device.patch_status?.os_eol ?? false,
        eolDate: device.patch_status?.eol_date,
      },
      domainJoined: false,
    }))
  }, [mode, apiDevices])

  const stats = useMemo(() => {
    const freshDevices = devices.filter(device => !isInventoryStale(device))
    const fullyPatchedCount = freshDevices.filter(device => device.patchStatus.missingCritical === 0 && device.patchStatus.missingTotal === 0 && !device.patchStatus.pendingReboot && !device.patchStatus.osEol).length
    return {
      patchCompliance: freshDevices.length === 0 ? 0 : Math.round((fullyPatchedCount / freshDevices.length) * 100),
      pendingReboot: freshDevices.filter(device => device.patchStatus.pendingReboot).length,
      eolDevices: devices.filter(device => device.patchStatus.osEol).length,
      missingCritical: freshDevices.reduce((sum, device) => sum + device.patchStatus.missingCritical, 0),
      updateScanFailures: devices.filter(device => device.patchStatus.updateScanStatus === 'failed').length,
      freshDevices: freshDevices.length,
      fullyPatched: fullyPatchedCount,
    }
  }, [devices])

  const pendingReboot = devices.filter(d => !isInventoryStale(d) && d.patchStatus.pendingReboot).length
  const eolDevices = devices.filter(d => d.patchStatus.osEol)
  const fullyPatched = stats.fullyPatched
  const staleInventoryDevices = devices.filter(device => isInventoryStale(device))
  const now = Date.now()
  const remediationSignals = [
    { label: 'End-of-support OS', color: STATUS_COLORS.critical },
    { label: 'Critical / important missing', color: '#C026D3' },
    { label: 'Restart required', color: STATUS_COLORS.warning },
    { label: 'Other updates missing', color: '#2563EB' },
    { label: 'Inventory stale (> 60m)', color: '#64748B' },
    { label: 'Update scan failed', color: STATUS_COLORS.critical },
    { label: "You're up to date", color: STATUS_COLORS.compliant },
  ].map(signal => ({
    ...signal,
    count: devices.filter(device => getRemediationState(device, now) === signal.label).length,
  }))
  const remediationChartData = remediationSignals
    .filter(signal => signal.count > 0)
    .map(signal => ({ name: signal.label, value: signal.count, color: signal.color }))

  // Per-device patch status sorted by missingCritical desc
  const devicesSorted = [...devices].sort((a, b) => b.patchStatus.missingCritical - a.patchStatus.missingCritical || b.patchStatus.missingTotal - a.patchStatus.missingTotal)
  const atRiskDevices = devices
    .filter(device => getRiskRank(device, now) > 0)
    .sort((a, b) => {
      const rankDifference = getRiskRank(b, now) - getRiskRank(a, now)
      if (rankDifference !== 0) return rankDifference
      if (getRiskRank(a, now) === 1) return Date.parse(a.patchStatus.lastUpdateCheck) - Date.parse(b.patchStatus.lastUpdateCheck)
      return b.patchStatus.missingCritical - a.patchStatus.missingCritical
        || b.patchStatus.missingTotal - a.patchStatus.missingTotal
        || Date.parse(a.patchStatus.lastUpdateCheck) - Date.parse(b.patchStatus.lastUpdateCheck)
    })
    .slice(0, 5)
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
  const visibleDeviceIds = pagedDevices.map(device => device.id).join('|')

  useEffect(() => {
    if (mode === 'demo' || !visibleDeviceIds) {
      setActiveCommands({})
      return
    }

    let cancelled = false
    const deviceIds = visibleDeviceIds.split('|')
    const refreshedCommandIds = new Set<string>()
    const refreshCommandStates = async () => {
      const results = await Promise.all(deviceIds.map(async deviceId => {
        try {
          return { deviceId, status: await getDeviceCommandStatus(deviceId) }
        } catch {
          return { deviceId, status: null }
        }
      }))
      if (cancelled) return

      const hasNewlyCompletedUpdate = results.some(({ status }) => {
        if (!status || status.status !== 'succeeded' || (status.command !== 'check_updates' && status.command !== 'install_updates')) return false
        if (refreshedCommandIds.has(status.command_id)) return false
        refreshedCommandIds.add(status.command_id)
        return true
      })
      if (hasNewlyCompletedUpdate) {
        void getDevices()
          .then(devicesData => {
            if (!cancelled) setApiDevices(Array.isArray(devicesData) ? devicesData : [])
          })
          .catch(() => undefined)
      }

      setActiveCommands(current => {
        const next = { ...current }
        for (const { deviceId, status } of results) {
          if (!status) continue
          const command = status.command === 'check_updates' || status.command === 'install_updates' ? status.command : null
          const phase = status.status === 'queued' ? 'queued' : status.status === 'running' ? 'running' : null
          if (command && phase) {
            next[deviceId] = { command, phase }
          } else {
            delete next[deviceId]
          }
        }
        return next
      })
    }

    void refreshCommandStates()
    const interval = window.setInterval(() => void refreshCommandStates(), 5000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [mode, visibleDeviceIds])

  const platformSummaries = (['Windows', 'Mac', 'Linux'] as const).map(os => {
    const platformDevices = devices.filter(device => device.os === os)
    const scanned = platformDevices.filter(device => !isInventoryStale(device))
    const current = scanned.filter(device => device.patchStatus.missingTotal === 0 && !device.patchStatus.pendingReboot && !device.patchStatus.osEol).length
    return { os, total: platformDevices.length, scanned: scanned.length, current, pending: scanned.filter(device => device.patchStatus.pendingReboot).length }
  })

  async function runUpdateCommand(device: Device, command: 'check_updates' | 'install_updates') {
    if (mode === 'demo') return
    setCommandError(null)
    setActiveCommands(current => ({ ...current, [device.id]: { command, phase: 'queued' } }))
    try {
      const queued = await queueUpdateCommand(device.id, command)
      const outcome = await waitForDeviceCommand(device.id, queued.command_id, status => {
        const phase = status.status === 'running' ? 'running' : status.status === 'queued' ? 'queued' : null
        if (phase) {
          setActiveCommands(current => ({ ...current, [device.id]: { command, phase } }))
        }
      }, 2000, command === 'install_updates' ? 2 * 60 * 60 * 1000 : 30 * 60 * 1000)
      if (!outcome) throw new Error('Still waiting for the endpoint agent. Check that it is online.')
      if (outcome.status === 'failed') throw new Error(outcome.result || 'The endpoint could not complete the update command.')
      if (outcome.status === 'cancelled') throw new Error(outcome.result || 'The update command was cancelled.')
      const refreshedDevices = await getDevices()
      setApiDevices(Array.isArray(refreshedDevices) ? refreshedDevices : [])
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : 'Unable to complete the update command')
    } finally {
      setActiveCommands(current => {
        const next = { ...current }
        delete next[device.id]
        return next
      })
    }
  }

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
            value: stats.freshDevices > 0 ? `${stats.patchCompliance}%` : '—',
            description: stats.freshDevices > 0 ? `${fullyPatched} of ${stats.freshDevices} freshly scanned devices are current` : 'No fresh update inventory reported',
            color: stats.freshDevices === 0 ? 'var(--muted-foreground)' : stats.patchCompliance >= 85 ? STATUS_COLORS.compliant : stats.patchCompliance >= 70 ? STATUS_COLORS.warning : STATUS_COLORS.critical,
          },
          {
            label: 'Critical / Important',
            value: stats.freshDevices > 0 ? stats.missingCritical : '—',
            description: stats.freshDevices > 0 ? `Across ${devices.filter(device => !isInventoryStale(device) && device.patchStatus.missingCritical > 0).length} freshly scanned endpoints` : 'No successful update scan reported',
            color: stats.freshDevices === 0 ? 'var(--muted-foreground)' : stats.missingCritical > 0 ? STATUS_COLORS.critical : STATUS_COLORS.compliant,
          },
          {
            label: 'Pending Reboot',
            value: pendingReboot,
            description: 'Fresh scans reporting a required restart',
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
          {platformSummaries.map(({ os, total, scanned, current, pending }) => {
            const percentage = scanned ? Math.round((current / scanned) * 100) : null
            return (
              <div key={os} className="rounded-md border border-border bg-surface px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <OSIcon os={os} />
                    <span className="text-[13px] font-semibold text-foreground">{os}</span>
                  </div>
                  <span className="font-mono text-[13px] font-semibold text-foreground">{percentage === null ? '—' : `${percentage}%`}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percentage ?? 0}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{percentage === null ? `No scan · ${total} devices` : `${current} of ${scanned} scanned ready`}</span>
                  <span>{pending} restart{pending === 1 ? '' : 's'} required</span>
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* Remediation signals and endpoint priority list */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <SectionCard title="Remediation queue" description="Each endpoint appears once, assigned to its highest-priority reported state." className="min-w-0 lg:col-span-2">
          {devices.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-center text-[12px] text-muted-foreground">No endpoint update data is available.</div>
          ) : (
            <FailingChecksPieChart data={remediationChartData} height={220} showTotal totalOverride={devices.length} showLegendBars={false} />
          )}
          {staleInventoryDevices.length > 0 && (
            <p className="mt-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
              Inventory older than 60 minutes: <span className="font-mono font-semibold text-foreground">{staleInventoryDevices.length}</span> endpoints, including devices in other slices.
            </p>
          )}
        </SectionCard>

        <SectionCard title="At-risk endpoints" description="Highest-priority devices, ranked by OS lifecycle, missing updates, restart state, then inventory age." className="min-w-0 lg:col-span-3">
          {atRiskDevices.length === 0 ? (
            <div className="rounded-md border border-border bg-surface px-4 py-8 text-center text-[12px] text-muted-foreground">
              No endpoint update risks are currently reported.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border bg-surface">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[minmax(190px,1.4fr)_minmax(160px,1fr)_minmax(190px,1.2fr)] items-center gap-3 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Endpoint</span>
                  <span>Missing updates</span>
                  <span>Signals and last scan</span>
                </div>
                <div className="divide-y divide-border">
                  {atRiskDevices.map(device => {
                    const stale = isInventoryStale(device, now)
                    return (
                      <div key={device.id} className="grid grid-cols-[minmax(190px,1.4fr)_minmax(160px,1fr)_minmax(190px,1.2fr)] items-center gap-3 px-3 py-3 transition-colors hover:bg-surface-hover">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[12px] font-medium text-foreground">{device.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{device.osCaption || device.os} · {device.osVersion}</p>
                        </div>
                        <div className="text-[11px] text-foreground">
                          {stale ? (
                            <>
                              <p>Update counts unverified</p>
                              <p className="text-muted-foreground">Last scan {getInventoryAge(device.patchStatus.lastUpdateCheck)}</p>
                            </>
                          ) : (
                            <>
                              <p>{device.patchStatus.missingCritical} critical / important</p>
                              <p className="text-muted-foreground">{device.patchStatus.missingTotal} total</p>
                            </>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {device.patchStatus.osEol && <span className="rounded-sm bg-status-critical/10 px-1.5 py-0.5 text-[10px] font-medium text-status-critical">OS end-of-support</span>}
                            {device.patchStatus.updateScanStatus === 'failed' && <span className="rounded-sm bg-status-critical/10 px-1.5 py-0.5 text-[10px] font-medium text-status-critical">Update scan failed</span>}
                            {!stale && device.patchStatus.pendingReboot && <span className="rounded-sm bg-status-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-status-warning">Restart required</span>}
                            {!stale && device.patchStatus.missingTotal > 0 && <span className="rounded-sm bg-status-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-status-warning">Updates available</span>}
                            {stale && <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Scan stale</span>}
                          </div>
                          <p className={cn('text-[10px]', stale ? 'text-status-warning' : 'text-muted-foreground')}>
                            Last scan {getInventoryAge(device.patchStatus.lastUpdateCheck)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
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
                     <p className="text-[11px] text-muted-foreground">{d.osCaption ? `${d.osCaption} · ${d.osVersion}` : d.osVersion}</p>
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
        {commandError && <p className="mb-2 text-[12px] text-status-critical">{commandError}</p>}
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
            {["You're up to date", 'Updates available', 'Security updates missing', 'Restart required', 'End of support', 'Inventory stale', 'Update scan failed'].map(state => (
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
              <span className="col-span-2">Device</span>
              <span className="col-span-2">OS</span>
              <span className="col-span-2">OS Version</span>
              <span className="col-span-2 text-center">Update Policy</span>
              <span className="col-span-2 text-center">Pending Reboot</span>
              <span className="col-span-2">Update State</span>
            </div>
            <div className="divide-y divide-border">
              {pagedDevices.map(d => (
                <div key={d.id} className="grid grid-cols-12 items-center px-3 py-2 text-[13px] transition-colors hover:bg-surface-hover">
                  <div className="col-span-2">
                    <span className="truncate font-mono text-[12px] text-black dark:text-white">{d.name}</span>
                  </div>
                  <span className="col-span-2 truncate text-[12px] text-black dark:text-white" title={d.osCaption ?? undefined}>
                    {d.osCaption || 'Not reported'}
                  </span>
                  <span className="col-span-2 truncate font-mono text-[12px] text-black dark:text-white" title={d.osVersion}>
                    {d.osVersion || 'Not reported'}
                  </span>
                  <span className="col-span-2 text-center text-[12px] text-black dark:text-white">
                    {d.patchStatus.updatesAutomatic ? 'Automatic' : 'Manual'}
                  </span>
                  <span className={cn('col-span-2 text-center text-[12px] font-medium', isInventoryStale(d) ? 'text-muted-foreground' : d.patchStatus.pendingReboot ? 'text-[#F79009]' : 'text-[#16A34A]')}>
                    {isInventoryStale(d) ? 'Unknown' : d.patchStatus.pendingReboot ? 'Required' : 'No'}
                  </span>
                  <span className="col-span-2 flex flex-col items-start gap-1">
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
                    {d.os === 'Windows' && (isInventoryStale(d) || d.patchStatus.missingTotal > 0) && (() => {
                      const activeCommand = activeCommands[d.id]
                      const command = isInventoryStale(d) ? 'check_updates' : 'install_updates'
                      const label = activeCommand
                        ? activeCommand.command === 'check_updates'
                          ? activeCommand.phase === 'running' ? 'Checking for updates…' : 'Waiting for agent…'
                          : activeCommand.phase === 'running' ? 'Installing…' : 'Waiting for agent…'
                        : command === 'check_updates' ? 'Check for updates' : 'Download and Install'
                      return (
                        <button type="button" disabled={Boolean(activeCommand)} onClick={() => void runUpdateCommand(d, command)} className="text-[10px] font-medium text-brand underline underline-offset-2 disabled:opacity-50">
                          {label}
                        </button>
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