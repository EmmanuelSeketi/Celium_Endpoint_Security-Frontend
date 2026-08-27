'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { FileText, Download, Plus, RefreshCw, FileSpreadsheet, ChevronRight } from 'lucide-react'
import { reports } from '@/lib/mock-data'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import type { ReportTemplate } from '@/lib/types'
import { cn } from '@/lib/utils'

const TYPE_COLORS: Record<ReportTemplate['type'], string> = {
  'Executive Summary': '#5B7FFF',
  'Compliance Detail': '#008080',
  'AD Security': '#8B7FE8',
  'Malware Summary': '#E87F9B',
  'Patch Status': '#7FC4E8',
}

const REPORT_TYPES: ReportTemplate['type'][] = [
  'Executive Summary',
  'Compliance Detail',
  'AD Security',
  'Malware Summary',
  'Patch Status',
]

function FormatIcon({ format }: { format: 'PDF' | 'CSV' }) {
  if (format === 'PDF') {
    return <FileText size={14} strokeWidth={1.5} className="text-[#E87F9B] shrink-0" />
  }
  return <FileSpreadsheet size={14} strokeWidth={1.5} className="text-[#008080] shrink-0" />
}

function GenerateModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<ReportTemplate['type']>('Executive Summary')
  const [format, setFormat] = useState<'PDF' | 'CSV'>('PDF')
  const [generating, setGenerating] = useState(false)

  function handleGenerate() {
    setGenerating(true)
    setTimeout(() => {
      setGenerating(false)
      onClose()
    }, 1800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-md w-[420px] z-10 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[14px] font-semibold text-foreground">Generate New Report</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-hover text-muted-foreground transition-colors">
            <span className="text-[16px] leading-none">&times;</span>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-foreground uppercase tracking-wider mb-2">Report Type</label>
            <div className="space-y-1.5">
              {REPORT_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md border text-left text-[13px] transition-colors',
                    type === t
                      ? 'border-brand/50 bg-brand/10 text-foreground'
                      : 'border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                  )}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TYPE_COLORS[t] }} />
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-foreground uppercase tracking-wider mb-2">Format</label>
            <div className="flex items-center gap-2">
              {(['PDF', 'CSV'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md border text-[13px] font-medium transition-colors',
                    format === f
                      ? 'border-brand/50 bg-brand/10 text-foreground'
                      : 'border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                  )}
                >
                  <FormatIcon format={f} />
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-surface-hover">
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-md text-[13px] font-medium hover:bg-brand/90 transition-colors disabled:opacity-60"
          >
            {generating ? (
              <>
                <RefreshCw size={13} strokeWidth={2} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus size={13} strokeWidth={2} />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ReportsPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      {showModal && <GenerateModal onClose={() => setShowModal(false)} />}

      <div className="space-y-4">
        <PageHeader
          title="Reports"
          description={`${reports.length} reports generated. Schedule or export compliance reports.`}
          action={
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand text-white rounded-md text-[13px] font-medium hover:bg-brand/90 transition-colors"
            >
              <Plus size={14} strokeWidth={2} />
              Generate Report
            </button>
          }
        />

        {/* Type summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {REPORT_TYPES.map(type => {
            const count = reports.filter(r => r.type === type).length
            return (
              <div key={type} className="bg-card border border-border rounded-md shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TYPE_COLORS[type] }} />
                  <span className="text-[13px] text-foreground font-semibold uppercase tracking-wider">{type}</span>
                </div>
                <p className="text-[30px] font-semibold leading-none tabular-nums text-foreground">{count}</p>
              </div>
            )
          })}
        </div>

        <SectionCard noPadding>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {['Report Name', 'Type', 'Date Range', 'Format', 'Generated', ''].map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground text-left"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr
                  key={r.id}
                  className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors cursor-pointer h-12"
                >
                  <td className="px-3">
                    <div className="flex items-center gap-2">
                      <FormatIcon format={r.format} />
                      <span className="font-medium text-foreground text-[13px] truncate max-w-60">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-[12px]"
                      style={{ color: TYPE_COLORS[r.type] }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: TYPE_COLORS[r.type] }} />
                      {r.type}
                    </span>
                  </td>
                  <td className="px-3 text-muted-foreground text-[12px]">{r.dateRange}</td>
                  <td className="px-3">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide',
                      r.format === 'PDF' ? 'bg-[#E87F9B]/15 text-[#E87F9B]' : 'bg-[#008080]/15 text-[#008080]'
                    )}>
                      {r.format}
                    </span>
                  </td>
                  <td className="px-3 text-muted-foreground text-[12px]">
                    {formatDistanceToNow(new Date(r.generatedDate), { addSuffix: true })}
                  </td>
                  <td className="px-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface text-muted-foreground hover:text-foreground transition-colors">
                        <Download size={13} strokeWidth={1.5} />
                      </button>
                      <ChevronRight size={13} strokeWidth={1.5} className="text-muted-foreground" />
                    </div>
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
