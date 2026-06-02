import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

export type User = { id: number; email: string; name: string; role: string }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.auth.me()
      .then(data => setUser(data.error ? null : data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.auth.login({ email, password })
    if (data.error) throw new Error(data.error)
    setUser(data)
    return data
  }, [])

  const register = useCallback(async (email: string, password: string, name: string) => {
    const data = await api.auth.register({ email, password, name })
    if (data.error) throw new Error(data.error)
    setUser(data)
    return data
  }, [])

  const logout = useCallback(async () => {
    await api.auth.logout()
    setUser(null)
  }, [])

  return { user, loading, login, register, logout }
}
