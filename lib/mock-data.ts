import type {
  Device,
  ComplianceCheck,
  ADDomainStatus,
  Alert,
  ScanActivity,
  MissingPatch,
  Detection,
  QuarantineItem,
  ReportTemplate,
} from './types'

// ─── Devices ──────────────────────────────────────────────────────────────────
const now = new Date('2026-07-31T10:00:00Z')

function daysAgo(d: number): string {
  const dt = new Date(now)
  dt.setDate(dt.getDate() - d)
  return dt.toISOString()
}
function hoursAgo(h: number): string {
  const dt = new Date(now)
  dt.setHours(dt.getHours() - h)
  return dt.toISOString()
}
function minutesAgo(m: number): string {
  const dt = new Date(now)
  dt.setMinutes(dt.getMinutes() - m)
  return dt.toISOString()
}

export const devices: Device[] = [
  {
    id: 'dev-001', name: 'NYC-LT-0142', os: 'Windows', osVersion: 'Windows 11 23H2 (22631.3447)',
    department: 'Engineering', ip: '10.0.1.42', mac: '3C:22:FB:4A:1D:88',
    username: 'j.chen', complianceScore: 94, status: 'compliant', failedChecks: 2, passedChecks: 28,
    lastSeen: minutesAgo(3), lastScanned: hoursAgo(1), domainJoined: true,
    malwareStatus: { engineVersion: '4.18.24050.7', definitionAge: 0, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 0, missingTotal: 1, pendingReboot: false, lastUpdateCheck: hoursAgo(2), osEol: false },
  },
  {
    id: 'dev-002', name: 'NYC-LT-0087', os: 'Windows', osVersion: 'Windows 11 23H2 (22631.3447)',
    department: 'Finance', ip: '10.0.1.87', mac: '00:1A:2B:3C:4D:5E',
    username: 'a.patel', complianceScore: 71, status: 'warning', failedChecks: 7, passedChecks: 23,
    lastSeen: minutesAgo(15), lastScanned: hoursAgo(3), domainJoined: true,
    malwareStatus: { engineVersion: '4.18.24040.9', definitionAge: 4, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 1 },
    patchStatus: { missingCritical: 2, missingTotal: 5, pendingReboot: true, lastUpdateCheck: hoursAgo(6), osEol: false },
  },
  {
    id: 'dev-003', name: 'NYC-SRV-0012', os: 'Windows', osVersion: 'Windows Server 2022 (20348.2340)',
    department: 'IT', ip: '10.0.1.12', mac: 'A4:BB:6D:09:F3:22',
    username: 'svc.backup', complianceScore: 88, status: 'compliant', failedChecks: 3, passedChecks: 27,
    lastSeen: minutesAgo(1), lastScanned: hoursAgo(2), domainJoined: true,
    malwareStatus: { engineVersion: '4.18.24050.7', definitionAge: 1, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 0, missingTotal: 2, pendingReboot: false, lastUpdateCheck: hoursAgo(1), osEol: false },
  },
  {
    id: 'dev-004', name: 'NYC-MBP-0034', os: 'Mac', osVersion: 'macOS 14.4.1 (Sonoma)',
    department: 'Design', ip: '10.0.1.34', mac: 'F8:FF:C2:1A:8B:D0',
    username: 'l.torres', complianceScore: 97, status: 'compliant', failedChecks: 1, passedChecks: 29,
    lastSeen: minutesAgo(5), lastScanned: hoursAgo(1), domainJoined: false,
    malwareStatus: { engineVersion: '101.24032.0006', definitionAge: 0, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 0, missingTotal: 0, pendingReboot: false, lastUpdateCheck: hoursAgo(4), osEol: false },
  },
  {
    id: 'dev-005', name: 'NYC-LT-0201', os: 'Windows', osVersion: 'Windows 10 22H2 (19045.4355)',
    department: 'Sales', ip: '10.0.1.201', mac: 'DC:A6:32:9E:5F:11',
    username: 'm.kim', complianceScore: 42, status: 'critical', failedChecks: 16, passedChecks: 14,
    lastSeen: hoursAgo(2), lastScanned: hoursAgo(8), domainJoined: true,
    malwareStatus: { engineVersion: '4.18.23100.3', definitionAge: 9, realtimeProtection: false, lastScanResult: 'threats_found', tamperProtection: false, quarantineCount: 3 },
    patchStatus: { missingCritical: 5, missingTotal: 11, pendingReboot: true, lastUpdateCheck: daysAgo(3), osEol: false },
  },
  {
    id: 'dev-006', name: 'NYC-LX-0055', os: 'Linux', osVersion: 'Ubuntu 22.04.4 LTS',
    department: 'Engineering', ip: '10.0.1.55', mac: '52:54:00:AB:CD:EF',
    username: 'r.sharma', complianceScore: 83, status: 'compliant', failedChecks: 4, passedChecks: 26,
    lastSeen: minutesAgo(8), lastScanned: hoursAgo(2), domainJoined: false,
    malwareStatus: { engineVersion: '101.24032.0006', definitionAge: 1, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 1, missingTotal: 3, pendingReboot: false, lastUpdateCheck: hoursAgo(3), osEol: false },
  },
  {
    id: 'dev-007', name: 'NYC-LT-0301', os: 'Windows', osVersion: 'Windows 11 23H2 (22631.3447)',
    department: 'HR', ip: '10.0.1.148', mac: '00:50:56:88:22:3C',
    username: 'p.nguyen', complianceScore: 78, status: 'warning', failedChecks: 6, passedChecks: 24,
    lastSeen: minutesAgo(22), lastScanned: hoursAgo(4), domainJoined: true,
    malwareStatus: { engineVersion: '4.18.24040.9', definitionAge: 2, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 1, missingTotal: 4, pendingReboot: true, lastUpdateCheck: hoursAgo(5), osEol: false },
  },
  {
    id: 'dev-008', name: 'NYC-MBP-0098', os: 'Mac', osVersion: 'macOS 13.6.7 (Ventura)',
    department: 'Marketing', ip: '10.0.1.98', mac: '3C:06:30:44:A2:BB',
    username: 'e.davis', complianceScore: 66, status: 'warning', failedChecks: 9, passedChecks: 21,
    lastSeen: minutesAgo(45), lastScanned: hoursAgo(6), domainJoined: false,
    malwareStatus: { engineVersion: '101.24020.0004', definitionAge: 3, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: false, quarantineCount: 0 },
    patchStatus: { missingCritical: 2, missingTotal: 6, pendingReboot: false, lastUpdateCheck: daysAgo(1), osEol: false },
  },
  {
    id: 'dev-009', name: 'SF-WKS-0087', os: 'Windows', osVersion: 'Windows 11 22H2 (22621.3155)',
    department: 'Operations', ip: '10.1.0.87', mac: 'B0:25:AA:55:C3:D1',
    username: 's.wilson', complianceScore: 55, status: 'warning', failedChecks: 12, passedChecks: 18,
    lastSeen: minutesAgo(30), lastScanned: hoursAgo(5), domainJoined: true,
    malwareStatus: { engineVersion: '4.18.24030.8', definitionAge: 5, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 3, missingTotal: 8, pendingReboot: false, lastUpdateCheck: daysAgo(2), osEol: false },
  },
  {
    id: 'dev-010', name: 'SF-WKS-0104', os: 'Windows', osVersion: 'Windows 10 21H2 (19044.4046)',
    department: 'Finance', ip: '10.1.0.104', mac: '00:D8:61:89:2A:F4',
    username: 't.martin', complianceScore: 38, status: 'critical', failedChecks: 18, passedChecks: 12,
    lastSeen: hoursAgo(4), lastScanned: hoursAgo(12), domainJoined: true,
    malwareStatus: { engineVersion: '4.18.23090.2', definitionAge: 11, realtimeProtection: false, lastScanResult: 'threats_found', tamperProtection: false, quarantineCount: 2 },
    patchStatus: { missingCritical: 6, missingTotal: 14, pendingReboot: true, lastUpdateCheck: daysAgo(5), osEol: true, eolDate: '2025-10-14' },
  },
  {
    id: 'dev-011', name: 'SF-MBP-0022', os: 'Mac', osVersion: 'macOS 14.4.1 (Sonoma)',
    department: 'Engineering', ip: '10.1.0.22', mac: 'AC:DE:48:00:11:22',
    username: 'k.anderson', complianceScore: 92, status: 'compliant', failedChecks: 2, passedChecks: 28,
    lastSeen: minutesAgo(7), lastScanned: hoursAgo(1), domainJoined: false,
    malwareStatus: { engineVersion: '101.24032.0006', definitionAge: 0, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 0, missingTotal: 1, pendingReboot: false, lastUpdateCheck: hoursAgo(2), osEol: false },
  },
  {
    id: 'dev-012', name: 'SF-LX-0031', os: 'Linux', osVersion: 'Ubuntu 20.04.6 LTS',
    department: 'IT', ip: '10.1.0.31', mac: '00:11:32:44:55:66',
    username: 'devops', complianceScore: 74, status: 'warning', failedChecks: 7, passedChecks: 23,
    lastSeen: minutesAgo(12), lastScanned: hoursAgo(3), domainJoined: false,
    malwareStatus: { engineVersion: '101.24020.0004', definitionAge: 2, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 1, missingTotal: 5, pendingReboot: false, lastUpdateCheck: hoursAgo(4), osEol: true, eolDate: '2025-04-02' },
  },
  {
    id: 'dev-013', name: 'SF-SRV-0003', os: 'Linux', osVersion: 'Ubuntu 22.04.4 LTS',
    department: 'IT', ip: '10.1.0.3', mac: '08:00:27:FF:EE:DD',
    username: 'svc.web', complianceScore: 85, status: 'compliant', failedChecks: 4, passedChecks: 26,
    lastSeen: minutesAgo(2), lastScanned: hoursAgo(1), domainJoined: false,
    malwareStatus: { engineVersion: '101.24032.0006', definitionAge: 1, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 0, missingTotal: 2, pendingReboot: false, lastUpdateCheck: hoursAgo(2), osEol: false },
  },
  {
    id: 'dev-014', name: 'SF-WKS-0157', os: 'Windows', osVersion: 'Windows 11 23H2 (22631.3447)',
    department: 'Sales', ip: '10.1.0.157', mac: 'CC:2D:E0:81:47:39',
    username: 'n.garcia', complianceScore: 62, status: 'warning', failedChecks: 10, passedChecks: 20,
    lastSeen: minutesAgo(55), lastScanned: hoursAgo(7), domainJoined: true,
    malwareStatus: { engineVersion: '4.18.24040.9', definitionAge: 4, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: false, quarantineCount: 0 },
    patchStatus: { missingCritical: 2, missingTotal: 7, pendingReboot: true, lastUpdateCheck: daysAgo(2), osEol: false },
  },
  {
    id: 'dev-015', name: 'SF-WKS-0199', os: 'Windows', osVersion: 'Windows 10 22H2 (19045.4355)',
    department: 'HR', ip: '10.1.0.199', mac: '1C:1B:0D:E0:88:A2',
    username: 'b.thompson', complianceScore: 47, status: 'critical', failedChecks: 14, passedChecks: 16,
    lastSeen: hoursAgo(3), lastScanned: hoursAgo(9), domainJoined: true,
    malwareStatus: { engineVersion: '4.18.23110.4', definitionAge: 8, realtimeProtection: false, lastScanResult: 'threats_found', tamperProtection: false, quarantineCount: 5 },
    patchStatus: { missingCritical: 4, missingTotal: 10, pendingReboot: true, lastUpdateCheck: daysAgo(4), osEol: false },
  },
  {
    id: 'dev-016', name: 'NYC-LT-0412', os: 'Windows', osVersion: 'Windows 11 23H2 (22631.3447)',
    department: 'Legal', ip: '10.0.1.200', mac: '4C:79:BA:1F:22:A3',
    username: 'c.white', complianceScore: 81, status: 'compliant', failedChecks: 5, passedChecks: 25,
    lastSeen: minutesAgo(18), lastScanned: hoursAgo(3), domainJoined: true,
    malwareStatus: { engineVersion: '4.18.24050.7', definitionAge: 1, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 0, missingTotal: 3, pendingReboot: false, lastUpdateCheck: hoursAgo(3), osEol: false },
  },
  {
    id: 'dev-017', name: 'NYC-SRV-0018', os: 'Windows', osVersion: 'Windows Server 2019 (17763.5696)',
    department: 'IT', ip: '10.0.1.18', mac: 'D0:67:E5:44:7F:C2',
    username: 'svc.sql', complianceScore: 76, status: 'warning', failedChecks: 7, passedChecks: 23,
    lastSeen: minutesAgo(4), lastScanned: hoursAgo(2), domainJoined: true,
    malwareStatus: { engineVersion: '4.18.24040.9', definitionAge: 3, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 1, missingTotal: 4, pendingReboot: true, lastUpdateCheck: hoursAgo(2), osEol: false },
  },
  {
    id: 'dev-018', name: 'NYC-MBP-0045', os: 'Mac', osVersion: 'macOS 12.7.5 (Monterey)',
    department: 'Finance', ip: '10.0.1.45', mac: 'A8:5C:2C:88:11:DD',
    username: 'f.jones', complianceScore: 58, status: 'warning', failedChecks: 11, passedChecks: 19,
    lastSeen: hoursAgo(1), lastScanned: hoursAgo(5), domainJoined: false,
    malwareStatus: { engineVersion: '101.24010.0003', definitionAge: 5, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: false, quarantineCount: 0 },
    patchStatus: { missingCritical: 2, missingTotal: 8, pendingReboot: false, lastUpdateCheck: daysAgo(1), osEol: false },
  },
  {
    id: 'dev-019', name: 'CHI-WKS-0011', os: 'Windows', osVersion: 'Windows 11 23H2 (22631.3447)',
    department: 'Engineering', ip: '10.2.0.11', mac: '00:1C:42:AB:CD:12',
    username: 'g.brown', complianceScore: 96, status: 'compliant', failedChecks: 1, passedChecks: 29,
    lastSeen: minutesAgo(2), lastScanned: hoursAgo(1), domainJoined: true,
    malwareStatus: { engineVersion: '4.18.24050.7', definitionAge: 0, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 0, missingTotal: 0, pendingReboot: false, lastUpdateCheck: hoursAgo(1), osEol: false },
  },
  {
    id: 'dev-020', name: 'CHI-MBP-0007', os: 'Mac', osVersion: 'macOS 14.4.1 (Sonoma)',
    department: 'Product', ip: '10.2.0.7', mac: 'F0:18:98:CC:DD:EE',
    username: 'h.lee', complianceScore: 93, status: 'compliant', failedChecks: 2, passedChecks: 28,
    lastSeen: minutesAgo(9), lastScanned: hoursAgo(2), domainJoined: false,
    malwareStatus: { engineVersion: '101.24032.0006', definitionAge: 0, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 0, missingTotal: 1, pendingReboot: false, lastUpdateCheck: hoursAgo(2), osEol: false },
  },
  {
    id: 'dev-021', name: 'CHI-LX-0023', os: 'Linux', osVersion: 'Debian 12.5 (Bookworm)',
    department: 'IT', ip: '10.2.0.23', mac: '52:54:00:12:34:56',
    username: 'root', complianceScore: 88, status: 'compliant', failedChecks: 3, passedChecks: 27,
    lastSeen: minutesAgo(6), lastScanned: hoursAgo(1), domainJoined: false,
    malwareStatus: { engineVersion: '101.24032.0006', definitionAge: 1, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 0, missingTotal: 2, pendingReboot: false, lastUpdateCheck: hoursAgo(3), osEol: false },
  },
  {
    id: 'dev-022', name: 'CHI-WKS-0044', os: 'Windows', osVersion: 'Windows 11 23H2 (22631.3447)',
    department: 'Sales', ip: '10.2.0.44', mac: '3C:A0:67:BB:22:91',
    username: 'i.clark', complianceScore: 85, status: 'compliant', failedChecks: 4, passedChecks: 26,
    lastSeen: minutesAgo(14), lastScanned: hoursAgo(2), domainJoined: true,
    malwareStatus: { engineVersion: '4.18.24050.7', definitionAge: 1, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 0, missingTotal: 2, pendingReboot: false, lastUpdateCheck: hoursAgo(2), osEol: false },
  },
  {
    id: 'dev-023', name: 'CHI-MBP-0019', os: 'Mac', osVersion: 'macOS 14.4.1 (Sonoma)',
    department: 'Design', ip: '10.2.0.19', mac: '88:E9:FE:3D:AA:55',
    username: 'j.murphy', complianceScore: 91, status: 'compliant', failedChecks: 2, passedChecks: 28,
    lastSeen: minutesAgo(20), lastScanned: hoursAgo(2), domainJoined: false,
    malwareStatus: { engineVersion: '101.24032.0006', definitionAge: 0, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 0, missingTotal: 0, pendingReboot: false, lastUpdateCheck: hoursAgo(4), osEol: false },
  },
  {
    id: 'dev-024', name: 'CHI-WKS-0078', os: 'Windows', osVersion: 'Windows 10 22H2 (19045.4355)',
    department: 'HR', ip: '10.2.0.78', mac: '00:26:B9:FF:88:C3',
    username: 'k.robinson', complianceScore: 72, status: 'warning', failedChecks: 8, passedChecks: 22,
    lastSeen: minutesAgo(40), lastScanned: hoursAgo(5), domainJoined: true,
    malwareStatus: { engineVersion: '4.18.24040.9', definitionAge: 2, realtimeProtection: true, lastScanResult: 'clean', tamperProtection: true, quarantineCount: 0 },
    patchStatus: { missingCritical: 1, missingTotal: 4, pendingReboot: true, lastUpdateCheck: hoursAgo(6), osEol: false },
  },
]

