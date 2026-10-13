'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { FileText, Download, Plus, RefreshCw, FileSpreadsheet, ChevronRight, CheckCircle2 } from 'lucide-react'
import { reports, devices, complianceChecks } from '@/lib/mock-data'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import type { ReportTemplate } from '@/lib/types'
import { cn } from '@/lib/utils'

const TYPE_COLORS: Record<ReportTemplate['type'], string> = {
  'Executive Summary': '#5B7FFF',
  'Compliance Detail': '#008080',
  'AD Security': '#8B7FE8',
  'Malware Summary': '#E87F9B',
  'OS Updates': '#7FC4E8',
}

const REPORT_TYPES: ReportTemplate['type'][] = [
  'Executive Summary',
  'Compliance Detail',
  'AD Security',
  'Malware Summary',
  'OS Updates',
]

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let crc = i
    for (let j = 0; j < 8; j += 1) {
      crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
    table[i] = crc >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildPdfBlob(title: string, lines: string[]): Blob {
  const pageWidth = 595.28
  const pageHeight = 841.89
  const content = lines
    .map((line, index) => {
      const y = pageHeight - 72 - index * 18
      return `BT /F1 11 Tf 50 ${y.toFixed(2)} Td (${line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')}) Tj ET`
    })
    .join('\n')

  const pdfContent = `BT /F1 16 Tf 50 780 Td (${title.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')}) Tj ET\n${content}`
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${pdfContent.length} >>\nstream\n${pdfContent}\nendstream`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
  }
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 0; i < objects.length; i += 1) {
    pdf += `${String(offsets[i + 1]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

function buildDocxBlob(title: string, lines: string[]): Blob {
  const paragraphs = lines
    .map(line => {
      const safeLine = escapeXml(line)
      return `<w:p><w:r><w:t xml:space="preserve">${safeLine}</w:t></w:r></w:p>`
    })
    .join('')

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 wp14">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escapeXml(title)}</w:t></w:r></w:p>
    ${paragraphs}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`

  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:creator>Fleet Compliance</dc:creator>
  <cp:lastModifiedBy>Fleet Compliance</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Fleet Compliance</Application>
</Properties>`

  const entries = {
    '[Content_Types].xml': contentTypes,
    '_rels/.rels': rels,
    'docProps/core.xml': coreXml,
    'docProps/app.xml': appXml,
    'word/document.xml': documentXml,
  }

  const encoder = new TextEncoder()
  const files = Object.entries(entries).map(([name, content]) => ({
    name,
    data: encoder.encode(content),
  }))

  let offset = 0
  const centralDir: Uint8Array[] = []
  const output: number[] = []

  files.forEach(({ name, data }) => {
    const nameBytes = encoder.encode(name)
    const crc = crc32(data)
    const local = new Uint8Array(30 + nameBytes.length + data.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, 0, true)
    localView.setUint16(12, 0, true)
    localView.setUint32(14, crc >>> 0, true)
    localView.setUint32(18, data.length, true)
    localView.setUint32(22, data.length, true)
    localView.setUint16(26, nameBytes.length, true)
    localView.setUint16(28, 0, true)
    local.set(nameBytes, 30)
    local.set(data, 30 + nameBytes.length)

    output.push(...Array.from(local))

    const central = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, 0, true)
    centralView.setUint16(14, 0, true)
    centralView.setUint32(16, crc >>> 0, true)
    centralView.setUint32(20, data.length, true)
    centralView.setUint32(24, data.length, true)
    centralView.setUint16(28, nameBytes.length, true)
    centralView.setUint16(30, 0, true)
    centralView.setUint16(32, 0, true)
    centralView.setUint16(34, 0, true)
    centralView.setUint16(36, 0, true)
    centralView.setUint32(38, 0, true)
    centralView.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    centralDir.push(central)
    offset += local.length
  })

  const centralSize = centralDir.reduce((sum, value) => sum + value.length, 0)
  const centralOffset = output.length
  output.push(...centralDir.flatMap(array => Array.from(array)))

  const endRecord = new Uint8Array(22)
  const endView = new DataView(endRecord.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, centralOffset, true)
  endView.setUint16(20, 0, true)
  output.push(...Array.from(endRecord))

  return new Blob([new Uint8Array(output)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

function formatReportContent(type: ReportTemplate['type'], title: string): { title: string; lines: string[] } {
  const scoring = devices.reduce((acc, device) => {
    acc.total += 1
    acc.compliant += device.status === 'compliant' ? 1 : 0
    acc.warning += device.status === 'warning' ? 1 : 0
    acc.critical += device.status === 'critical' ? 1 : 0
    acc.score += device.complianceScore
    return acc
  }, { total: 0, compliant: 0, warning: 0, critical: 0, score: 0 })

  const avgCompliance = Math.round(scoring.score / Math.max(scoring.total, 1))
  const failedChecks = complianceChecks.filter(check => check.failingDeviceCount > 0).length

  if (type === 'Executive Summary') {
    return {
      title,
      lines: [
        `Fleet: ${devices.length} managed endpoints`,
        `Average compliance score: ${avgCompliance}%`,
        `Compliant devices: ${scoring.compliant} | Warning: ${scoring.warning} | Critical: ${scoring.critical}`,
        `Failed policy checks tracked: ${failedChecks}`,
        'Most at-risk endpoint: SF-WKS-0104 (critical remediation required)',
        'Action recommended: patch 14 outstanding Windows devices before next maintenance window.',
      ],
    }
  }

  if (type === 'Compliance Detail') {
    const topFailures = [...complianceChecks]
      .sort((a, b) => b.failingDeviceCount - a.failingDeviceCount)
      .slice(0, 5)
      .map(check => `${check.name}: ${check.failingDeviceCount} failing devices`)

    return {
      title,
      lines: [
        'Detailed compliance tracking by control family',
        ...topFailures,
        'The most severe gaps remain in patch compliance, real-time protection, and privileged AD membership.',
        'Recommended next review: validate critical updates and remove stale privileged accounts.',
      ],
    }
  }

  if (type === 'AD Security') {
    return {
      title,
      lines: [
        'Active Directory health snapshot',
        'Privileged group review: 2 accounts require cleanup',
        'Inactive computer accounts older than 90 days: 4 identified',
        'Password never expires violations: 9 accounts flagged',
        'Recommended action: remove stale accounts and reduce Domain Admin exposure to approved users only.',
      ],
    }
  }

  if (type === 'Malware Summary') {
    return {
      title,
      lines: [
        'Malware and endpoint protection summary',
        'Real-time protection disabled on 3 devices',
        'Threats detected in last 30 days: 5 endpoints',
        'Definition age above policy threshold on 7 devices',
        'Tamper protection disabled on 4 devices; enforce endpoint security policy urgently.',
      ],
    }
  }

  return {
    title,
    lines: [
      'Patch and operating system compliance summary',
      'Critical patches missing: 8 devices',
      'Pending reboot after patching: 6 devices',
      'End-of-life operating systems detected: 2 devices',
      'Action required: complete updates and plan replacement or upgrade before vendor support ends.',
    ],
  }
}

function buildReportBlob(report: ReportTemplate): Blob {
  const { title, lines } = formatReportContent(report.type, report.name)
  return report.format === 'PDF' ? buildPdfBlob(title, lines) : buildDocxBlob(title, lines)
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function FormatIcon({ format }: { format: ReportTemplate['format'] }) {
  if (format === 'PDF') {
    return <FileText size={14} strokeWidth={1.5} className="text-[#E87F9B] shrink-0" />
  }
  return <FileSpreadsheet size={14} strokeWidth={1.5} className="text-[#008080] shrink-0" />
}

function GenerateModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<ReportTemplate['type']>('Executive Summary')
  const [format, setFormat] = useState<ReportTemplate['format']>('PDF')
  const [generating, setGenerating] = useState(false)

  function handleGenerate() {
    const report: ReportTemplate = {
      id: `report-${Date.now()}`,
      name: `${type} - ${new Date().toLocaleDateString()}`,
      type,
      dateRange: 'Last 30 days',
      generatedDate: new Date().toISOString(),
      format,
    }

    setGenerating(true)
    setTimeout(() => {
      const blob = buildReportBlob(report)
      const fileName = `${report.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${format.toLowerCase()}`
      downloadBlob(blob, fileName)
      setGenerating(false)
      onClose()
    }, 500)
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
              {(['PDF', 'DOCX'] as const).map(f => (
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

  function handleDownload(report: ReportTemplate) {
    const blob = buildReportBlob(report)
    const fileName = `${report.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${report.format.toLowerCase()}`
    downloadBlob(blob, fileName)
  }

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
                  className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors h-12"
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
                      <button
                        onClick={() => handleDownload(r)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`Download ${r.name}`}
                      >
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
