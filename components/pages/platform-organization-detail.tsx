'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Bell, Laptop, ShieldCheck, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { KpiCard } from '@/components/ui/kpi-card'
import { SectionCard } from '@/components/ui/section-card'
import { useDataMode } from '@/lib/data-mode-provider'
import { createOrganizationAdmin, getPlatformOrg, type Admin, type PlatformOrganization } from '@/lib/api-client'
import { platformOrganizations } from '@/lib/platform-mock'

export function PlatformOrganizationDetailPage({ id }: { id: string }) {
  const { mode } = useDataMode(); const [org, setOrg] = useState<PlatformOrganization | null>(platformOrganizations.find(item => item.id === id) ?? null); const [tab, setTab] = useState('Overview'); const [adminName, setAdminName] = useState(''); const [adminEmail, setAdminEmail] = useState(''); const [adminPassword, setAdminPassword] = useState(''); const [adminPhone, setAdminPhone] = useState(''); const [createdAdmin, setCreatedAdmin] = useState<Admin | null>(null); const [adminError, setAdminError] = useState<string | null>(null)
  useEffect(() => { if (mode !== 'demo') getPlatformOrg(id).then(setOrg).catch(() => setOrg(null)) }, [id, mode])
  async function handleCreateAdmin(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setAdminError(null); try { const created = mode === 'demo' ? { id: `admin-${Date.now()}`, organization_id: id, name: adminName, email: adminEmail, phone: adminPhone, is_active: true, created_at: new Date().toISOString() } : await createOrganizationAdmin(id, { name: adminName, email: adminEmail, password: adminPassword, phone: adminPhone }); setCreatedAdmin(created); setAdminName(''); setAdminEmail(''); setAdminPassword(''); setAdminPhone('') } catch (requestError) { setAdminError(requestError instanceof Error ? requestError.message : 'Unable to create administrator') } }
  if (!org) return <SectionCard title="Organization not found"><Link href="/platform/organizations" className="text-brand text-[13px]">Return to organizations</Link></SectionCard>
  return <div className="space-y-4">
    <Link href="/platform/organizations" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"><ArrowLeft size={14} />Organizations</Link>
    <PageHeader title={org.name} description={org.description ?? 'Tenant organization'} />
    <div className="flex gap-1 border-b border-border">{['Overview', 'Devices', 'Admins', 'Alerts'].map(item => <button key={item} type="button" onClick={() => setTab(item)} className={`px-3 py-2 text-[12px] ${tab === item ? 'border-b-2 border-brand text-brand' : 'text-muted-foreground'}`}>{item}</button>)}</div>
    {tab === 'Overview' && <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><KpiCard label="Devices" value={org.device_count} accentColor="#008080" /><KpiCard label="Admins" value={org.admin_count} accentColor="#5B7FFF" /><KpiCard label="Open alerts" value={org.alert_count} accentColor="#F79009" /><KpiCard label="Status" value={org.is_active ? 'Active' : 'Suspended'} accentColor={org.is_active ? '#12B76A' : '#98A2B3'} /></div>
      <SectionCard title="Tenant posture"><div className="grid gap-3 sm:grid-cols-3"><div className="flex items-center gap-2 text-[13px]"><Laptop size={16} className="text-brand" />{org.device_count} managed endpoints</div><div className="flex items-center gap-2 text-[13px]"><Users size={16} className="text-brand" />{org.admin_count} administrators</div><div className="flex items-center gap-2 text-[13px]"><Bell size={16} className="text-status-warning" />{org.alert_count} open alerts</div></div></SectionCard>
    </>}
    {tab === 'Admins' && <SectionCard title="Create organization administrator" description="The administrator can sign in with these credentials and create endpoint enrollment tokens.">
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleCreateAdmin}><input required value={adminName} onChange={event => setAdminName(event.target.value)} placeholder="Full name" className="h-9 rounded-md border border-border bg-background px-3 text-[13px]" /><input required type="email" value={adminEmail} onChange={event => setAdminEmail(event.target.value)} placeholder="Email address" className="h-9 rounded-md border border-border bg-background px-3 text-[13px]" /><input required minLength={8} type="password" value={adminPassword} onChange={event => setAdminPassword(event.target.value)} placeholder="Temporary password" className="h-9 rounded-md border border-border bg-background px-3 text-[13px]" /><input required type="tel" value={adminPhone} onChange={event => setAdminPhone(event.target.value)} placeholder="Phone number" className="h-9 rounded-md border border-border bg-background px-3 text-[13px]" /><button type="submit" className="h-9 rounded-md bg-brand px-3 text-[12px] font-medium text-white sm:col-span-2 sm:w-fit">Create administrator</button></form>
      {adminError && <p className="mt-2 text-[12px] text-status-critical">{adminError}</p>}
      {createdAdmin && <p className="mt-3 text-[12px] text-status-compliant">Administrator created for {createdAdmin.email}. Share the temporary password securely.</p>}
    </SectionCard>}
    {(tab === 'Devices' || tab === 'Alerts') && <SectionCard title={tab}><div className="flex items-center gap-2 text-[13px] text-muted-foreground"><ShieldCheck size={16} className="text-brand" />{tab} data is available through the tenant workspace.</div></SectionCard>}
  </div>
}
