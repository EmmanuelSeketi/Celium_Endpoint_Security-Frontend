'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, ArrowDownToLine, FileText, Plus, RefreshCw, FileSpreadsheet, ShieldCheck } from 'lucide-react'
import { devices, complianceChecks, adDomainStatus, detections } from '@/lib/mock-data'
import { PageHeader } from '@/components/ui/page-header'
import { KpiCard } from '@/components/ui/kpi-card'
import { SectionCard } from '@/components/ui/section-card'
import type { Device, ReportTemplate, Severity } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useDataMode } from '@/lib/data-mode-provider'
import { getADDomainStatus, getDevices, getMalwareDetections, getSecurityChecks, type ADDomainStatus, type ManagedDevice, type MalwareDetection } from '@/lib/api-client'

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

type ReportCheck = { name: string; category: string; failingDeviceCount: number; severity?: Severity }
type ReportDetection = Pick<MalwareDetection, 'device_name' | 'threat_name' | 'action' | 'severity' | 'timestamp'>
type ReportDevice = Pick<Device, 'name' | 'os' | 'osVersion'> & {
  complianceScore: number | null
  status: Device['status'] | 'unknown'
  failedChecks: number | null
  malwareStatus: {
    definitionAge: number | null
    realtimeProtection: boolean | null
    tamperProtection: boolean | null
    lastScanResult: Device['malwareStatus']['lastScanResult'] | null
    quarantineCount: number | null
  }
  patchStatus: {
    missingCritical: number | null
    missingTotal: number | null
    pendingReboot: boolean | null
    lastUpdateCheck: string | null
    osEol: boolean | null
    eolDate?: string
  }
}
type ReportSnapshot = {
  devices: ReportDevice[]
  checks: ReportCheck[]
  detections?: ReportDetection[]
  adStatus?: ADDomainStatus
}
type ReportSection = { heading: string; lines: string[] }
type ReportFinding = { title: string; detail: string; count: number; severity?: Severity }

const DEMO_REPORT_SNAPSHOT: ReportSnapshot = {
  devices,
  checks: complianceChecks,
  detections: detections.map(detection => ({
    device_name: detection.deviceName,
    threat_name: detection.threatName,
    action: detection.action,
    severity: detection.severity,
    timestamp: detection.timestamp,
  })),
  adStatus: adDomainStatus,
}

function mapManagedDevice(device: ManagedDevice): ReportDevice {
  const score = Number.isFinite(device.compliance_score) ? device.compliance_score : null
  const malware = device.malware
  const patch = device.patch_status
  return {
    name: device.hostname,
    os: device.os === 'windows' ? 'Windows' : device.os === 'macos' ? 'Mac' : 'Linux',
    osVersion: device.os_version,
    complianceScore: score,
    status: score === null ? 'unknown' : score >= 85 ? 'compliant' : score >= 65 ? 'warning' : 'critical',
    failedChecks: Number.isFinite(device.failed_checks) ? device.failed_checks : null,
    malwareStatus: {
      definitionAge: typeof malware?.definition_age === 'number' && Number.isFinite(malware.definition_age) ? malware.definition_age : null,
      realtimeProtection: typeof malware?.realtime_protection === 'boolean' ? malware.realtime_protection : null,
      lastScanResult: malware?.last_scan_result ?? null,
      tamperProtection: typeof malware?.tamper_protection === 'boolean' ? malware.tamper_protection : null,
      quarantineCount: typeof malware?.quarantine_count === 'number' && Number.isFinite(malware.quarantine_count) ? malware.quarantine_count : null,
    },
    patchStatus: {
      missingCritical: typeof patch?.missing_critical === 'number' && Number.isFinite(patch.missing_critical) ? patch.missing_critical : null,
      missingTotal: typeof patch?.missing_total === 'number' && Number.isFinite(patch.missing_total) ? patch.missing_total : null,
      pendingReboot: typeof patch?.pending_reboot === 'boolean' ? patch.pending_reboot : null,
      lastUpdateCheck: patch?.last_update_check ?? null,
      osEol: typeof patch?.os_eol === 'boolean' ? patch.os_eol : null,
      eolDate: patch?.eol_date,
    },
  }
}

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

