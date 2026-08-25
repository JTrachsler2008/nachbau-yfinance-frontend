import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { ApiError } from '../api/client'
import { missingValue } from '../format/numbers'
import { tabularNums } from '../theme/theme'
import type { KpiTone } from './kpiTone'

interface KpiCardProps {
  label: string
  /** Fertig formatierter Wert. Die Karte formatiert nicht selbst, sie kennt die Einheit nicht. */
  value: ReactNode
  /** Einordnung unter der Zahl, etwa die Herkunft oder eine Einschränkung. */
  hint?: ReactNode
  tone?: KpiTone
  isPending?: boolean
  error?: unknown
  onRetry?: () => void
}

/**
 * Kennzahlenkarte für die Kopfzeile einer Auswertungsseite.
 *
 * Lade- und Fehlerzustand stecken mit drin, weil jede dieser Karten an einer eigenen Abfrage hängt:
 * eine fehlgeschlagene Kennzahl darf laut UI/UX-Plan nicht die Seite blockieren, muss aber sichtbar
 * scheitern statt einfach leer zu bleiben.
 */
export function KpiCard({
  label,
  value,
  hint,
  tone = 'neutral',
  isPending = false,
  error,
  onRetry,
}: KpiCardProps) {
  const hatFehler = error !== null && error !== undefined
  // Farben über `theme.vars`, damit der Moduswechsel sie mitzieht, wie im übrigen Code.
  const farbe = (theme: Theme): string => {
    if (hatFehler) {
      return theme.vars.palette.text.disabled
    }
    if (tone === 'gain') {
      return theme.vars.palette.finance.gainText
    }
    if (tone === 'loss') {
      return theme.vars.palette.finance.lossText
    }
    return theme.vars.palette.text.primary
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary" component="h3">
          {label}
        </Typography>

        {isPending ? (
          <Skeleton variant="text" width={140} sx={{ fontSize: '1.5rem' }} />
        ) : (
          <Typography variant="h5" sx={{ ...tabularNums, color: farbe }}>
            {hatFehler ? missingValue : value}
          </Typography>
        )}

        {hatFehler ? (
          <Typography variant="caption" color="error" sx={{ display: 'block' }}>
            {error instanceof ApiError && error.isNetworkError
              ? 'Backend nicht erreichbar.'
              : 'Konnte nicht geladen werden.'}
            {onRetry !== undefined && (
              <Button size="small" onClick={onRetry} sx={{ ml: 0.5, p: 0, minWidth: 0 }}>
                Erneut versuchen
              </Button>
            )}
          </Typography>
        ) : (
          hint !== undefined && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {hint}
            </Typography>
          )
        )}
      </CardContent>
    </Card>
  )
}
