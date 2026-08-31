import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
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
  const { isAuthenticated, isBootstrapping } = useAuth()
  const location = useLocation()

  // Beim Reload steht erst nach dem Start-Refresh fest, ob eine Sitzung besteht. Bis dahin warten
  // statt umleiten: sonst landet jeder Reload einer geschützten Seite auf dem Login-Formular, das
  // einen Augenblick später wieder verschwindet - und der angeforderte Pfad wäre verloren.
  if (isBootstrapping) {
    return (
      <Box sx={{ p: 3 }} aria-busy="true" aria-label="Sitzung wird geprüft">
        <Skeleton variant="text" width={240} height={40} />
        <Skeleton variant="rectangular" height={160} sx={{ mt: 2 }} />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}
