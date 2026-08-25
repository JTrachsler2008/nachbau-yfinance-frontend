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
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { describeApiError, type FormError } from '../api/formErrors'
import { useIsMobile } from '../components/useIsMobile'
import { currencies } from '../format/currencies'
import { parseAmount } from '../format/numbers'
import type { Security } from '../securities/securityApi'
import { assetTypes, type SecurityInput } from './adminApi'
import { useCreateSecurity } from './useAdmin'

interface SecurityFormDialogProps {
  open: boolean
  /**
   * Bereits vorhandene Wertpapiere. Nur für die Dublettenprüfung, siehe unten.
   */
  bestand: readonly Security[]
  onClose: () => void
}

/** Leere Eingabe heisst "nicht angegeben", nicht "leerer Text". */
function optional(text: string): string | null {
  const getrimmt = text.trim()
  return getrimmt === '' ? null : getrimmt
}

/**
 * Wertpapier anlegen (YOUNGOITV-460).
 *
 * Nur Anlegen: das Backend kennt für Wertpapiere kein Ändern und kein Löschen. Der Sektor lässt sich
 * also anders als im Original nicht nachträglich korrigieren, und ein Knopf dafür wäre ein
 * Versprechen ohne Endpunkt. Der Hinweis im Dialog sagt es, damit die Angaben beim Anlegen sitzen.
 *
 * Die Dublettenprüfung läuft im Browser gegen die geladene Liste, weil `securities.symbol` in der
 * Datenbank eindeutig ist, das Backend die Verletzung aber nicht abfängt: ein zweites Wertpapier mit
 * demselben Symbol endet dort in einem 500er, und daraus liesse sich in der Oberfläche keine
 * brauchbare Auskunft machen (der Text eines 500ers darf nicht angezeigt werden). Verbindlich bleibt
 * die Datenbank; die Prüfung hier fängt nur den Normalfall früh ab.
 */
export function SecurityFormDialog({ open, bestand, onClose }: SecurityFormDialogProps) {
  const isMobile = useIsMobile()
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [assetType, setAssetType] = useState<string>('STOCK')
  const [tradingCurrency, setTradingCurrency] = useState<string>('CHF')
  const [isin, setIsin] = useState('')
  const [exchangeCode, setExchangeCode] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [sector, setSector] = useState('')
  const [couponRate, setCouponRate] = useState('')
  const [maturityDate, setMaturityDate] = useState('')
  const [error, setError] = useState<FormError | null>(null)
  const [symbolFehler, setSymbolFehler] = useState<string | null>(null)
  const [couponFehler, setCouponFehler] = useState<string | null>(null)
  const create = useCreateSecurity()

  const istAnleihe = assetType === 'BOND'

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setSymbolFehler(null)
    setCouponFehler(null)

    // Symbole des Marktdatenanbieters sind grossgeschrieben, und die Suche im Backend vergleicht
    // genau. "aapl" würde also ein zweites Wertpapier neben AAPL anlegen.
    const gewaehltesSymbol = symbol.trim().toUpperCase()
    if (bestand.some((vorhanden) => vorhanden.symbol.toUpperCase() === gewaehltesSymbol)) {
      setSymbolFehler(`${gewaehltesSymbol} ist bereits erfasst. Ein Symbol darf nur einmal vorkommen.`)
      return
    }

    let zinssatz: number | null = null
    if (istAnleihe && couponRate.trim() !== '') {
      zinssatz = parseAmount(couponRate)
      if (zinssatz === null || zinssatz < 0) {
        setCouponFehler('Bitte einen Zinssatz in Prozent eingeben, zum Beispiel 1.75.')
        return
      }
    }

    const input: SecurityInput = {
      symbol: gewaehltesSymbol,
      isin: optional(isin),
      name: name.trim(),
      assetType,
      exchangeCode: optional(exchangeCode),
      tradingCurrency,
      countryCode: optional(countryCode),
      sector: optional(sector),
      // Das Backend weist beide Felder für alles ausser BOND mit 400 zurück. Sie werden deshalb nicht
      // nur ausgeblendet, sondern auch nicht mitgeschickt.
      couponRate: istAnleihe ? zinssatz : null,
      maturityDate: istAnleihe ? optional(maturityDate) : null,
    }

    try {
      await create.mutateAsync(input)
      onClose()
    } catch (caught) {
      // Ohne eigene Übersetzungstabelle: die Feldmeldungen des Backends sind hier die genauere
      // Auskunft, und der Fall "Rolle fehlt" (403) gehört der globalen Fehlerbehandlung, die dabei
      // aus der Verwaltung zurückführt.
      setError(describeApiError(caught))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogTitle>Wertpapier anlegen</DialogTitle>
        <DialogContent>
          {error !== null && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Symbol"
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                required
                autoFocus
                fullWidth
                error={symbolFehler !== null || error?.fieldErrors.symbol !== undefined}
                helperText={
                  symbolFehler ??
                  error?.fieldErrors.symbol ??
                  'Ticker des Marktdatenanbieters, etwa AAPL oder NESN.SW. Wird gross geschrieben.'
                }
              />
              <TextField
                select
                label="Anlageart"
                value={assetType}
                onChange={(event) => setAssetType(event.target.value)}
                fullWidth
                helperText="Nur eine Anleihe hat Zinssatz und Laufzeit."
              >
                {assetTypes.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              fullWidth
              error={error?.fieldErrors.name !== undefined}
              helperText={error?.fieldErrors.name ?? 'Ausgeschrieben, etwa "Nestlé SA".'}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Handelswährung"
                value={tradingCurrency}
                onChange={(event) => setTradingCurrency(event.target.value)}
                fullWidth
                error={error?.fieldErrors.tradingCurrency !== undefined}
                helperText={
                  error?.fieldErrors.tradingCurrency ?? 'Währung, in der Kurse geliefert werden.'
                }
              >
                {currencies.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="ISIN"
                value={isin}
                onChange={(event) => setIsin(event.target.value)}
                fullWidth
                helperText="Optional, zwölf Zeichen."
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Börse"
                value={exchangeCode}
                onChange={(event) => setExchangeCode(event.target.value)}
                fullWidth
                helperText="Optional, etwa SIX oder NASDAQ."
              />
              <TextField
                label="Land"
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                fullWidth
                helperText="Optional, Kürzel wie CH oder US. Ordnet die Länderaufteilung im Dashboard."
              />
            </Stack>

            <TextField
              label="Sektor"
              value={sector}
              onChange={(event) => setSector(event.target.value)}
              fullWidth
              helperText="Optional, etwa Gesundheit. Lässt sich später nicht mehr ändern, das Backend kennt kein Bearbeiten von Wertpapieren."
            />

            {istAnleihe && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Zinssatz"
                  value={couponRate}
                  onChange={(event) => setCouponRate(event.target.value)}
                  fullWidth
                  inputMode="decimal"
                  error={couponFehler !== null}
                  helperText={couponFehler ?? 'In Prozent pro Jahr, etwa 1.75.'}
                />
                <TextField
                  label="Endfälligkeit"
                  type="date"
                  value={maturityDate}
                  onChange={(event) => setMaturityDate(event.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText="Rückzahlungstermin der Anleihe."
                />
              </Stack>
            )}

            <Typography variant="caption" color="text.secondary">
              Kurse werden nicht mit angelegt. Sie kommen beim Buchen vom Marktdatenanbieter, der das
              Symbol kennen muss.
            </Typography>
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
            disabled={symbol.trim() === '' || name.trim() === ''}
          >
            Anlegen
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