// ─── Compliance Checks ────────────────────────────────────────────────────────
export const complianceChecks: ComplianceCheck[] = [
  { id: 'chk-001', name: 'Windows Defender Real-time Protection', category: 'malware_protection', severity: 'critical', failingDeviceCount: 3, description: 'Verifies that Windows Defender Antivirus real-time protection is enabled and actively scanning files on access.', remediation: 'Navigate to Windows Security > Virus & threat protection settings and enable Real-time protection. Ensure the Microsoft Defender Antivirus service is running.' },
  { id: 'chk-002', name: 'Antivirus Definition Age ≤ 3 days', category: 'malware_protection', severity: 'warning', failingDeviceCount: 7, description: 'Checks that malware signature definitions were updated within the last 3 days to ensure detection coverage against recent threats.', remediation: 'Force a definition update via Windows Security or run `Update-MpSignature` in PowerShell. Verify network connectivity to Microsoft Update servers.' },
  { id: 'chk-003', name: 'Critical Patches Applied (30d)', category: 'os_updates', severity: 'critical', failingDeviceCount: 8, description: 'Ensures all critical-severity Windows/Linux patches released in the last 30 days are installed. Unpatched critical vulnerabilities are primary attack vectors.', remediation: 'Run Windows Update or trigger the patch management tool to deploy outstanding critical updates. Review KB articles for any known compatibility issues before deployment.' },
  { id: 'chk-004', name: 'Pending Reboot After Patching', category: 'os_updates', severity: 'warning', failingDeviceCount: 6, description: 'Flags devices awaiting a restart to complete patch installation. Patches are not fully applied until the pending reboot occurs.', remediation: 'Schedule a maintenance window and restart the device. For servers, coordinate with application owners before rebooting.' },
  { id: 'chk-005', name: 'Domain Admin Group Membership Audit', category: 'active_directory', severity: 'critical', failingDeviceCount: 2, description: 'Detects unauthorized or unexpected accounts in the Domain Admins group. Privileged group membership should match the approved list.', remediation: 'Review all members of the Domain Admins group in Active Directory Users and Computers. Remove accounts that do not have documented business justification. Enable auditing for group membership changes.' },
  { id: 'chk-006', name: 'Stale Computer Accounts (90d)', category: 'active_directory', severity: 'warning', failingDeviceCount: 4, description: 'Identifies Active Directory computer accounts that have not authenticated in 90 or more days. Stale accounts represent potential re-activation risk.', remediation: 'Disable or remove stale computer accounts via Active Directory Users and Computers or using `Disable-ADAccount`. Investigate accounts before deletion to confirm decommission.' },
  { id: 'chk-007', name: 'Local Administrator Account Disabled', category: 'other', severity: 'warning', failingDeviceCount: 5, description: 'Verifies the built-in local Administrator account is disabled on endpoints. Enabled local admin accounts bypass domain audit logging and are commonly targeted.', remediation: 'Disable the built-in Administrator account via Group Policy (Computer Configuration > Security Settings > Local Policies). Use LAPS for any required local admin access.' },
  { id: 'chk-008', name: 'Tamper Protection Enabled', category: 'malware_protection', severity: 'critical', failingDeviceCount: 4, description: 'Confirms Microsoft Defender Tamper Protection is active, preventing unauthorized modification of security settings by malware or unprivileged processes.', remediation: 'Enable Tamper Protection in Windows Security > Virus & threat protection settings, or deploy via Microsoft Intune Endpoint Security policy.' },
  { id: 'chk-009', name: 'Password Never Expires Flag', category: 'active_directory', severity: 'warning', failingDeviceCount: 9, description: 'Identifies user accounts with the "Password Never Expires" attribute set. This configuration violates password rotation policy and persists compromised credentials.', remediation: 'Unset the "Password never expires" attribute for flagged accounts via Active Directory Users and Computers or `Set-ADUser -PasswordNeverExpires $false`. Coordinate with service account owners.' },
  { id: 'chk-010', name: 'OS End-of-Life Detection', category: 'os_updates', severity: 'critical', failingDeviceCount: 2, description: 'Flags devices running operating systems that have reached end-of-life and no longer receive security updates from the vendor. EOL OS devices cannot be patched against new CVEs.', remediation: 'Plan and execute OS upgrade or replacement for all EOL devices. Windows 10 reaches end-of-life October 2025. Ubuntu 20.04 LTS reached EOS April 2025.' },
  { id: 'chk-011', name: 'Bitlocker / FileVault Encryption', category: 'other', severity: 'critical', failingDeviceCount: 6, description: 'Verifies full disk encryption is enabled on all endpoints (BitLocker on Windows, FileVault on macOS). Unencrypted devices expose sensitive data on physical theft.', remediation: 'Enable BitLocker via Intune or Group Policy for Windows. Enable FileVault via System Preferences > Security on macOS. Ensure recovery keys are escrowed to a central store.' },
  { id: 'chk-012', name: 'Windows Firewall Enabled', category: 'other', severity: 'warning', failingDeviceCount: 3, description: 'Checks that Windows Defender Firewall is enabled on all profiles (Domain, Private, Public). Disabled firewall allows unrestricted inbound connection attempts.', remediation: 'Enable the firewall via Windows Security or Group Policy. Do not rely on network-level firewalls alone. Audit any application rules added to allow-list that may be overly permissive.' },
  { id: 'chk-013', name: 'USB / Removable Media Control', category: 'other', severity: 'critical', failingDeviceCount: 4, description: 'Ensures USB storage and other removable media are restricted via Group Policy or endpoint protection. Uncontrolled USB access enables data exfiltration and malware infection.', remediation: 'Deploy a Group Policy to block USB storage under Computer Configuration > Administrative Templates > System > Removable Storage Access. Consider using Windows Defender Application Control or Intune device restrictions.' },
  { id: 'chk-014', name: 'RDP Exposure', category: 'other', severity: 'critical', failingDeviceCount: 2, description: 'Detects endpoints with Remote Desktop Protocol exposed to untrusted networks or the internet. RDP is a top attack vector for brute-force and ransomware campaigns.', remediation: 'Restrict RDP access to VPN or internal networks only. Enable Network Level Authentication (NLA) and use strong account lockout policies. Consider replacing RDP with alternative remote support tools.' },
  { id: 'chk-015', name: 'SMBv1 Enabled', category: 'other', severity: 'critical', failingDeviceCount: 1, description: 'Checks for the legacy SMBv1 protocol, which lacks modern security controls and was exploited by WannaCry, NotPetya, and other worms.', remediation: 'Remove SMBv1 via Windows Features or Group Policy. Verify SMB signing is enforced and SMBv2/v3 is in use. Scan the network with tools like nmap to confirm no SMBv1 listeners remain.' },
  { id: 'chk-016', name: 'Guest Account Status', category: 'other', severity: 'warning', failingDeviceCount: 3, description: 'Verifies the built-in Guest account is disabled. Guest accounts bypass normal authentication and auditing, and are frequently abused for lateral movement.', remediation: 'Disable the Guest account via Computer Management > Local Users and Groups, or via Group Policy. Review any services or applications that may depend on the Guest account and replace them with service accounts.' },
  { id: 'chk-017', name: 'Secure Boot / TPM', category: 'other', severity: 'warning', failingDeviceCount: 5, description: 'Confirms Secure Boot is enabled and a TPM is present and active. Without these, devices are vulnerable to bootkits, firmware attacks, and unauthorized OS modifications.', remediation: 'Enable Secure Boot in the device firmware/BIOS. Provision TPM 2.0 via Windows Autopilot or Group Policy. Verify BitLocker is bound to the TPM with PIN or startup key as required by policy.' },
  { id: 'chk-018', name: 'Application Whitelisting (AppLocker/WDAC)', category: 'other', severity: 'warning', failingDeviceCount: 6, description: 'Checks whether AppLocker or Windows Defender Application Control is configured to block unauthorized executables. Whitelisting prevents unknown malware and unapproved software from executing.', remediation: 'Deploy AppLocker or WDAC policies via Intune or Group Policy. Start in audit mode to identify allowed applications, then enforce blocked rules. Review and update rules during each software change cycle.' },
  { id: 'chk-019', name: 'Screen Lock / Inactivity Lock', category: 'other', severity: 'warning', failingDeviceCount: 4, description: 'Ensures endpoints lock automatically after a short period of inactivity. Unlocked devices allow physical access attacks, data theft, and unauthorized session access.', remediation: 'Configure a screen saver or lock policy via Group Policy or Intune: require password on wake, set timeout to 5 minutes or less. Test behavior across laptop lid-close, sleep, and remote desktop sessions.' },
  { id: 'chk-020', name: 'User Account Control (UAC)', category: 'other', severity: 'critical', failingDeviceCount: 3, description: 'Verifies UAC is enabled and set to at least the default level. Disabled or lowered UAC allows processes to run with elevated privileges without user consent.', remediation: 'Enable UAC via Control Panel or Group Policy. Set the default level for standard user sessions. Do not disable UAC for convenience — use elevation prompts or Run as Administrator for legitimate administrative tasks.' },
  { id: 'chk-021', name: 'AutoRun / AutoPlay Disabled', category: 'other', severity: 'warning', failingDeviceCount: 7, description: 'Confirms AutoRun and AutoPlay are disabled for removable media and network drives. Auto-execution from USB drives is a common malware infection vector.', remediation: 'Disable AutoRun via Group Policy under Computer Configuration > Administrative Templates > Windows Components > AutoPlay Policies. Set AutoPlay to "Do not execute" for all drive types and media.' },
  { id: 'chk-022', name: 'Audit Policy Enabled', category: 'other', severity: 'warning', failingDeviceCount: 2, description: 'Checks that Windows Audit Policy is enabled for logon events, object access, and policy changes. Without auditing, security incidents cannot be detected, investigated, or forensically analyzed.', remediation: 'Enable Advanced Audit Policy via Group Policy under Computer Configuration > Windows Settings > Security Settings > Advanced Audit Policy Configuration. At minimum, enable Logon/Logoff, Account Management, and Object Access subcategories.' },
  { id: 'chk-023', name: 'Scheduled Tasks', category: 'other', severity: 'warning', failingDeviceCount: 4, description: 'Reviews scheduled tasks for unauthorized or suspicious entries. Attackers commonly use scheduled tasks for persistence, privilege escalation, and lateral movement.', remediation: 'Audit scheduled tasks via Task Scheduler or `Get-ScheduledTask` PowerShell. Remove unknown tasks, restrict task creation permissions, and monitor for new tasks created by non-admin accounts.' },
  { id: 'chk-024', name: 'Unnecessary Services', category: 'other', severity: 'warning', failingDeviceCount: 5, description: 'Identifies non-essential Windows services running on endpoints. Every running service expands the attack surface and increases the number of potential vulnerabilities.', remediation: 'Review running services via `Get-Service` or Services.msc. Disable unnecessary services and set startup type to Manual or Disabled. Prioritize disabling services with known vulnerabilities or excessive privileges.' },
  { id: 'chk-025', name: 'Network Shares', category: 'other', severity: 'warning', failingDeviceCount: 3, description: 'Detects open or overly permissive network shares that may expose sensitive data. Unrestricted shares are a common source of data breaches and lateral movement.', remediation: 'Audit shares via `net share` or Computer Management. Remove unnecessary shares, enforce least-privilege permissions, and require authentication. Encrypt sensitive data stored on shared locations.' },
  { id: 'chk-026', name: 'Remote Access Tools', category: 'other', severity: 'warning', failingDeviceCount: 2, description: 'Flags unauthorized remote access tools such as TeamViewer, AnyDesk, or unapproved RDP alternatives. These tools bypass firewall controls and can be used for data exfiltration.', remediation: 'Deploy application control policies to block unauthorized remote access tools. Review installed software inventory regularly. Allow only approved remote support tools and enforce MFA for their use.' },
  { id: 'chk-027', name: 'Backup Status', category: 'other', severity: 'critical', failingDeviceCount: 2, description: 'Verifies that endpoints have recent, successful backups. Without reliable backups, ransomware and data loss incidents become catastrophic.', remediation: 'Enable and verify backup software on all endpoints. Ensure backups are stored offline or in a separate security zone. Test restore procedures quarterly and monitor backup success/failure alerts.' },
  { id: 'chk-028', name: 'Browser Security', category: 'other', severity: 'warning', failingDeviceCount: 6, description: 'Assesses browser security settings including phishing protection, certificate validation, and extension hygiene. Insecure browsers are a primary vector for phishing and web-based attacks.', remediation: 'Enforce browser security baselines via Group Policy or Intune: disable insecure protocols, enable phishing protection, block untrusted extensions, and enforce certificate validation. Keep browsers updated and remove legacy browsers.' },
]

