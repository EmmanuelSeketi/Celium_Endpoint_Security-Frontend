'use client'

import { useMemo, useState, useEffect } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { AlertTriangle, CheckCircle2, Clock, Search, ShieldAlert, AlertCircle, RefreshCw, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { devices as mockDevices } from '@/lib/mock-data'
import type { Device } from '@/lib/types'
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
  if (hasPendingRestart(device)) return { label: 'Restart required', color: STATUS_COLORS.warning, icon: Clock }
  if (device.patchStatus.updateScanStatus === 'failed') return { label: 'Update scan failed', color: STATUS_COLORS.critical, icon: AlertTriangle }
  if (isInventoryStale(device)) return { label: 'Inventory stale', color: '#64748B', icon: RefreshCw }
  if (device.patchStatus.missingCritical > 0) return { label: 'Security updates missing', color: STATUS_COLORS.critical, icon: ShieldAlert }
  if (device.patchStatus.missingTotal > 0) return { label: 'Updates available', color: STATUS_COLORS.warning, icon: AlertCircle }
  return { label: "You're up to date", color: STATUS_COLORS.compliant, icon: CheckCircle2 }
}

const INVENTORY_STALE_AFTER_MS = 60 * 60 * 1000
const UPDATE_COMMANDS = ['check_updates', 'install_updates', 'restart_now', 'automatic_on', 'automatic_off'] as const
type UpdateCommand = typeof UPDATE_COMMANDS[number] | `install_update:${string}`

function isUpdateCommand(command: string): command is UpdateCommand {
  return UPDATE_COMMANDS.some(updateCommand => updateCommand === command)
    || /^install_update:[0-9a-f-]{36}$/i.test(command)
}

function isInventoryStale(device: Device, now = Date.now()) {
  const lastCheck = Date.parse(device.patchStatus.lastUpdateCheck)
  const unknownScanStatus = device.patchStatus.updateScanStatus !== undefined
    && device.patchStatus.updateScanStatus !== 'succeeded'
  return unknownScanStatus || !Number.isFinite(lastCheck) || now - lastCheck > INVENTORY_STALE_AFTER_MS
}

function hasPendingRestart(device: Device) {
  return device.patchStatus.pendingReboot
    || device.patchStatus.availableUpdates?.some(update => update.status === 'pending_restart' || update.rebootRequired) === true
}

function getInventoryAge(lastUpdateCheck: string) {
  const lastCheck = Date.parse(lastUpdateCheck)
  if (!Number.isFinite(lastCheck)) return 'Never scanned'
  return formatDistanceToNow(new Date(lastCheck), { addSuffix: true })
}

function getRiskRank(device: Device, now: number) {
  if (device.patchStatus.osEol) return 5
  if (!isInventoryStale(device, now) && device.patchStatus.missingCritical > 0) return 4
  if (hasPendingRestart(device)) return 3
  if (!isInventoryStale(device, now) && device.patchStatus.missingTotal > 0) return 2
  if (isInventoryStale(device, now)) return 1
  return 0
}

