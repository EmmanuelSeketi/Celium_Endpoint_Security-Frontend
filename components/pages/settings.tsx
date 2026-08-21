'use client'

import { useState } from 'react'
import { Settings, Bell, Shield, Key, Users, Globe, Save, Eye, EyeOff } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import { cn } from '@/lib/utils'

type Section = 'general' | 'notifications' | 'security' | 'api'

const SECTIONS: { id: Section; label: string; icon: typeof Settings }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security Policies', icon: Shield },
  { id: 'api', label: 'API & Tokens', icon: Key },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'w-9 h-5 rounded-full transition-colors relative shrink-0',
        checked ? 'bg-brand' : 'bg-surface-hover border border-border'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm',
          checked ? 'left-[18px]' : 'left-0.5'
        )}
      />
    </button>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        {description && <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function TextField({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-8 bg-surface border border-border rounded-md px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand/60 transition-colors w-64"
    />
  )
}

export function SettingsPage() {
  const [section, setSection] = useState<Section>('general')
  const [saved, setSaved] = useState(false)

  // General
  const [orgName, setOrgName] = useState('Acme Corp')
  const [timezone, setTimezone] = useState('UTC-5 (Eastern Time)')
  const [scanInterval, setScanInterval] = useState('60')

  // Notifications
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [slackAlerts, setSlackAlerts] = useState(false)
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  const [alertEmail, setAlertEmail] = useState('security@acme.com')

  // Security
  const [rtpRequired, setRtpRequired] = useState(true)
  const [tamperRequired, setTamperRequired] = useState(true)
  const [maxDefinitionAge, setMaxDefinitionAge] = useState('3')
  const [maxCriticalPatches, setMaxCriticalPatches] = useState('0')
  const [domainRequired, setDomainRequired] = useState(false)

  // API
  const [showToken, setShowToken] = useState(false)
  const apiToken = 'sk_live_ac_7f3e2b1d4a9c8e5f2b3d1a4c'

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Manage your Fleet Compliance platform configuration." />

      <div className="flex gap-4">
        {/* Sidebar nav */}
        <div className="w-48 shrink-0">
          <nav className="bg-card border border-border rounded-md shadow-sm p-1.5 space-y-0.5">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors text-left relative',
                  section === id
                    ? 'bg-surface-hover text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                )}
              >
                {section === id && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-brand" />
                )}
                <Icon size={15} strokeWidth={1.5} className={cn(section === id ? 'text-brand' : 'text-muted-foreground')} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {section === 'general' && (
            <SectionCard title="General Settings">
              <SettingRow label="Fleet Name" description="Display name for this fleet.">
                <TextField value={orgName} onChange={setOrgName} />
              </SettingRow>
              <SettingRow label="Timezone" description="Used for report timestamps and scheduling.">
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="h-8 bg-surface border border-border rounded-md px-3 text-[13px] text-foreground focus:outline-none focus:border-brand/60 transition-colors w-64"
                >
                  {['UTC-8 (Pacific Time)', 'UTC-7 (Mountain Time)', 'UTC-6 (Central Time)', 'UTC-5 (Eastern Time)', 'UTC+0 (UTC)', 'UTC+1 (CET)'].map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </SettingRow>
              <SettingRow label="Scan Interval (minutes)" description="How frequently agents report device status.">
                <TextField value={scanInterval} onChange={setScanInterval} type="number" />
              </SettingRow>
            </SectionCard>
          )}

          {section === 'notifications' && (
            <SectionCard title="Notification Settings">
              <SettingRow label="Email Alerts" description="Send security alerts to a configured email address.">
                <Toggle checked={emailAlerts} onChange={setEmailAlerts} />
              </SettingRow>
              {emailAlerts && (
                <SettingRow label="Alert Email Address" description="Destination for critical and warning alerts.">
                  <TextField value={alertEmail} onChange={setAlertEmail} placeholder="security@company.com" type="email" />
                </SettingRow>
              )}
              <SettingRow label="Slack Notifications" description="Post alerts to a Slack channel via webhook.">
                <Toggle checked={slackAlerts} onChange={setSlackAlerts} />
              </SettingRow>
              <SettingRow label="Critical Alerts Only" description="Suppress warning-severity notifications.">
                <Toggle checked={criticalOnly} onChange={setCriticalOnly} />
              </SettingRow>
              <SettingRow label="Weekly Digest" description="Receive a weekly compliance summary email every Monday.">
                <Toggle checked={weeklyDigest} onChange={setWeeklyDigest} />
              </SettingRow>
            </SectionCard>
          )}

          {section === 'security' && (
            <SectionCard title="Security Policies" description="Define thresholds that determine compliance pass/fail status.">
              <SettingRow label="Require Real-time Protection" description="Devices with RTP disabled are marked critical.">
                <Toggle checked={rtpRequired} onChange={setRtpRequired} />
              </SettingRow>
              <SettingRow label="Require Tamper Protection" description="Devices with tamper protection off are flagged.">
                <Toggle checked={tamperRequired} onChange={setTamperRequired} />
              </SettingRow>
              <SettingRow label="Max Definition Age (days)" description="Definitions older than this are flagged as stale.">
                <TextField value={maxDefinitionAge} onChange={setMaxDefinitionAge} type="number" />
              </SettingRow>
              <SettingRow label="Max Missing Critical Patches" description="Devices exceeding this count are marked critical.">
                <TextField value={maxCriticalPatches} onChange={setMaxCriticalPatches} type="number" />
              </SettingRow>
              <SettingRow label="Require Domain Join" description="Non-domain devices are flagged as warning.">
                <Toggle checked={domainRequired} onChange={setDomainRequired} />
              </SettingRow>
            </SectionCard>
          )}

          {section === 'api' && (
            <SectionCard title="API & Integration Tokens">
              <SettingRow label="Platform API Token" description="Use this token to authenticate agent check-ins and the REST API.">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-[12px] bg-surface border border-border rounded px-2 py-1.5 text-muted-foreground w-52 overflow-hidden">
                    {showToken ? apiToken : '•'.repeat(32)}
                  </code>
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? <EyeOff size={13} strokeWidth={1.5} /> : <Eye size={13} strokeWidth={1.5} />}
                  </button>
                </div>
              </SettingRow>
              <div className="pt-2">
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  API tokens grant full access to your fleet&apos;s compliance data. Treat them like passwords — rotate regularly and never commit to source control.
                </p>
                <button className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:border-brand/50 transition-colors">
                  <Key size={13} strokeWidth={1.5} />
                  Rotate Token
                </button>
              </div>
            </SectionCard>
          )}

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium transition-all',
                saved
                  ? 'bg-[#008080]/20 text-[#008080] border border-[#008080]/30'
                  : 'bg-brand text-white hover:bg-brand/90'
              )}
            >
              <Save size={14} strokeWidth={2} />
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
