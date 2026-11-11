'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Settings, Bell, Shield, Key, Save, UserCircle, LogOut, Plus, Trash2, Copy, Check } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-provider'
import { getApiKeys, createApiKey, deleteApiKey as deleteApiKeyApi, getEnrollmentTokens, createEnrollmentToken, deleteEnrollmentToken as deleteEnrollmentTokenApi, getOrganizationSettings, updateOrganizationSettings, type ApiKey, type EnrollmentToken } from '@/lib/api-client'
import { formatOrganizationDate, setOrganizationTimezone } from '@/lib/organization-time'

type Section = 'account' | 'general' | 'notifications' | 'security' | 'api'

const SECTIONS: { id: Section; label: string; icon: typeof Settings }[] = [
  { id: 'account', label: 'Account', icon: UserCircle },
  { id: 'general', label: 'General', icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security Policies', icon: Shield },
  { id: 'api', label: 'API & Tokens', icon: Key },
]

const TIMEZONES = [
  ['UTC', 'UTC'],
  ['America/Los_Angeles', 'Pacific Time'],
  ['America/Denver', 'Mountain Time'],
  ['America/Chicago', 'Central Time'],
  ['America/New_York', 'Eastern Time'],
  ['Europe/London', 'United Kingdom'],
  ['Europe/Paris', 'Central European Time'],
  ['Africa/Nairobi', 'East Africa Time'],
  ['Asia/Dubai', 'Gulf Standard Time'],
  ['Asia/Kolkata', 'India Standard Time'],
  ['Asia/Singapore', 'Singapore'],
  ['Asia/Tokyo', 'Japan Standard Time'],
  ['Australia/Sydney', 'Australian Eastern Time'],
] as const

/* ---------- Shared styles (one source of truth for controls) ---------- */

const inputBase =
  'h-9 rounded-md border border-border bg-surface px-3 text-[13px] text-foreground placeholder:text-muted-foreground transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

const primaryBtn =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-brand px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50'

const iconBtn =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-status-critical focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40'

/* ---------- Building blocks ---------- */

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for non-secure contexts (e.g. http on a LAN address)
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(el)
      return ok
    } catch {
      return false
    }
  }
}

function CopyButton({ value, label, ariaLabel }: { value: string; label?: string; ariaLabel: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (await copyToClipboard(value)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  const Icon = copied ? Check : Copy
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel}
      className={cn(
        label
          ? 'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium'
          : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        copied ? 'text-status-good' : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
      )}
    >
      <Icon size={14} strokeWidth={1.75} />
      {label && (copied ? 'Copied' : label)}
    </button>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        checked ? 'border-brand bg-brand' : 'border-border bg-surface-hover'
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0'
        )}
      />
    </button>
  )
}

function SettingRow({
  label,
  description,
  indent,
  children,
}: {
  label: string
  description?: string
  indent?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-border py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
        indent && 'pl-4'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <div className="sm:shrink-0">{children}</div>
    </div>
  )
}

function TextField({
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  max,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  min?: number
  max?: number
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      className={cn(inputBase, 'w-full sm:w-64')}
    />
  )
}

function CredentialPanel({
  title,
  description,
  error,
  loading,
  loadingText,
  emptyText,
  isEmpty,
  inputValue,
  onInputChange,
  inputPlaceholder,
  onCreate,
  children,
}: {
  title: string
  description: string
  error: string | null
  loading: boolean
  loadingText: string
  emptyText: string
  isEmpty: boolean
  inputValue: string
  onInputChange: (v: string) => void
  inputPlaceholder: string
  onCreate: () => void
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 max-w-prose text-[12px] leading-relaxed text-muted-foreground">{description}</p>
      </div>

      {error && (
        <p role="alert" className="text-[12px] text-status-critical">
          {error}
        </p>
      )}

      <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
        {loading && <p className="px-3 py-3 text-[12px] text-muted-foreground">{loadingText}</p>}
        {!loading && isEmpty && <p className="px-3 py-4 text-[12px] text-muted-foreground">{emptyText}</p>}
        {children}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          placeholder={inputPlaceholder}
          className={cn(inputBase, 'min-w-0 flex-1')}
        />
        <button type="button" onClick={onCreate} disabled={!inputValue.trim()} className={primaryBtn}>
          <Plus size={14} strokeWidth={1.75} />
          Create
        </button>
      </div>
    </section>
  )
}

