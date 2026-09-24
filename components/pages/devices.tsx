'use client'

import { useState, useMemo, useEffect } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Search, X, ChevronDown, ChevronLeft, ChevronRight, Laptop, CheckCircle2, XCircle, RefreshCw, Info, Megaphone, PauseCircle, History, Settings2, Check, Shield, ShieldCheck, ShieldAlert, Lock, Bug, Activity, User } from 'lucide-react'
import { Gauge } from '@mui/x-charts/Gauge'
import { getDevices, getDeviceChecks, getDeviceProtectionHistory, queueUpdateCommand, type DeviceCheck, type DeviceProtectionHistory, type ManagedDevice } from '@/lib/api-client'
import { devices as demoDevices } from '@/lib/mock-data'
import { useDataMode } from '@/lib/data-mode-provider'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import { getDefinitionAgeColor, STATUS_COLORS } from '@/lib/theme'
import type { Device, OS, DeviceStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const OS_OPTIONS: OS[] = ['Windows', 'Mac', 'Linux']
const STATUS_OPTIONS: DeviceStatus[] = ['compliant', 'warning', 'critical']
const PAGE_SIZE = 10

function managedDeviceToDevice(managedDevice: ManagedDevice): Device {
  const lastSeen = managedDevice.last_checkin ?? managedDevice.created_at
  const complianceScore = managedDevice.compliance_score ?? 0
  const reportedChecks = (managedDevice.passed_checks ?? 0) + (managedDevice.failed_checks ?? 0)
  const status: DeviceStatus = reportedChecks > 0
    ? complianceScore >= 85 ? 'compliant' : complianceScore >= 65 ? 'warning' : 'critical'
    : managedDevice.status === 'active' ? 'compliant' : managedDevice.status === 'error' ? 'critical' : 'warning'
  const os: OS = managedDevice.os === 'windows' ? 'Windows' : managedDevice.os === 'macos' ? 'Mac' : 'Linux'

  return {
    id: managedDevice.id,
    name: managedDevice.hostname,
    assetType: 'workstation',
    os,
    osVersion: managedDevice.os_version || 'Not reported',
    osCaption: managedDevice.os_caption || undefined,
    department: 'Not reported',
    ip: managedDevice.ip_address || 'Not reported',
    mac: managedDevice.mac_address || 'Not reported',
    username: managedDevice.username || 'Not reported',
    complianceScore,
    status,
    failedChecks: managedDevice.failed_checks ?? 0,
    passedChecks: managedDevice.passed_checks ?? 0,
    lastSeen,
    lastScanned: lastSeen,
    malwareStatus: {
      definitionAge: managedDevice.malware?.definition_age ?? 0,
      realtimeProtection: managedDevice.malware?.realtime_protection ?? false,
      tamperProtection: managedDevice.malware?.tamper_protection ?? false,
      quarantineCount: managedDevice.malware?.quarantine_count ?? 0,
      cloudDeliveredProtection: managedDevice.malware?.cloud_delivered_protection ?? false,
      automaticSampleSubmission: managedDevice.malware?.automatic_sample_submission ?? false,
      devDriveProtection: managedDevice.malware?.dev_drive_protection ?? false,
      lastScanResult: managedDevice.malware?.last_scan_result ?? 'scan_failed',
      lastScanAt: managedDevice.malware?.last_scan_at,
      lastScanType: managedDevice.malware?.last_scan_type,
      lastScanFiles: managedDevice.malware?.last_scan_files,
    },
    patchStatus: {
      missingCritical: managedDevice.patch_status?.missing_critical ?? 0,
      missingTotal: managedDevice.patch_status?.missing_total ?? 0,
      pendingReboot: managedDevice.patch_status?.pending_reboot ?? false,
      lastUpdateCheck: managedDevice.patch_status?.last_update_check ?? lastSeen,
      osEol: managedDevice.patch_status?.os_eol ?? false,
      updateHistory: managedDevice.update_history,
      updatesAutomatic: managedDevice.updates_automatic,
      updatesPauseUntil: managedDevice.updates_pause_until,
    },
    domainJoined: false,
  }
}

// --- Shared health and reporting status system -----------------------------
type Severity = 'compliant' | 'warning' | 'critical'
type ReportingStatus = 'online' | 'stale' | 'offline' | 'disconnected'

const SEVERITY: Record<Severity, { dot: string; label: string }> = {
  compliant: { dot: 'var(--category-1)', label: 'Healthy' },
  warning: { dot: STATUS_COLORS.warning, label: 'Warning' },
  critical: { dot: STATUS_COLORS.critical, label: 'Critical' },
}

const REPORTING_STATUS: Record<ReportingStatus, { dot: string; label: string }> = {
  online: { dot: 'var(--status-good)', label: 'Online' },
  stale: { dot: 'var(--status-critical)', label: 'Stale' },
  offline: { dot: 'var(--status-unknown)', label: 'Offline' },
  disconnected: { dot: 'var(--status-critical)', label: 'Disconnected' },
}

// Status text stays neutral in every state — only the dot carries color.
// This is what keeps the indicator restrained instead of reading as a
// bright, candy-colored badge.
function scoreToSeverity(score: number): Severity {
  if (score >= 85) return 'compliant'
  if (score >= 65) return 'warning'
  return 'critical'
}

function getReportingStatus(dateStr: string): ReportingStatus {
  const hoursAgo = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60)
  if (hoursAgo <= 1) return 'online'
  if (hoursAgo <= 24) return 'stale'
  if (hoursAgo <= 24 * 7) return 'offline'
  return 'disconnected'
}

function StatusIndicator({ status, className, showDot = true }: { status: DeviceStatus; className?: string; showDot?: boolean }) {
  const s = SEVERITY[status as Severity]
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {showDot && <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: s.dot }} />}
      <span className="text-[12px] font-medium capitalize text-black">
        {s.label}
      </span>
    </span>
  )
}

function ReportingStatusIndicator({ lastSeen, className }: { lastSeen: string; className?: string }) {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const status = hydrated ? REPORTING_STATUS[getReportingStatus(lastSeen)] : REPORTING_STATUS.online
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: status.dot }} />
      <span className="text-[12px] font-medium text-black">{status.label}</span>
    </span>
  )
}