function formatReportDate(value: string | undefined, pattern: string) {
  if (!value) return 'not reported'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? format(date, pattern) : 'not reported'
}

function buildPdfBlob(title: string, lines: string[]): Blob {
  const pageWidth = 595.28
  const pageHeight = 841.89
  const safePdfText = (value: string) => value
    .replace(/[^\x20-\x7E]/g, '-')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
  const wrappedLines = lines.flatMap(line => {
    const isHeading = line.startsWith('## ')
    const text = line.replace(/^## /, '')
    const width = isHeading ? 70 : 92
    const words = text.split(/\s+/)
    const output: string[] = []
    let current = ''
    for (const word of words) {
      if (current && `${current} ${word}`.length > width) {
        output.push(`${isHeading ? '## ' : ''}${current}`)
        current = word
      } else {
        current = current ? `${current} ${word}` : word
      }
    }
    if (current) output.push(`${isHeading ? '## ' : ''}${current}`)
    return output
  })
  const pageLines: string[][] = []
  for (let index = 0; index < wrappedLines.length; index += 40) {
    pageLines.push(wrappedLines.slice(index, index + 40))
  }
  if (pageLines.length === 0) pageLines.push([])

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ]
  const pageIds: number[] = []
  pageLines.forEach((page, pageIndex) => {
    const pageId = objects.length + 1
    const contentId = pageId + 1
    pageIds.push(pageId)
    const content = [
      `BT /F2 16 Tf 50 785 Td (${safePdfText(title)}) Tj ET`,
      `BT /F1 9 Tf 50 765 Td (Fleet Compliance - Current inventory snapshot) Tj ET`,
      ...page.flatMap((line, index) => {
        const heading = line.startsWith('## ')
        const y = 735 - index * 17
        const text = line.replace(/^## /, '')
        return [`BT /${heading ? 'F2' : 'F1'} ${heading ? 12 : 10} Tf 50 ${y.toFixed(2)} Td (${safePdfText(text)}) Tj ET`]
      }),
      `BT /F1 9 Tf 500 28 Td (Page ${pageIndex + 1} of ${pageLines.length}) Tj ET`,
    ].join('\n')
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    )
  })
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`

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
      const heading = line.startsWith('## ')
      const safeLine = escapeXml(line.replace(/^## /, ''))
      return `<w:p>${heading ? '<w:pPr><w:pStyle w:val="Heading2"/></w:pPr>' : ''}<w:r><w:t xml:space="preserve">${safeLine}</w:t></w:r></w:p>`
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

function getReportSections(type: ReportTemplate['type'], snapshot: ReportSnapshot): ReportSection[] {
  const total = snapshot.devices.length
  const scoredDevices = snapshot.devices.filter(device => device.complianceScore !== null)
  const averageScore = scoredDevices.length
    ? Math.round(scoredDevices.reduce((sum, device) => sum + (device.complianceScore ?? 0), 0) / scoredDevices.length)
    : 0
  const compliant = snapshot.devices.filter(device => device.status === 'compliant').length
  const warning = snapshot.devices.filter(device => device.status === 'warning').length
  const critical = snapshot.devices.filter(device => device.status === 'critical').length
  const unknownPosture = snapshot.devices.filter(device => device.status === 'unknown').length
  const failingChecks = snapshot.checks.filter(check => check.failingDeviceCount > 0)
  const criticalUpdateReported = snapshot.devices.filter(device => device.patchStatus.missingCritical !== null).length
  const criticalUpdateDevices = snapshot.devices.filter(device => (device.patchStatus.missingCritical ?? 0) > 0).length
  const restartReported = snapshot.devices.filter(device => device.patchStatus.pendingReboot !== null).length
  const restartRequired = snapshot.devices.filter(device => device.patchStatus.pendingReboot === true).length
  const osSupportReported = snapshot.devices.filter(device => device.patchStatus.osEol !== null).length
  const endOfSupport = snapshot.devices.filter(device => device.patchStatus.osEol === true).length
  const realtimeReported = snapshot.devices.filter(device => device.malwareStatus.realtimeProtection !== null).length
  const realtimeDisabled = snapshot.devices.filter(device => device.malwareStatus.realtimeProtection === false).length
  const categoryLabels: Record<string, string> = {
    active_directory: 'Active Directory',
    malware_protection: 'Malware protection',
    os_updates: 'OS updates',
    other: 'Other controls',
  }
  const topChecks = [...failingChecks].sort((a, b) => b.failingDeviceCount - a.failingDeviceCount).slice(0, 10)
  const updateRiskDevices = [...snapshot.devices]
    .filter(device => device.patchStatus.osEol === true || (device.patchStatus.missingCritical ?? 0) > 0 || device.patchStatus.pendingReboot === true || (device.patchStatus.missingTotal ?? 0) > 0)
    .sort((a, b) => Number(b.patchStatus.osEol === true) - Number(a.patchStatus.osEol === true) || (b.patchStatus.missingCritical ?? 0) - (a.patchStatus.missingCritical ?? 0) || (a.complianceScore ?? 101) - (b.complianceScore ?? 101))
  const protectionRiskDevices = snapshot.devices.filter(device => device.malwareStatus.realtimeProtection === false || device.malwareStatus.tamperProtection === false || (device.malwareStatus.definitionAge ?? 0) > 3)
  const atRiskDevices = [...snapshot.devices]
    .filter(device => updateRiskDevices.includes(device) || protectionRiskDevices.includes(device))
    .sort((a, b) => Number(b.patchStatus.osEol === true) - Number(a.patchStatus.osEol === true) || (b.patchStatus.missingCritical ?? 0) - (a.patchStatus.missingCritical ?? 0) || (a.complianceScore ?? 101) - (b.complianceScore ?? 101))
    .slice(0, 10)

  if (type === 'Executive Summary') {
    return [
      { heading: 'Fleet posture', lines: [
        `Managed endpoints: ${total}`,
        `Average compliance score: ${scoredDevices.length ? `${averageScore}% across ${scoredDevices.length} endpoints` : 'not reported'}`,
        `Posture distribution: ${compliant} compliant, ${warning} warning, ${critical} critical, ${unknownPosture} not reported`,
        `Controls with reported failures: ${failingChecks.length} of ${snapshot.checks.length}`,
      ] },
      { heading: 'Key exposure indicators', lines: [
        `Endpoints with critical or important updates missing: ${criticalUpdateDevices} of ${criticalUpdateReported} reporting`,
        `Endpoints awaiting restart: ${restartRequired} of ${restartReported} reporting`,
        `Endpoints running an end-of-support OS: ${endOfSupport} of ${osSupportReported} reporting`,
        `Endpoints with real-time protection disabled: ${realtimeDisabled} of ${realtimeReported} reporting`,
      ] },
      { heading: 'Priority endpoints', lines: atRiskDevices.length
        ? atRiskDevices.map(device => {
          const reasons = [
            device.patchStatus.osEol === true ? 'end-of-support OS' : '',
            (device.patchStatus.missingCritical ?? 0) > 0 ? `${device.patchStatus.missingCritical} critical updates missing` : '',
            device.patchStatus.pendingReboot === true ? 'restart pending' : '',
            device.malwareStatus.realtimeProtection === false ? 'real-time protection disabled' : '',
            device.malwareStatus.tamperProtection === false ? 'tamper protection disabled' : '',
          ].filter(Boolean)
          return `${device.name} | score ${device.complianceScore === null ? 'not reported' : `${device.complianceScore}%`} | ${reasons.join(', ')}`
        })
        : ['No endpoints are currently flagged by the available update and protection indicators.'] },
      { heading: 'Recommended next steps', lines: [
        'Remediate end-of-support operating systems and critical update gaps first.',
        'Review controls with the highest failing-device counts and assign owners for follow-up.',
        'Confirm endpoint protection is enabled and investigate any active threat detections.',
      ] },
    ]
  }

  if (type === 'Compliance Detail') {
    return [
      { heading: 'Assessment scope', lines: [
        `Managed endpoints assessed: ${total}`,
        `Checks available: ${snapshot.checks.length}`,
        `Checks reporting at least one failure: ${failingChecks.length}`,
        `Reported failed-device instances across checks: ${failingChecks.reduce((sum, check) => sum + check.failingDeviceCount, 0)} (a device may appear in more than one check)`,
      ] },
      { heading: 'Highest-impact failing controls', lines: topChecks.length
        ? topChecks.map((check, index) => `${index + 1}. ${check.name} | ${categoryLabels[check.category] ?? check.category} | ${check.failingDeviceCount} failing devices`)
        : ['No failing controls were reported in the current snapshot.'] },
      { heading: 'Endpoint posture', lines: [
        `Compliant: ${compliant} (${total ? Math.round(compliant / total * 100) : 0}%)`,
        `Warning: ${warning} (${total ? Math.round(warning / total * 100) : 0}%)`,
        `Critical: ${critical} (${total ? Math.round(critical / total * 100) : 0}%)`,
        `Compliance score not reported: ${total - scoredDevices.length}`,
        ...atRiskDevices.map(device => `${device.name} | ${device.failedChecks === null ? 'failed checks not reported' : `${device.failedChecks} failed checks`} | compliance score ${device.complianceScore === null ? 'not reported' : `${device.complianceScore}%`}`),
      ] },
    ]
  }

  if (type === 'AD Security') {
    const ad = snapshot.adStatus
    if (!ad) return [{ heading: 'Data availability', lines: ['Active Directory security data was not available for this report. No AD findings have been inferred.'] }]
    const unhealthyControllers = ad.domain_controllers.filter(controller => !controller.online || !controller.replication_healthy)
    return [
      { heading: 'Directory overview', lines: [
        `Domain controllers reported: ${ad.domain_controllers.length}`,
        `Controllers offline or with unhealthy replication: ${unhealthyControllers.length}`,
        `Stale accounts reported: ${ad.stale_accounts}`,
        `Failed logons in the last 24 hours: ${ad.failed_logons_24h}`,
        `Successful logons in the last 24 hours: ${ad.successful_logons_24h}`,
        `Kerberos anomalies reported: ${ad.kerberos_anomalies.length}`,
      ] },
      { heading: 'Domain controller health', lines: ad.domain_controllers.length
        ? ad.domain_controllers.map(controller => `${controller.name} | ${controller.online ? 'online' : 'offline'} | replication ${controller.replication_healthy ? 'healthy' : 'unhealthy'} | last replication ${formatReportDate(controller.last_replication, 'MMM d, yyyy HH:mm')}`)
        : ['No domain controllers were reported.'] },
      { heading: 'Stale accounts requiring review', lines: ad.stale_account_records.length
        ? ad.stale_account_records.filter(account => account.stale).slice(0, 10).map(account => `${account.account_name} | ${account.account_type} | last logon ${formatReportDate(account.last_logon, 'MMM d, yyyy')} | password never expires: ${account.password_never_expires ? 'yes' : 'no'}`)
        : ['No stale account records were returned.'] },
      { heading: 'Recent privilege and Kerberos events', lines: [
        ...ad.privileged_group_changes.slice(0, 8).map(change => `${change.action} ${change.account} in ${change.group_name} | ${formatReportDate(change.timestamp, 'MMM d, yyyy HH:mm')}`),
        ...ad.kerberos_anomalies.slice(0, 8).map(anomaly => `${anomaly.severity.toUpperCase()} ${anomaly.type} | account ${anomaly.account} | ${formatReportDate(anomaly.timestamp, 'MMM d, yyyy HH:mm')}`),
        ...(!ad.privileged_group_changes.length && !ad.kerberos_anomalies.length ? ['No privilege changes or Kerberos anomalies were reported.'] : []),
      ] },
    ]
  }

  if (type === 'Malware Summary') {
    const detectionsAvailable = snapshot.detections !== undefined
    const detectionRows = snapshot.detections ?? []
    const realtimeCoverage = snapshot.devices.filter(device => device.malwareStatus.realtimeProtection !== null).length
    const tamperCoverage = snapshot.devices.filter(device => device.malwareStatus.tamperProtection !== null).length
    const definitionCoverage = snapshot.devices.filter(device => device.malwareStatus.definitionAge !== null).length
    const quarantineCoverage = snapshot.devices.filter(device => device.malwareStatus.quarantineCount !== null).length
    const protectionGaps = snapshot.devices.filter(device => device.malwareStatus.realtimeProtection === false || device.malwareStatus.tamperProtection === false || (device.malwareStatus.definitionAge ?? 0) > 3)
      .sort((a, b) => Number(b.malwareStatus.realtimeProtection === false) - Number(a.malwareStatus.realtimeProtection === false) || (b.malwareStatus.definitionAge ?? -1) - (a.malwareStatus.definitionAge ?? -1))
      .slice(0, 10)
    return [
      { heading: 'Protection coverage', lines: [
        `Endpoints assessed: ${total}`,
        `Real-time protection enabled: ${snapshot.devices.filter(device => device.malwareStatus.realtimeProtection === true).length}; disabled: ${snapshot.devices.filter(device => device.malwareStatus.realtimeProtection === false).length}; status not reported: ${total - realtimeCoverage}`,
        `Tamper protection enabled: ${snapshot.devices.filter(device => device.malwareStatus.tamperProtection === true).length}; disabled: ${snapshot.devices.filter(device => device.malwareStatus.tamperProtection === false).length}; status not reported: ${total - tamperCoverage}`,
        `Definition age greater than 3 days: ${snapshot.devices.filter(device => (device.malwareStatus.definitionAge ?? 0) > 3).length}; age not reported: ${total - definitionCoverage}`,
        `Quarantined items reported: ${snapshot.devices.reduce((sum, device) => sum + (device.malwareStatus.quarantineCount ?? 0), 0)} across ${quarantineCoverage} endpoints; not reported: ${total - quarantineCoverage}`,
        `Detection records available: ${detectionsAvailable ? detectionRows.length : 'not available'}`,
      ] },
      { heading: 'Endpoints requiring protection review', lines: protectionGaps.length
        ? protectionGaps.map(device => `${device.name} | real-time ${device.malwareStatus.realtimeProtection === null ? 'not reported' : device.malwareStatus.realtimeProtection ? 'on' : 'off'} | tamper ${device.malwareStatus.tamperProtection === null ? 'not reported' : device.malwareStatus.tamperProtection ? 'on' : 'off'} | definitions ${device.malwareStatus.definitionAge === null ? 'not reported' : `${device.malwareStatus.definitionAge} days old`}`)
        : ['No protection gaps were identified in the available endpoint data.'] },
      { heading: 'Detection activity', lines: detectionsAvailable
        ? detectionRows.slice(0, 12).map(detection => `${detection.severity.toUpperCase()} ${detection.threat_name} | ${detection.device_name} | action ${detection.action} | ${formatReportDate(detection.timestamp, 'MMM d, yyyy HH:mm')}`)
        : ['Detection history was not available. Endpoint protection posture is still included above.'] },
    ]
  }

  return [
    { heading: 'Update posture', lines: [
      `Endpoints assessed: ${total}`,
      `Endpoints with critical or important updates missing: ${criticalUpdateDevices} of ${criticalUpdateReported} reporting`,
      `Total missing updates reported: ${snapshot.devices.reduce((sum, device) => sum + (device.patchStatus.missingTotal ?? 0), 0)} across ${snapshot.devices.filter(device => device.patchStatus.missingTotal !== null).length} endpoints`,
      `Endpoints awaiting restart: ${restartRequired} of ${restartReported} reporting`,
      `Endpoints running end-of-support operating systems: ${endOfSupport} of ${osSupportReported} reporting`,
    ] },
    { heading: 'Devices requiring update remediation', lines: atRiskDevices.length
      ? updateRiskDevices.map(device => `${device.name} | ${device.os} ${device.osVersion} | ${device.patchStatus.missingCritical === null ? 'critical updates not reported' : `${device.patchStatus.missingCritical} critical / important missing`} | ${device.patchStatus.missingTotal === null ? 'total missing not reported' : `${device.patchStatus.missingTotal} total missing`} | restart ${device.patchStatus.pendingReboot === null ? 'not reported' : device.patchStatus.pendingReboot ? 'required' : 'not required'} | OS support ${device.patchStatus.osEol === null ? 'not reported' : device.patchStatus.osEol ? 'ended' : 'supported'}`)
      : ['No update or operating-system lifecycle risks were reported.'] },
    { heading: 'Recommended next steps', lines: [
      'Deploy critical and important updates to affected endpoints, then validate scan results.',
      'Complete pending restarts during approved maintenance windows.',
      'Prioritize OS upgrades or replacements for endpoints outside vendor support.',
    ] },
  ]
}

function buildReportBlob(report: ReportTemplate, snapshot: ReportSnapshot): Blob {
  const sections = getReportSections(report.type, snapshot)
  const lines = [
    `Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`,
    'Coverage: current inventory snapshot; findings reflect the data available at generation time.',
    '',
    ...sections.flatMap(section => [`## ${section.heading}`, ...section.lines, '']),
  ]
  return report.format === 'PDF' ? buildPdfBlob(report.name, lines) : buildDocxBlob(report.name, lines)
}

