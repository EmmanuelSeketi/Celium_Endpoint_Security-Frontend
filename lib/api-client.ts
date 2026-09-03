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
}

export type ComplianceSummary = {
  total_devices: number
  active_devices: number
  compliant_count: number
  non_compliant: number
  error_count: number
}

export type ComplianceCheck = {
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

export async function getComplianceSummary() {
  const result = await authenticatedRequest<ApiSuccess<ComplianceSummary>>('/compliance/summary')
  return result.data
}

export async function getComplianceChecks() {
  const result = await authenticatedRequest<ApiSuccess<ComplianceCheck[]>>('/compliance/checks')
  return result.data
}

export async function getAlerts() {
  const result = await authenticatedRequest<ApiSuccess<Alert[]>>('/alerts')
  return result.data
}
