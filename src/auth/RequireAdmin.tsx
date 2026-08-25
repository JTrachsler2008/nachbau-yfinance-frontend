import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

/**
 * Route-Guard für den Verwaltungsbereich (YOUNGOITV-460).
 *
 * Verhindert, dass ein Privatanleger die Seite über die eingegebene Adresse öffnet und dort auf
 * Formulare trifft, die jeder Server-Aufruf mit 403 beantwortet. Der Schutz ist ausdrücklich nur
 * Bequemlichkeit: verbindlich prüft das Backend bei jedem Aufruf (`AdminCheckService.requireAdmin`).
 *
 * Umgeleitet wird auf das Dashboard und nicht auf eine "kein Zugriff"-Seite, weil es ohne die Rolle
 * nichts zu holen gibt und ein eigener Screen für diesen Fall nur Wege verlängert. Solange die Rolle
 * noch nicht geladen ist, gibt es diesen Zustand hier nicht: der `AuthProvider` setzt Name und Rolle
 * gemeinsam, und ohne Namen greift bereits `RequireAuth`.
 */
export function RequireAdmin() {
  const { role } = useAuth()

  if (role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
