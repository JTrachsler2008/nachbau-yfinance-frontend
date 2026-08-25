import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import type { Account } from '../accounts/accountApi'
import { ApiError } from '../api/client'
import { describeApiError } from '../api/formErrors'
import { currencies } from '../format/currencies'
import { parseAmount } from '../format/numbers'
import { useSecurities } from '../securities/useSecurities'
import type { Security } from '../securities/securityApi'
import {
  transactionTypeLabels,
  transactionTypes,
  type TransactionInput,
  type TransactionType,
} from './transactionApi'
import { useCreateTransaction } from './useTransactions'

interface TransactionFormDialogProps {
  open: boolean
  portfolioId: number
  accounts: readonly Account[]
  onClose: () => void
}

/** Heute als ISO-Datum in der Zeitzone des Benutzers. `toISOString` wäre UTC und damit abends falsch. */
function heute(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Menge ist bei einem Split kein Eingabewert: das Verhältnis rechnet den ganzen Bestand um. */
function braucht(type: TransactionType): {
  menge: boolean
  preis: boolean
  gebuehren: boolean
  verhaeltnis: boolean
} {
  return {
    menge: type !== 'SPLIT',
    preis: type !== 'SPLIT',
    // Gebühr und Steuer wertet das Backend nur bei Kauf und Verkauf aus. Bei den übrigen Typen
    // würden eingetippte Werte stillschweigend verfallen, deshalb sind die Felder dort nicht da.
    gebuehren: type === 'BUY' || type === 'SELL',
    verhaeltnis: type === 'SPLIT',
  }
}

/**
 * Buchungsformular (YOUNGOITV-448).
 *
 * Alle sechs Typen des Backends sind wählbar, nicht nur Kauf, Verkauf und Dividende wie im Original.
 * Der UI/UX-Plan liess diese Entscheidung offen; die Alternative wäre, dass Splits, Übernahmen und
 * Fusionen nur per Hand gegen die API buchbar bleiben, obwohl das Backend sie vollständig verarbeitet
 * und ein nicht gebuchter Split jede Folgerechnung verfälscht. Je Typ sind nur die Felder sichtbar,
 * die das Backend für ihn auch auswertet.
 *
 * Der Preis darf leer bleiben. Das Backend sucht dann den historischen Kurs zum Buchungsdatum und
 * antwortet mit 404, wenn keiner hinterlegt ist. Genau dieser Fall wird unten am Preisfeld erklärt,
 * statt als "Nicht gefunden" im Banner zu landen.
 */
export function TransactionFormDialog({
  open,
  portfolioId,
  accounts,
  onClose,
}: TransactionFormDialogProps) {
  const securities = useSecurities()
  const create = useCreateTransaction(portfolioId)

  const [accountId, setAccountId] = useState<number>(accounts[0]?.id ?? 0)
  const [type, setType] = useState<TransactionType>('BUY')
  const [security, setSecurity] = useState<Security | null>(null)
  const [quantityText, setQuantityText] = useState('')
  const [priceText, setPriceText] = useState('')
  const [feeText, setFeeText] = useState('')
  const [taxText, setTaxText] = useState('')
  const [splitRatioText, setSplitRatioText] = useState('')
  const [currency, setCurrency] = useState<string>(accounts[0]?.currency ?? currencies[0])
  const [date, setDate] = useState(heute())

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  const sichtbar = braucht(type)
  const account = accounts.find((candidate) => candidate.id === accountId)

  function setFieldError(field: string, message: string): void {
    setFieldErrors({ [field]: message })
  }

  /** Wählt ein Konto und übernimmt dessen Währung, solange der Benutzer sie nicht selbst geändert hat. */
  function handleAccountChange(nextId: number): void {
    setAccountId(nextId)
    const next = accounts.find((candidate) => candidate.id === nextId)
    if (next !== undefined && account !== undefined && currency === account.currency) {
      setCurrency(next.currency)
    }
  }

  /** Liest und prüft alle Felder. `null` heisst: eine Feldmeldung steht, es wird nicht gesendet. */
  function pruefen(): { input: TransactionInput } | null {
    if (security === null) {
      setFieldError('securityId', 'Bitte ein Wertpapier auswählen.')
      return null
    }

    let quantity = 0
    if (sichtbar.menge) {
      const parsed = parseAmount(quantityText)
      if (parsed === null) {
        setFieldError('quantity', 'Bitte eine Menge eingeben, zum Beispiel 10.')
        return null
      }
      if (parsed <= 0) {
        setFieldError('quantity', 'Die Menge muss grösser als 0 sein.')
        return null
      }
      quantity = parsed
    }

    let price: number | null = null
    if (sichtbar.preis && priceText.trim() !== '') {
      const parsed = parseAmount(priceText)
      if (parsed === null || parsed <= 0) {
        setFieldError('price', 'Der Preis muss eine Zahl grösser als 0 sein.')
        return null
      }
      price = parsed
    }

    let splitRatio: number | null = null
    if (sichtbar.verhaeltnis) {
      const parsed = parseAmount(splitRatioText)
      if (parsed === null || parsed <= 0) {
        setFieldError('splitRatio', 'Bitte ein Verhältnis eingeben, zum Beispiel 2 für 1:2.')
        return null
      }
      splitRatio = parsed
    }

    let fee: number | null = null
    let tax: number | null = null
    if (sichtbar.gebuehren) {
      for (const [feld, text] of [
        ['fee', feeText],
        ['tax', taxText],
      ] as const) {
        if (text.trim() === '') {
          continue
        }
        const parsed = parseAmount(text)
        if (parsed === null || parsed < 0) {
          setFieldError(feld, 'Bitte eine Zahl ab 0 eingeben oder das Feld leer lassen.')
          return null
        }
        if (feld === 'fee') {
          fee = parsed
        } else {
          tax = parsed
        }
      }
    }

    if (date === '') {
      setFieldError('transactionDate', 'Bitte ein Datum wählen.')
      return null
    }
    if (date > heute()) {
      setFieldError('transactionDate', 'Das Datum darf nicht in der Zukunft liegen.')
      return null
    }

    return {
      input: {
        securityId: security.id,
        transactionType: type,
        quantity,
        price,
        fee,
        tax,
        splitRatio,
        transactionCurrency: currency,
        transactionDate: date,
      },
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFieldErrors({})
    setGeneralError(null)

    const geprueft = pruefen()
    if (geprueft === null) {
      return
    }

    try {
      await create.mutateAsync({ accountId, input: geprueft.input })
      onClose()
    } catch (caught) {
      const described = describeApiError(caught)
      if (Object.keys(described.fieldErrors).length > 0) {
        setFieldErrors(described.fieldErrors)
        return
      }
      if (caught instanceof ApiError && caught.status === 404 && geprueft.input.price === null) {
        setFieldError(
          'price',
          'Für dieses Datum ist kein Kurs hinterlegt. Bitte den Preis von Hand eintragen.',
        )
        return
      }
      if (caught instanceof ApiError && caught.status === 400) {
        // Der Endpunkt liefert bei fachlichen Fehlern keinen Feldbezug. Die englischen Meldungen des
        // Backends ("has insufficient cash for a BUY of ...") gehören nicht in die Oberfläche.
        setGeneralError(fachlicheMeldung(type, described.message))
        return
      }
      setGeneralError(described.message)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle>Neue Transaktion</DialogTitle>
        <DialogContent>
          {generalError !== null && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {generalError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Konto"
              value={accountId}
              onChange={(event) => handleAccountChange(Number(event.target.value))}
              required
              fullWidth
            >
              {accounts.map((candidate) => (
                <MenuItem key={candidate.id} value={candidate.id}>
                  {candidate.name} ({candidate.currency})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Typ"
              value={type}
              onChange={(event) => {
                setType(event.target.value as TransactionType)
                setFieldErrors({})
              }}
              required
              fullWidth
            >
              {transactionTypes.map((candidate) => (
                <MenuItem key={candidate} value={candidate}>
                  {transactionTypeLabels[candidate]}
                </MenuItem>
              ))}
            </TextField>

            <Autocomplete
              options={securities.data ?? []}
              loading={securities.isPending}
              value={security}
              onChange={(_event, next) => {
                setSecurity(next)
                if (next !== null) {
                  // Der Handelswährung folgen, weil ein Kauf üblicherweise in ihr abgerechnet wird.
                  setCurrency(next.tradingCurrency)
                }
              }}
              getOptionLabel={(option) => `${option.symbol} (${option.name})`}
              isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
              noOptionsText="Kein Wertpapier gefunden"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Wertpapier"
                  required
                  error={fieldErrors.securityId !== undefined}
                  helperText={
                    fieldErrors.securityId ??
                    (securities.isError
                      ? 'Die Wertpapierliste konnte nicht geladen werden.'
                      : 'Suche über Symbol oder Name.')
                  }
                />
              )}
            />

            {sichtbar.menge && (
              <TextField
                label="Menge"
                inputMode="decimal"
                value={quantityText}
                onChange={(event) => setQuantityText(event.target.value)}
                required
                fullWidth
                error={fieldErrors.quantity !== undefined}
                helperText={fieldErrors.quantity ?? 'Stückzahl, Bruchteile erlaubt.'}
              />
            )}

            {sichtbar.verhaeltnis && (
              <TextField
                label="Splitverhältnis"
                inputMode="decimal"
                value={splitRatioText}
                onChange={(event) => setSplitRatioText(event.target.value)}
                required
                fullWidth
                error={fieldErrors.splitRatio !== undefined}
                helperText={
                  fieldErrors.splitRatio ??
                  'Faktor, um den sich die Stückzahl vervielfacht. 2 bedeutet 1:2.'
                }
              />
            )}

            {sichtbar.preis && (
              <TextField
                label="Preis je Stück"
                inputMode="decimal"
                value={priceText}
                onChange={(event) => setPriceText(event.target.value)}
                fullWidth
                error={fieldErrors.price !== undefined}
                helperText={
                  fieldErrors.price ?? 'Leer lassen, um den hinterlegten Kurs zum Datum zu nehmen.'
                }
              />
            )}

            {sichtbar.gebuehren && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Gebühr"
                  inputMode="decimal"
                  value={feeText}
                  onChange={(event) => setFeeText(event.target.value)}
                  fullWidth
                  error={fieldErrors.fee !== undefined}
                  helperText={fieldErrors.fee ?? 'Optional.'}
                />
                <TextField
                  label="Steuer"
                  inputMode="decimal"
                  value={taxText}
                  onChange={(event) => setTaxText(event.target.value)}
                  fullWidth
                  error={fieldErrors.tax !== undefined}
                  helperText={fieldErrors.tax ?? 'Optional.'}
                />
              </Stack>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Währung"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                required
                fullWidth
                error={fieldErrors.transactionCurrency !== undefined}
                helperText={fieldErrors.transactionCurrency ?? 'Währung der Abrechnung.'}
              >
                {currencies.map((candidate) => (
                  <MenuItem key={candidate} value={candidate}>
                    {candidate}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Datum"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: heute() } }}
                error={fieldErrors.transactionDate !== undefined}
                helperText={fieldErrors.transactionDate ?? 'Buchungstag, nicht in der Zukunft.'}
              />
            </Stack>

            {account !== undefined && currency !== account.currency && (
              <Typography variant="caption" color="text.secondary">
                Abrechnung in {currency}, das Konto führt {account.currency}. Das Backend rechnet mit
                dem Tageskurs um.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Abbrechen
          </Button>
          <Button type="submit" variant="contained" loading={create.isPending}>
            Buchen
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}

/** Übersetzt die fachlichen 400er des Buchungsendpunkts in etwas, das dem Benutzer weiterhilft. */
function fachlicheMeldung(type: TransactionType, original: string): string {
  if (type === 'BUY') {
    return 'Das Konto hat nicht genug Cash für diesen Kauf. Zuerst einzahlen oder die Menge verringern.'
  }
  if (type === 'SELL') {
    return 'Der Bestand in diesem Konto reicht für den Verkauf nicht aus.'
  }
  if (type === 'SPLIT') {
    return 'Der Split konnte nicht gebucht werden. Ohne Bestand im gewählten Konto gibt es nichts umzurechnen.'
  }
  return original
}
