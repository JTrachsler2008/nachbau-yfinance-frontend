import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { setAuthToken, setUnauthorizedHandler } from '../api/client'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { fetchMe, requestLogin } from './authApi'

/**
 * Hält den Anmeldezustand.
 *
 * Das Token selbst liegt in `api/client.ts` im Modulspeicher und bewusst nicht in `localStorage`
 * (Architektur-Plan, SEC-1/SEC-2). Folge: ein Reload der Seite meldet ab. Hier wird nur der
 * Benutzername als React-State gehalten, damit die Oberfläche auf An- und Abmelden reagiert.
 *
 * Muss innerhalb des Routers stehen, weil der 401-Haken auf die Login-Seite umleitet.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const logout = useCallback((): void => {
    setAuthToken(null)
    setUsername(null)
    // Ohne Leeren würden Daten des abgemeldeten Users beim nächsten Login kurz sichtbar bleiben,
    // bis React Query sie als veraltet nachlädt.
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
      navigate('/login', { replace: true })
    })
    return () => {
      setUnauthorizedHandler(null)
    }
  }, [logout, navigate])

  const login = useCallback(async (name: string, password: string): Promise<void> => {
    const token = await requestLogin(name, password)
    setAuthToken(token)
    try {
      const me = await fetchMe()
      setUsername(me.username)
    } catch (error) {
      // Token verwerfen, wenn es zwar ausgestellt wurde, der Folgeaufruf aber scheitert. Sonst
      // gäbe es einen halb angemeldeten Zustand mit gültigem Token und leerer Oberfläche.
      setAuthToken(null)
      throw error
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ username, isAuthenticated: username !== null, login, logout }),
    [username, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