// ─── AD Domain Status ─────────────────────────────────────────────────────────
export const adDomainStatus: ADDomainStatus = {
  domainControllers: [
    { name: 'NYC-DC-01', site: 'NYC-Primary', online: true, replicationHealthy: true, lastReplication: minutesAgo(8) },
    { name: 'NYC-DC-02', site: 'NYC-Primary', online: true, replicationHealthy: true, lastReplication: minutesAgo(12) },
    { name: 'NYC-DC-03', site: 'NYC-DR', online: true, replicationHealthy: false, lastReplication: hoursAgo(2) },
  ],
  failedLogons24h: 47,
  successfulLogons24h: 1284,
  privilegedGroupChanges: [
    { timestamp: hoursAgo(14), account: 'j.chen', group: 'Domain Admins', action: 'added', source: 'NYC-DC-01' },
    { timestamp: daysAgo(3), account: 'temp.admin', group: 'Enterprise Admins', action: 'removed', source: 'NYC-DC-01' },
    { timestamp: daysAgo(5), account: 'svc.deploy', group: 'Administrators', action: 'added', source: 'NYC-DC-02' },
  ],
  kerberosAnomalies: [
    { type: 'kerberoasting', account: 'svc.sql', timestamp: hoursAgo(6), severity: 'critical' },
    { type: 'as_rep_roasting', account: 'p.nguyen', timestamp: daysAgo(2), severity: 'warning' },
  ],
  staleAccounts: 11,
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const alerts: Alert[] = [
  { id: 'alt-001', severity: 'critical', category: 'malware_protection', message: 'Threat detected and quarantined: Trojan:Win32/Qakbot.GE on NYC-LT-0201', timestamp: minutesAgo(12), deviceName: 'NYC-LT-0201', checkName: 'Windows Defender Real-time Protection' },
  { id: 'alt-002', severity: 'critical', category: 'active_directory', message: 'Account j.chen added to Domain Admins — requires review', timestamp: hoursAgo(14), deviceName: undefined, checkName: 'Domain Admin Group Membership Audit' },
  { id: 'alt-003', severity: 'warning', category: 'os_updates', message: 'SF-WKS-0104 has 6 missing critical patches and is running EOL OS (Windows 10 21H2)', timestamp: hoursAgo(2), deviceName: 'SF-WKS-0104', checkName: 'Critical Patches Applied (30d)' },
  { id: 'alt-004', severity: 'critical', category: 'malware_protection', message: 'Real-time protection disabled on SF-WKS-0199 for 3+ hours', timestamp: hoursAgo(3), deviceName: 'SF-WKS-0199', checkName: 'Windows Defender Real-time Protection' },
  { id: 'alt-005', severity: 'warning', category: 'active_directory', message: 'Kerberoasting attempt detected targeting service account svc.sql', timestamp: hoursAgo(6), deviceName: 'NYC-SRV-0018', checkName: 'Domain Admin Group Membership Audit' },
  { id: 'alt-006', severity: 'critical', category: 'malware_protection', message: 'Tamper Protection disabled on NYC-LT-0201 — security posture compromised', timestamp: hoursAgo(8), deviceName: 'NYC-LT-0201', checkName: 'Tamper Protection Enabled' },
  { id: 'alt-007', severity: 'warning', category: 'os_updates', message: 'SF-LX-0031 running Ubuntu 20.04 LTS — end-of-life since April 2025', timestamp: daysAgo(1), deviceName: 'SF-LX-0031', checkName: 'OS End-of-Life Detection' },
  { id: 'alt-008', severity: 'warning', category: 'os_updates', message: '4 devices have been pending reboot for more than 72 hours after patching', timestamp: daysAgo(1), deviceName: undefined, checkName: 'Pending Reboot After Patching' },
]

// ─── Scan Activity ────────────────────────────────────────────────────────────
export const scanActivity: ScanActivity[] = [
  { deviceId: 'dev-001', deviceName: 'NYC-LT-0142', timestamp: hoursAgo(1), score: 94, previousScore: 91, status: 'compliant' },
  { deviceId: 'dev-005', deviceName: 'NYC-LT-0201', timestamp: hoursAgo(8), score: 42, previousScore: 78, status: 'critical' },
  { deviceId: 'dev-009', deviceName: 'SF-WKS-0087', timestamp: hoursAgo(5), score: 55, previousScore: 62, status: 'warning' },
  { deviceId: 'dev-011', deviceName: 'SF-MBP-0022', timestamp: hoursAgo(1), score: 92, previousScore: 88, status: 'compliant' },
  { deviceId: 'dev-019', deviceName: 'CHI-WKS-0011', timestamp: hoursAgo(1), score: 96, previousScore: 95, status: 'compliant' },
  { deviceId: 'dev-010', deviceName: 'SF-WKS-0104', timestamp: hoursAgo(12), score: 38, previousScore: 55, status: 'critical' },
  { deviceId: 'dev-002', deviceName: 'NYC-LT-0087', timestamp: hoursAgo(3), score: 71, previousScore: 74, status: 'warning' },
  { deviceId: 'dev-015', deviceName: 'SF-WKS-0199', timestamp: hoursAgo(9), score: 47, previousScore: 60, status: 'critical' },
]

// Auth activity for AD page
export const authActivityTrend = Array.from({ length: 14 }, (_, i) => {
  const date = new Date(now)
  date.setDate(date.getDate() - (13 - i))
  const spike = i === 8 ? 180 : i === 9 ? 95 : 0
  return {
    date: date.toISOString().split('T')[0],
    successful: 1100 + Math.round(Math.random() * 300) + (i * 5),
    failed: 28 + Math.round(Math.random() * 20) + spike,
    anomaly: spike > 100,
  }
})

// ─── Missing Patches ──────────────────────────────────────────────────────────
export const missingPatches: MissingPatch[] = [
  { id: 'patch-001', kbId: 'KB5036980', title: 'Cumulative Update for Windows 11 — April 2024', severity: 'critical', affectedDevices: 8, daysAvailable: 12, cveReference: 'CVE-2024-26234' },
  { id: 'patch-002', kbId: 'KB5035845', title: 'Windows 10 Cumulative Update — March 2024', severity: 'critical', affectedDevices: 5, daysAvailable: 45, cveReference: 'CVE-2024-21433' },
  { id: 'patch-003', kbId: 'KB5036893', title: 'Security Update for .NET Framework 4.8', severity: 'critical', affectedDevices: 11, daysAvailable: 18, cveReference: 'CVE-2024-29059' },
  { id: 'patch-004', kbId: 'KB5034763', title: 'Windows Server 2022 Cumulative Update', severity: 'warning', affectedDevices: 3, daysAvailable: 62 },
  { id: 'patch-005', kbId: 'KB5036022', title: 'Microsoft Edge Security Update', severity: 'warning', affectedDevices: 14, daysAvailable: 8 },
  { id: 'patch-006', kbId: 'RHSA-2024:1825', title: 'Linux kernel security update (Ubuntu)', severity: 'critical', affectedDevices: 4, daysAvailable: 22, cveReference: 'CVE-2024-1086' },
]

// ─── Detections ───────────────────────────────────────────────────────────────
export const detections: Detection[] = [
  { id: 'det-001', timestamp: minutesAgo(12), deviceId: 'dev-005', deviceName: 'NYC-LT-0201', threatName: 'Trojan:Win32/Qakbot.GE', filePath: 'C:\\Users\\m.kim\\AppData\\Local\\Temp\\svchost_upd.exe', action: 'quarantined', hash: '4a8e2b1f9c3d7e5a2b4c8f1e9d3a7b5c2e4f8a1b' },
  { id: 'det-002', timestamp: hoursAgo(3), deviceId: 'dev-010', deviceName: 'SF-WKS-0104', threatName: 'HackTool:Win32/Mimikatz.C', filePath: 'C:\\Temp\\tools\\m.exe', action: 'blocked', hash: '7c2e5f9a1b4d8e3c6f2a9d5b8e1c4f7a2d5e8b1c' },
  { id: 'det-003', timestamp: hoursAgo(4), deviceId: 'dev-015', deviceName: 'SF-WKS-0199', threatName: 'Ransomware:Win32/Ryuk.B!dll', filePath: 'C:\\Users\\b.thompson\\Downloads\\invoice_052024.exe', action: 'quarantined', hash: '2d8f5a1c9e4b7d3a6c2f5e8b1d4a7c3e6f9b2d5a' },
  { id: 'det-004', timestamp: daysAgo(1), deviceId: 'dev-002', deviceName: 'NYC-LT-0087', threatName: 'Adware:Win32/Adposhel.I', filePath: 'C:\\Program Files (x86)\\UpdateHelper\\updater.exe', action: 'quarantined', hash: '9b3d6f1a4c8e2b5f8a3d6c1e4b7f2a5c8d3e6b1a' },
  { id: 'det-005', timestamp: daysAgo(2), deviceId: 'dev-015', deviceName: 'SF-WKS-0199', threatName: 'Exploit:Win32/CVE-2024-21338', filePath: 'C:\\Windows\\Temp\\spool.dll', action: 'deleted', hash: '1e4a7c2f5b8d3a6e9c1f4b7d2a5c8e3b6f1a4c7d' },
]

// ─── Quarantine Items ─────────────────────────────────────────────────────────
export const quarantineItems: QuarantineItem[] = [
  { id: 'quar-001', fileName: 'svchost_upd.exe', deviceId: 'dev-005', deviceName: 'NYC-LT-0201', quarantineDate: minutesAgo(12), originalPath: 'C:\\Users\\m.kim\\AppData\\Local\\Temp\\svchost_upd.exe', threatName: 'Trojan:Win32/Qakbot.GE' },
  { id: 'quar-002', fileName: 'invoice_052024.exe', deviceId: 'dev-015', deviceName: 'SF-WKS-0199', quarantineDate: hoursAgo(4), originalPath: 'C:\\Users\\b.thompson\\Downloads\\invoice_052024.exe', threatName: 'Ransomware:Win32/Ryuk.B!dll' },
  { id: 'quar-003', fileName: 'updater.exe', deviceId: 'dev-002', deviceName: 'NYC-LT-0087', quarantineDate: daysAgo(1), originalPath: 'C:\\Program Files (x86)\\UpdateHelper\\updater.exe', threatName: 'Adware:Win32/Adposhel.I' },
  { id: 'quar-004', fileName: 'wsus_patch.bat', deviceId: 'dev-010', deviceName: 'SF-WKS-0104', quarantineDate: daysAgo(2), originalPath: 'C:\\Temp\\wsus_patch.bat', threatName: 'Trojan:Win32/Emotet.ZA' },
  { id: 'quar-005', fileName: 'pdf_reader_upd.msi', deviceId: 'dev-015', deviceName: 'SF-WKS-0199', quarantineDate: daysAgo(3), originalPath: 'C:\\Users\\b.thompson\\AppData\\Roaming\\pdf_reader_upd.msi', threatName: 'PUP:Win32/Bundlore.EV' },
]

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reports: ReportTemplate[] = [
  { id: 'rpt-001', name: 'Fleet Compliance Executive Summary — July 2026', type: 'Executive Summary', dateRange: 'Jul 1 – Jul 31, 2026', generatedDate: daysAgo(1), format: 'PDF' },
  { id: 'rpt-002', name: 'Detailed Compliance Report — Q2 2026', type: 'Compliance Detail', dateRange: 'Apr 1 – Jun 30, 2026', generatedDate: daysAgo(5), format: 'PDF' },
  { id: 'rpt-003', name: 'Active Directory Security Assessment — July 2026', type: 'AD Security', dateRange: 'Jul 1 – Jul 31, 2026', generatedDate: daysAgo(2), format: 'PDF' },
  { id: 'rpt-004', name: 'Malware Detection Summary — Last 30 Days', type: 'Malware Summary', dateRange: 'Jul 1 – Jul 31, 2026', generatedDate: daysAgo(3), format: 'CSV' },
  { id: 'rpt-005', name: 'Patch Compliance Status — Fleet', type: 'Patch Status', dateRange: 'Jul 1 – Jul 31, 2026', generatedDate: daysAgo(1), format: 'CSV' },
  { id: 'rpt-006', name: 'Fleet Compliance Executive Summary — June 2026', type: 'Executive Summary', dateRange: 'Jun 1 – Jun 30, 2026', generatedDate: '2026-07-01T08:00:00Z', format: 'PDF' },
]

// ─── Derived helpers ──────────────────────────────────────────────────────────
export function getFleetStats() {
  const total = devices.length
  const compliant = devices.filter(d => d.status === 'compliant').length
  const warning = devices.filter(d => d.status === 'warning').length
  const critical = devices.filter(d => d.status === 'critical').length
  const avgScore = Math.round(devices.reduce((s, d) => s + d.complianceScore, 0) / total)
  const needingAttention = warning + critical
  const pendingReboot = devices.filter(d => d.patchStatus.pendingReboot).length
  const rtpDisabled = devices.filter(d => !d.malwareStatus.realtimeProtection).length
  const rtpCoverage = Math.round(((total - rtpDisabled) / total) * 100)
  const defUpToDate = devices.filter(d => d.malwareStatus.definitionAge <= 1).length
  const defCompliance = Math.round((defUpToDate / total) * 100)
  const activeDetections = detections.filter(d => d.action !== 'quarantined' && d.action !== 'deleted').length
  const missingCriticalTotal = missingPatches.filter(p => p.severity === 'critical').reduce((s, p) => s + p.affectedDevices, 0)
  const fullyPatched = devices.filter(d => d.patchStatus.missingCritical === 0).length
  const patchCompliance = Math.round((fullyPatched / total) * 100)
  const eolDevices = devices.filter(d => d.patchStatus.osEol).length

  const byOS = {
    Windows: { total: 0, avg: 0 },
    Mac: { total: 0, avg: 0 },
    Linux: { total: 0, avg: 0 },
  }
  for (const d of devices) {
    byOS[d.os].total++
    byOS[d.os].avg += d.complianceScore
  }
  for (const k of Object.keys(byOS) as (keyof typeof byOS)[]) {
    if (byOS[k].total > 0) byOS[k].avg = Math.round(byOS[k].avg / byOS[k].total)
  }

  return { total, compliant, warning, critical, avgScore, needingAttention, pendingReboot, rtpCoverage, defCompliance, activeDetections, missingCriticalTotal, patchCompliance, eolDevices, byOS }
}
