import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface PagePlaceholderProps {
  title: string
  /** Jira-Schlüssel des Tickets, das diese Seite umsetzt. */
  ticket: string
  /** Was die Seite laut UI/UX-Plan enthalten wird. */
  planned: string
}

/**
 * Platzhalter für Seiten, die noch offen sind.
 *
 * Bewusst mit Ticketnummer und geplantem Inhalt statt einer leeren Seite: die Navigation ist ab
 * Ticket YOUNGOITV-445 vollständig, die Inhalte kommen einzeln nach. Ohne diese Angabe wäre eine
 * leere Seite von einem Fehler nicht zu unterscheiden.
 */
export function PagePlaceholder({ title, ticket, planned }: PagePlaceholderProps) {
  return (
    <Box sx={{ maxWidth: 900, py: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        {title}
      </Typography>
      <Alert severity="info">
        <AlertTitle>Noch nicht umgesetzt ({ticket})</AlertTitle>
        {planned}
      </Alert>
    </Box>
  )
}
