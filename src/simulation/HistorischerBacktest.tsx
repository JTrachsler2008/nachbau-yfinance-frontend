import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { SeriesLineChart } from '../charts/SeriesLineChart'
import type { LinePoint, Serie } from '../charts/verlauf'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/DataState'
import { KpiCard } from '../components/KpiCard'
import { toneFor } from '../components/kpiTone'
import { gestern, vorJahren } from '../format/dates'
import { formatAmount, formatDate, formatPercent, formatQuantity, parseAmount } from '../format/numbers'
import { SimulationBadge } from './SimulationBadge'
import { simulationsMeldung } from './fehler'
import { leseSymbol } from './positionen'
import { useBacktest } from './useSimulation'

/**
 * Historischer Backtest eines einzelnen Kaufs (YOUNGOITV-456, UC-03).
 *
 * "Was wäre gewesen, wenn ich damals gekauft hätte." Kein Portfolio, keine Buchung, keine Gebühren
 * und keine Steuern: der Endpunkt multipliziert die Kursreihe mit der Menge.
 *
 * Die Beträge tragen keinen Währungscode, weil die Antwort keine Währung mitliefert. Sie stehen in der
 * Handelswährung des Wertpapiers, und die kennt die Oberfläche hier nicht.
 */
export function HistorischerBacktest() {
  const [symbolText, setSymbolText] = useState('')
  const [quantityText, setQuantityText] = useState('10')
  const [datumText, setDatumText] = useState(vorJahren(3))
  const [symbolFehler, setSymbolFehler] = useState<string | null>(null)
  const [mengeFehler, setMengeFehler] = useState<string | null>(null)
  const [datumFehler, setDatumFehler] = useState<string | null>(null)

  const [symbol, setSymbol] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number | null>(null)
  const [purchaseDate, setPurchaseDate] = useState<string | null>(null)
  const backtest = useBacktest(symbol, quantity, purchaseDate)

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setSymbolFehler(null)
    setMengeFehler(null)
    setDatumFehler(null)

    const gewaehlt = leseSymbol(symbolText)
    if (!gewaehlt.ok) {
      setSymbolFehler(gewaehlt.fehler)
      return
    }

    const menge = parseAmount(quantityText)
    if (menge === null || menge <= 0) {
      setMengeFehler('Bitte eine Menge grösser als 0 eingeben.')
      return
    }

    if (datumText === '') {
      setDatumFehler('Bitte ein Kaufdatum wählen.')
      return
    }
    // Der Endpunkt rechnet bis gestern. Heute wäre für ihn schon Zukunft und ergäbe einen 400er.
    if (datumText > gestern()) {
      setDatumFehler('Das Kaufdatum muss vor dem heutigen Tag liegen.')
      return
    }

    setSymbol(gewaehlt.symbol)
    setQuantity(menge)
    setPurchaseDate(datumText)
  }

  const ergebnis = backtest.data
  const serien: Serie[] = [
    { key: 'portfolioValue', label: 'Wert der Position' },
    { key: 'invested', label: 'Eingesetzt' },
  ]
  const punkte: LinePoint[] = (ergebnis?.priceHistory ?? []).map((punkt) => ({
    label: formatDate(punkt.date),
    values: {
      portfolioValue: punkt.portfolioValue,
      // Bei einem einmaligen Kauf bleibt der eingesetzte Betrag über die ganze Reihe gleich. Als
      // waagrechte Linie ist er die Nulllinie des Gewinns und damit die eigentliche Aussage.
      invested: ergebnis?.investedAmount ?? null,
    },
  }))
  const fachlich = simulationsMeldung(backtest.error, symbol ?? 'dieses Symbol')

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" component="h2">
              Kauf in der Vergangenheit
            </Typography>
            <SimulationBadge />
          </Stack>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: 'flex-start' }}
            >
              <TextField
                label="Symbol"
                size="small"
                value={symbolText}
                onChange={(event) => setSymbolText(event.target.value)}
                error={symbolFehler !== null}
                helperText={symbolFehler ?? 'Ticker des Marktdatenanbieters, etwa AAPL.'}
                sx={{ minWidth: 200 }}
              />
              <TextField
                label="Menge"
                size="small"
                inputMode="decimal"
                value={quantityText}
                onChange={(event) => setQuantityText(event.target.value)}
                error={mengeFehler !== null}
                helperText={mengeFehler ?? 'Stückzahl, Bruchteile erlaubt.'}
              />
              <TextField
                label="Kaufdatum"
                type="date"
                size="small"
                value={datumText}
                onChange={(event) => setDatumText(event.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: gestern() } }}
                error={datumFehler !== null}
                helperText={datumFehler ?? 'Muss in der Vergangenheit liegen.'}
              />
              <Button
                type="submit"
                variant="contained"
                loading={backtest.isFetching}
                sx={{ mt: { sm: 0.5 } }}
              >
                Rechnen
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {symbol === null || quantity === null || purchaseDate === null ? (
        <EmptyPanel>
          Noch nichts gerechnet. Symbol, Menge und Kaufdatum eingeben, um den Verlauf zu sehen.
        </EmptyPanel>
      ) : backtest.isPending || backtest.isFetching ? (
        <LoadingPanel
          rows={4}
          hint="Die Kursreihe wird tagesgenau ab dem Kaufdatum geholt und kann einige Sekunden dauern."
        />
      ) : backtest.isError ? (
        fachlich !== null ? (
          <EmptyPanel>{fachlich}</EmptyPanel>
        ) : (
          <ErrorPanel
            error={backtest.error}
            onRetry={() => void backtest.refetch()}
            title="Der Backtest konnte nicht gerechnet werden"
          />
        )
      ) : ergebnis === undefined ? null : (
        <>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" component="h2">
                {ergebnis.symbol}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatQuantity(ergebnis.quantity)} Stück, gekauft am {formatDate(ergebnis.buyDate)}
              </Typography>
            </CardContent>
          </Card>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
            }}
          >
            <KpiCard
              label="Kurs beim Kauf"
              value={formatAmount(ergebnis.priceAtBuy)}
              hint="Letzter Kurs am Kaufdatum oder davor"
            />
            <KpiCard
              label="Kurs heute"
              value={formatAmount(ergebnis.currentPrice)}
              hint="Livekurs, sonst der letzte Kurs der Reihe"
            />
            <KpiCard
              label="Eingesetzt"
              value={formatAmount(ergebnis.investedAmount)}
              hint="Kurs beim Kauf mal Menge, ohne Gebühren"
            />
            <KpiCard
              label="Wert heute"
              value={formatAmount(ergebnis.currentValue)}
              hint="Kurs heute mal Menge"
            />
            <KpiCard
              label="Gewinn"
              value={formatAmount(ergebnis.gainLoss)}
              tone={toneFor(ergebnis.gainLoss)}
              hint="Wert heute minus Einsatz, ohne Dividenden"
            />
            <KpiCard
              label="Rendite"
              value={formatPercent(ergebnis.returnPercent, { withSign: true })}
              tone={toneFor(ergebnis.returnPercent)}
              hint="Auf den Einsatz, nicht pro Jahr"
            />
          </Box>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <SeriesLineChart
                  title="Wert der Position seit dem Kauf"
                  points={punkte}
                  series={serien}
                  formatValue={(wert) => formatAmount(wert)}
                  empty="Ab diesem Datum liegen keine Kurse vor."
                />
                <Typography variant="caption" color="text.secondary">
                  Ohne Gebühren, Steuern und Dividenden, und ohne Währungscode, weil die Antwort keine
                  Währung mitliefert. War das Kaufdatum kein Handelstag, ist der Einsatz mit dem
                  letzten Kurs davor gerechnet und liegt deshalb nicht genau auf dem ersten Punkt der
                  Linie.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  )
}
