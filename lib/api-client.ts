const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001/api/v1'

type ApiSuccess<T> = {
  success: boolean
  data: T
  message?: string
}

type ApiError = {
  message?: string
  error?: string
}

export type Admin = {
  id: string
  organization_id: string
  name: string
  email: string
  is_active: boolean
  created_at: string
  last_login?: string
}

type LoginResponse = {
  token: string
  admin: Admin
}

export type MalwareStatusApi = {
  engine_version?: string
  security_intelligence_version?: string
  security_intelligence_updated_at?: string
  definition_age?: number
  realtime_protection: boolean
  last_scan_result: string
  last_scan_at?: string
  last_scan_type?: string
  last_scan_duration_seconds?: number
  last_scan_files?: number
  tamper_protection: boolean
  quarantine_count: number
}

export type ManagedDevice = {
  id: string
  device_id: string
  hostname: string
  os: 'windows' | 'macos' | 'linux'
  os_version: string
  ip_address: string
  status: 'active' | 'inactive' | 'error'
  last_checkin?: string
  created_at: string
  malware?: MalwareStatusApi
  patch_status?: {
    missing_critical: number
    missing_total: number
    pending_reboot: boolean
    last_update_check?: string
    os_eol: boolean
    eol_date?: string
  }
}

export type PostureSummary = {
  total_devices: number
  active_devices: number
  compliant_count: number
  non_compliant: number
  error_count: number
}

export type SecurityCheck = {
  id: string
  check_id: string
  category: string
  title: string
  description?: string
  is_active: boolean
}

export type Alert = {
  id: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  status: 'active' | 'acknowledged' | 'resolved'
  alert_type: string
  created_at: string
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as ApiError
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('fleet-api-token')
      localStorage.removeItem('fleet-admin')
      window.dispatchEvent(new Event('fleet-auth-expired'))
    }
    throw new Error(error.message ?? error.error ?? 'Unable to reach the local backend')
  }

  return response.json() as Promise<T>
}

export function getSetupStatus() {
  return request<{ configured: boolean }>('/auth/setup')
}

export async function registerInitialAdmin(input: { name: string; email: string; password: string }) {
  const result = await request<ApiSuccess<Admin>>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return result.data
}

export async function login(input: { email: string; password: string }) {
  const result = await request<ApiSuccess<LoginResponse>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return result.data
}

function getStoredToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('fleet-api-token')
}

async function authenticatedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken()
  if (!token) throw new Error('Your session has expired. Please sign in again.')
  return request<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  })
}

export async function getDevices() {
  const result = await authenticatedRequest<ApiSuccess<ManagedDevice[]>>('/devices')
  return result.data
}

export async function getPostureSummary() {
  const result = await authenticatedRequest<ApiSuccess<PostureSummary>>('/security/summary')
  return result.data
}

export async function getSecurityChecks() {
  const result = await authenticatedRequest<ApiSuccess<SecurityCheck[]>>('/security/checks')
  return result.data
}

export async function getAlerts() {
  const result = await authenticatedRequest<ApiSuccess<Alert[]>>('/alerts')
  return result.data
}

export type MalwareDetection = {
  id: string
  device_id: string
  device_name: string
  threat_name: string
  file_path: string
  action: string
  hash: string
  severity: string
  timestamp: string
}

export type MalwareQuarantineItem = {
  id: string
  device_id: string
  device_name: string
  file_name: string
  original_path: string
  threat_name: string
  quarantined_at: string
}

export async function getMalwareDetections() {
  const result = await authenticatedRequest<ApiSuccess<MalwareDetection[]>>('/malware/detections')
  return result.data
}

export async function getMalwareQuarantine() {
  const result = await authenticatedRequest<ApiSuccess<MalwareQuarantineItem[]>>('/malware/quarantine')
  return result.data
}

export type ADDomainStatus = {
  domain_controllers: {
    id: string
    name: string
    site: string
    online: boolean
    replication_healthy: boolean
    last_replication?: string
  }[]
  failed_logons_24h: number
  successful_logons_24h: number
  privileged_group_changes: {
    id: string
    timestamp: string
    account: string
    group_name: string
    action: string
    source?: string
  }[]
  kerberos_anomalies: {
    type: string
    account: string
    timestamp: string
    severity: string
  }[]
  stale_accounts: number
  stale_account_records: {
    id: string
    account_name: string
    display_name?: string
    account_type: string
    organizational_unit: string
    enabled: boolean
    last_logon?: string
    password_last_set?: string
    password_never_expires: boolean
    distinguished_name: string
    source_domain_controller: string
    stale: boolean
  }[]
  kerberos_events: {
    id: string
    event_id: number
    activity: string
    account: string
    service_principal_name?: string
    client_host: string
    client_ip: string
    source_domain_controller: string
    timestamp: string
    severity: string
    detection_reason?: string
  }[]
}

