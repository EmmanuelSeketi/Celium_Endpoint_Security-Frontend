'use client'

import { FormEvent, useState } from 'react'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { useTheme } from '@/lib/theme-provider'
import { Button } from '@/components/ui/button'

type AuthGateProps = { children: React.ReactNode }

export function AuthGate({ children }: AuthGateProps) {
  const { state, error } = useAuth()

  if (state === 'signed-in') return <>{children}</>

  if (state === 'loading') {
    return (
      <AuthShell>
        <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-muted-foreground">
          <Loader2 size={15} className="animate-spin" />
          Connecting to local service...
        </div>
      </AuthShell>
    )
  }

  if (state === 'unavailable') {
    return (
      <AuthShell>
        <div className="flex items-start gap-3 rounded-md border border-status-critical/30 bg-status-criticalBg/40 px-3.5 py-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-status-critical" />
          <div>
            <p className="text-[13px] font-semibold text-foreground">Local service unavailable</p>
            <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{error ?? 'Start the Fleet Compliance backend and refresh this page.'}</p>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <AuthForm mode={state === 'setup' ? 'setup' : 'login'} />
    </AuthShell>
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center text-center">
          <img
            src={theme === 'dark' ? '/Risq Dark.png' : '/Risq Light.png'}
            alt="Risq"
            className="h-10 w-auto object-contain"
          />
        </div>
        <div className="mt-6 rounded-md border border-border bg-card p-6 shadow-card">
          {children}
        </div>
        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          Endpoint Security &amp; Fleet Compliance · Local instance
        </p>
      </div>
    </main>
  )
}

function AuthForm({ mode }: { mode: 'setup' | 'login' }) {
  const { register, login } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'setup') await register({ name, email, password })
      else await login({ email, password })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to continue')
    } finally {
      setSubmitting(false)
    }
  }

  const isSetup = mode === 'setup'
  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-[17px] font-semibold text-foreground">{isSetup ? 'Set up your workspace' : 'Sign in'}</h1>
      <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
        {isSetup ? 'Create the administrator account for this local installation.' : 'Sign in with the administrator account for this local installation.'}
      </p>

      <div className="mt-5 space-y-3.5">
        {isSetup && <Field label="Full name" value={name} onChange={setName} autoComplete="name" />}
        <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
        <div>
          <label className="text-[12px] font-medium text-foreground">Password</label>
          <div className="relative mt-1.5">
            <input
              className="h-9 w-full rounded-md border border-border bg-background px-3 pr-9 text-[13px] text-foreground outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              value={password}
              onChange={event => setPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSetup ? 'new-password' : 'current-password'}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-status-critical/30 bg-status-criticalBg/40 px-3 py-2 text-[12px] text-status-critical">
          {error}
        </p>
      )}
      {isSetup && !error && (
        <p className="mt-4 text-[11.5px] text-muted-foreground">You'll sign in with these credentials right after setup.</p>
      )}

      <Button type="submit" className="mt-5 w-full" disabled={submitting}>
        {submitting ? (
          <span className="inline-flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Please wait...</span>
        ) : isSetup ? 'Create administrator' : 'Sign in'}
      </Button>
    </form>
  )
}

function Field({ label, value, onChange, type = 'text', autoComplete }: { label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete: string }) {
  return (
    <label className="block text-[12px] font-medium text-foreground">
      {label}
      <input
        className="mt-1.5 h-9 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        value={value}
        onChange={event => onChange(event.target.value)}
        type={type}
        autoComplete={autoComplete}
        required
      />
    </label>
  )
}