type MalwareRow = {
  label: string
  value: string
  color?: string
  mono?: boolean
}

function getMalwareRows(device: Device): { provider: string; summary: string; rows: MalwareRow[] } {
  const malware = device.malwareStatus
  const protectionColor = malware.realtimeProtection ? 'var(--status-good)' : STATUS_COLORS.critical
  const scanLabel = (malware.lastScanResult || 'scan_failed').replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase())

  if (device.os === 'Windows') {
    return {
      provider: 'Microsoft Defender Antivirus',
      summary: malware.realtimeProtection ? 'Protection is active' : 'Action needed',
        rows: [
          { label: 'Security intelligence', value: `${malware.definitionAge} day${malware.definitionAge === 1 ? '' : 's'} old`, color: getDefinitionAgeColor(malware.definitionAge) },
          { label: 'Security intelligence status', value: malware.definitionAge <= 3 ? 'Up to date' : 'Update required', color: malware.definitionAge <= 3 ? protectionColor : STATUS_COLORS.warning },
          { label: 'Security intelligence version', value: malware.securityIntelligenceVersion ?? 'Not reported', mono: true },
          { label: 'Last update', value: malware.securityIntelligenceUpdatedAt ? format(new Date(malware.securityIntelligenceUpdatedAt), 'MMM d, yyyy HH:mm') : format(new Date(device.lastScanned), 'MMM d, yyyy HH:mm'), color: malware.definitionAge <= 3 ? protectionColor : STATUS_COLORS.warning },
          { label: 'Update check', value: malware.definitionAge <= 3 ? 'No action needed' : 'Check for updates', color: malware.definitionAge <= 3 ? protectionColor : STATUS_COLORS.warning },
          { label: 'Real-time protection', value: malware.realtimeProtection ? 'Enabled' : 'Disabled', color: protectionColor },
          { label: 'Dev Drive protection', value: malware.devDriveProtection ? 'Enabled' : 'Disabled', color: malware.devDriveProtection ? protectionColor : STATUS_COLORS.critical },
          { label: 'Cloud-delivered protection', value: malware.cloudDeliveredProtection ? 'Enabled' : 'Disabled', color: malware.cloudDeliveredProtection ? protectionColor : STATUS_COLORS.critical },
          { label: 'Automatic sample submission', value: malware.automaticSampleSubmission ? 'Enabled' : 'Disabled', color: malware.automaticSampleSubmission ? protectionColor : STATUS_COLORS.critical },
          { label: 'Tamper protection', value: malware.tamperProtection ? 'Enabled' : 'Disabled', color: malware.tamperProtection ? protectionColor : STATUS_COLORS.critical },
          { label: 'Controlled folder access', value: malware.tamperProtection ? 'Review settings' : 'Not enabled', color: malware.tamperProtection ? STATUS_COLORS.warning : STATUS_COLORS.critical },
          { label: 'Ransomware protection', value: malware.tamperProtection ? 'No action needed' : 'Review settings', color: malware.tamperProtection ? protectionColor : STATUS_COLORS.warning },
          { label: 'Protection History', value: String(malware.quarantineCount), mono: true },
        ],
    }
  }

  if (device.os === 'Mac') {
    return {
      provider: 'Apple Endpoint Security',
      summary: malware.realtimeProtection ? 'Built-in protections are active' : 'Action needed',
      rows: [
        { label: 'XProtect malware definitions', value: `${malware.definitionAge} day${malware.definitionAge === 1 ? '' : 's'} old`, color: getDefinitionAgeColor(malware.definitionAge) },
        { label: 'XProtect remediation', value: malware.realtimeProtection ? 'Enabled' : 'Disabled', color: protectionColor },
        { label: 'Gatekeeper', value: malware.realtimeProtection ? 'Enabled' : 'Review settings', color: protectionColor },
        { label: 'Malware Removal Tool', value: malware.realtimeProtection ? 'Available' : 'Unavailable', color: protectionColor },
        { label: 'Background malware scan', value: scanLabel, color: malware.lastScanResult === 'clean' ? protectionColor : STATUS_COLORS.critical },
        { label: 'Last scan result', value: scanLabel, color: malware.lastScanResult === 'clean' ? protectionColor : STATUS_COLORS.critical },
        { label: 'Detected items', value: String(malware.quarantineCount), mono: true },
      ],
    }
  }

  return {
    provider: 'Linux Endpoint Protection',
    summary: malware.realtimeProtection ? 'Endpoint protection is active' : 'Action needed',
      rows: [
        { label: 'EDR agent', value: malware.realtimeProtection ? 'Running' : 'Stopped', color: protectionColor },
        { label: 'ClamAV / malware engine', value: malware.realtimeProtection ? 'Enabled' : 'Disabled', color: protectionColor },
        { label: 'Signature database', value: `${malware.definitionAge} day${malware.definitionAge === 1 ? '' : 's'} old`, color: getDefinitionAgeColor(malware.definitionAge) },
        { label: 'On-access scanning', value: malware.realtimeProtection ? 'Enabled' : 'Disabled', color: protectionColor },
        { label: 'Audit and detection service', value: malware.tamperProtection ? 'Running' : 'Review required', color: malware.tamperProtection ? protectionColor : STATUS_COLORS.warning },
        { label: 'Last scan result', value: scanLabel, color: malware.lastScanResult === 'clean' ? protectionColor : STATUS_COLORS.critical },
        { label: 'Quarantined items', value: String(malware.quarantineCount), mono: true },
      ],
  }
}

// --- Per-OS update mechanics --------------------------------------------
// What each platform actually exposes differs: Windows has a "seeker"
// toggle and a date-based pause; macOS has an automatic-install toggle and
// day-based deferral (no calendar date); Linux has unattended-upgrades and
// package holds (no built-in pause window at all). This keeps the tab
// honest to each platform instead of showing Windows-only concepts on
// Mac/Linux devices.
type UpdatePauseKind = 'date' | 'defer' | 'hold'

interface UpdateOptions {
  providerLabel: string
  autoUpdate: { label: string; description: string }
  pause: { kind: UpdatePauseKind; label: string; description: string; actionLabel: string }
  eolNote: string | null
}

