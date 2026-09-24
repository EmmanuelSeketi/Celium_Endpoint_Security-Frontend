'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Settings, Bell, Shield, Key, Save, Eye, EyeOff, UserCircle, LogOut, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-provider'
import { getApiKeys, createApiKey, deleteApiKey as deleteApiKeyApi, getEnrollmentTokens, createEnrollmentToken, deleteEnrollmentToken as deleteEnrollmentTokenApi, type ApiKey, type EnrollmentToken } from '@/lib/api-client'

type Section = 'account' | 'general' | 'notifications' | 'security' | 'api'

const SECTIONS: { id: Section; label: string; icon: typeof Settings }[] = [
  { id: 'account', label: 'Account', icon: UserCircle },
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

  function handleSave() {
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
          {section === 'account' && <AccountSection />}

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
              <div className="space-y-6">
                <div>
                  <h3 className="text-[13px] font-semibold text-foreground mb-2">API Keys</h3>
                  <p className="text-[12px] text-muted-foreground mb-3">
                    Use these keys to authenticate platform integrations and external tools.
                  </p>
                  {keyError && <p className="text-[12px] text-status-critical mb-2">{keyError}</p>}
                  <div className="space-y-2 mb-3">
                    {loadingKeys && <p className="text-[12px] text-muted-foreground">Loading API keys...</p>}
                    {!loadingKeys && apiKeys.length === 0 && (
                      <p className="text-[12px] text-muted-foreground">No API keys yet.</p>
                    )}
                    {apiKeys.map(key => (
                      <div key={key.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-foreground truncate">{key.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {key.key_prefix}•••••••• •••••
                            {key.expires_at ? ` • Expires ${new Date(key.expires_at).toLocaleDateString()}` : ' • No expiry'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteApiKey(key.id)}
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-surface-hover text-muted-foreground hover:text-status-critical transition-colors"
                          aria-label="Delete API key"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={e => setNewKeyName(e.target.value)}
                      placeholder="New API key name"
                      className="h-8 flex-1 bg-surface border border-border rounded-md px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand/60 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleCreateApiKey}
                      disabled={!newKeyName.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-md text-[12px] font-medium hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={13} strokeWidth={1.5} />
                      Create
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-[13px] font-semibold text-foreground mb-2">Enrollment Tokens</h3>
                  <p className="text-[12px] text-muted-foreground mb-3">
                    One-time tokens used by endpoints to enroll into this fleet.
                  </p>
                  {tokenError && <p className="text-[12px] text-status-critical mb-2">{tokenError}</p>}
                  <div className="space-y-2 mb-3">
                    {loadingTokens && <p className="text-[12px] text-muted-foreground">Loading enrollment tokens...</p>}
                    {!loadingTokens && enrollmentTokens.length === 0 && (
                      <p className="text-[12px] text-muted-foreground">No enrollment tokens yet.</p>
                    )}
                    {enrollmentTokens.map(token => (
                      <div key={token.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-[12px] font-mono text-foreground truncate">{token.token}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {token.description || 'No description'}
                            {token.expires_at ? ` • Expires ${new Date(token.expires_at).toLocaleDateString()}` : ' • No expiry'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteEnrollmentToken(token.id)}
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-surface-hover text-muted-foreground hover:text-status-critical transition-colors"
                          aria-label="Delete enrollment token"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTokenDescription}
                      onChange={e => setNewTokenDescription(e.target.value)}
                      placeholder="New enrollment token description"
                      className="h-8 flex-1 bg-surface border border-border rounded-md px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand/60 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleCreateEnrollmentToken}
                      disabled={!newTokenDescription.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand text-white rounded-md text-[12px] font-medium hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={13} strokeWidth={1.5} />
                      Create
                    </button>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Save button */}
          {section !== 'account' && (
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
          )}
        </div>
      </div>
    </div>
  )
}

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
        <form onSubmit={handleSignIn} className="max-w-sm space-y-3.5 py-2">
          <label className="block text-[12px] font-medium text-foreground">
            Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="mt-1.5 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
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
              className="mt-1.5 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </label>
          {error && <p className="text-[12px] text-status-critical">{error}</p>}
          <Button type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</Button>
        </form>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Account" description="Your administrator profile for this local installation.">
      <div className="flex items-center gap-3 py-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
          <UserCircle size={24} strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">{admin.name}</p>
          <p className="truncate text-[12px] text-muted-foreground">{admin.email}</p>
        </div>
      </div>

      <SettingRow label="Status" description="Current session for this browser.">
        <span className="text-[12px] font-medium text-status-good">Signed in</span>
      </SettingRow>
      <SettingRow label="Last login" description="Most recent successful sign-in.">
        <span className="text-[12px] text-muted-foreground">{admin.last_login ? new Date(admin.last_login).toLocaleString() : '—'}</span>
      </SettingRow>

      <div className="pt-3">
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-md border border-status-critical/30 bg-status-criticalBg/40 px-3 py-1.5 text-[13px] font-medium text-status-critical transition-colors hover:bg-status-criticalBg/60"
        >
          <LogOut size={14} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </SectionCard>
  )
}
