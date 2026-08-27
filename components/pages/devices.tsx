'use client'

import { useState, useMemo } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Search, X, ChevronDown, ChevronLeft, ChevronRight, Plus, Laptop } from 'lucide-react'
import { Gauge } from '@mui/x-charts/Gauge'
import { devices as allDevices } from '@/lib/mock-data'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import { getDefinitionAgeColor, STATUS_COLORS } from '@/lib/theme'
import type { Device, OS, DeviceStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const OS_OPTIONS: OS[] = ['Windows', 'Mac', 'Linux']
const STATUS_OPTIONS: DeviceStatus[] = ['compliant', 'warning', 'critical']
const DEPT_OPTIONS = [...new Set(allDevices.map(d => d.department))].sort()
const PAGE_SIZE = 10

// --- Shared severity system -------------------------------------------------
// One palette, applied identically to Status, Score, Checks, and Last Seen,
// so a Critical row reads as Critical everywhere instead of four different
// ad hoc color decisions per row.
type Severity = 'compliant' | 'warning' | 'critical'

const SEVERITY: Record<Severity, { dot: string; label: string }> = {
  compliant: { dot: 'var(--category-1)', label: 'Healthy' },
  warning: { dot: STATUS_COLORS.warning, label: 'Warning' },
  critical: { dot: STATUS_COLORS.critical, label: 'Critical' },
}

// Status text stays neutral in every state — only the dot carries color.
// This is what keeps the indicator restrained instead of reading as a
// bright, candy-colored badge.
function scoreToSeverity(score: number): Severity {
  if (score >= 85) return 'compliant'
  if (score >= 65) return 'warning'
  return 'critical'
}

function lastSeenSeverity(dateStr: string): Severity {
  const hoursAgo = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60)
  if (hoursAgo < 24) return 'compliant'
  if (hoursAgo <= 24 * 7) return 'warning'
  return 'critical'
}