function getUpdateOptions(device: Device): UpdateOptions {
  if (device.os === 'Windows') {
    return {
      providerLabel: 'Windows Update',
      autoUpdate: {
        label: 'Get the latest updates as soon as they\u2019re available',
        description: 'Be among the first to get non-security updates, fixes, and improvements as they roll out.',
      },
      pause: {
        kind: 'date',
        label: 'Pause updates',
        description: 'Select the date to pause updates until.',
        actionLabel: 'Pick a date',
      },
      eolNote: null,
    }
  }

  if (device.os === 'Mac') {
    return {
      providerLabel: 'Software Update',
      autoUpdate: {
        label: 'Install macOS updates automatically',
        description: 'Automatically install macOS updates, security responses, and system files.',
      },
      pause: {
        kind: 'defer',
        label: 'Defer software updates',
        description: 'Delay optional macOS updates from appearing, in days rather than a set date.',
        actionLabel: 'Set deferral',
      },
      eolNote: 'Apple does not publish official end-of-support dates \u2014 treat this as an estimate.',
    }
  }

  return {
    providerLabel: 'Package Updates',
    autoUpdate: {
      label: 'Automatically install security updates',
      description: 'Apply available security patches without manual approval (e.g. unattended-upgrades).',
    },
    pause: {
      kind: 'hold',
      label: 'Hold available updates',
      description: 'Prevent pending packages from installing until the hold is released.',
      actionLabel: 'Manage holds',
    },
    eolNote: null,
  }
}

