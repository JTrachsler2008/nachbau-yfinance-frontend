import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { describeApiError, type FormError } from '../api/formErrors'
import { useIsMobile } from '../components/useIsMobile'
import type { Portfolio } from './portfolioApi'
import { useAssignManager } from './usePortfolios'

/**
 * Deutsche Texte für die Statuscodes von `PATCH /portfolios/{id}/manager`.
 *
 * Die Meldungen des Backends sind englisch und technisch ("User 7 does not have the MANAGER role").
 * Der 400er ist hier der einzige, der im Normalbetrieb vorkommt: er heisst nicht "falsche Eingabe",
 * sondern "dieser Benutzer ist kein Manager", und nur ein Admin kann das ändern.
 */
const fehlermeldungen: Partial<Record<number, string>> = {
  400: 'Dieser Benutzer hat nicht die Rolle Portfolio-Manager. Diese Rolle vergibt ein Administrator.',
  403: 'Nur der Eigentümer eines Portfolios darf einen Manager zuordnen.',
  404: 'Es gibt keinen Benutzer mit dieser Nummer.',
}

interface ManagerDialogProps {
  open: boolean
  portfolio: Portfolio
  onClose: () => void
}

/**
 * Manager eines Portfolios zuordnen oder entfernen (YOUNGOITV-459).
 *
 * Eingegeben wird die Benutzernummer und nicht ein Name, weil das Backend keinen Endpunkt zum
 * Suchen oder Auflisten von Benutzern hat. Ein Namensfeld würde also eine Suche vortäuschen, die es
 * nicht gibt. Der Hinweistext sagt das offen, statt den Nutzer raten zu lassen.
 *
 * Der Dialog wird nur dem Eigentümer angeboten: der Server lässt einen zugeordneten Manager hier
 * bewusst nicht durch (`OwnerCheckService.isOwner` statt `isAuthorizedForPortfolio`), und ein
 * Menüeintrag, der immer mit 403 endet, wäre eine leere Zusage.
 */
export function ManagerDialog({ open, portfolio, onClose }: ManagerDialogProps) {
  const isMobile = useIsMobile()
  const [userId, setUserId] = useState('')
  const [error, setError] = useState<FormError | null>(null)
  const [eingabefehler, setEingabefehler] = useState<string | null>(null)
  const assign = useAssignManager()

  async function speichere(managerUserId: number | null): Promise<void> {
    setError(null)
    try {
      await assign.mutateAsync({ id: portfolio.id, managerUserId })
      onClose()
    } catch (caught) {
      setError(describeApiError(caught, fehlermeldungen))
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setEingabefehler(null)
    const parsed = Number(userId.trim())
    if (!Number.isInteger(parsed) || parsed <= 0) {
      // Vor dem Absenden geprüft, weil das Backend eine leere oder unsinnige Nummer als "Manager
      // entfernen" oder als 500er verstehen würde, und beides wäre hier eine Überraschung.
      setEingabefehler('Bitte eine Benutzernummer eingeben, eine ganze Zahl grösser als 0.')
      return
    }
    await speichere(parsed)
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" fullScreen={isMobile}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle>Portfolio-Manager</DialogTitle>
        <DialogContent>
          {error !== null && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {portfolio.managerUsername === null
                ? `Für ${portfolio.name} ist kein Manager zugeordnet.`
                : `${portfolio.name} wird von ${portfolio.managerUsername} betreut.`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ein zugeordneter Manager sieht dieses Portfolio und darf darin buchen, so als wäre es
              sein eigenes.
            </Typography>
            <TextField
              label="Benutzernummer des Managers"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              autoFocus
              fullWidth
              inputMode="numeric"
              error={eingabefehler !== null}
              helperText={
                eingabefehler ??
                'Die Nummer nennt der Manager selbst oder ein Administrator. Eine Benutzersuche gibt es bewusst nicht.'
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Abbrechen
          </Button>
          {portfolio.managerUserId !== null && (
            <Button color="error" loading={assign.isPending} onClick={() => void speichere(null)}>
              Zuordnung entfernen
            </Button>
          )}
          <Button type="submit" variant="contained" loading={assign.isPending}>
            Zuordnen
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
