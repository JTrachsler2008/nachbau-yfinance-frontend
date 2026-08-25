import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { describeApiError } from '../api/formErrors'
import { currencies } from '../format/currencies'
import { heute } from '../format/dates'
import { formatDate, parseAmount } from '../format/numbers'
import type { FxRate } from './adminApi'
import { useCreateFxRate, useFindFxRate } from './useAdmin'

/**
 * Ein fehlender Kurs ist im Backend ein 400er und kein 404er (`FxRateNotAvailableException` wird im
 * `GlobalExceptionHandler` auf Bad Request abgebildet). Für diesen Endpunkt ist das der einzige 400er,
 * der hier vorkommen kann: Währungspaar und Datum stammen aus Auswahlfeldern, ein fehlender oder
 * unlesbarer Parameter ist damit ausgeschlossen. Deshalb ist die Übersetzung eindeutig.
 */
const suchFehler: Partial<Record<number, string>> = {
  400: 'Für dieses Paar ist an diesem Tag und davor kein Kurs erfasst.',
}

/**
 * Wechselkurse erfassen und nachsehen (YOUNGOITV-460).
 *
 * Währungspaar und Stichtag stehen einmal für beide Aktionen, weil sie im Betrieb zusammengehören:
 * erst nachsehen, ob für den Tag schon ein Kurs liegt, dann bei Bedarf erfassen. Zwei getrennte
 * Formulare würden dieselben drei Felder doppelt verlangen.
 *
 * Eine Liste aller erfassten Kurse gibt es nicht, weil das Backend keinen Endpunkt dafür hat.
 * `GET /fx-rates` liefert genau einen Kurs, nämlich den jüngsten am oder vor dem Stichtag. Genau das
 * macht die Antwort interessant: liegt das Datum des Treffers vor dem Stichtag, rechnet das Backend
 * mit einem älteren Kurs weiter, und das steht hier auch so da.
 */
