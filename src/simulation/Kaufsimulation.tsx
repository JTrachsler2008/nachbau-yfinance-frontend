import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { DonutChart } from '../charts/DonutChart'
import type { Slice } from '../charts/slices'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/DataState'
import { KpiCard } from '../components/KpiCard'
import { toneFor } from '../components/kpiTone'
import { ResponsiveTable, type Column } from '../components/ResponsiveTable'
import { formatAmount, formatMoney, formatPercent, formatQuantity, parseAmount } from '../format/numbers'
import type { Portfolio } from '../portfolios/portfolioApi'
import { SimulationBadge } from './SimulationBadge'
import { gewichteVergleich, type GewichtsZeile } from './allokation'
import { simulationsMeldung } from './fehler'
import { leseSymbol } from './positionen'
import type { WeightItem } from './simulationApi'
import { usePurchaseSimulation } from './useSimulation'

/** Positionen ohne Wert lassen sich nicht als Segment zeichnen und fallen deshalb weg. */
function segmente(items: readonly WeightItem[]): Slice[] {
  return items
    .filter((item): item is WeightItem & { value: number } => item.value !== null)
    .map((item) => ({ key: item.symbol, label: item.symbol, value: item.value }))
}

/**
 * Kaufsimulation (YOUNGOITV-456, UC-03).
 *
 * Zeigt, was ein Zukauf mit der Gewichtung des Bestands machen würde. Es wird nichts gebucht: der
 * Endpunkt liest das Portfolio nur, um es zu bewerten, und schreibt keine Transaktion.
 *
 * Zu den Währungen, weil die Antwort keine mitliefert: Kurs und Kosten stehen in der Handelswährung
 * des Wertpapiers, die die Oberfläche hier nicht kennt und deshalb auch nicht behauptet. Die
 * Depotwerte und die Gewichtung rechnet das Backend in die Basiswährung des Portfolios um, dort steht
 * der Code darum dran.
 */
export function Kaufsimulation({ portfolio }: { portfolio: Portfolio }) {
  const [symbolText, setSymbolText] = useState('')
  const [quantityText, setQuantityText] = useState('10')
  const [symbolFehler, setSymbolFehler] = useState<string | null>(null)
  const [mengeFehler, setMengeFehler] = useState<string | null>(null)

  const [symbol, setSymbol] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<number | null>(null)
  const simulation = usePurchaseSimulation(portfolio.id, symbol, quantity)

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setSymbolFehler(null)
    setMengeFehler(null)

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

    setSymbol(gewaehlt.symbol)
    setQuantity(menge)
  }

  const ergebnis = simulation.data
  const fachlich = simulationsMeldung(simulation.error, symbol ?? 'dieses Symbol')

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" component="h2">
              Zukauf simulieren
            </Typography>
            <SimulationBadge />
          </Stack>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
              <TextField
                label="Symbol"
                size="small"
                value={symbolText}
                onChange={(event) => setSymbolText(event.target.value)}
                error={symbolFehler !== null}
                helperText={symbolFehler ?? 'Ticker des Marktdatenanbieters, etwa AAPL oder NESN.SW.'}
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
              <Button
                type="submit"
                variant="contained"
                loading={simulation.isFetching}
                sx={{ mt: { sm: 0.5 } }}
              >
                Simulieren
              </Button>
            </Stack>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Gerechnet gegen "{portfolio.name}". Der Zukauf wird nicht gebucht und kostet kein Cash;
            das Konto bleibt unberührt.
          </Typography>
        </CardContent>
      </Card>

      {symbol === null || quantity === null ? (
        <EmptyPanel>
          Noch nichts simuliert. Symbol und Menge eingeben, um die Wirkung auf die Gewichtung zu
          sehen.
        </EmptyPanel>
      ) : simulation.isPending || simulation.isFetching ? (
        <LoadingPanel rows={4} hint="Der Livekurs wird beim Marktdatenanbieter abgefragt." />
      ) : simulation.isError ? (
        fachlich !== null ? (
          <EmptyPanel>{fachlich}</EmptyPanel>
        ) : (
          <ErrorPanel
            error={simulation.error}
            onRetry={() => void simulation.refetch()}
            title="Die Kaufsimulation konnte nicht gerechnet werden"
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
                {ergebnis.securityName}
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
              label="Kurs"
              value={formatAmount(ergebnis.currentPrice)}
              hint="Livekurs, in der Handelswährung des Wertpapiers"
            />
            <KpiCard
              label="Kosten"
              value={formatAmount(ergebnis.cost)}
              hint={`Kurs mal ${formatQuantity(ergebnis.quantity)} Stück, ohne Gebühren und Steuern`}
            />
            <KpiCard
              label="Zukauf im Depot"
              value={formatMoney(ergebnis.valueChange, portfolio.baseCurrency)}
              hint="Die Kosten in Basiswährung. Kein Gewinn, nur der zusätzliche Bestand."
            />
            <KpiCard
              label="Depotwert vorher"
              value={formatMoney(ergebnis.currentPortfolioValue, portfolio.baseCurrency)}
              hint="Nur Positionen mit Livekurs"
            />
            <KpiCard
              label="Depotwert nachher"
              value={formatMoney(ergebnis.simulatedPortfolioValue, portfolio.baseCurrency)}
              hint="Bestand plus Zukauf"
            />
            <KpiCard
              label="Anteil am Bestand"
              value={formatPercent(ergebnis.returnChangePercent, { withSign: true })}
              tone={toneFor(ergebnis.returnChangePercent)}
              hint="Um so viel wächst der Depotwert durch den Zukauf"
            />
          </Box>

          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Box
                  sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}
                >
                  <DonutChart
                    title="Gewichtung vorher"
                    slices={segmente(ergebnis.currentWeights)}
                    currency={portfolio.baseCurrency}
                    empty="Der Bestand hat keine Position mit Livekurs."
                  />
                  <DonutChart
                    title="Gewichtung nachher"
                    slices={segmente(ergebnis.simulatedWeights)}
                    currency={portfolio.baseCurrency}
                    empty="Ohne bewertbaren Bestand gibt es keine Gewichtung."
                  />
                </Box>
                <Gewichte rows={gewichteVergleich(ergebnis.currentWeights, ergebnis.simulatedWeights)} />
                <Typography variant="caption" color="text.secondary">
                  Positionen ohne Livekurs lässt der Endpunkt aus beiden Ringen weg. Der Depotwert
                  oben ist deshalb der Wert der bewertbaren Positionen, nicht zwingend der ganze
                  Bestand.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  )
}

function Gewichte({ rows }: { rows: readonly GewichtsZeile[] }) {
  const columns: readonly Column<GewichtsZeile>[] = [
    { key: 'symbol', label: 'Symbol', render: (row) => row.symbol, primary: true },
    { key: 'vorher', label: 'Vorher', align: 'right', render: (row) => formatPercent(row.vorher) },
    { key: 'nachher', label: 'Nachher', align: 'right', render: (row) => formatPercent(row.nachher) },
    {
      key: 'veraenderung',
      label: 'Veränderung',
      align: 'right',
      render: (row) => formatPercent(row.veraenderungPunkte, { withSign: true }),
    },
  ]

  return (
    <ResponsiveTable
      label="Gewichtung vor und nach dem Zukauf"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.symbol}
    />
  )
}
