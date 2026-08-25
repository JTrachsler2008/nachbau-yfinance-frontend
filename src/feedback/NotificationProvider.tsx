import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError, setGlobalErrorHandler } from '../api/client'
import {
  NotificationContext,
  type NotificationContextValue,
  type NotificationSeverity,
} from './NotificationContext'

interface Notification {
  message: string
  severity: NotificationSeverity
  /** Zählt hoch, damit zwei gleiche Meldungen hintereinander die Snackbar neu öffnen. */
  key: number
}

/**
 * Zentrale Umsetzung der Fehlerbehandlungsstrategie für alles, was nicht an ein Formularfeld gehört
 * (YOUNGOITV-457).
 *
 * Der Plan verlangt drei Ebenen: feldbezogen inline, sonst ein Banner am Formular, für 500er einen
 * globalen Toast. Die ersten beiden liegen bei den Formularen und bei `describeApiError`, die dritte
 * hier. Dazu kommt der 403, der laut Plan mit einem Hinweis zur Portfolio-Übersicht zurückführt statt
 * einen technischen Fehlerdialog zu zeigen.
 *
 * Muss innerhalb des Routers stehen, weil der 403-Fall umleitet.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const notify = useCallback(
    (message: string, severity: NotificationSeverity = 'info'): void => {
      setNotification((previous) => ({ message, severity, key: (previous?.key ?? 0) + 1 }))
    },
    [],
  )

  useEffect(() => {
    setGlobalErrorHandler((error: ApiError) => {
      if (error.status === 403) {
        notify('Kein Zugriff auf dieses Portfolio. Es gehört einem anderen Benutzer.', 'warning')
        // Nur weg von der Seite, die den 403 ausgelöst hat. Vom Dashboard aus wäre es eine Umleitung
        // auf sich selbst, die die Meldung nur wegblinken liesse.
        if (location.pathname !== '/') {
          navigate('/', { replace: true })
        }
        return
      }
      // Bewusst ohne die Meldung des Backends: bei einem 500er kann darin ein Klassenname oder ein
      // Auszug eines Stacktrace stehen, und der gehört nicht in die Oberfläche (Architektur-Plan,
      // SEC-5). Eine Korrelations-ID, die der UI/UX-Plan klein dazu wünscht, liefert die
      // Fehlerstruktur des Backends nicht, deshalb bleibt es beim neutralen Text.
      notify('Etwas ist schiefgelaufen. Bitte später erneut versuchen.', 'error')
    })
    return () => {
      setGlobalErrorHandler(null)
    }
  }, [notify, navigate, location.pathname])

  const value = useMemo<NotificationContextValue>(() => ({ notify }), [notify])

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Snackbar
        key={notification?.key}
        open={notification !== null}
        autoHideDuration={8000}
        onClose={() => setNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notification === null ? undefined : (
          <Alert
            severity={notification.severity}
            variant="filled"
            onClose={() => setNotification(null)}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        )}
      </Snackbar>
    </NotificationContext.Provider>
  )
}