function OSIcon({ os, className }: { os: OS; className?: string }) {
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
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" className={className} fill="none">
      <path d="M12 2C10.5 2 9 3 8.5 4.5C8 3 6.5 2 5 2C3.5 2 2.5 3.5 2.5 5.5C2.5 7 3 8 3.5 8.5C3 8.8 2 9.5 2 11C2 12.5 2.8 13.5 4 14C3 14.5 2 15.5 2 17C2 19 3.5 21 5 21C6.5 21 7 19.5 8.5 19.5C10 19.5 10.5 21 12 21C13.5 21 14 19.5 15.5 19.5C17 19.5 17.5 21 19 21C20.5 21 22 19 22 17C22 15.5 21 14.5 20 14C21.2 13.5 22 12.5 22 11C22 9.5 21 8.8 20.5 8.5C21 8 21.5 7 21.5 5.5C21.5 3.5 20.5 2 19 2C17.5 2 16 3 15.5 4.5C15 3 13.5 2 12 2Z" fill="#FFCC00" stroke="#000" strokeWidth="0.5"/>
      <ellipse cx="8" cy="10" rx="1.5" ry="2" fill="#fff"/>
      <ellipse cx="16" cy="10" rx="1.5" ry="2" fill="#fff"/>
      <circle cx="8" cy="10.5" r="0.8" fill="#000"/>
      <circle cx="16" cy="10.5" r="0.8" fill="#000"/>
      <path d="M10 13C10 13 11 14 12 14C13 14 14 13 14 13" stroke="#F7941D" strokeWidth="1" strokeLinecap="round"/>
      <path d="M8 5C8 5 9 4 10 5" stroke="#FF8C00" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      <path d="M16 5C16 5 15 4 14 5" stroke="#FF8C00" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

interface DeviceDrawerProps {
  device: Device
  onClose: () => void
}

function DeviceDrawer({ device, onClose }: DeviceDrawerProps) {
  const [tab, setTab] = useState<'overview' | 'checks' | 'updates' | 'malware' | 'history'>('overview')
  const [checks, setChecks] = useState<DeviceCheck[]>([])
  const [checksLoading, setChecksLoading] = useState(false)
  const [updateBannerOpen, setUpdateBannerOpen] = useState(true)
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(device.patchStatus.updatesAutomatic ?? false)
  const [pauseDate, setPauseDate] = useState(device.patchStatus.updatesPauseUntil?.slice(0, 10) ?? '')
  const [updateAction, setUpdateAction] = useState<string | null>(null)
  const [updateHistoryOpen, setUpdateHistoryOpen] = useState(false)
  const [protectionHistory, setProtectionHistory] = useState<DeviceProtectionHistory[]>([])
  const [protectionHistoryLoading, setProtectionHistoryLoading] = useState(false)
  const [protectionHistoryOpen, setProtectionHistoryOpen] = useState(false)

  useEffect(() => {
    setChecksLoading(true)
    getDeviceChecks(device.id)
      .then(setChecks)
      .catch(() => setChecks([]))
      .finally(() => setChecksLoading(false))
  }, [device.id])

  const checkSeverity: Record<string, 'critical' | 'warning' | 'info'> = {
    'chk-001': 'critical', 'chk-002': 'warning', 'chk-004': 'warning', 'chk-007': 'warning',
    'chk-008': 'critical', 'chk-010': 'critical', 'chk-011': 'critical', 'chk-012': 'warning',
    'chk-014': 'critical', 'chk-015': 'critical', 'chk-016': 'warning', 'chk-017': 'warning',
    'chk-020': 'critical', 'chk-021': 'warning',
  }
  const defColor = getDefinitionAgeColor(device.malwareStatus.definitionAge)
  const updateState = device.patchStatus.osEol
    ? { label: 'End of support', color: STATUS_COLORS.critical }
    : device.patchStatus.pendingReboot
    ? { label: 'Restart required', color: STATUS_COLORS.warning }
    : device.patchStatus.missingCritical > 0
    ? { label: 'Security updates missing', color: STATUS_COLORS.critical }
    : device.patchStatus.missingTotal > 0
    ? { label: 'Updates available', color: STATUS_COLORS.warning }
    : { label: 'Up to date', color: 'var(--status-good)' }
  const sendUpdateCommand = async (command: string, pauseUntil?: string) => {
    setUpdateAction(command)
    try { await queueUpdateCommand(device.id, command, pauseUntil) } finally { setUpdateAction(null) }
  }
  const openProtectionHistory = () => {
    setProtectionHistoryOpen(true)
    setProtectionHistoryLoading(true)
    void getDeviceProtectionHistory(device.id)
      .then(setProtectionHistory)
      .catch(() => setProtectionHistory([]))
      .finally(() => setProtectionHistoryLoading(false))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 flex h-[min(860px,calc(100vh-2rem))] w-full max-w-[640px] flex-col overflow-hidden border border-border bg-card shadow-2xl sm:h-[min(860px,calc(100vh-3rem))]">
        {/* Header */}
        <div className="sticky top-0 z-30 flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <Laptop size={15} strokeWidth={1.5} className="shrink-0 text-black dark:text-white" />
                <span className="truncate font-mono text-[12px] font-semibold text-black">{device.name}</span>
              </div>
              <span className="h-3 w-px shrink-0 bg-border" />
              <StatusIndicator status={device.status} />
              <span className="h-3 w-px shrink-0 bg-border" />
              <ReportingStatusIndicator lastSeen={device.lastSeen} />
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[12px] font-mono text-black">
              <span>{device.osCaption ? `${device.osCaption} · ${device.osVersion}` : device.osVersion}</span>
              <span className="text-border">·</span>
              <span>{device.ip}</span>
            </div>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 shrink-0 items-center justify-center rounded hover:bg-surface-hover text-black dark:text-white transition-colors mt-0.5">
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Tabs */}
        <div className="sticky top-[73px] z-20 flex border-b border-border bg-card px-5">
          {([
            ['overview', 'Overview'],
            ['checks', 'Checks'],
            ['updates', 'OS Updates'],
            ['malware', 'Malware'],
            ['history', 'History'],
          ] as [string, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id as typeof tab)}
              className={cn(
                'px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors -mb-px first:pl-0',
                tab === id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-black dark:text-white hover:text-black dark:hover:text-white'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === 'checks' && (
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-[14px] font-semibold text-foreground">Endpoint checks</h3>
                  <p className="mt-1 text-[12px] text-muted-foreground">Latest compliance result reported by this device.</p>
                </div>
                <span className="font-mono text-[12px] text-muted-foreground">{device.passedChecks} passed · {device.failedChecks} failed</span>
              </div>
              {checksLoading ? (
                <div className="rounded-md border border-border bg-surface px-4 py-8 text-center text-[12px] text-muted-foreground">Loading check results...</div>
              ) : checks.length === 0 ? (
                <div className="rounded-md border border-border bg-surface px-4 py-8 text-center text-[12px] text-muted-foreground">No check results have been reported yet.</div>
              ) : (
                <div className="divide-y divide-border rounded-md border border-border bg-surface">
                  {checks.map(check => {
                    const statusColor = check.status === 'passed' ? 'var(--status-good)' : check.status === 'failed' ? STATUS_COLORS.critical : check.status === 'error' ? STATUS_COLORS.warning : 'var(--status-unknown)'
                    const severity = checkSeverity[check.check_id] ?? 'info'
                    return (
                      <div key={check.check_id} className="space-y-2 px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: statusColor }} />
                              <p className="text-[12px] font-semibold text-foreground">{check.title}</p>
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{severity}</span>
                            </div>
                            <p className="mt-1 pl-4 text-[11px] text-muted-foreground">{check.category.replace('_', ' ')}</p>
                          </div>
                          <span className="shrink-0 text-[11px] font-semibold capitalize" style={{ color: statusColor }}>{check.status}</span>
                        </div>
                        {check.details && <p className="pl-4 text-[11px] leading-relaxed text-foreground">{check.details}</p>}
                        <p className="pl-4 text-[10px] text-muted-foreground">{check.checked_at ? `Checked ${formatDistanceToNow(new Date(check.checked_at), { addSuffix: true })}` : 'Not checked yet'}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'overview' && (
            <div className="space-y-4">
              {/* Score Ring */}
              <div className="flex items-center gap-4 rounded-md border border-border bg-surface p-4">
                <Gauge
                  width={104}
                  height={104}
                  value={device.complianceScore}
                  valueMin={0}
                  valueMax={100}
                  startAngle={0}
                  endAngle={360}
                  innerRadius="72%"
                  outerRadius="100%"
                  sx={{
                    [`& .MuiGauge-valueArc`]: {
                      fill: SEVERITY[device.status as Severity].dot,
                    },
                    [`& .MuiGauge-referenceArc`]: {
                      fill: 'var(--border)',
                    },
                    [`& .MuiGauge-valueText`]: {
                      fill: SEVERITY[device.status as Severity].dot,
                      fontSize: 22,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    },
                  }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Activity size={14} strokeWidth={1.75} className="shrink-0 text-black dark:text-white" />
                    <p className="text-[13px] font-semibold text-foreground">Compliance Score</p>
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-[12px] text-black dark:text-white">
                    <p className="inline-flex items-center gap-1.5 font-medium text-black dark:text-white">
                      <CheckCircle2 size={13} strokeWidth={2.25} className="text-[var(--category-1)]" />
                      {device.passedChecks} passed
                    </p>
                    <p className="flex items-center gap-1.5 font-medium text-black dark:text-white">
                      <XCircle size={13} strokeWidth={2.25} className="text-[var(--status-critical)]" />
                      {device.failedChecks} failed
                    </p>
                  </div>
                </div>
              </div>

              {[
                {
                  title: 'Device information',
                  icon: Laptop,
                  rows: [
                    { label: 'Asset Type', value: device.assetType === 'dc_server' ? 'DC Server' : device.assetType === 'laptop' ? 'Laptop' : 'Workstation' },
                     { label: 'Operating System', value: device.osCaption ? `${device.osCaption} · ${device.osVersion}` : `${device.os} · ${device.osVersion}` },
                    { label: 'IP Address', value: device.ip, mono: true },
                    { label: 'MAC Address', value: device.mac, mono: true },
                  ] as MalwareRow[],
                },
                {
                  title: 'Health & reporting',
                  icon: Activity,
                  rows: [
                    { label: 'Health', value: SEVERITY[scoreToSeverity(device.complianceScore)].label, color: SEVERITY[scoreToSeverity(device.complianceScore)].dot },
                    { label: 'Status', value: REPORTING_STATUS[getReportingStatus(device.lastSeen)].label, color: REPORTING_STATUS[getReportingStatus(device.lastSeen)].dot },
                    { label: 'Last Seen', value: formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true }) },
                    { label: 'Last Scanned', value: formatDistanceToNow(new Date(device.lastScanned), { addSuffix: true }) },
                  ] as MalwareRow[],
                },
                {
                  title: 'Ownership',
                  icon: User,
                  rows: [
                    { label: 'Department', value: device.department },
                    { label: 'Username', value: device.username },
                    { label: 'Domain Joined', value: device.domainJoined ? 'Yes' : 'No' },
                  ] as MalwareRow[],
                },
              ].map(section => {
                const SectionIcon = section.icon
                return (
                  <div key={section.title}>
                    <div className="mb-2 flex items-center gap-2">
                      <SectionIcon size={14} strokeWidth={1.75} className="shrink-0 text-black dark:text-white" />
                      <p className="text-[13px] font-semibold text-foreground">{section.title}</p>
                    </div>
                    <div className="divide-y divide-border rounded-md border border-border bg-surface">
                      {section.rows.map(item => (
                        <div key={item.label} className="flex items-center justify-between gap-4 px-3 py-2.5">
                          <span className="text-[12px] text-black dark:text-white">{item.label}</span>
                          <span className={cn('inline-flex items-center gap-1.5 text-right text-[12px] text-black dark:text-white', item.mono && 'font-mono')}>
                            {item.color && <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: item.color }} />}
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'updates' && (
            <div className="space-y-4">
              {(() => {
                const hasMissing = device.patchStatus.missingTotal > 0
                const isUpToDate = updateState.label === 'Up to date'
                const missingLabel = `${device.patchStatus.missingTotal} update${device.patchStatus.missingTotal === 1 ? '' : 's'}`
                const updateOptions = getUpdateOptions(device)

                return (
                  <>
                    {/* Status card */}
                    <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface p-4">
                      <div className="flex items-center gap-3.5">
                        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${updateState.color}1f` }}>
                          <RefreshCw size={18} strokeWidth={2} style={{ color: updateState.color }} />
                          {isUpToDate && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-surface" style={{ backgroundColor: 'var(--status-good)' }}>
                              <Check size={10} strokeWidth={3} className="text-white" />
                            </span>
                          )}
                        </span>
                        <div>
                          <p className="text-[14px] font-semibold text-foreground">{updateState.label}</p>
                          <p className="mt-0.5 text-[12px] text-muted-foreground">
                            {updateOptions.providerLabel} · Last checked {formatDistanceToNow(new Date(device.patchStatus.lastUpdateCheck), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void sendUpdateCommand('check')}
                        className="shrink-0 rounded-md bg-[#303030] px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#3b3b3b]"
                      >
                        Check for updates
                      </button>
                    </div>

                    {/* Available update banner */}
                    {hasMissing && updateBannerOpen && (
                      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Info size={15} strokeWidth={2} className="shrink-0 text-brand" />
                          <p className="truncate text-[12px] text-black dark:text-white">
                            {missingLabel} available for {device.osVersion}
                            {device.patchStatus.missingCritical > 0 && ` (${device.patchStatus.missingCritical} critical)`}.
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <button type="button" onClick={() => undefined} className="text-[12px] font-medium text-brand hover:underline">
                            Download &amp; install
                          </button>
                          <button type="button" onClick={() => setUpdateBannerOpen(false)} aria-label="Dismiss" className="text-black dark:text-white">
                            <X size={13} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* More options */}
                    <div>
                      <p className="mb-2 text-[13px] font-semibold text-foreground">More options</p>
                      <div className="divide-y divide-border rounded-md border border-border bg-surface">
                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <div className="flex items-start gap-3">
                            <Megaphone size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-black dark:text-white" />
                            <div>
                              <p className="text-[12px] font-medium text-black dark:text-white">{updateOptions.autoUpdate.label}</p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">{updateOptions.autoUpdate.description}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={autoUpdateEnabled}
                            onClick={() => { const next = !autoUpdateEnabled; setAutoUpdateEnabled(next); void sendUpdateCommand(next ? 'automatic_on' : 'automatic_off') }}
                            className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', autoUpdateEnabled ? 'bg-brand' : 'bg-border')}
                          >
                            <span className={cn('inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform', autoUpdateEnabled ? 'translate-x-[18px]' : 'translate-x-1')} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-4 px-4 py-3">
                          <div className="flex items-start gap-3">
                            <PauseCircle size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-black dark:text-white" />
                            <div>
                              <p className="text-[12px] font-medium text-black dark:text-white">{updateOptions.pause.label}</p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">{updateOptions.pause.description}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                          <input type="date" value={pauseDate} min={new Date().toISOString().slice(0, 10)} onChange={event => setPauseDate(event.target.value)} className="h-7 rounded border border-border bg-card px-2 text-[11px] text-foreground" />
                          <button
                            type="button"
                            onClick={() => pauseDate && void sendUpdateCommand('pause', `${pauseDate}T23:59:59Z`)}
                            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-[12px] font-medium text-black dark:text-white transition-colors hover:bg-surface-hover"
                          >
                            {updateOptions.pause.actionLabel}
                          </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setUpdateHistoryOpen(true)}
                          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
                        >
                          <div className="flex items-center gap-3">
                            <History size={15} strokeWidth={1.75} className="shrink-0 text-black dark:text-white" />
                            <p className="text-[12px] font-medium text-black dark:text-white">Update history</p>
                          </div>
                          <ChevronRight size={14} strokeWidth={1.75} className="shrink-0 text-black dark:text-white" />
                        </button>

                      </div>
                    </div>

                    <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <RefreshCw size={12} strokeWidth={1.75} className="shrink-0" />
                      Last full update inventory check: {format(new Date(device.patchStatus.lastUpdateCheck), 'MMM d, yyyy HH:mm')}
                    </p>
                  </>
                )
              })()}
            </div>
          )}

          {tab === 'malware' && (
            <div className="space-y-4">
              {(() => {
                const malwareDetails = getMalwareRows(device)
                const protectionActive = device.malwareStatus.realtimeProtection
                const hasThreats = device.malwareStatus.lastScanResult === 'threats_found'
                const protectionColor = protectionActive ? 'var(--status-good)' : STATUS_COLORS.critical

                const sections = [
                  {
                    title: 'Virus & threat protection settings',
                    description: 'Core Microsoft Defender protection controls.',
                    icon: Shield,
                    labels: ['Real-time protection', 'Dev Drive protection', 'Cloud-delivered protection', 'Automatic sample submission', 'Tamper protection'],
                  },
                  {
                    title: 'Virus & threat protection updates',
                    description: 'Security intelligence and engine update status.',
                    icon: RefreshCw,
                    labels: ['Security intelligence', 'Security intelligence status', 'Security intelligence version', 'Last update', 'Update check'],
                  },
                  {
                    title: 'Ransomware protection',
                    description: 'Controls that protect files and folders from unauthorized changes.',
                    icon: Lock,
                    labels: ['Controlled folder access', 'Ransomware protection', 'Protection History'],
                  },
                ]

                const renderRow = (item: MalwareRow) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 px-3 py-2.5">
                    <span className="text-[12px] text-black dark:text-white">{item.label}</span>
                    <span className={cn('inline-flex items-center gap-1.5 text-right text-[12px] text-black dark:text-white', item.mono && 'font-mono')}>
                      {item.color && <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: item.color }} />}
                      {item.value}
                    </span>
                  </div>
                )

                return (
                  <>
                    {/* Status card */}
                    <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface p-4">
                      <div className="flex items-center gap-3.5">
                        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${protectionColor}1f` }}>
                          {protectionActive ? (
                            <ShieldCheck size={19} strokeWidth={2} style={{ color: protectionColor }} />
                          ) : (
                            <ShieldAlert size={19} strokeWidth={2} style={{ color: protectionColor }} />
                          )}
                        </span>
                        <div>
                          <p className="text-[14px] font-semibold text-foreground">{malwareDetails.provider}</p>
                          <p className="mt-0.5 text-[12px] text-muted-foreground">{malwareDetails.summary} · {device.os} protection profile</p>
                        </div>
                      </div>
                      {device.os === 'Windows' && (
                        <button
                          type="button"
                          onClick={() => undefined}
                          className="shrink-0 rounded-md bg-[#303030] px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#3b3b3b]"
                        >
                          Quick scan
                        </button>
                      )}
                    </div>

                    {/* Current threats banner */}
                    {device.os === 'Windows' && (
                      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          {hasThreats ? (
                            <Bug size={15} strokeWidth={2} className="shrink-0" style={{ color: STATUS_COLORS.critical }} />
                          ) : (
                            <ShieldCheck size={15} strokeWidth={2} className="shrink-0" style={{ color: 'var(--status-good)' }} />
                          )}
                          <p className="truncate text-[12px] text-black dark:text-white">
                            {hasThreats
                              ? `${device.malwareStatus.quarantineCount} threat${device.malwareStatus.quarantineCount === 1 ? '' : 's'} found or quarantined`
                              : 'No current threats found'}
                            {' · '}Last {device.malwareStatus.lastScanType ?? 'quick'} scan {formatDistanceToNow(new Date(device.malwareStatus.lastScanAt ?? device.lastScanned), { addSuffix: true })}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {typeof device.malwareStatus.lastScanFiles === 'number' ? `${device.malwareStatus.lastScanFiles.toLocaleString()} files scanned` : 'Files scanned not reported'}
                        </span>
                      </div>
                    )}

                    {device.os === 'Windows' ? (
                      <>
                        {sections.map(section => {
                          const rows = malwareDetails.rows.filter(row => section.labels.includes(row.label))
                          const SectionIcon = section.icon
                          return (
                            <div key={section.title}>
                              <div className="mb-0.5 flex items-center gap-2">
                                <SectionIcon size={14} strokeWidth={1.75} className="shrink-0 text-black dark:text-white" />
                                <p className="text-[13px] font-semibold text-foreground">{section.title}</p>
                              </div>
                              <p className="mb-2 ml-[22px] text-[11px] text-muted-foreground">{section.description}</p>
                              <div className="divide-y divide-border rounded-md border border-border bg-surface">
                                {rows.map(renderRow)}
                              </div>
                            </div>
                          )
                        })}
                        <button type="button" onClick={openProtectionHistory} className="flex w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-3 text-left transition-colors hover:bg-surface-hover">
                          <span className="text-[12px] font-medium text-foreground">Open Protection History</span>
                          <ChevronRight size={14} strokeWidth={1.75} className="text-muted-foreground" />
                        </button>
                      </>
                    ) : (
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <Shield size={14} strokeWidth={1.75} className="shrink-0 text-black dark:text-white" />
                          <p className="text-[13px] font-semibold text-foreground">Protection details</p>
                        </div>
                        <div className="divide-y divide-border rounded-md border border-border bg-surface">
                          {malwareDetails.rows.map(renderRow)}
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-4">
              <p className="text-[13px] font-semibold text-foreground">Compliance scan history</p>
              <div className="bg-surface border border-border rounded-md divide-y divide-border">
                {[...Array(5)].map((_, i) => {
                  const score = device.complianceScore - i * 2
                  return <div key={i} className="flex items-center justify-between px-3 py-2.5"><span className="text-[12px] text-black dark:text-white font-mono">{format(new Date(Date.now() - i * 3 * 3600 * 1000), 'MMM d, HH:mm')}</span><span className="text-[12px] font-mono" style={{ color: SEVERITY[scoreToSeverity(Math.max(0, score))].dot }}>{Math.max(0, score)}%</span><StatusIndicator status={scoreToSeverity(Math.max(0, score))} /></div>
                })}
              </div>
            </div>
          )}
        </div>
        {updateHistoryOpen && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-5">
            <div className="max-h-full w-full overflow-hidden rounded-md border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div><p className="text-[13px] font-semibold text-foreground">Windows Update History</p><p className="text-[11px] text-muted-foreground">Reported by the endpoint</p></div>
                <button type="button" onClick={() => setUpdateHistoryOpen(false)} aria-label="Close update history"><X size={14} /></button>
              </div>
              <div className="max-h-[520px] divide-y divide-border overflow-y-auto">
                {(device.patchStatus.updateHistory ?? []).map((item, index) => <div key={index} className="space-y-1 px-4 py-3"><p className="text-[12px] font-medium text-foreground">{String(item.title ?? 'Windows Update')}</p><p className="text-[11px] text-muted-foreground">{String(item.status ?? 'Unknown')} · {item.date ? format(new Date(String(item.date)), 'MMM d, yyyy HH:mm') : 'Unknown date'}</p><p className="text-[11px] text-muted-foreground">{String(item.description ?? item.operation ?? '')}</p></div>)}
                {(device.patchStatus.updateHistory ?? []).length === 0 && <p className="px-4 py-8 text-center text-[12px] text-muted-foreground">No Windows Update history reported yet.</p>}
              </div>
            </div>
          </div>
        )}
        {protectionHistoryOpen ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-5">
            <div className="max-h-full w-full overflow-hidden rounded-md border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="text-[13px] font-semibold text-foreground">Protection History</p><button type="button" onClick={() => setProtectionHistoryOpen(false)} aria-label="Close protection history"><X size={14} /></button></div>
              {protectionHistoryLoading ? <p className="px-4 py-8 text-center text-[12px] text-muted-foreground">Loading protection history...</p> : <div className="max-h-[520px] divide-y divide-border overflow-y-auto">{protectionHistory.map(item => <div key={item.id} className="space-y-1 px-4 py-3"><div className="flex items-center justify-between gap-3"><p className="text-[12px] font-semibold text-foreground">{item.threat_name}</p><span className="text-[11px] capitalize text-muted-foreground">{item.action}</span></div><p className="truncate text-[11px] text-muted-foreground" title={item.file_path}>{item.file_path || 'Affected item not reported'}</p><p className="text-[11px] text-muted-foreground">{item.severity} · {format(new Date(item.detected_at), 'MMM d, yyyy HH:mm')}</p></div>)}</div>}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function DevicesPage() {
  const { mode } = useDataMode()
  const [search, setSearch] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [allDevices, setAllDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [osFilter, setOsFilter] = useState<OS | ''>('')
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | ''>('')
  const [deptFilter, setDeptFilter] = useState('')
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [osOpen, setOsOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [deptOpen, setDeptOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setHydrated(true)
    setPage(1)
    setSelectedDevice(null)

    if (mode === 'demo') {
      setAllDevices(demoDevices)
      setLoadError(null)
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    setLoading(true)
    setLoadError(null)
    setAllDevices([])
    getDevices()
      .then(managedDevices => {
        if (cancelled) return
        setAllDevices(
          (Array.isArray(managedDevices) ? managedDevices : []).map(managedDeviceToDevice)
        )
      })
      .catch(error => {
        if (cancelled) return
        setAllDevices([])
        setLoadError(error instanceof Error ? error.message : 'Unable to load endpoints')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [mode])

  const deptOptions = useMemo(
    () => [...new Set(allDevices.map(device => device.department))].filter(department => department !== 'Not reported').sort(),
    [allDevices]
  )

  const filtered = useMemo(() => {
    return allDevices.filter(d => {
      if (search) {
        const q = search.toLowerCase()
        if (!d.name.toLowerCase().includes(q) && !d.ip.includes(q) && !d.username.toLowerCase().includes(q)) return false
      }
      if (osFilter && d.os !== osFilter) return false
      if (statusFilter && d.status !== statusFilter) return false
      if (deptFilter && d.department !== deptFilter) return false
      return true
    })
  }, [allDevices, search, osFilter, statusFilter, deptFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleDevices = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function updateSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <>
      <div className="space-y-4">
        <PageHeader
          title="Devices"
          description={`${allDevices.length} endpoints in the fleet.`}
          className="pt-4"
        >
          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-72">
            <Search size={13} strokeWidth={1.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, IP, user..."
              value={search}
              onChange={e => updateSearch(e.target.value)}
              className="w-full h-8 bg-surface border border-border rounded-md pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand/60 transition-colors"
            />
          </div>

          {/* OS filter */}
          <div className="relative">
            <button
              onClick={() => { setOsOpen(!osOpen); setStatusOpen(false); setDeptOpen(false) }}
              className="flex items-center gap-1.5 h-8 px-3 text-[13px] bg-surface border border-border rounded-md text-black dark:text-white hover:text-black dark:hover:text-white transition-colors"
            >
              OS {osFilter ? <span className="text-brand font-medium">· {osFilter}</span> : ''}
              <ChevronDown size={12} strokeWidth={2} />
            </button>
            {osOpen && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-surface-elevated border border-border rounded-md shadow-lg z-20 py-1">
                <button onClick={() => { setOsFilter(''); setPage(1); setOsOpen(false) }} className="w-full text-left px-3 py-1.5 text-[13px] text-black dark:text-white hover:bg-surface-hover hover:text-black dark:hover:text-white transition-colors">
                  All OS
                </button>
                {OS_OPTIONS.map(o => (
                  <button key={o} onClick={() => { setOsFilter(o); setPage(1); setOsOpen(false) }} className={cn('w-full text-left px-3 py-1.5 text-[13px] text-black dark:text-white hover:bg-surface-hover hover:text-black dark:hover:text-white transition-colors', osFilter === o && 'font-medium')}>
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status filter */}
          <div className="relative">
            <button
              onClick={() => { setStatusOpen(!statusOpen); setOsOpen(false); setDeptOpen(false) }}
              className="flex items-center gap-1.5 h-8 px-3 text-[13px] bg-surface border border-border rounded-md text-black dark:text-white hover:text-black dark:hover:text-white transition-colors"
            >
              Health {statusFilter ? <span className="text-brand font-medium">· {statusFilter}</span> : ''}
              <ChevronDown size={12} strokeWidth={2} />
            </button>
            {statusOpen && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-surface-elevated border border-border rounded-md shadow-lg z-20 py-1">
                <button onClick={() => { setStatusFilter(''); setPage(1); setStatusOpen(false) }} className="w-full text-left px-3 py-1.5 text-[13px] text-black dark:text-white hover:bg-surface-hover hover:text-black dark:hover:text-white transition-colors">
                  All Health States
                </button>
                {STATUS_OPTIONS.map(s => (
                  <button key={s} onClick={() => { setStatusFilter(s); setPage(1); setStatusOpen(false) }} className={cn('w-full text-left px-3 py-1.5 text-[13px] text-black dark:text-white hover:bg-surface-hover hover:text-black dark:hover:text-white transition-colors capitalize', statusFilter === s && 'font-medium')}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dept filter */}
          <div className="relative">
            <button
              onClick={() => { setDeptOpen(!deptOpen); setOsOpen(false); setStatusOpen(false) }}
              className="flex items-center gap-1.5 h-8 px-3 text-[13px] bg-surface border border-border rounded-md text-black dark:text-white hover:text-black dark:hover:text-white transition-colors"
            >
              Dept {deptFilter ? <span className="text-brand font-medium">· {deptFilter}</span> : ''}
              <ChevronDown size={12} strokeWidth={2} />
            </button>
            {deptOpen && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-surface-elevated border border-border rounded-md shadow-lg z-20 py-1">
                <button onClick={() => { setDeptFilter(''); setPage(1); setDeptOpen(false) }} className="w-full text-left px-3 py-1.5 text-[13px] text-black dark:text-white hover:bg-surface-hover hover:text-black dark:hover:text-white transition-colors">
                  All Departments
                </button>
                {deptOptions.map(dept => (
                  <button key={dept} onClick={() => { setDeptFilter(dept); setPage(1); setDeptOpen(false) }} className={cn('w-full text-left px-3 py-1.5 text-[13px] text-black dark:text-white hover:bg-surface-hover hover:text-black dark:hover:text-white transition-colors', deptFilter === dept && 'font-medium')}>
                    {dept}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active filter chips */}
          {[osFilter, statusFilter, deptFilter].filter(Boolean).map(f => (
            <span key={f} className="flex items-center gap-1 px-2 py-0.5 bg-brand/15 border border-brand/30 rounded-full text-[12px] text-brand">
              {f}
              <button onClick={() => {
                if (f === osFilter) setOsFilter('')
                if (f === statusFilter) setStatusFilter('')
                if (f === deptFilter) setDeptFilter('')
                setPage(1)
              }}>
                <X size={11} strokeWidth={2.5} />
              </button>
            </span>
          ))}

          {[osFilter, statusFilter, deptFilter].some(Boolean) && (
            <button
              onClick={() => { setOsFilter(''); setStatusFilter(''); setDeptFilter(''); setPage(1) }}
              className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Clear all
            </button>
          )}
          </div>
        </PageHeader>

        <SectionCard noPadding>
          {loading && <p className="px-3 py-3 text-[12px] text-muted-foreground">Loading endpoints...</p>}
          {loadError && <p className="px-3 py-3 text-[12px] text-status-critical">{loadError}</p>}
          <table className="w-full table-fixed text-[12px]">
            <colgroup>
              <col className="w-[19%]" />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                {[
                  { label: 'Device', align: 'left', sortable: false },
                  { label: 'Asset Type', align: 'left', sortable: false },
                  { label: 'OS', align: 'left', sortable: false },
                  { label: 'IP', align: 'left', sortable: false },
                  { label: 'Health', align: 'left', sortable: false },
                  { label: 'Status', align: 'left', sortable: false },
                  { label: 'Last Seen', align: 'left', sortable: false },
                ].map(h => (
                  <th key={h.label} className={cn('px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground', h.align === 'right' ? 'text-right' : 'text-left', h.label === 'Status' && 'pl-8')}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Laptop size={20} strokeWidth={1.5} className="text-muted-foreground" />
                      <p className="text-[13px] text-muted-foreground">No devices match the current filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleDevices.map(d => (
                  <tr
                    key={d.id}
                    className="border-b border-border h-10 hover:bg-surface-hover cursor-pointer transition-colors"
                    onClick={() => setSelectedDevice(d)}
                  >
                    <td className="px-3">
                      <span className="font-mono text-[12px] font-medium text-black dark:text-white">{d.name}</span>
                    </td>
                    <td className="px-3">
                      <span className="text-[12px] font-medium text-black dark:text-white">
                        {d.assetType === 'dc_server' ? 'DC Server' : d.assetType === 'laptop' ? 'Laptop' : 'Workstation'}
                      </span>
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-2">
                        <OSIcon os={d.os} />
                        <span className="text-[12px] font-medium text-black dark:text-white">{d.os}</span>
                      </div>
                    </td>
                    <td className="px-3"><span className="font-mono text-[12px] font-medium text-black dark:text-white">{d.ip}</span></td>
                    <td className="px-3 align-middle">
                      <StatusIndicator status={scoreToSeverity(d.complianceScore)} className="gap-1.5" />
                    </td>
                    <td className="px-3 pl-8">
                      <ReportingStatusIndicator lastSeen={d.lastSeen} />
                    </td>
                    <td className="px-3"><span className="text-[12px] font-medium text-black dark:text-white">{hydrated ? formatDistanceToNow(new Date(d.lastSeen), { addSuffix: true }) : '—'}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="px-3 py-2 border-t border-border flex items-center justify-between">
            <p className="text-[12px] font-medium text-black dark:text-white">
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} devices
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="flex h-7 w-7 items-center justify-center rounded border border-border text-black dark:text-white transition-colors hover:bg-surface-hover hover:text-black dark:hover:text-white disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft size={14} strokeWidth={1.75} />
              </button>
              <span className="min-w-16 text-center text-[12px] font-medium text-black dark:text-white">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className="flex h-7 w-7 items-center justify-center rounded border border-border text-black dark:text-white transition-colors hover:bg-surface-hover hover:text-black dark:hover:text-white disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight size={14} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </SectionCard>
      </div>

      {selectedDevice && (
        <DeviceDrawer device={selectedDevice} onClose={() => setSelectedDevice(null)} />
      )}
      {(osOpen || statusOpen || deptOpen) && (
        <div className="fixed inset-0 z-10" onClick={() => { setOsOpen(false); setStatusOpen(false); setDeptOpen(false) }} />
      )}
    </>
  )
}