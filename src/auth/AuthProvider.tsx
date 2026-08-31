import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { refreshSession, setAuthToken, setUnauthorizedHandler } from '../api/client'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { fetchMe, requestLogin, requestLogout, type UserRole } from './authApi'

/**
 * Hält den Anmeldezustand.
 *
 * Das Zugriffs-Token liegt in `api/client.ts` im Modulspeicher und bewusst nicht in `localStorage`
 * (Architektur-Plan, SEC-1/SEC-2). Einen Reload übersteht die Anmeldung trotzdem: der Refresh-Token
 * steht in einem httpOnly-Cookie, und beim Start tauscht `refreshSession` ihn gegen ein frisches
 * Zugriffs-Token. Hier werden nur Benutzername und Rolle als React-State gehalten, damit die
 * Oberfläche auf An- und Abmelden reagiert und rollenabhängige Bereiche ein- oder ausblenden kann.
 *
 * Muss innerhalb des Routers stehen, weil der 401-Haken auf die Login-Seite umleitet.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  /**
   * Solange der Start-Refresh läuft, ist noch nicht entschieden, ob eine Sitzung besteht. Ohne diesen
   * Zwischenzustand würde `RequireAuth` im ersten Rendern auf die Login-Seite umleiten und den
   * angeforderten Pfad verlieren, obwohl das Cookie gültig ist.
   */
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const clearSession = useCallback((): void => {
    setAuthToken(null)
    setUsername(null)
    setRole(null)
    // Ohne Leeren würden Daten des abgemeldeten Users beim nächsten Login kurz sichtbar bleiben,
    // bis React Query sie als veraltet nachlädt.
    queryClient.clear()
  }, [queryClient])

  const logout = useCallback((): void => {
    clearSession()
    // Ohne await: der lokale Zustand ist schon leer, die Oberfläche muss nicht auf das Netz warten.
    // Scheitert der Aufruf, bleibt das Cookie liegen - dagegen ist von hier aus nichts zu machen, und
    // ein Fehlerdialog beim Abmelden würde nur verwirren. Der Token läuft ohnehin ab.
    void requestLogout().catch(() => undefined)
  }, [clearSession])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession()
      navigate('/login', { replace: true })
    })
    return () => {
      setUnauthorizedHandler(null)
    }
  }, [clearSession, navigate])

  const loadMe = useCallback(async (): Promise<void> => {
    const me = await fetchMe()
    setUsername(me.username)
    setRole(me.role)
  }, [])

  /**
   * Setzt beim Seitenstart eine bestehende Sitzung fort.
   *
   * Läuft genau einmal. Schlägt der Refresh fehl, ist das kein Fehlerfall, sondern der Normalfall
   * eines Besuchers ohne Anmeldung - deshalb keine Meldung, nur der abgemeldete Zustand.
   */
  useEffect(() => {
    let verworfen = false

    const fortsetzen = async (): Promise<void> => {
      try {
        await refreshSession()
        await loadMe()
      } catch {
        setAuthToken(null)
      } finally {
        if (!verworfen) {
          setIsBootstrapping(false)
        }
      }
    }

    void fortsetzen()
    return () => {
      verworfen = true
    }
  }, [loadMe])

  const login = useCallback(
    async (name: string, password: string): Promise<void> => {
      const token = await requestLogin(name, password)
      setAuthToken(token)
      try {
        await loadMe()
      } catch (error) {
        // Token verwerfen, wenn es zwar ausgestellt wurde, der Folgeaufruf aber scheitert. Sonst
        // gäbe es einen halb angemeldeten Zustand mit gültigem Token und leerer Oberfläche.
        setAuthToken(null)
        throw error
      }
    },
    [loadMe],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      username,
      role,
      isAuthenticated: username !== null,
      isBootstrapping,
      login,
      logout,
    }),
    [username, role, isBootstrapping, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
