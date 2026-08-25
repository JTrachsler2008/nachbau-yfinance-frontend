import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

/**
 * Route-Guard für alle geschützten Screens (UI/UX-Plan: die Login-Seite ist der einzige
 * ungeschützte Screen).
 *
 * Als Layout-Route eingesetzt, damit der Schutz einmal für den ganzen Teilbaum gilt und nicht in
 * jeder Seite wiederholt werden muss. Das ursprünglich angeforderte Ziel wird mitgegeben, damit
 * nach dem Anmelden dorthin und nicht immer auf das Dashboard gesprungen wird.
 */
export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}
