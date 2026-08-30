import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { LoginModal } from '#/components/auth/LoginModal'
import type { PublicUser } from '#/server/auth'
import { getSessionFn, loginFn, logoutFn } from '#/server/auth-fns'

type AuthContextValue = {
  user: PublicUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    const { user: nextUser } = await getSessionFn()
    setUser(nextUser)
  }, [])

  useEffect(() => {
    let cancelled = false

    refreshSession()
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshSession])

  const login = useCallback(async (username: string, password: string) => {
    const { user: nextUser } = await loginFn({ data: { username, password } })
    setUser(nextUser)
  }, [])

  const logout = useCallback(async () => {
    await logoutFn()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      logout,
      refreshSession,
    }),
    [user, isLoading, login, logout, refreshSession],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {!isLoading && !user ? <LoginModal onLogin={login} /> : null}
    </AuthContext.Provider>
  )
}