function CredentialRow({
  onDelete,
  deleteLabel,
  copyValue,
  copyLabel,
  children,
}: {
  onDelete: () => void
  deleteLabel: string
  copyValue?: string
  copyLabel?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-3">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 items-center">
        {copyValue && <CopyButton value={copyValue} ariaLabel={copyLabel ?? 'Copy'} />}
        <button type="button" onClick={onDelete} className={iconBtn} aria-label={deleteLabel}>
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}

/* ---------- Page ---------- */

export function SettingsPage() {
  const [section, setSection] = useState<Section>('account')
  const [saved, setSaved] = useState(false)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [enrollmentTokens, setEnrollmentTokens] = useState<EnrollmentToken[]>([])
  const [loadingKeys, setLoadingKeys] = useState(false)
  const [loadingTokens, setLoadingTokens] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newTokenDescription, setNewTokenDescription] = useState('')
  const [keyError, setKeyError] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)

  // General
  const [orgName, setOrgName] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [scanInterval, setScanInterval] = useState('30')
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)

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

  const { admin } = useAuth()

  useEffect(() => {
    if (section !== 'api') return
    setLoadingKeys(true)
    setLoadingTokens(true)
    setKeyError(null)
    setTokenError(null)
    Promise.all([getApiKeys(), getEnrollmentTokens()])
      .then(([keys, tokens]) => {
        setApiKeys(Array.isArray(keys) ? keys : [])
        setEnrollmentTokens(Array.isArray(tokens) ? tokens : [])
      })
      .catch(error => {
        setKeyError(error instanceof Error ? error.message : 'Unable to load API keys')
        setTokenError(error instanceof Error ? error.message : 'Unable to load enrollment tokens')
      })
      .finally(() => {
        setLoadingKeys(false)
        setLoadingTokens(false)
      })
  }, [section])

  useEffect(() => {
    if (!admin) return
    let cancelled = false
    setSettingsLoaded(false)
    setSettingsLoading(true)
    setSettingsError(null)
    getOrganizationSettings()
      .then(settings => {
        if (cancelled) return
        setOrgName(settings.fleet_name)
        setTimezone(settings.timezone)
        setOrganizationTimezone(settings.timezone)
        setScanInterval(String(settings.scan_interval_minutes))
        setRtpRequired(settings.require_realtime_protection)
        setTamperRequired(settings.require_tamper_protection)
        setMaxDefinitionAge(String(settings.max_definition_age_days))
        setMaxCriticalPatches(String(settings.max_missing_critical_patches))
        setDomainRequired(settings.require_domain_join)
        setSettingsLoaded(true)
      })
      .catch(error => {
        if (!cancelled) setSettingsError(error instanceof Error ? error.message : 'Unable to load organization settings')
      })
      .finally(() => {
        if (!cancelled) setSettingsLoading(false)
      })
    return () => { cancelled = true }
  }, [admin])

  async function handleSave() {
    setSaved(false)
    if (section === 'general' || section === 'security') {
      const interval = Number(scanInterval)
      const definitionAge = Number(maxDefinitionAge)
      const criticalPatches = Number(maxCriticalPatches)
      if (section === 'general' && (!Number.isInteger(interval) || interval < 1 || interval > 1440)) {
        setSettingsError('Scan interval must be a whole number between 1 and 1440 minutes.')
        return
      }
      if (section === 'security' && (!Number.isInteger(definitionAge) || definitionAge < 0 || definitionAge > 365)) {
        setSettingsError('Maximum definition age must be a whole number between 0 and 365 days.')
        return
      }
      if (section === 'security' && (!Number.isInteger(criticalPatches) || criticalPatches < 0 || criticalPatches > 10000)) {
        setSettingsError('Maximum missing critical patches must be a whole number between 0 and 10000.')
        return
      }

      setSettingsSaving(true)
      setSettingsError(null)
      try {
        const settings = await updateOrganizationSettings(section === 'general'
          ? { timezone, scan_interval_minutes: interval }
          : {
              require_realtime_protection: rtpRequired,
              require_tamper_protection: tamperRequired,
              max_definition_age_days: definitionAge,
              max_missing_critical_patches: criticalPatches,
              require_domain_join: domainRequired,
            })
        setOrgName(settings.fleet_name)
        if (section === 'general') {
          setTimezone(settings.timezone)
          setOrganizationTimezone(settings.timezone)
          setScanInterval(String(settings.scan_interval_minutes))
        } else {
          setRtpRequired(settings.require_realtime_protection)
          setTamperRequired(settings.require_tamper_protection)
          setMaxDefinitionAge(String(settings.max_definition_age_days))
          setMaxCriticalPatches(String(settings.max_missing_critical_patches))
          setDomainRequired(settings.require_domain_join)
        }
      } catch (error) {
        setSettingsError(error instanceof Error ? error.message : 'Unable to save organization settings')
        return
      } finally {
        setSettingsSaving(false)
      }
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  async function handleCreateApiKey() {
    if (!newKeyName.trim()) return
    setKeyError(null)
    try {
      const created = await createApiKey({ name: newKeyName.trim() })
      setApiKeys(prev => [created, ...prev])
      setNewKeyName('')
    } catch (error) {
      setKeyError(error instanceof Error ? error.message : 'Unable to create API key')
    }
  }

  async function handleCreateEnrollmentToken() {
    if (!newTokenDescription.trim()) return
    setTokenError(null)
    try {
      const created = await createEnrollmentToken({ description: newTokenDescription.trim() })
      setEnrollmentTokens(prev => [created, ...prev])
      setNewTokenDescription('')
    } catch (error) {
      setTokenError(error instanceof Error ? error.message : 'Unable to create enrollment token')
    }
  }

  async function handleDeleteApiKey(id: string) {
    setKeyError(null)
    try {
      await deleteApiKeyApi(id)
      setApiKeys(prev => prev.filter(key => key.id !== id))
    } catch (error) {
      setKeyError(error instanceof Error ? error.message : 'Unable to delete API key')
    }
  }

  async function handleDeleteEnrollmentToken(id: string) {
    setTokenError(null)
    try {
      await deleteEnrollmentTokenApi(id)
      setEnrollmentTokens(prev => prev.filter(token => token.id !== id))
    } catch (error) {
      setTokenError(error instanceof Error ? error.message : 'Unable to delete enrollment token')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your Fleet Compliance platform configuration." />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        {/* Section nav: horizontal tabs on small screens, sticky sidebar on md+ */}
        <nav
          aria-label="Settings sections"
          className="flex gap-1 overflow-x-auto rounded-md border border-border bg-card p-1.5 shadow-card transition-shadow duration-200 hover:shadow-md md:sticky md:top-4 md:w-56 md:shrink-0 md:flex-col md:overflow-visible"
        >
          {SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = section === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 md:w-full',
                  active
                    ? 'bg-surface-hover font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                )}
              >
                <Icon size={15} strokeWidth={1.5} className={active ? 'text-brand' : 'text-muted-foreground'} />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-4">
          {section === 'account' && <AccountSection />}

          {section === 'general' && (
            <>
            {settingsError && <p role="alert" className="text-[12px] text-status-critical">{settingsError}</p>}
            {settingsLoading && <p className="text-[12px] text-muted-foreground">Loading organization settings...</p>}
            <SectionCard title="General Settings">
              <SettingRow label="Fleet Name" description="Set by the platform manager for this organization.">
                <input value={orgName} readOnly aria-readonly="true" className={cn(inputBase, 'w-full sm:w-64')} />
              </SettingRow>
              <SettingRow label="Timezone" description="Used to display platform timestamps and generated report times.">
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className={cn(inputBase, 'w-full sm:w-64')}
                >
                  {TIMEZONES.map(([zone, label]) => (
                    <option key={zone} value={zone}>{label} ({zone})</option>
                  ))}
                  {!TIMEZONES.some(([zone]) => zone === timezone) && <option value={timezone}>{timezone}</option>}
                </select>
              </SettingRow>
              <SettingRow label="Scan Interval (minutes)" description="How often agents run compliance scans; telemetry inventory continues every 5 minutes.">
                <TextField value={scanInterval} onChange={setScanInterval} type="number" min={1} max={1440} />
              </SettingRow>
            </SectionCard>
            </>
          )}

          {section === 'notifications' && (
            <SectionCard title="Notification Settings">
              <SettingRow label="Email Alerts" description="Send security alerts to a configured email address.">
                <Toggle checked={emailAlerts} onChange={setEmailAlerts} />
              </SettingRow>
              {emailAlerts && (
                <SettingRow indent label="Alert Email Address" description="Destination for critical and warning alerts.">
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
            <>
            {settingsError && <p role="alert" className="text-[12px] text-status-critical">{settingsError}</p>}
            {settingsLoading && <p className="text-[12px] text-muted-foreground">Loading organization settings...</p>}
            <SectionCard title="Security Policies" description="Policies are sent to enrolled agents and determine compliance results.">
              <SettingRow label="Require Real-time Protection" description="Devices with RTP disabled are marked critical.">
                <Toggle checked={rtpRequired} onChange={setRtpRequired} />
              </SettingRow>
              <SettingRow label="Require Tamper Protection" description="Devices with tamper protection off are flagged.">
                <Toggle checked={tamperRequired} onChange={setTamperRequired} />
              </SettingRow>
              <SettingRow label="Max Definition Age (days)" description="Definitions older than this are flagged as stale.">
                <TextField value={maxDefinitionAge} onChange={setMaxDefinitionAge} type="number" min={0} max={365} />
              </SettingRow>
              <SettingRow label="Max Missing Critical Patches" description="Devices exceeding this count are marked critical.">
                <TextField value={maxCriticalPatches} onChange={setMaxCriticalPatches} type="number" min={0} max={10000} />
              </SettingRow>
              <SettingRow label="Require Domain Join" description="Non-domain devices are flagged as warning.">
                <Toggle checked={domainRequired} onChange={setDomainRequired} />
              </SettingRow>
            </SectionCard>
            </>
          )}

          {section === 'api' && (
            <SectionCard title="API & Integration Tokens">
              <div className="space-y-6">
                <CredentialPanel
                  title="API Keys"
                  description="Use these keys to authenticate platform integrations and external tools."
                  error={keyError}
                  loading={loadingKeys}
                  loadingText="Loading API keys..."
                  emptyText="No API keys yet."
                  isEmpty={apiKeys.length === 0}
                  inputValue={newKeyName}
                  onInputChange={setNewKeyName}
                  inputPlaceholder="New API key name"
                  onCreate={handleCreateApiKey}
                >
                  {apiKeys.map(key => (
                    <CredentialRow key={key.id} onDelete={() => handleDeleteApiKey(key.id)} deleteLabel="Delete API key">
                      <p className="truncate text-[13px] font-medium text-foreground">{key.name}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {key.key_prefix}•••••••• •••••
                        {key.expires_at ? ` • Expires ${formatOrganizationDate(key.expires_at, { dateStyle: 'medium' })}` : ' • No expiry'}
                      </p>
                      {key.raw_key && (
                        <div className="mt-2.5 rounded-md bg-status-warning/10 p-2.5">
                          <div className="flex items-center gap-2">
                            <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-foreground">{key.raw_key}</code>
                            <CopyButton value={key.raw_key} label="Copy" ariaLabel="Copy API key" />
                          </div>
                          <p className="mt-1.5 text-[11px] text-status-warning">Copy this key now. It won't be shown again.</p>
                        </div>
                      )}
                    </CredentialRow>
                  ))}
                </CredentialPanel>

                <div className="border-t border-border pt-6">
                  <CredentialPanel
                    title="Enrollment Tokens"
                    description="One-time tokens used by the endpoint executable to enroll into this fleet. The executable prompts for this token and it cannot be reused."
                    error={tokenError}
                    loading={loadingTokens}
                    loadingText="Loading enrollment tokens..."
                    emptyText="No enrollment tokens yet."
                    isEmpty={enrollmentTokens.length === 0}
                    inputValue={newTokenDescription}
                    onInputChange={setNewTokenDescription}
                    inputPlaceholder="New enrollment token description"
                    onCreate={handleCreateEnrollmentToken}
                  >
                    {enrollmentTokens.map(token => (
                      <CredentialRow
                        key={token.id}
                        onDelete={() => handleDeleteEnrollmentToken(token.id)}
                        deleteLabel="Delete enrollment token"
                        copyValue={token.token}
                        copyLabel="Copy enrollment token"
                      >
                        <p className="truncate font-mono text-[12px] text-foreground">{token.token}</p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          {token.description || 'No description'}
                          {token.expires_at ? ` • Expires ${formatOrganizationDate(token.expires_at, { dateStyle: 'medium' })}` : ' • No expiry'}
                        </p>
                      </CredentialRow>
                    ))}
                  </CredentialPanel>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Save button */}
          {section !== 'account' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={(section === 'general' || section === 'security') && (!admin || !settingsLoaded || settingsLoading || settingsSaving)}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-md px-4 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                  saved
                    ? 'border border-status-good/30 bg-status-good/10 text-status-good'
                    : 'bg-brand text-white hover:bg-brand/90'
                )}
              >
                <Save size={14} strokeWidth={2} />
                {settingsSaving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Account ---------- */

function AccountSection() {
  const { admin, logout, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!admin) {
    async function handleSignIn(event: FormEvent<HTMLFormElement>) {
      event.preventDefault()
      setError(null)
      setSubmitting(true)
      try {
        await login({ email, password })
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to sign in')
      } finally {
        setSubmitting(false)
      }
    }

    return (
      <SectionCard title="Account" description="Sign in with your administrator account.">
        <form onSubmit={handleSignIn} className="max-w-sm space-y-4 py-2">
          <label className="block text-[12px] font-medium text-foreground">
            Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={cn(inputBase, 'mt-1.5 w-full')}
            />
          </label>
          <label className="block text-[12px] font-medium text-foreground">
            Password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className={cn(inputBase, 'mt-1.5 w-full')}
            />
          </label>
          {error && <p role="alert" className="text-[12px] text-status-critical">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">{submitting ? 'Signing in...' : 'Sign in'}</Button>
        </form>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Account" description="Your administrator profile for this local installation.">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
          <UserCircle size={24} strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-foreground">{admin.name}</p>
          <p className="truncate text-[12px] text-muted-foreground">{admin.email}</p>
        </div>
      </div>

      <SettingRow label="Status" description="Current session for this browser.">
        <span className="text-[12px] font-medium text-status-good">Signed in</span>
      </SettingRow>
      <SettingRow label="Last login" description="Most recent successful sign-in.">
        <span className="text-[12px] text-muted-foreground">{admin.last_login ? formatOrganizationDate(admin.last_login) : '—'}</span>
      </SettingRow>
      <SettingRow label="Sign out" description="End your session on this browser.">
        <button
          type="button"
          onClick={logout}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-[13px] font-medium text-status-critical transition-colors hover:bg-status-criticalBg/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-critical/30"
        >
          <LogOut size={14} strokeWidth={2} />
          Sign out
        </button>
      </SettingRow>
    </SectionCard>
  )
}