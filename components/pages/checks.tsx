'use client'

import { useState } from 'react'
import { X, ListChecks, ChevronRight, Info } from 'lucide-react'
import { complianceChecks } from '@/lib/mock-data'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import { StatusBadge } from '@/components/ui/status-badge'
import type { ComplianceCheck, Severity, CheckCategory } from '@/lib/types'
import { cn } from '@/lib/utils'
import { STATUS_COLORS } from '@/lib/theme'

const SEVERITY_ORDER: Severity[] = ['critical', 'warning', 'info']
const CATEGORY_LABELS: Record<CheckCategory, string> = {
  active_directory: 'Active Directory',
  malware_protection: 'Malware Protection',
  os_updates: 'OS Updates',
  other: 'Other',
}
const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [CheckCategory, string][]

interface CheckDetailProps {
  check: ComplianceCheck
  onClose: () => void
}

function CheckDetail({ check, onClose }: CheckDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border-l border-border w-[480px] h-full overflow-y-auto z-10 flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1.5">
              <StatusBadge status={check.severity === 'critical' ? 'critical' : check.severity === 'warning' ? 'warning' : 'compliant'} size="sm" />
              <span className="text-[11px] text-foreground uppercase tracking-wider font-medium">
                {CATEGORY_LABELS[check.category]}
              </span>
            </div>
            <h2 className="text-[15px] font-semibold text-foreground leading-snug text-balance">{check.name}</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-hover text-muted-foreground transition-colors mt-0.5 shrink-0">
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Failing devices */}
          <div className="flex items-center gap-3 bg-surface border border-border rounded-md p-4">
            <div
              className="text-[30px] font-semibold leading-none tabular-nums"
              style={{ color: check.severity === 'critical' ? STATUS_COLORS.critical : check.severity === 'warning' ? STATUS_COLORS.warning : STATUS_COLORS.compliant }}
            >
              {check.failingDeviceCount}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Failing Devices</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Require remediation</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Info size={13} strokeWidth={1.5} className="text-muted-foreground" />
              <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wider">Description</h3>
            </div>
            <p className="text-[13px] text-foreground leading-relaxed">{check.description}</p>
          </div>

          {/* Remediation */}
          <div className="bg-surface border border-border rounded-md p-4">
            <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wider mb-2">Remediation Steps</h3>
            <p className="text-[13px] text-foreground leading-relaxed">{check.remediation}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ChecksPage() {
  const [categoryFilter, setCategoryFilter] = useState<CheckCategory | ''>('')
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('')
  const [selected, setSelected] = useState<ComplianceCheck | null>(null)

  const filtered = complianceChecks.filter(c => {
    if (categoryFilter && c.category !== categoryFilter) return false
    if (severityFilter && c.severity !== severityFilter) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const si = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
    if (si !== 0) return si
    return b.failingDeviceCount - a.failingDeviceCount
  })

  const criticalCount = complianceChecks.filter(c => c.severity === 'critical').length
  const warningCount = complianceChecks.filter(c => c.severity === 'warning').length
  const totalFailing = complianceChecks.reduce((s, c) => s + c.failingDeviceCount, 0)

  return (
    <>
      {selected && <CheckDetail check={selected} onClose={() => setSelected(null)} />}

      <div className="space-y-4">
        <PageHeader
          title="Compliance Checks"
          description={`${complianceChecks.length} checks defined · ${totalFailing} total failing instances.`}
        />

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Checks', value: complianceChecks.length, color: undefined },
            { label: 'Critical Checks', value: criticalCount, color: STATUS_COLORS.critical },
            { label: 'Warning Checks', value: warningCount, color: STATUS_COLORS.warning },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-md shadow-sm p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground mb-2">{label}</p>
              <p className="text-[30px] font-semibold leading-none tabular-nums" style={color ? { color } : undefined}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-surface border border-border rounded-md p-0.5">
            <button
              onClick={() => setSeverityFilter('')}
              className={cn('px-3 py-1 text-[12px] rounded transition-colors', !severityFilter ? 'bg-surface-hover text-foreground font-medium' : 'text-muted-foreground hover:text-foreground')}
            >
              All Severity
            </button>
            {SEVERITY_ORDER.map(s => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={cn('px-3 py-1 text-[12px] rounded capitalize transition-colors', severityFilter === s ? 'bg-surface-hover text-foreground font-medium' : 'text-muted-foreground hover:text-foreground')}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-surface border border-border rounded-md p-0.5">
            <button
              onClick={() => setCategoryFilter('')}
              className={cn('px-3 py-1 text-[12px] rounded transition-colors', !categoryFilter ? 'bg-surface-hover text-foreground font-medium' : 'text-muted-foreground hover:text-foreground')}
            >
              All
            </button>
            {CATEGORY_OPTIONS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className={cn('px-3 py-1 text-[12px] rounded transition-colors', categoryFilter === key ? 'bg-surface-hover text-foreground font-medium' : 'text-muted-foreground hover:text-foreground')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <SectionCard noPadding>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {['Severity', 'Check Name', 'Category', 'Failing Devices', ''].map((h, i) => (
                  <th
                    key={i}
                    className={cn(
                      'px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-left',
                      i === 3 && 'text-right',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ListChecks size={20} strokeWidth={1.5} className="text-muted-foreground" />
                      <p className="text-[13px] text-muted-foreground">No checks match the current filters.</p>
                    </div>
                  </td>
                </tr>
              ) : sorted.map(check => (
                <tr
                  key={check.id}
                  className="border-b border-border h-11 hover:bg-surface-hover cursor-pointer transition-colors last:border-0"
                  onClick={() => setSelected(check)}
                >
                  <td className="px-3">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide',
                        check.severity === 'critical'
                          ? 'bg-[#F04438]/15 text-[#F04438]'
                          : check.severity === 'warning'
                          ? 'bg-[#F79009]/15 text-[#F79009]'
                          : 'bg-[#008080]/15 text-[#008080]'
                      )}
                    >
                      {check.severity}
                    </span>
                  </td>
                  <td className="px-3 font-medium text-foreground">{check.name}</td>
                  <td className="px-3 text-muted-foreground">{CATEGORY_LABELS[check.category]}</td>
                  <td className="px-3 text-right">
                    <span
                      className={cn(
                        'font-mono font-semibold',
                        check.failingDeviceCount > 5 ? 'text-[#F04438]' : check.failingDeviceCount > 0 ? 'text-[#F79009]' : 'text-[#008080]'
                      )}
                    >
                      {check.failingDeviceCount}
                    </span>
                  </td>
                  <td className="px-3 text-right">
                    <ChevronRight size={14} strokeWidth={1.5} className="text-muted-foreground ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </>
  )
}
