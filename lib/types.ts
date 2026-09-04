export type OS = 'Windows' | 'Mac' | 'Linux'
export type DeviceStatus = 'compliant' | 'warning' | 'critical'
export type DeviceAssetType = 'dc_server' | 'laptop' | 'workstation'
export type Severity = 'info' | 'warning' | 'critical'
export type CheckCategory = 'active_directory' | 'malware_protection' | 'os_updates' | 'other'

export interface MalwareStatus {
  engineVersion: string
  securityIntelligenceVersion?: string
  securityIntelligenceCreatedAt?: string
  securityIntelligenceUpdatedAt?: string
  definitionAge: number // days
  realtimeProtection: boolean
  lastScanResult: 'clean' | 'threats_found' | 'scan_failed'
  lastScanAt?: string
  lastScanType?: 'quick' | 'full' | 'custom'
  lastScanDurationSeconds?: number
  lastScanFiles?: number
  tamperProtection: boolean
  quarantineCount: number
}

export interface PatchStatus {
  missingCritical: number
  missingTotal: number
  pendingReboot: boolean
  lastUpdateCheck: string // ISO datetime
  osEol: boolean
  eolDate?: string
}

export interface Device {
  id: string
  name: string
  assetType: DeviceAssetType
  os: OS
  osVersion: string
  department: string
  ip: string
  mac: string
  username: string
  complianceScore: number
  status: DeviceStatus
  failedChecks: number
  passedChecks: number
  lastSeen: string // ISO datetime
  lastScanned: string // ISO datetime
  malwareStatus: MalwareStatus
  patchStatus: PatchStatus
  domainJoined: boolean
}

export interface ComplianceCheck {
  id: string
  name: string
  category: CheckCategory
  severity: Severity
  failingDeviceCount: number
  description: string
  remediation: string
}

export interface DomainController {
  name: string
  site: string
  online: boolean
  replicationHealthy: boolean
  lastReplication: string
}

export interface PrivilegedGroupChange {
  timestamp: string
  account: string
  group: string
  action: 'added' | 'removed'
  source?: string
}

export interface KerberosAnomaly {
  type: 'kerberoasting' | 'golden_ticket' | 'silver_ticket' | 'as_rep_roasting'
  account: string
  timestamp: string
  severity: Severity
}

export type ADAccountType = 'user' | 'service' | 'computer'

export interface ADAccountRecord {
  id: string
  accountName: string
  displayName?: string
  accountType: ADAccountType
  organizationalUnit: string
  enabled: boolean
  lastLogon: string
  passwordLastSet?: string
  passwordNeverExpires: boolean
  distinguishedName: string
  sourceDomainController: string
  stale: boolean
}

export interface KerberosEventRecord {
  id: string
  eventId: 4768 | 4769 | 4771 | 4776
  activity: 'ticket_requested' | 'service_ticket_requested' | 'pre_authentication_failed' | 'credential_validation'
  account: string
  servicePrincipalName?: string
  clientHost: string
  clientIp: string
  sourceDomainController: string
  timestamp: string
  severity: Severity
  detectionReason?: string
}

export interface ADDomainStatus {
  domainControllers: DomainController[]
  failedLogons24h: number
  successfulLogons24h: number
  privilegedGroupChanges: PrivilegedGroupChange[]
  kerberosAnomalies: KerberosAnomaly[]
  staleAccounts: number
  staleAccountRecords: ADAccountRecord[]
  kerberosEvents: KerberosEventRecord[]
}

export interface Alert {
  id: string
  severity: Severity
  category: CheckCategory
  message: string
  timestamp: string
  deviceName?: string
  checkName?: string
}

export interface ScanActivity {
  deviceId: string
  deviceName: string
  timestamp: string
  score: number
  previousScore: number
  status: DeviceStatus
}

export interface TrendData {
  date: string
  average: number
  min: number
  max: number
}

export interface MissingPatch {
  id: string
  kbId: string
  title: string
  severity: Severity
  affectedDevices: number
  daysAvailable: number
  cveReference?: string
}

export interface Detection {
  id: string
  timestamp: string
  deviceId: string
  deviceName: string
  threatName: string
  filePath: string
  action: 'quarantined' | 'deleted' | 'blocked' | 'allowed'
  hash: string
}

export interface QuarantineItem {
  id: string
  fileName: string
  deviceId: string
  deviceName: string
  quarantineDate: string
  originalPath: string
  threatName: string
}

export interface ReportTemplate {
  id: string
  name: string
  type: 'Executive Summary' | 'Compliance Detail' | 'AD Security' | 'Malware Summary' | 'Patch Status'
  dateRange: string
  generatedDate: string
  format: 'PDF' | 'CSV'
}

export interface KPI {
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
  trend?: 'up' | 'down' | 'flat'
  trendGood?: boolean // whether an "up" trend is a good thing
  sparkline?: number[]
}
