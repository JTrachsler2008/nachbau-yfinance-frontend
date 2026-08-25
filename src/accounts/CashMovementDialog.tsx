import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { describeApiError } from '../api/formErrors'
import { useIsMobile } from '../components/useIsMobile'
import { formatMoney, parseAmount } from '../format/numbers'
import type { Account } from './accountApi'
import { accountKeys, useMoveCash } from './useAccounts'

export type CashDirection = 'deposit' | 'withdraw'

interface CashMovementDialogProps {
  open: boolean
  portfolioId: number
  account: Account
  direction: CashDirection
  onClose: () => void
}

const titles: Record<CashDirection, string> = {
  deposit: 'Einzahlen',
  withdraw: 'Auszahlen',
}

/**
 * Ein- und Auszahlung auf ein Konto (YOUNGOITV-447).
 *
 * Beide Richtungen in einem Dialog, weil sie sich nur im Vorzeichen und im Endpunkt unterscheiden.
 *
 * Fehler stehen am Betragsfeld, nicht in einem Sammelbanner: das Original zeigte für jeden
 * fehlgeschlagenen Aufruf denselben Text "Nicht genug Cash oder Fehler", womit ein Tippfehler im
 * Betrag, ein zu tiefer Cash-Stand und ein abgelaufenes Token gleich aussahen (UI/UX-Plan,
 * Fehlerbehandlung). Der zu tiefe Cash-Stand wird zusätzlich vorab geprüft, damit die Meldung ohne
 * Serverrunde erscheint. Die Prüfung ersetzt die serverseitige nicht, sie kommt ihr nur zuvor: der
 * Stand kann sich zwischen Laden und Absenden geändert haben.
 */
export function CashMovementDialog({
  open,
  portfolioId,
  account,
  direction,
  onClose,
}: CashMovementDialogProps) {
  const isMobile = useIsMobile()
  const [amountText, setAmountText] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const move = useMoveCash(portfolioId)
  const queryClient = useQueryClient()

  const amount = parseAmount(amountText)
  const balance = formatMoney(account.cashAmount, account.currency)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setAmountError(null)
    setGeneralError(null)

    if (amount === null) {
      setAmountError('Bitte einen Betrag eingeben, zum Beispiel 1500.00')
      return
    }
    if (amount <= 0) {
      setAmountError('Der Betrag muss grösser als 0 sein.')
      return
    }
    if (direction === 'withdraw' && amount > account.cashAmount) {
      setAmountError(`Der Betrag übersteigt den Cash-Stand von ${balance}.`)
      return
    }

    try {
      await move.mutateAsync({ accountId: account.id, direction, amount })
      setAmountText('')
      onClose()
    } catch (caught) {
      const described = describeApiError(caught)
      const fieldError = described.fieldErrors.amount
      if (fieldError !== undefined) {
        setAmountError(fieldError)
        return
      }
      // Ein 400 an diesem Endpunkt betrifft immer den Betrag: entweder ist er nicht positiv oder er
      // übersteigt den Cash-Stand (InsufficientFundsException). Deshalb ans Feld statt ins Banner.
      if (caught instanceof ApiError && caught.status === 400) {
        if (direction === 'withdraw') {
          // Die Vorprüfung oben hat den Betrag durchgelassen, also war der angezeigte Stand nicht
          // mehr aktuell. Kein Zitat des alten Standes in der Meldung, sondern neu laden.
          setAmountError(
            'Der Betrag übersteigt den Cash-Stand. Der angezeigte Stand war veraltet und wurde neu geladen.',
          )
          await queryClient.invalidateQueries({
            queryKey: accountKeys.forPortfolio(portfolioId),
          })
        } else {
          setAmountError(described.message)
        }
        return
      }
      setGeneralError(described.message)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" fullScreen={isMobile}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle>
          {titles[direction]} auf {account.name}
        </DialogTitle>
        <DialogContent>
          {generalError !== null && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {generalError}
            </Alert>
          )}
          <DialogContentText>
            Aktueller Cash-Stand: <strong>{balance}</strong>
          </DialogContentText>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Betrag"
              // Bewusst kein type="number": das Mausrad verändert dort unbemerkt Werte, und der
              // Dezimaltrenner hängt vom Gebietsschema des Browsers ab. parseAmount nimmt Punkt und
              // Komma.
              inputMode="decimal"
              value={amountText}
              onChange={(event) => {
                setAmountText(event.target.value)
                setAmountError(null)
              }}
              required
              autoFocus
              fullWidth
              error={amountError !== null}
              helperText={amountError ?? `Betrag in ${account.currency}.`}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">{account.currency}</InputAdornment>
                  ),
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Abbrechen
          </Button>
          <Button
            type="submit"
            variant="contained"
            loading={move.isPending}
            disabled={amountText.trim() === ''}
          >
            {titles[direction]}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
