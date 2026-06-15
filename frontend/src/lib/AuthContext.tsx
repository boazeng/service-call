import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, setToken } from './api'
import type { User } from './types'

type AuthState = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  devLogin: (email: string) => Promise<void>
  logout: () => void
}

const AuthCtx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadMe() {
    try {
      setUser(await api<User>('/api/auth/me'))
    } catch {
      setUser(null)
      setToken(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMe()
  }, [])

  async function login(email: string, password: string) {
    const res = await api<{ access_token: string }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setToken(res.access_token)
    await loadMe()
  }

  async function devLogin(email: string) {
    const res = await api<{ access_token: string }>('/api/auth/dev-login', {
      method: 'POST',
      body: { email },
    })
    setToken(res.access_token)
    await loadMe()
  }

  function logout() {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, devLogin, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
