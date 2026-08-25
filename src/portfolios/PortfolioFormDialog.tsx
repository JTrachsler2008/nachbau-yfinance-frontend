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
import type { Portfolio } from './portfolioApi'
import { useCreatePortfolio, useUpdatePortfolio } from './usePortfolios'

interface PortfolioFormDialogProps {
  open: boolean
  /** Gesetzt heisst bearbeiten, null heisst neu anlegen. */
  portfolio: Portfolio | null
  onClose: () => void
  /** Wird nach erfolgreichem Anlegen mit dem neuen Portfolio aufgerufen, damit es aktiv wird. */
  onCreated?: (portfolio: Portfolio) => void
}

export function PortfolioFormDialog({
  open,
  portfolio,
  onClose,
  onCreated,
}: PortfolioFormDialogProps) {
  const isEdit = portfolio !== null
  const [name, setName] = useState(portfolio?.name ?? '')
  const [baseCurrency, setBaseCurrency] = useState<string>(portfolio?.baseCurrency ?? currencies[0])
  const [description, setDescription] = useState(portfolio?.description ?? '')
  const [error, setError] = useState<FormError | null>(null)

  const create = useCreatePortfolio()
  const update = useUpdatePortfolio()
  const pending = create.isPending || update.isPending

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    const input = {
      name: name.trim(),
      baseCurrency,
      description: description.trim() === '' ? null : description.trim(),
    }
    try {
      if (isEdit) {
        await update.mutateAsync({ id: portfolio.id, input })
      } else {
        const created = await create.mutateAsync(input)
        onCreated?.(created)
      }
      onClose()
    } catch (caught) {
      setError(describeApiError(caught))
    }
  }

  return (
    // keepMounted bewusst nicht: der Dialog soll bei jedem Öffnen mit den Werten des dann
    // ausgewählten Portfolios neu aufgebaut werden.
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle>{isEdit ? 'Portfolio bearbeiten' : 'Neues Portfolio'}</DialogTitle>
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
              helperText={error?.fieldErrors.name}
            />
            <TextField
              select
              label="Basiswährung"
              value={baseCurrency}
              onChange={(event) => setBaseCurrency(event.target.value)}
              fullWidth
              error={error?.fieldErrors.baseCurrency !== undefined}
              helperText={
                error?.fieldErrors.baseCurrency ??
                'Alle Kennzahlen des Portfolios werden in diese Währung umgerechnet.'
              }
            >
              {currencies.map((currency) => (
                <MenuItem key={currency} value={currency}>
                  {currency}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Beschreibung"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              fullWidth
              multiline
              minRows={2}
              error={error?.fieldErrors.description !== undefined}
              helperText={error?.fieldErrors.description ?? 'Optional'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Abbrechen
          </Button>
          <Button type="submit" variant="contained" loading={pending}>
            {isEdit ? 'Speichern' : 'Anlegen'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
