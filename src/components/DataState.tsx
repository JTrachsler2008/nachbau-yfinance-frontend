import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { ApiError } from '../api/client'
import { serverErrorMessage } from '../api/formErrors'

/**
 * Lade-, Fehler- und Leerzustände als drei kleine Bausteine.
 *
 * Der UI/UX-Plan verlangt Skeleton-Platzhalter statt eines "Laden..."-Textes und einen sichtbaren
 * Fehlerzustand für jeden fehlgeschlagenen Request, der angezeigte Daten betrifft. Beides hier
 * einmal, damit es nicht pro Seite neu und unterschiedlich entsteht.
 */

interface LoadingPanelProps {
  /** Anzahl der Platzhalterzeilen. Sollte der erwarteten Datenmenge nahekommen. */
  rows?: number
  /** Zusatztext für Operationen, die bekannt lange dauern. */
  hint?: string
}

export function LoadingPanel({ rows = 3, hint }: LoadingPanelProps) {
  return (
    <Box aria-busy="true" aria-live="polite">
      {hint !== undefined && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {hint}
        </Typography>
      )}
      <Stack spacing={1}>
        {Array.from({ length: rows }, (_unused, index) => index).map((index) => (
          <Skeleton key={index} variant="rounded" height={index === 0 ? 40 : 32} />
        ))}
      </Stack>
      {/* Für Screenreader und für Tests, denen ein Skeleton sonst nichts sagt. */}
      <Box sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        Daten werden geladen
      </Box>
    </Box>
  )
}

interface ErrorPanelProps {
  error: unknown
  /** Wird als Wiederholen-Knopf angeboten, wenn gesetzt. */
  onRetry?: () => void
  /** Überschrift, wenn nur ein Teil der Seite betroffen ist, etwa "Klassifizierung". */
  title?: string
}

/**
 * Fehler einer Datenabfrage. Zeigt bei einem nicht erreichbaren Backend einen anderen Text als bei
 * einer fachlichen Fehlermeldung, weil der Nutzer im ersten Fall nichts richten kann und im zweiten
 * meist doch.
 *
 * Ein 5xx bekommt den neutralen Text aus `serverErrorMessage`: der Wortlaut des Backends kann dort
 * Interna tragen (SEC-5). Fachliche Meldungen bleiben unverändert stehen.
 */
export function ErrorPanel({ error, onRetry, title }: ErrorPanelProps) {
  const apiError = error instanceof ApiError ? error : null
  const message =
    apiError === null
      ? 'Unerwarteter Fehler'
      : apiError.isNetworkError
        ? 'Backend nicht erreichbar. Läuft der Server auf Port 8080?'
        : apiError.status >= 500
          ? serverErrorMessage
          : apiError.message

  return (
    <Alert
      severity="error"
      action={
        onRetry === undefined ? undefined : (
          <Button color="inherit" size="small" onClick={onRetry}>
            Erneut versuchen
          </Button>
        )
      }
    >
      {title !== undefined && <AlertTitle>{title}</AlertTitle>}
      {message}
    </Alert>
  )
}

/** Leerzustand mit Handlungsaufforderung statt einer leeren Fläche. */
export function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <Alert severity="info" variant="outlined">
      {children}
    </Alert>
  )
}
