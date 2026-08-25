import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useState, type FormEvent } from 'react'
import { describeApiError, type FormError } from '../api/formErrors'
import { currencies } from '../format/currencies'
import { useCreateAccount } from './useAccounts'

interface AccountFormDialogProps {
  open: boolean
  portfolioId: number
  /** Vorbelegung der Kontowährung, üblicherweise die Basiswährung des Portfolios. */
  defaultCurrency: string
  onClose: () => void
}

/**
 * Neues Konto anlegen (YOUNGOITV-447).
 *
 * Das Backend kennt für Konten nur Anlegen und Auflisten, kein Ändern und kein Löschen. Deshalb
 * bewusst nur ein Anlegen-Dialog: ein Bearbeiten-Knopf, der am Server scheitert, wäre schlechter als
 * keiner.
 */
export function AccountFormDialog({
  open,
  portfolioId,
  defaultCurrency,
  onClose,
}: AccountFormDialogProps) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<string>(defaultCurrency)
  const [error, setError] = useState<FormError | null>(null)
  const create = useCreateAccount(portfolioId)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    try {
      await create.mutateAsync({ name: name.trim(), currency })
      onClose()
    } catch (caught) {
      setError(describeApiError(caught))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle>Neues Konto</DialogTitle>
        <DialogContent>
          {error !== null && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoFocus
              fullWidth
              error={error?.fieldErrors.name !== undefined}
              helperText={error?.fieldErrors.name ?? 'Zum Beispiel "Depot CHF" oder "Cash USD".'}
            />
            <TextField
              select
              label="Kontowährung"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              fullWidth
              error={error?.fieldErrors.currency !== undefined}
              helperText={
                error?.fieldErrors.currency ??
                'Lässt sich später nicht mehr ändern, das Backend kennt kein Bearbeiten von Konten.'
              }
            >
              {currencies.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Abbrechen
          </Button>
          <Button
            type="submit"
            variant="contained"
            loading={create.isPending}
            disabled={name.trim() === ''}
          >
            Anlegen
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