function StatusIndicator({ status, className, showDot = true }: { status: DeviceStatus; className?: string; showDot?: boolean }) {
  const s = SEVERITY[status as Severity]
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {showDot && <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: s.dot }} />}
      <span className="text-[12px] font-medium capitalize text-black dark:text-white">
        {s.label}
      </span>
    </span>
  )
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
  const [tab, setTab] = useState<'overview' | 'malware' | 'patches' | 'history'>('overview')
  const defColor = getDefinitionAgeColor(device.malwareStatus.definitionAge)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border-l border-border w-[480px] h-full overflow-y-auto z-10 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Laptop size={15} strokeWidth={1.5} className="text-black dark:text-white" />
              <span className="font-mono text-[15px] font-semibold text-black dark:text-white">{device.name}</span>
              <StatusIndicator status={device.status} />
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-black dark:text-white">
              <span>{device.osVersion}</span>
              <span>{device.ip}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-hover text-black dark:text-white transition-colors mt-0.5">
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5 sticky top-[73px] bg-card">
          {([
            ['overview', 'Dashboard'],
            ...(device.domainJoined ? [['ad', 'Active Directory']] : []),
            ['malware', 'Malware'],
            ['patches', 'Patches'],
            ['history', 'History'],
          ] as [string, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id as typeof tab)}
              className={cn(
                'px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors -mb-px',
                tab === id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-black dark:text-white hover:text-black dark:hover:text-white'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 flex-1">
          {tab === 'overview' && (
            <div className="space-y-4">
              {/* Score Ring */}
              <div className="flex items-center gap-4 bg-surface border border-border rounded-md p-4">
                <Gauge
                  width={72}
                  height={72}
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
                      fontSize: 18,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    },
                  }}
                />
                <div>
                  <p className="text-[13px] font-semibold text-black dark:text-white">Compliance Score</p>
                    <p className="text-[12px] text-black dark:text-white mt-0.5">
                    {device.failedChecks} failed · {device.passedChecks} passed
                  </p>
                </div>
              </div>

              {/* Key facts */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Department', value: device.department },
                  { label: 'Username', value: device.username },
                  { label: 'Domain Joined', value: device.domainJoined ? 'Yes' : 'No' },
                  { label: 'Last Scanned', value: formatDistanceToNow(new Date(device.lastScanned), { addSuffix: true }) },
                  { label: 'MAC Address', value: device.mac, mono: true },
                ].map(item => (
                  <div key={item.label} className="bg-surface border border-border rounded-md p-3">
                    <p className="text-[11px] uppercase tracking-wider text-black dark:text-white font-medium">{item.label}</p>
                    <p className={cn('text-[13px] text-black dark:text-white mt-1', item.mono && 'font-mono')}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'malware' && (
            <div className="space-y-3">
              <div className="bg-surface border border-border rounded-md divide-y divide-border">
                {[
                  { label: 'Engine Version', value: device.malwareStatus.engineVersion, mono: true },
                  {
                    label: 'Definition Age',
                    value: `${device.malwareStatus.definitionAge} day${device.malwareStatus.definitionAge !== 1 ? 's' : ''}`,
                    color: defColor,
                  },
                  {
                    label: 'Real-time Protection',
                    value: device.malwareStatus.realtimeProtection ? 'Enabled' : 'Disabled',
                    color: device.malwareStatus.realtimeProtection ? 'var(--category-1)' : '#F04438',
                  },
                  {
                    label: 'Tamper Protection',
                    value: device.malwareStatus.tamperProtection ? 'Enabled' : 'Disabled',
                    color: device.malwareStatus.tamperProtection ? 'var(--category-1)' : '#F04438',
                  },
                  {
                    label: 'Last Scan Result',
                    value: device.malwareStatus.lastScanResult.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    color: device.malwareStatus.lastScanResult === 'clean' ? 'var(--category-1)' : '#F04438',
                  },
                  { label: 'Quarantine Count', value: String(device.malwareStatus.quarantineCount), mono: true },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-[12px] text-black dark:text-white">{item.label}</span>
                    <span className={cn('text-[12px] text-black dark:text-white', item.mono && 'font-mono')} style={item.color ? { color: item.color } : undefined}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'patches' && (
            <div className="space-y-3">
              <div className="bg-surface border border-border rounded-md divide-y divide-border">
                {[
                  { label: 'Missing Critical', value: device.patchStatus.missingCritical, color: device.patchStatus.missingCritical > 0 ? STATUS_COLORS.critical : 'var(--category-1)' },
                  { label: 'Missing Total', value: device.patchStatus.missingTotal },
                  { label: 'Pending Reboot', value: device.patchStatus.pendingReboot ? 'Yes' : 'No', color: device.patchStatus.pendingReboot ? STATUS_COLORS.warning : undefined },
                  { label: 'OS End-of-Life', value: device.patchStatus.osEol ? `Yes — EOL: ${device.patchStatus.eolDate ?? '—'}` : 'No', color: device.patchStatus.osEol ? STATUS_COLORS.critical : 'var(--category-1)' },
                  { label: 'Last Update Check', value: format(new Date(device.patchStatus.lastUpdateCheck), 'MMM d, yyyy HH:mm') },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-[12px] text-black dark:text-white">{item.label}</span>
                    <span className="text-[12px] font-mono" style={item.color ? { color: item.color } : { color: '#E6E8EB' }}>
                      {String(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-2">
              <p className="text-[13px] text-black dark:text-white py-8 text-center">
                Scan history shows the last 30 scan events for this device.
              </p>
              <div className="bg-surface border border-border rounded-md divide-y divide-border">
                {[...Array(5)].map((_, i) => {
                  const score = device.complianceScore - i * 2
                  return (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5">
                      <span className="text-[12px] text-black dark:text-white font-mono">
                        {format(new Date(Date.now() - i * 3 * 3600 * 1000), 'MMM d, HH:mm')}
                      </span>
                      <span className="text-[12px] font-mono" style={{ color: SEVERITY[scoreToSeverity(Math.max(0, score))].dot }}>
                        {Math.max(0, score)}%
                      </span>
                      <StatusIndicator status={scoreToSeverity(Math.max(0, score))} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function DevicesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [osFilter, setOsFilter] = useState<OS | ''>('')
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | ''>('')
  const [deptFilter, setDeptFilter] = useState('')
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [osOpen, setOsOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [deptOpen, setDeptOpen] = useState(false)

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
  }, [search, osFilter, statusFilter, deptFilter])

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
          action={
            <button className="flex items-center gap-2 px-3 py-1.5 bg-brand text-white rounded-md text-[13px] font-medium hover:bg-brand/90 transition-colors">
              <Plus size={14} strokeWidth={2} />
              Add Device
            </button>
          }
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
              Status {statusFilter ? <span className="text-brand font-medium">· {statusFilter}</span> : ''}
              <ChevronDown size={12} strokeWidth={2} />
            </button>
            {statusOpen && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-surface-elevated border border-border rounded-md shadow-lg z-20 py-1">
                <button onClick={() => { setStatusFilter(''); setPage(1); setStatusOpen(false) }} className="w-full text-left px-3 py-1.5 text-[13px] text-black dark:text-white hover:bg-surface-hover hover:text-black dark:hover:text-white transition-colors">
                  All Statuses
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
                {DEPT_OPTIONS.map(dept => (
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
          <table className="w-full table-fixed text-[12px]">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[18%]" />
              <col className="w-[16%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border">
                {[
                  { label: 'Device', align: 'left', sortable: false },
                  { label: 'OS', align: 'left', sortable: false },
                  { label: 'IP', align: 'left', sortable: false },
                  { label: 'Score', align: 'right', sortable: false },
                  { label: 'Checks', align: 'right', sortable: false },
                  { label: 'Status', align: 'left', sortable: false },
                  { label: 'Last Seen', align: 'left', sortable: false },
                ].map(h => (
                  <th key={h.label} className={cn('px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground', h.align === 'right' ? 'text-right' : 'text-left', h.label === 'Checks' && 'pr-8', h.label === 'Status' && 'pl-8')}>
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
                      <div className="flex items-center gap-2">
                        <OSIcon os={d.os} />
                        <span className="text-[12px] font-medium text-black dark:text-white">{d.os}</span>
                      </div>
                    </td>
                    <td className="px-3"><span className="font-mono text-[12px] font-medium text-black dark:text-white">{d.ip}</span></td>
                    <td className="px-3 align-middle text-right">
                      <span className="inline-block text-[12px] font-semibold leading-none tabular-nums text-black dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {d.complianceScore}%
                      </span>
                    </td>
                    <td className="px-3 pr-8 text-right align-middle">
                      <span className="font-mono text-[12px] font-semibold text-black dark:text-white">{d.failedChecks}</span>
                      <span className="font-mono text-[12px] font-medium text-black dark:text-white"> / {d.failedChecks + d.passedChecks}</span>
                    </td>
                    <td className="px-3 pl-8">
                      <span className="text-[12px] font-semibold text-foreground">{d.status === 'compliant' ? 'Healthy' : d.status.charAt(0).toUpperCase() + d.status.slice(1)}</span>
                    </td>
                    <td className="px-3"><span className="text-[12px] font-medium text-black dark:text-white">{formatDistanceToNow(new Date(d.lastSeen), { addSuffix: true })}</span></td>
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