function getRemediationState(device: Device, now: number) {
  const stale = isInventoryStale(device, now)
  if (device.patchStatus.osEol) return 'End-of-support OS'
  if (hasPendingRestart(device)) return 'Restart required'
  if (device.patchStatus.updateScanStatus === 'failed') return 'Update scan failed'
  if (!stale && device.patchStatus.missingCritical > 0) return 'Critical / important missing'
  if (stale) return 'Inventory stale (> 60m)'
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
  const [selectedUpdateDevice, setSelectedUpdateDevice] = useState<Device | null>(null)
  const [activeCommands, setActiveCommands] = useState<Record<string, { command: UpdateCommand; phase: 'queued' | 'running' | 'downloading' | 'installing' | 'unreachable' }>>({})
  const [commandError, setCommandError] = useState<string | null>(null)
  const [commandStatusError, setCommandStatusError] = useState<string | null>(null)
  const pageSize = 8

  useEffect(() => {
    if (mode === 'demo') {
      setApiDevices([])
      setLoadError(null)
      setCommandStatusError(null)
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
    }, 10_000)
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
        availableUpdates: device.available_updates?.map(update => ({
          updateId: update.update_id,
          revision: update.revision,
          title: update.title,
          status: update.status,
          downloaded: update.downloaded,
          rebootRequired: update.reboot_required,
          severity: update.severity,
          categories: update.categories ?? [],
          sizeBytes: update.size_bytes ?? 0,
        })),
        updateHistory: device.update_history,
        updatesAutomatic: device.updates_automatic,
        updatesPauseUntil: device.updates_pause_until,
      },
      domainJoined: false,
    }))
  }, [mode, apiDevices])

  useEffect(() => {
    setSelectedUpdateDevice(current => {
      if (!current) return current
      return devices.find(device => device.id === current.id) ?? current
    })
  }, [devices])

  const stats = useMemo(() => {
    const freshDevices = devices.filter(device => !isInventoryStale(device))
    const fullyPatchedCount = freshDevices.filter(device => device.patchStatus.missingCritical === 0 && device.patchStatus.missingTotal === 0 && !hasPendingRestart(device) && !device.patchStatus.osEol).length
    return {
      patchCompliance: freshDevices.length === 0 ? 0 : Math.round((fullyPatchedCount / freshDevices.length) * 100),
      pendingReboot: devices.filter(hasPendingRestart).length,
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
  const availableUpdateRows = devices.flatMap(device => (device.patchStatus.availableUpdates ?? []).map(update => ({
    device,
    update,
    key: `${device.id}:${update.updateId}:${update.revision}`,
  })))
  const failedUpdateInventoryCount = devices.filter(device =>
    device.os === 'Windows' && device.patchStatus.updateScanStatus === 'failed',
  ).length
  const partialUpdateInventoryCount = devices.filter(device =>
    device.os === 'Windows' && device.patchStatus.updateScanStatus === 'succeeded' && Boolean(device.patchStatus.updateScanError),
  ).length
  const commandDeviceIds = [...new Set([
    ...visibleDeviceIds.split('|').filter(Boolean),
    ...availableUpdateRows.map(({ device }) => device.id),
  ])].join('|')

  useEffect(() => {
    if (mode === 'demo' || !commandDeviceIds) {
      setActiveCommands({})
      return
    }

    let cancelled = false
    const deviceIds = commandDeviceIds.split('|')
    const refreshedCommandIds = new Set<string>()
    const refreshCommandStates = async () => {
      const results = await Promise.all(deviceIds.map(async deviceId => {
        try {
          return { deviceId, status: await getDeviceCommandStatus(deviceId), error: null }
        } catch (error) {
          return { deviceId, status: null, error: error instanceof Error ? error.message : 'Unknown error' }
        }
      }))
      if (cancelled) return

      const statusFailures = results.filter(result => result.error)
      setCommandStatusError(statusFailures.length
        ? `Unable to check command status for ${statusFailures.length} endpoint${statusFailures.length === 1 ? '' : 's'}. Retrying automatically. ${statusFailures[0].error}`
        : null)

      let hasNewlyCompletedUpdate = false
      for (const { status } of results) {
        if (!status || !isUpdateCommand(status.command) || refreshedCommandIds.has(status.command_id)) continue
        if (!['succeeded', 'failed', 'cancelled'].includes(status.status)) continue
        refreshedCommandIds.add(status.command_id)
        if (status.status === 'succeeded') {
          hasNewlyCompletedUpdate = true
        } else {
          setCommandError(status.result || `The ${status.command.replace('_', ' ')} command ${status.status}.`)
        }
      }
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
          if (!status) {
            if (next[deviceId]) next[deviceId] = { ...next[deviceId], phase: 'unreachable' }
            continue
          }
          const command = isUpdateCommand(status.command) ? status.command : null
          const progress = status.result?.match(/^update_progress:([0-9a-f-]{36}):(downloading|installing)$/i)
          const phase = progress
            ? progress[2] as 'downloading' | 'installing'
            : status.status === 'queued' ? 'queued' : status.status === 'running' ? 'running' : null
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
  }, [mode, commandDeviceIds])

  const platformSummaries = (['Windows', 'Mac', 'Linux'] as const).map(os => {
    const platformDevices = devices.filter(device => device.os === os)
    const scanned = platformDevices.filter(device => !isInventoryStale(device))
    const current = scanned.filter(device => device.patchStatus.missingTotal === 0 && !hasPendingRestart(device) && !device.patchStatus.osEol).length
    return {
      os,
      total: platformDevices.length,
      scanned: scanned.length,
      current,
      pending: platformDevices.filter(hasPendingRestart).length,
    }
  })

  async function runUpdateCommand(device: Device, command: UpdateCommand) {
    if (mode === 'demo') return
    setCommandError(null)
    setActiveCommands(current => ({ ...current, [device.id]: { command, phase: 'queued' } }))
    try {
      const queued = await queueUpdateCommand(device.id, command)
      const outcome = await waitForDeviceCommand(device.id, queued.command_id, status => {
        const progress = status.result?.match(/^update_progress:([0-9a-f-]{36}):(downloading|installing)$/i)
        const phase = progress
          ? progress[2] as 'downloading' | 'installing'
          : status.status === 'running' ? 'running' : status.status === 'queued' ? 'queued' : null
        if (phase) {
          setActiveCommands(current => ({ ...current, [device.id]: { command, phase } }))
        }

      }, 2000, command === 'install_updates' || command.startsWith('install_update:')
        ? 2 * 60 * 60 * 1000
        : command === 'check_updates' ? 30 * 60 * 1000 : 10 * 60 * 1000)
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

  function requestRestart(device: Device) {
    if (!window.confirm(`Restart ${device.name} now? The endpoint will restart in about 60 seconds.`)) return
    void runUpdateCommand(device, 'restart_now')
  }

  return (
    <div className="space-y-5">
      {selectedUpdateDevice && (() => {
        const device = selectedUpdateDevice
        const scanStatus = device.patchStatus.updateScanStatus ?? 'unknown'
        const partialResults = scanStatus === 'succeeded' && Boolean(device.patchStatus.updateScanError)
        const scanStatusLabel = partialResults ? 'Partial results' : scanStatus === 'succeeded' ? 'Successful' : scanStatus === 'failed' ? 'Failed' : 'Unknown'
        const scanStatusColor = partialResults ? STATUS_COLORS.warning : scanStatus === 'succeeded' ? STATUS_COLORS.compliant : scanStatus === 'failed' ? STATUS_COLORS.critical : STATUS_COLORS.unknown
        const lastScan = Date.parse(device.patchStatus.lastUpdateCheck)
        const pauseUntil = device.patchStatus.updatesPauseUntil ? Date.parse(device.patchStatus.updatesPauseUntil) : Number.NaN
        const state = getUpdateState(device)
        const StateIcon = state.icon

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedUpdateDevice(null)}>
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="update-device-detail-title"
              onClick={event => event.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-md border border-border bg-card shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">OS update details</p>
                  <h2 id="update-device-detail-title" className="mt-1 truncate text-[16px] font-semibold text-foreground">{device.name}</h2>
                  <p className="mt-1 text-[12px] text-muted-foreground">{device.osCaption || device.os} · {device.osVersion || 'Version not reported'}</p>
                </div>
                <button type="button" onClick={() => setSelectedUpdateDevice(null)} aria-label="Close update details" className="rounded p-1 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
                {commandError && <p role="alert" className="rounded-md border border-status-critical/20 bg-status-critical/5 px-3 py-2 text-[12px] text-status-critical">{commandError}</p>}
                {commandStatusError && <p role="status" className="rounded-md border border-status-warning/20 bg-status-warning/5 px-3 py-2 text-[12px] text-muted-foreground">{commandStatusError}</p>}
                <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface p-4 shadow-sm">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current update posture</p>
                    <p className="mt-1 text-[12px] text-foreground">
                      {device.patchStatus.missingCritical} critical / important · {device.patchStatus.missingTotal} total missing
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold" style={{ color: state.color, backgroundColor: `${state.color}1A` }}>
                    <StateIcon size={14} strokeWidth={1.75} />
                    {state.label}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-surface p-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Update scan</p>
                    <p className="mt-2 text-[13px] font-semibold" style={{ color: scanStatusColor }}>{scanStatusLabel}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Last scan {Number.isFinite(lastScan) ? format(new Date(lastScan), 'MMM d, yyyy HH:mm') : 'Never'}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-surface p-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Restart required</p>
                    <p className={cn('mt-2 text-[13px] font-semibold', hasPendingRestart(device) ? 'text-status-warning' : isInventoryStale(device) ? 'text-muted-foreground' : 'text-status-compliant')}>
                      {hasPendingRestart(device) ? 'Yes' : isInventoryStale(device) ? 'Unknown — scan is stale' : 'No'}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-surface p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Update policy</p>
                      {device.os === 'Windows' && (() => {
                        const activeCommand = activeCommands[device.id]
                        const isAutomatic = device.patchStatus.updatesAutomatic === true
                        const isApplying = activeCommand?.command === 'automatic_on' || activeCommand?.command === 'automatic_off'
                        return (
                          <button
                            type="button"
                            role="switch"
                            aria-label="Get the latest updates as soon as they're available"
                            aria-checked={isAutomatic}
                            disabled={mode === 'demo' || Boolean(activeCommand)}
                            onClick={event => {
                              event.stopPropagation()
                              void runUpdateCommand(device, isAutomatic ? 'automatic_off' : 'automatic_on')
                            }}
                            className={cn(
                              'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                              isAutomatic ? 'bg-brand' : 'bg-border',
                            )}
                          >
                            <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', isAutomatic ? 'translate-x-[18px]' : 'translate-x-1')} />
                            <span className="sr-only">{isApplying ? 'Applying update preference' : isAutomatic ? 'Enabled' : 'Disabled'}</span>
                          </button>
                        )
                      })()}
                    </div>
                    {(activeCommands[device.id]?.command === 'automatic_on' || activeCommands[device.id]?.command === 'automatic_off') && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-brand">
                        <RefreshCw size={12} className="animate-spin" />
                        {activeCommands[device.id]?.phase === 'running' ? 'Applying update setting…' : 'Waiting for endpoint agent…'}
                      </p>
                    )}
                    <p className="mt-2 text-[13px] font-semibold text-foreground">
                      {device.patchStatus.updatesAutomatic === undefined ? 'Not reported' : device.patchStatus.updatesAutomatic ? 'Latest updates enabled' : 'Latest updates disabled'}
                    </p>
                    {device.os === 'Windows' && <p className="mt-1 text-[11px] text-muted-foreground">Get the latest updates as soon as they’re available, including non-security updates, fixes, and improvements.</p>}
                    {Number.isFinite(pauseUntil) && (
                      <p className="mt-1 text-[11px] text-muted-foreground">Paused until {format(new Date(pauseUntil), 'MMM d, yyyy')}</p>
                    )}
                  </div>
                  <div className="rounded-md border border-border bg-surface p-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">OS support</p>
                    <p className={cn('mt-2 text-[13px] font-semibold', device.patchStatus.osEol ? 'text-status-critical' : 'text-status-compliant')}>
                      {device.patchStatus.osEol ? 'End of support' : 'Supported'}
                    </p>
                    {device.patchStatus.eolDate && <p className="mt-1 text-[11px] text-muted-foreground">End date {device.patchStatus.eolDate}</p>}
                  </div>
                </div>

                {device.patchStatus.updateScanError && (
                  <div className={cn('rounded-md border p-3', partialResults ? 'border-status-warning/20 bg-status-warning/5' : 'border-status-critical/20 bg-status-critical/5')}>
                    <p className={cn('text-[10px] font-semibold uppercase tracking-wider', partialResults ? 'text-status-warning' : 'text-status-critical')}>
                      {partialResults ? 'Scan warning' : 'Scan error'}
                    </p>
                    <p className="mt-1 break-words text-[12px] text-foreground">{device.patchStatus.updateScanError}</p>
                  </div>
                )}

                <section aria-labelledby="update-history-heading">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 id="update-history-heading" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Update history</h3>
                    <span className="text-[11px] text-muted-foreground">{device.patchStatus.updateHistory?.length ?? 0} entries</span>
                  </div>
                  <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface shadow-sm">
                    {(device.patchStatus.updateHistory ?? []).map((item, index) => {
                      const eventDate = item.date ? new Date(String(item.date)) : null
                      const eventDescription = item.description ?? item.operation
                      return (
                        <div key={index} className="space-y-1 px-3 py-2.5">
                          <p className="text-[12px] font-medium text-foreground">{String(item.title ?? 'Windows Update')}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {String(item.status ?? 'Unknown')} · {eventDate && Number.isFinite(eventDate.getTime()) ? format(eventDate, 'MMM d, yyyy HH:mm') : 'Unknown date'}
                          </p>
                          {Boolean(eventDescription) && (
                            <p className="text-[11px] text-muted-foreground">{String(eventDescription)}</p>
                          )}
                        </div>
                      )
                    })}
                    {(device.patchStatus.updateHistory ?? []).length === 0 && (
                      <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">No update history reported for this endpoint.</p>
                    )}
                  </div>
                </section>
              </div>
              <div className="flex justify-end border-t border-border px-5 py-3">
                <button type="button" onClick={() => setSelectedUpdateDevice(null)} className="rounded-md border border-border px-3 py-1.5 text-[12px] text-foreground transition-colors hover:bg-surface-hover">Close</button>
              </div>
            </section>
          </div>
        )
      })()}

      {loading && (
        <div className="flex items-center justify-center rounded-lg border border-border bg-card py-12 text-[13px] text-muted-foreground shadow-card">Loading patch data...</div>
      )}
      {loadError && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-status-critical/20 bg-status-critical/5 py-10 text-[13px] text-status-critical">
          <p>{loadError}</p>
          <button type="button" onClick={() => mode !== 'demo' && window.location.reload()} className="rounded-md border border-border bg-card px-3 py-1.5 text-[12px] transition-colors hover:bg-surface-hover">Retry</button>
        </div>
      )}

      {!loading && !loadError && (
        <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
      <SectionCard title="Update posture by platform" description="A quick view of update readiness across the fleet." className="rounded-lg transition-shadow duration-200 hover:shadow-md">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {platformSummaries.map(({ os, total, scanned, current, pending }) => {
            const percentage = scanned ? Math.round((current / scanned) * 100) : null
            return (
              <div key={os} className="rounded-lg border border-border bg-gradient-to-br from-surface to-surface-elevated p-4 shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full p-[5px]"
                    role="progressbar"
                    aria-label={`${os} update readiness`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentage ?? undefined}
                    style={{
                      background: percentage === null
                        ? 'var(--border)'
                        : `conic-gradient(var(--brand) ${percentage}%, var(--border) ${percentage}% 100%)`,
                    }}
                  >
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-surface text-[13px] font-semibold text-foreground">
                      {percentage === null ? '—' : `${percentage}%`}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <OSIcon os={os} />
                      <span className="text-[13px] font-semibold text-foreground">{os}</span>
                    </div>
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      <p>{percentage === null ? `No scan · ${total} devices` : `${current} of ${scanned} scanned ready`}</p>
                      <p>{pending} restart{pending === 1 ? '' : 's'} required</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Available Windows updates"
        description="Windows Update inventory refreshes every five minutes. Live download and install states are reported for Fleet actions; this agent cannot report live progress for downloads started elsewhere."
        className="order-3 rounded-lg transition-shadow duration-200 hover:shadow-md"
      >
        {commandError && <p role="alert" className="mb-3 rounded-md border border-status-critical/20 bg-status-critical/5 px-3 py-2 text-[12px] text-status-critical">{commandError}</p>}
        {commandStatusError && <p role="status" className="mb-3 rounded-md border border-status-warning/20 bg-status-warning/5 px-3 py-2 text-[12px] text-muted-foreground">{commandStatusError}</p>}
        {failedUpdateInventoryCount > 0 && (
          <p role="alert" className="mb-3 rounded-md border border-status-critical/20 bg-status-critical/5 px-3 py-2 text-[12px] text-muted-foreground">
            {failedUpdateInventoryCount} Windows endpoint{failedUpdateInventoryCount === 1 ? '' : 's'} reported an update scan failure; displayed inventory may be old. Open endpoint details for the scan error.
          </p>
        )}
        {partialUpdateInventoryCount > 0 && (
          <p role="status" className="mb-3 rounded-md border border-status-warning/20 bg-status-warning/5 px-3 py-2 text-[12px] text-muted-foreground">
            {partialUpdateInventoryCount} Windows endpoint{partialUpdateInventoryCount === 1 ? '' : 's'} returned partial update results. Review the endpoint scan warning.
          </p>
        )}
        {availableUpdateRows.length === 0 ? (
          <div className="rounded-md border border-border bg-surface px-4 py-8 text-center text-[12px] text-muted-foreground">
            {devices.some(device => device.os === 'Windows' && device.patchStatus.updateScanStatus === 'failed')
              ? 'Windows Update could not return an inventory. Open the endpoint details to see the scan error and retry.'
              : devices.some(device => device.os === 'Windows' && device.patchStatus.updateScanStatus === 'succeeded' && Boolean(device.patchStatus.updateScanError))
              ? 'Windows Update returned partial results. Review the endpoint scan warning before treating this as an empty inventory.'
              : devices.some(device => device.os === 'Windows' && device.patchStatus.availableUpdates !== undefined)
              ? 'Windows Update reports no applicable updates.'
              : 'Per-update inventory has not been reported by the Windows endpoints yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-sm">
            <table className="w-full min-w-[760px] text-left text-[12px]">
              <thead className="border-b border-border bg-surface-elevated text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">Endpoint</th>
                  <th className="px-3 py-2.5">Windows update</th>
                  <th className="px-3 py-2.5">Last observed status</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {availableUpdateRows.map(({ device, update, key }) => {
                  const active = activeCommands[device.id]
                  const command = `install_update:${update.updateId}`
                  const isActive = active?.command === command || active?.command === 'install_updates'
                  const pendingRestart = update.status === 'pending_restart' || update.rebootRequired
                  const liveStatus = isActive
                    ? active.phase === 'unreachable' ? 'Status unavailable'
                    : active.phase === 'downloading' ? 'Downloading'
                    : active.phase === 'installing' ? 'Installing'
                    : active.phase === 'queued' ? 'Waiting for endpoint'
                    : 'Preparing'
                    : pendingRestart ? 'Pending restart'
                    : update.downloaded ? 'Install' : 'Available'
                  const statusColor = liveStatus === 'Pending restart'
                    ? STATUS_COLORS.warning
                    : liveStatus === 'Install' ? 'var(--brand)' : liveStatus === 'Available' ? 'var(--muted-foreground)' : STATUS_COLORS.compliant
                  const updateSize = update.sizeBytes > 0 ? `${(update.sizeBytes / 1024 / 1024).toFixed(1)} MB` : null
                  return (
                    <tr key={key}>
                      <td className="px-3 py-3 align-top">
                        <p className="font-medium text-foreground">{device.name}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          Last scan {getInventoryAge(device.patchStatus.lastUpdateCheck)}
                        </p>
                      </td>
                      <td className="max-w-[420px] px-3 py-3 align-top">
                        <p className="font-medium text-foreground">{update.title}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {[update.severity, ...update.categories, updateSize].filter(Boolean).join(' · ') || 'Windows Update'}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: statusColor }}>
                          {isActive && active.phase !== 'unreachable' && <Loader2 size={12} className="animate-spin" />}
                          {liveStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right align-top">
                        {isActive ? (
                          <span className="text-[11px] text-muted-foreground">
                            {active.phase === 'unreachable' ? 'Cannot verify command status' : liveStatus === 'Downloading' ? 'Downloading…' : liveStatus === 'Installing' ? 'Installing…' : 'Waiting…'}
                          </span>
                        ) : pendingRestart ? (
                          <button
                            type="button"
                            disabled={mode === 'demo' || Boolean(active)}
                            onClick={() => requestRestart(device)}
                            className="text-[11px] font-medium text-status-warning underline underline-offset-2 disabled:opacity-50"
                          >
                            Restart now
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={mode === 'demo' || Boolean(active) || !isUpdateCommand(command)}
                            onClick={() => {
                              if (isUpdateCommand(command)) void runUpdateCommand(device, command)
                            }}
                            className="text-[11px] font-medium text-brand underline underline-offset-2 disabled:opacity-50"
                          >
                            {update.downloaded ? 'Install' : 'Download & install'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Remediation signals and endpoint priority list */}
      <div className="order-4 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-5">
        <SectionCard title="Remediation queue" description="Each endpoint appears once, assigned to its highest-priority reported state." className="min-w-0 rounded-lg transition-shadow duration-200 hover:shadow-md lg:col-span-2">
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

        <SectionCard title="At-risk endpoints" description="Highest-priority devices, ranked by OS lifecycle, missing updates, restart state, then inventory age." className="min-w-0 rounded-lg transition-shadow duration-200 hover:shadow-md lg:col-span-3">
          {atRiskDevices.length === 0 ? (
            <div className="rounded-md border border-border bg-surface px-4 py-8 text-center text-[12px] text-muted-foreground shadow-sm">
              No endpoint update risks are currently reported.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border bg-surface shadow-sm">
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
        <SectionCard title="End-of-Life Devices" description="These devices are running operating systems no longer receiving security updates." className="order-5 rounded-lg transition-shadow duration-200 hover:shadow-md">
          <div className="space-y-2">
            {eolDevices.map(d => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-status-critical/20 bg-status-critical/5 px-4 py-3 shadow-sm transition-shadow duration-200 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={15} strokeWidth={1.5} className="shrink-0 text-status-critical" />
                  <div>
                    <p className="font-mono text-[13px] font-medium text-foreground">{d.name}</p>
                     <p className="text-[11px] text-muted-foreground">{d.osCaption ? `${d.osCaption} · ${d.osVersion}` : d.osVersion}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-semibold text-status-critical">EOL{d.patchStatus.eolDate ? `: ${d.patchStatus.eolDate}` : ''}</p>
                  <p className="text-[11px] text-muted-foreground">{d.patchStatus.missingCritical} critical missing</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Device patch table */}
      <SectionCard title="Device update status" description="All managed devices sorted by update exposure." className="order-3 rounded-lg transition-shadow duration-200 hover:shadow-md">
        {commandError && <p role="alert" className="mb-3 rounded-md border border-status-critical/20 bg-status-critical/5 px-3 py-2 text-[12px] text-status-critical">{commandError}</p>}
        {commandStatusError && <p role="status" className="mb-3 rounded-md border border-status-warning/20 bg-status-warning/5 px-3 py-2 text-[12px] text-muted-foreground">{commandStatusError}</p>}
        <div className="mb-4 flex flex-wrap items-center gap-2">
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
        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-12 border-b border-border bg-surface-elevated px-3 py-3 text-[13px] font-semibold uppercase tracking-wider text-black dark:text-white">
              <span className="col-span-2">Device</span>
              <span className="col-span-2">OS</span>
              <span className="col-span-2 pl-4">OS Version</span>
              <span className="col-span-2 text-center">Update Policy</span>
              <span className="col-span-2 text-center">Pending Reboot</span>
              <span className="col-span-2">Update State</span>
            </div>
            <div className="divide-y divide-border">
              {pagedDevices.map(d => (
                <div
                  key={d.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`View OS update details for ${d.name}`}
                  onClick={() => setSelectedUpdateDevice(d)}
                  onKeyDown={event => {
                    if (event.target !== event.currentTarget) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedUpdateDevice(d)
                    }
                  }}
                  className="grid cursor-pointer grid-cols-12 items-center px-3 py-3 text-[13px] transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
                >
                  <div className="col-span-2">
                    <span className="truncate font-mono text-[13px] text-foreground">{d.name}</span>
                  </div>
                  <span className="col-span-2 truncate text-[13px] text-foreground" title={d.osCaption ?? undefined}>
                    {d.osCaption || 'Not reported'}
                  </span>
                  <span className="col-span-2 truncate pl-4 font-mono text-[13px] text-foreground" title={d.osVersion}>
                    {d.osVersion || 'Not reported'}
                  </span>
                  <span className="col-span-2 text-center text-[13px] text-foreground">
                    {d.patchStatus.updatesAutomatic === undefined ? 'Unknown' : d.patchStatus.updatesAutomatic ? 'Automatic' : 'Manual'}
                  </span>
                  <span className={cn('col-span-2 text-center text-[13px] font-medium', hasPendingRestart(d) ? 'text-status-warning' : isInventoryStale(d) ? 'text-muted-foreground' : 'text-status-compliant')}>
                    {hasPendingRestart(d)
                      ? 'Required'
                      : isInventoryStale(d) ? 'Unknown' : 'No'}
                  </span>
                  <span className="col-span-2 flex flex-col items-start gap-1">
                    {(() => {
                      const state = getUpdateState(d)
                      const Icon = state.icon
                      return (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium"
                          style={{ color: state.color, backgroundColor: `${state.color}1A` }}
                        >
                          <Icon size={12} strokeWidth={1.75} className="shrink-0" />
                          {state.label}
                        </span>
                      )
                    })()}
                    {d.os === 'Windows' && (hasPendingRestart(d) || isInventoryStale(d) || d.patchStatus.missingTotal > 0) && (() => {
                      const activeCommand = activeCommands[d.id]
                      const restartRequired = hasPendingRestart(d)
                      const command = restartRequired ? 'restart_now' : isInventoryStale(d) ? 'check_updates' : 'install_updates'
                      const label = activeCommand
                        ? activeCommand.command === 'check_updates'
                          ? activeCommand.phase === 'running' ? 'Checking for updates…' : 'Waiting for agent…'
                          : activeCommand.command === 'install_updates'
                          ? activeCommand.phase === 'running' ? 'Installing…' : 'Waiting for agent…'
                          : activeCommand.command === 'restart_now'
                          ? activeCommand.phase === 'running' ? 'Restarting…' : 'Waiting for agent…'
                          : activeCommand.phase === 'running' ? 'Applying update setting…' : 'Waiting for agent…'
                        : command === 'restart_now' ? 'Restart now' : command === 'check_updates' ? 'Check for updates' : 'Download and Install'
                      return (
                        <button type="button" disabled={Boolean(activeCommand)} onClick={event => { event.stopPropagation(); if (command === 'restart_now') requestRestart(d); else void runUpdateCommand(d, command) }} className="text-[11px] font-medium text-brand underline underline-offset-2 disabled:opacity-50">
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
            <button type="button" onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={currentPage === 1} aria-label="Previous page" className="flex h-7 w-7 items-center justify-center rounded border border-border text-foreground transition-colors hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-40">
              <ChevronLeft size={14} strokeWidth={1.75} />
            </button>
            <span className="min-w-16 text-center text-[12px] font-medium text-foreground">Page {currentPage} of {totalPages}</span>
            <button type="button" onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} aria-label="Next page" className="flex h-7 w-7 items-center justify-center rounded border border-border text-foreground transition-colors hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-40">
              <ChevronRight size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </SectionCard>
        </div>
    )}
  </div>
)
}