export type AuthActivity = {
  id: string
  date: string
  successful: number
  failed: number
  anomaly: boolean
}

export async function getADDomainStatus() {
  const result = await authenticatedRequest<ApiSuccess<ADDomainStatus>>('/ad/status')
  return result.data
}

export async function getAuthActivity() {
  const result = await authenticatedRequest<ApiSuccess<AuthActivity[]>>('/ad/auth-activity')
  return result.data
}

export type MissingPatch = {
  id: string
  kb_id: string
  title: string
  severity: string
  affected_devices: number
  days_available: number
  cve_reference?: string
}

export type PatchStats = {
  total: number
  patch_compliance: number
  pending_reboot: number
  eol_devices: number
  critical_patches: number
  missing_critical: number
}

export async function getMissingPatches() {
  const result = await authenticatedRequest<ApiSuccess<MissingPatch[]>>('/patches/missing')
  return result.data
}

export async function getPatchStats() {
  const result = await authenticatedRequest<ApiSuccess<PatchStats>>('/patches/stats')
  return result.data
}

export type ApiKey = {
  id: string
  name: string
  key_prefix: string
  has_key: boolean
  expires_at?: string
  is_active: boolean
  last_used?: string
  created_at: string
}

export type EnrollmentToken = {
  id: string
  token: string
  description?: string
  expires_at?: string
  is_active: boolean
  created_at: string
}

export type AgentEnrollmentRequest = {
  token: string
}

export type AgentEnrollmentResponse = {
  device_id: string
  agent_token: string
}

export type AgentTelemetryRequest = {
  hostname: string
  os: string
  os_version: string
  ip_address: string
  mac_address: string
  malware: {
    engine_version: string
    security_intelligence_version: string
    security_intelligence_updated_at?: string
    definition_age: number
    realtime_protection: boolean
    last_scan_result: string
    last_scan_at?: string
    last_scan_type?: string
    last_scan_duration_seconds: number
    last_scan_files: number
    tamper_protection: boolean
    quarantine_count: number
  }
  patch_status: {
    missing_critical: number
    missing_total: number
    pending_reboot: boolean
    last_update_check?: string
    os_eol: boolean
    eol_date?: string
  }
  detections: Array<{
    threat_name: string
    file_path: string
    action: string
    hash: string
    severity: string
  }>
  quarantine: Array<{
    file_name: string
    original_path: string
    threat_name: string
  }>
}

export async function getApiKeys() {
  const result = await authenticatedRequest<ApiSuccess<ApiKey[]>>('/api-keys')
  return result.data
}

export async function createApiKey(input: { name: string; expires_in?: string }) {
  const result = await authenticatedRequest<ApiSuccess<ApiKey>>('/api-keys', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return result.data
}

export async function updateApiKey(id: string, input: { is_active?: boolean }) {
  await authenticatedRequest(`/api-keys/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function deleteApiKey(id: string) {
  await authenticatedRequest(`/api-keys/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function getEnrollmentTokens() {
  const result = await authenticatedRequest<ApiSuccess<EnrollmentToken[]>>('/enrollment-tokens')
  return result.data
}

export async function createEnrollmentToken(input: { description?: string; expires_in?: string }) {
  const result = await authenticatedRequest<ApiSuccess<EnrollmentToken>>('/enrollment-tokens', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return result.data
}

export async function deleteEnrollmentToken(id: string) {
  await authenticatedRequest(`/enrollment-tokens/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function enrollAgent(input: AgentEnrollmentRequest) {
  const result = await authenticatedRequest<ApiSuccess<AgentEnrollmentResponse>>('/agent/enroll', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return result.data
}

export async function sendTelemetry(payload: AgentTelemetryRequest, agentToken: string) {
  await request('/agent/telemetry', {
    method: 'POST',
    headers: {
      'X-Agent-Token': agentToken,
    },
    body: JSON.stringify(payload),
  })
}

