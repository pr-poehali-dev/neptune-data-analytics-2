import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { api, setSessionId, clearSessionId } from '@/lib/api'

export type User = { id: number; email: string; name: string; role: string }

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (email: string, password: string, name: string) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.auth.me()
      .then(data => setUser(data.error ? null : data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const data = await api.auth.login({ email, password })
    if (data.error) throw new Error(data.error)
    if (data.session_id) setSessionId(data.session_id)
    const { session_id: _, ...user } = data
    setUser(user)
    return user
  }, [])

  const register = useCallback(async (email: string, password: string, name: string): Promise<User> => {
    const data = await api.auth.register({ email, password, name })
    if (data.error) throw new Error(data.error)
    if (data.session_id) setSessionId(data.session_id)
    const { session_id: _, ...user } = data
    setUser(user)
    return user
  }, [])

  const logout = useCallback(async () => {
    await api.auth.logout()
    clearSessionId()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