export function Wechselkurse() {
  const [baseCurrency, setBaseCurrency] = useState<string>('EUR')
  const [quoteCurrency, setQuoteCurrency] = useState<string>('CHF')
  const [rateDate, setRateDate] = useState<string>(heute())
  const [rate, setRate] = useState('')
  const [kursFehler, setKursFehler] = useState<string | null>(null)
  const [erfassenFehler, setErfassenFehler] = useState<string | null>(null)
  const [erfasst, setErfasst] = useState<FxRate | null>(null)
  const [gefunden, setGefunden] = useState<FxRate | null>(null)
  const [suchmeldung, setSuchmeldung] = useState<string | null>(null)
  const create = useCreateFxRate()
  const suche = useFindFxRate()

  const gleichesPaar = baseCurrency === quoteCurrency

  /** Ein Wechsel des Paares oder des Tages macht ein vorheriges Ergebnis ungültig. */
  function setzeParameter(aenderung: () => void): void {
    aenderung()
    setGefunden(null)
    setSuchmeldung(null)
    setErfasst(null)
  }

  async function handleSuche(): Promise<void> {
    setSuchmeldung(null)
    setGefunden(null)
    try {
      const treffer = await suche.mutateAsync({
        base: baseCurrency,
        quote: quoteCurrency,
        date: rateDate,
      })
      setGefunden(treffer)
    } catch (caught) {
      setSuchmeldung(describeApiError(caught, suchFehler).message)
    }
  }

  async function handleErfassen(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setErfassenFehler(null)
    setKursFehler(null)
    setErfasst(null)

    const wert = parseAmount(rate)
    if (wert === null || wert <= 0) {
      setKursFehler('Bitte einen Kurs grösser als 0 eingeben, zum Beispiel 0.94.')
      return
    }

    try {
      const angelegt = await create.mutateAsync({
        baseCurrency,
        quoteCurrency,
        rateDate,
        rate: wert,
      })
      setErfasst(angelegt)
      setRate('')
      // Ein vorheriger Treffer ist jetzt veraltet, und der Kurs ist ohnehin oben zu sehen.
      setGefunden(null)
      setSuchmeldung(null)
    } catch (caught) {
      // Der 403 liegt bei der globalen Fehlerbehandlung, deshalb hier keine eigene Übersetzung.
      setErfassenFehler(describeApiError(caught).message)
    }
  }

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleErfassen} noValidate>
            <Stack spacing={2}>
              <Typography variant="subtitle2" component="h2">
                Währungspaar und Stichtag
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label="Von Währung"
                  value={baseCurrency}
                  onChange={(event) => setzeParameter(() => setBaseCurrency(event.target.value))}
                  fullWidth
                  size="small"
                  helperText="Basiswährung des Kurses."
                >
                  {currencies.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Nach Währung"
                  value={quoteCurrency}
                  onChange={(event) => setzeParameter(() => setQuoteCurrency(event.target.value))}
                  fullWidth
                  size="small"
                  error={gleichesPaar}
                  helperText={
                    gleichesPaar
                      ? 'Bitte zwei verschiedene Währungen wählen.'
                      : `1 ${baseCurrency} in ${quoteCurrency}.`
                  }
                >
                  {currencies.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Stichtag"
                  type="date"
                  value={rateDate}
                  onChange={(event) => setzeParameter(() => setRateDate(event.target.value))}
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText="Tag, für den der Kurs gilt."
                />
              </Stack>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: 'flex-start' }}
              >
                <TextField
                  label="Kurs"
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  size="small"
                  inputMode="decimal"
                  error={kursFehler !== null}
                  helperText={kursFehler ?? `Wie viel ${quoteCurrency} ein ${baseCurrency} kostet.`}
                  sx={{ minWidth: 200 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  loading={create.isPending}
                  disabled={gleichesPaar || rate.trim() === ''}
                  sx={{ mt: { sm: 0.5 } }}
                >
                  Kurs erfassen
                </Button>
                <Button
                  onClick={() => void handleSuche()}
                  loading={suche.isPending}
                  disabled={gleichesPaar}
                  sx={{ mt: { sm: 0.5 } }}
                >
                  Nachsehen
                </Button>
              </Stack>

              {erfassenFehler !== null && <Alert severity="error">{erfassenFehler}</Alert>}

              {erfasst !== null && (
                <Alert severity="success">
                  Kurs erfasst: 1 {erfasst.baseCurrency} = {erfasst.rate} {erfasst.quoteCurrency} am{' '}
                  {formatDate(erfasst.rateDate)}.
                </Alert>
              )}

              {suchmeldung !== null && <Alert severity="info">{suchmeldung}</Alert>}

              {gefunden !== null && (
                <Alert severity={gefunden.rateDate === rateDate ? 'success' : 'warning'}>
                  {gefunden.rateDate === rateDate
                    ? `Erfasst: 1 ${gefunden.baseCurrency} = ${gefunden.rate} ${gefunden.quoteCurrency} am ${formatDate(gefunden.rateDate)}.`
                    : `Für den Stichtag selbst liegt kein Kurs. Gerechnet wird mit dem vom ${formatDate(gefunden.rateDate)}: 1 ${gefunden.baseCurrency} = ${gefunden.rate} ${gefunden.quoteCurrency}.`}
                </Alert>
              )}
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.secondary">
        Kurse gelten nur in der erfassten Richtung. Für die Umrechnung von CHF nach EUR braucht es
        einen eigenen Eintrag, das Backend kehrt einen Kurs nicht um. Ein bestehender Eintrag lässt
        sich nicht ändern und nicht löschen; ein zweiter Kurs für denselben Tag überschreibt ihn nicht,
        sondern kommt daneben zu liegen, und welcher der beiden dann verwendet wird, ist nicht
        festgelegt. Deshalb vor dem Erfassen nachsehen.
      </Typography>
    </Stack>
  )
}
