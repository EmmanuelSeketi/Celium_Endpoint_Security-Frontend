'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Admin, getSetupStatus, login as loginRequest, registerInitialAdmin } from '@/lib/api-client'

type AuthState = 'loading' | 'setup' | 'signed-out' | 'signed-in' | 'unavailable'

type AuthContextValue = {
  state: AuthState
  admin: Admin | null
  error: string | null
  register: (input: { name: string; email: string; password: string }) => Promise<void>
  login: (input: { email: string; password: string }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const TOKEN_KEY = 'fleet-api-token'
const ADMIN_KEY = 'fleet-admin'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>('loading')
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedAdmin = localStorage.getItem(ADMIN_KEY)
    if (storedToken && storedAdmin) {
      setAdmin(JSON.parse(storedAdmin) as Admin)
      setState('signed-in')
      return
    }

    getSetupStatus()
      .then(({ configured }) => setState(configured ? 'signed-out' : 'setup'))
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : 'Unable to reach the local backend')
        setState('unavailable')
      })
  }, [])

  async function register(input: { name: string; email: string; password: string }) {
    setError(null)
    const createdAdmin = await registerInitialAdmin(input)
    setAdmin(createdAdmin)
    setState('signed-out')
  }

  async function login(input: { email: string; password: string }) {
    setError(null)
    const result = await loginRequest(input)
    localStorage.setItem(TOKEN_KEY, result.token)
    localStorage.setItem(ADMIN_KEY, JSON.stringify(result.admin))
    setAdmin(result.admin)
    setState('signed-in')
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ADMIN_KEY)
    setAdmin(null)
    setState('signed-out')
  }

  return (
    <AuthContext.Provider value={{ state, admin, error, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
