import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Wird als einzige `h1` der Seite gesetzt. */
  title: string
  /** Kurze Einordnung unter dem Titel, etwa das aktive Portfolio. */
  subtitle?: ReactNode
  /** Aktionen der Seite, etwa "Neues Konto". Rutschen auf Mobile unter den Titel. */
  actions?: ReactNode
}

/**
 * Kopfbereich einer Fachseite.
 *
 * Eine Stelle für Titel, Einordnung und Seitenaktionen, damit die Seiten nicht jede eine eigene
 * Variante bauen. Das Original setzte pro Seite unterschiedliche Überschriftenebenen, teilweise ohne
 * `h1`, was Screenreadern die Orientierung nimmt (UI/UX-Plan, Barrierefreiheit).
 */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2, py: 3 }}
    >
      <Box>
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        {subtitle !== undefined && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions !== undefined && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>
      )}
    </Stack>
  )
}