function getReportFindings(snapshot: ReportSnapshot): ReportFinding[] {
  const topCheck = [...snapshot.checks].sort((a, b) => b.failingDeviceCount - a.failingDeviceCount)[0]
  const criticalUpdateReported = snapshot.devices.filter(device => device.patchStatus.missingCritical !== null || device.patchStatus.missingTotal !== null || device.patchStatus.pendingReboot !== null || device.patchStatus.osEol !== null).length
  const criticalUpdateDevices = snapshot.devices.filter(device => (device.patchStatus.missingCritical ?? 0) > 0 || device.patchStatus.osEol === true).length
  const protectionCoverage = snapshot.devices.filter(device => device.malwareStatus.realtimeProtection !== null && device.malwareStatus.tamperProtection !== null).length
  const protectionGaps = snapshot.devices.filter(device => device.malwareStatus.realtimeProtection === false || device.malwareStatus.tamperProtection === false).length
  const findings: ReportFinding[] = []
  if (topCheck && topCheck.failingDeviceCount > 0) findings.push({
    title: 'Highest-impact control',
    detail: `${topCheck.name} is failing on ${topCheck.failingDeviceCount} devices.`,
    count: topCheck.failingDeviceCount,
    severity: topCheck.severity,
  })
  findings.push({
    title: 'Critical update exposure',
    detail: `${criticalUpdateDevices} of ${criticalUpdateReported} endpoints with update data report missing critical updates or end-of-support operating systems.`,
    count: criticalUpdateDevices,
    severity: criticalUpdateDevices ? 'critical' : criticalUpdateReported === snapshot.devices.length ? 'info' : undefined,
  })
  findings.push({
    title: 'Endpoint protection gaps',
    detail: `${protectionGaps} endpoints have a reported protection gap; protection status is available for ${protectionCoverage} of ${snapshot.devices.length}.`,
    count: protectionGaps,
    severity: protectionGaps ? 'critical' : protectionCoverage === snapshot.devices.length ? 'info' : undefined,
  })
  if (snapshot.adStatus) {
    const directoryRisks = snapshot.adStatus.stale_accounts + snapshot.adStatus.kerberos_anomalies.length
    const hasCriticalKerberosAnomaly = snapshot.adStatus.kerberos_anomalies.some(anomaly => anomaly.severity === 'critical')
    findings.push({
      title: 'Directory risk signals',
      detail: `${snapshot.adStatus.stale_accounts} stale accounts and ${snapshot.adStatus.kerberos_anomalies.length} Kerberos anomalies are reported; count represents signals, not unique identities.`,
      count: directoryRisks,
      severity: hasCriticalKerberosAnomaly ? 'critical' : directoryRisks ? 'warning' : 'info',
    })
  }
  return findings
}

