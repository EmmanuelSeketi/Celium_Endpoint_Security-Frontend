import type { PlatformAdmin, PlatformOrganization, PlatformStats } from '@/lib/api-client'

export const platformStats: PlatformStats = {
  total_orgs: 12,
  active_orgs: 10,
  inactive_orgs: 2,
  total_devices: 1842,
  active_devices: 1768,
  total_alerts: 27,
  health_summary: { compliant_devices: 1594, non_compliant_devices: 248 },
}

export const platformOrganizations: PlatformOrganization[] = [
  { id: 'org-acme', name: 'Acme Industries', description: 'North America production fleet', is_active: true, created_at: '2026-01-18T10:00:00Z', device_count: 642, admin_count: 4, alert_count: 8 },
  { id: 'org-northstar', name: 'Northstar Health', description: 'Clinical operations', is_active: true, created_at: '2026-02-04T10:00:00Z', device_count: 381, admin_count: 3, alert_count: 4 },
  { id: 'org-vertex', name: 'Vertex Legal', description: 'Managed legal practice', is_active: false, created_at: '2025-12-12T10:00:00Z', device_count: 214, admin_count: 2, alert_count: 0 },
  { id: 'org-cedar', name: 'Cedar Logistics', description: 'Distributed warehouse fleet', is_active: true, created_at: '2026-03-08T10:00:00Z', device_count: 605, admin_count: 5, alert_count: 15 },
]

export const platformAdmins: PlatformAdmin[] = [
  { id: 'adm-1', organization_id: 'org-acme', organization_name: 'Acme Industries', name: 'Jordan Blake', email: 'jordan.blake@example.com', is_active: true, is_platform_admin: false, created_at: '2026-01-18T10:00:00Z' },
  { id: 'adm-2', organization_id: 'org-northstar', organization_name: 'Northstar Health', name: 'Mina Patel', email: 'mina.patel@example.com', is_active: true, is_platform_admin: false, created_at: '2026-02-04T10:00:00Z' },
  { id: 'adm-3', organization_id: 'org-vertex', organization_name: 'Vertex Legal', name: 'Elliot Ross', email: 'elliot.ross@example.com', is_active: false, is_platform_admin: false, created_at: '2025-12-12T10:00:00Z' },
]