function getReportMetrics(snapshot: ReportSnapshot) {
  const total = snapshot.devices.length
  const scoredDevices = snapshot.devices.filter(device => device.complianceScore !== null)
  const updateReported = snapshot.devices.filter(device => device.patchStatus.missingCritical !== null || device.patchStatus.missingTotal !== null || device.patchStatus.pendingReboot !== null || device.patchStatus.osEol !== null).length
  return {
    endpoints: total,
    averageScore: scoredDevices.length ? Math.round(scoredDevices.reduce((sum, device) => sum + (device.complianceScore ?? 0), 0) / scoredDevices.length) : 0,
    scoreCoverage: scoredDevices.length,
    failingControls: snapshot.checks.filter(check => check.failingDeviceCount > 0).length,
    updateRisk: snapshot.devices.filter(device => (device.patchStatus.missingCritical ?? 0) > 0 || device.patchStatus.osEol === true).length,
    updateCoverage: updateReported,
  }
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

const REPORT_DESCRIPTIONS: Record<ReportTemplate['type'], string> = {
  'Executive Summary': 'Fleet-wide health, exposure indicators, prioritized endpoints, and recommended next steps.',
  'Compliance Detail': 'Control coverage, highest-impact failures, and endpoint posture with measured counts.',
  'AD Security': 'Directory controller health, stale accounts, privilege changes, and Kerberos anomalies.',
  'Malware Summary': 'Protection coverage, definition age, quarantine totals, and available detection activity.',
  'OS Updates': 'Missing updates, reboot requirements, end-of-support systems, and affected endpoints.',
}

function GenerateModal({
  onClose,
  snapshot,
  initialType,
}: {
  onClose: () => void
  snapshot: ReportSnapshot
  initialType: ReportTemplate['type']
}) {
  const [type, setType] = useState<ReportTemplate['type']>(initialType)
  const [format, setFormat] = useState<ReportTemplate['format']>('PDF')
  const [generating, setGenerating] = useState(false)

  function handleGenerate() {
    const report: ReportTemplate = {
      id: `report-${Date.now()}`,
      name: `${type} - ${new Date().toLocaleDateString()}`,
      type,
      dateRange: 'Current snapshot',
      generatedDate: new Date().toISOString(),
      format,
    }

    setGenerating(true)
    setTimeout(() => {
      const blob = buildReportBlob(report, snapshot)
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
  const { mode } = useDataMode()
  const [showModal, setShowModal] = useState(false)
  const [selectedType, setSelectedType] = useState<ReportTemplate['type']>('Executive Summary')
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(mode === 'demo' ? DEMO_REPORT_SNAPSHOT : null)
  const [loading, setLoading] = useState(mode !== 'demo')
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'demo') {
      setSnapshot(DEMO_REPORT_SNAPSHOT)
      setLoadError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.allSettled([getDevices(), getSecurityChecks(), getMalwareDetections(), getADDomainStatus()])
      .then(([deviceResult, checkResult, detectionResult, adResult]) => {
        if (cancelled) return
        if (deviceResult.status === 'rejected' || checkResult.status === 'rejected') {
          const errors = [
            deviceResult.status === 'rejected' ? deviceResult.reason : null,
            checkResult.status === 'rejected' ? checkResult.reason : null,
          ].filter(Boolean)
          setSnapshot(null)
          setLoadError(errors.map(error => error instanceof Error ? error.message : String(error)).join(' '))
          return
        }

        setSnapshot({
          devices: deviceResult.value.map(mapManagedDevice),
          checks: checkResult.value.filter(check => check.is_active).map(check => ({
            name: check.title,
            category: check.category === 'patch' ? 'os_updates' : check.category === 'malware' ? 'malware_protection' : check.category,
            failingDeviceCount: check.failing_device_count ?? 0,
          })),
          ...(detectionResult.status === 'fulfilled'
            ? { detections: detectionResult.value.map(detection => ({
              device_name: detection.device_name,
              threat_name: detection.threat_name,
              action: detection.action,
              severity: detection.severity,
              timestamp: detection.timestamp,
            })) }
            : {}),
          ...(adResult.status === 'fulfilled' ? { adStatus: adResult.value } : {}),
        })
        if (detectionResult.status === 'rejected' || adResult.status === 'rejected') {
          const unavailable = [
            detectionResult.status === 'rejected' ? 'malware detection history' : '',
            adResult.status === 'rejected' ? 'Active Directory details' : '',
          ].filter(Boolean)
          setLoadError(`Some optional report sources are unavailable: ${unavailable.join(' and ')}. Those sections will be marked accordingly.`)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [mode])

  const metrics = useMemo(() => snapshot ? getReportMetrics(snapshot) : null, [snapshot])
  const findings = useMemo(() => snapshot ? getReportFindings(snapshot) : [], [snapshot])

  function openGenerateModal(type: ReportTemplate['type'] = 'Executive Summary') {
    setSelectedType(type)
    setShowModal(true)
  }

  return (
    <>
      {showModal && snapshot && <GenerateModal onClose={() => setShowModal(false)} snapshot={snapshot} initialType={selectedType} />}

      <div className="space-y-5">
        <PageHeader
          title="Reports"
          action={
            <button
              onClick={() => openGenerateModal()}
              disabled={!snapshot || loading}
              className="flex items-center gap-2 rounded-md bg-brand px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} strokeWidth={2} />
              Generate Report
            </button>
          }
        >
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Reports</h1>
          
          </div>
        </PageHeader>

        {loadError && (
          <div className={cn(
            'flex items-start gap-2 rounded-md border px-3.5 py-3 text-[12px]',
            snapshot ? 'border-status-warning/30 bg-status-warning/5 text-foreground' : 'border-status-critical/30 bg-status-critical/5 text-foreground',
          )}>
            <AlertTriangle size={15} className={snapshot ? 'text-status-warning' : 'text-status-critical'} />
            <p>{loadError}</p>
          </div>
        )}

        {loading && (
          <SectionCard>
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <RefreshCw size={14} className="animate-spin" /> Loading report data…
            </div>
          </SectionCard>
        )}

        {metrics && snapshot && (
          <>
            <section className="rounded-md border border-border bg-card p-4 shadow-card sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Managed endpoints" value={metrics.endpoints} accentColor="#008080" />
                <KpiCard label="Average compliance" value={metrics.scoreCoverage ? `${metrics.averageScore}%` : '—'} description={`${metrics.scoreCoverage} of ${metrics.endpoints} scores reported`} accentColor="#5B7FFF" />
                <KpiCard label="Controls with failures" value={metrics.failingControls} accentColor={metrics.failingControls ? '#F79009' : '#12B76A'} />
                <KpiCard label="Critical / EOL update risk" value={metrics.updateRisk} description={`${metrics.updateCoverage} of ${metrics.endpoints} endpoints reported update data`} accentColor={metrics.updateRisk ? '#F04438' : '#12B76A'} />
              </div>
            </section>

            <SectionCard title="Priority findings">
              <div className="divide-y divide-border">
                {findings.map(finding => {
                  const color = finding.severity === 'critical' ? 'var(--status-critical)' : finding.severity === 'warning' ? 'var(--status-warning)' : 'var(--status-good)'
                  return (
                    <div key={finding.title} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface text-[13px] font-semibold tabular-nums" style={{ color: finding.severity ? color : 'var(--muted-foreground)' }}>
                        {finding.count}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-foreground">{finding.title}</p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">{finding.detail}</p>
                      </div>
                      {finding.severity && (
                        <span className="hidden rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline-flex">
                          {finding.severity === 'info' ? 'Clear' : finding.severity}
                        </span>
                      )}
                    </div>
                  )
                })}
                {findings.length === 0 && <p className="py-3 text-[12px] text-muted-foreground">No report findings are available.</p>}
              </div>
            </SectionCard>
          </>
        )}

        <SectionCard title="Report templates" description="Choose a report to generate from the current snapshot." noPadding>
          <div className="divide-y divide-border">
            {REPORT_TYPES.map(type => (
              <div key={type} className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-surface-hover sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold text-foreground">{type}</h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{REPORT_DESCRIPTIONS[type]}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!snapshot || loading}
                  onClick={() => openGenerateModal(type)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-md border border-border px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
                >
                  <ArrowDownToLine size={13} />
                  Generate
                </button>
              </div>
            ))}
          </div>
          <p className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
            Reports include the available findings and device-level evidence at generation time. Unavailable sources are identified in the export rather than estimated.
          </p>
        </SectionCard>
      </div>
    </>
  )
}
