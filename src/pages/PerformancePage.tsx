import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useMemo, useState } from 'react'
import { StackedBarChart, type StackedRow } from '../charts/StackedBarChart'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/DataState'
import { KpiCard } from '../components/KpiCard'
import { toneFor } from '../components/kpiTone'
import { PageHeader } from '../components/PageHeader'
import { ResponsiveTable, type Column } from '../components/ResponsiveTable'
import { formatMoney, formatPercent, formatQuantity } from '../format/numbers'
import { dividendenJeJahr, dividendenWaehrungen, type DividendenJahr } from '../performance/dividenden'
import {
  useDividends,
  useHistory,
  useRealizedGains,
  useReturns,
  useValuation,
} from '../performance/usePerformance'
import { Wertverlauf } from '../performance/Wertverlauf'
import { PortfolioGate } from '../portfolios/PortfolioGate'
import type { Portfolio } from '../portfolios/portfolioApi'
import { useTransactions } from '../transactions/useTransactions'
import { ZeitraumLeiste } from '../zeitraum/ZeitraumLeiste'
import { useZeitraumWahl } from '../zeitraum/useZeitraumWahl'

/**
 * Auswertung des aktiven Portfolios (YOUNGOITV-452).
 *
 * Realisierte Gewinne und Dividendenerträge kommen wie zuvor vom Backend, in die Basiswährung des
 * Portfolios umgerechnet. Dazu Marktwert und die geldgewichtete Rendite (MWR): beide brauchen nur
 * einen Livekurs je Position und die tatsächlichen Cashflows aus der Transaktionshistorie, keine
 * historische Neubewertung.
 *
 * Die zeitgewichtete Rendite (TWR), der Wertverlauf und der Benchmark-Vergleich kommen dagegen alle
 * drei aus `GET /portfolios/{id}/history` - aus einem Aufruf, weil es eine Rechnung ist: die TWR ist
 * der Endwert derselben verketteten Teilperioden, die auch die Indexlinie zeichnen. Sie hängen
 * deshalb am gewählten Zeitraum, die vier Karten oben und die MWR nicht. Damit das nicht geraten
 * werden muss, sagt es jede der drei Beschriftungen ausdrücklich.
 *
 * Die Jahresübersicht der Dividenden entsteht aus der Transaktionshistorie, also aus Daten, die
 * ohnehin schon in der Oberfläche liegen. Das ist keine nachgebaute Fachlogik, sondern eine Summe
 * über Zeilen, die dieselbe Definition verwendet wie der Endpunkt (siehe `dividendenJeJahr`).
 */
export function PerformancePage() {
  return <PortfolioGate>{(portfolio) => <Auswertung portfolio={portfolio} />}</PortfolioGate>
}

function Auswertung({ portfolio }: { portfolio: Portfolio }) {
  const realizedGains = useRealizedGains(portfolio.id, portfolio.baseCurrency)
  const dividends = useDividends(portfolio.id, portfolio.baseCurrency)
  const valuation = useValuation(portfolio.id)
  const returns = useReturns(portfolio.id)
  const transactions = useTransactions(portfolio.id)

  const wahl = useZeitraumWahl()
  const verlauf = useHistory(portfolio.id, wahl.zeitraum, wahl.benchmark, wahl.gueltig)
  // Das Symbol aus der Antwort und nicht aus dem Zustand, wie auf der Risiko-Seite: so steht in der
  // Beschriftung die Benchmark, gegen die tatsächlich gerechnet wurde.
  const referenz = verlauf.data?.benchmarkSymbol ?? wahl.benchmark

  const [gewaehlteWaehrung, setGewaehlteWaehrung] = useState<string | null>(null)

  // Über useMemo, weil die Liste in zwei Abhängigkeitslisten steht und `?? []` sonst bei jedem
  // Render ein neues Array liefert.
  const alleBuchungen = useMemo(() => transactions.data ?? [], [transactions.data])
  const waehrungen = useMemo(() => dividendenWaehrungen(alleBuchungen), [alleBuchungen])

  // Wie im Dashboard abgeleitet statt in einem Effekt nachgezogen, damit ein Portfoliowechsel keine
  // Währung stehen lässt, in der es keine Zahlung gibt.
  const waehrung =
    gewaehlteWaehrung !== null && waehrungen.includes(gewaehlteWaehrung)
      ? gewaehlteWaehrung
      : waehrungen.includes(portfolio.baseCurrency)
        ? portfolio.baseCurrency
        : (waehrungen[0] ?? portfolio.baseCurrency)

  const auswertung = useMemo(
    () => dividendenJeJahr(alleBuchungen, waehrung),
    [alleBuchungen, waehrung],
  )

  const balken: StackedRow[] = auswertung.jahre.map((jahr) => ({
    label: jahr.jahr,
    values: jahr.jeSymbol,
  }))

  return (
    <>
      <PageHeader title="Performance" subtitle={`Portfolio ${portfolio.name}`} />

      <Stack spacing={3}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          }}
        >
          <KpiCard
            label="Marktwert"
            value={formatMoney(valuation.data?.marketValue, portfolio.baseCurrency)}
            hint={`Live bewertet, in ${portfolio.baseCurrency}`}
            isPending={valuation.isPending}
            error={valuation.isError ? valuation.error : undefined}
            onRetry={() => void valuation.refetch()}
          />
          <KpiCard
            label="Gewinn/Verlust (unrealisiert)"
            value={formatMoney(valuation.data?.unrealizedGainLoss, portfolio.baseCurrency)}
            hint="Marktwert minus Einstand, live"
            tone={toneFor(valuation.data?.unrealizedGainLoss)}
            isPending={valuation.isPending}
            error={valuation.isError ? valuation.error : undefined}
            onRetry={() => void valuation.refetch()}
          />
          <KpiCard
            label="Realisierte Gewinne"
            value={formatMoney(realizedGains.data?.amount, realizedGains.data?.currency)}
            hint="Aus allen Verkäufen nach FIFO, umgerechnet in die Basiswährung"
            tone={toneFor(realizedGains.data?.amount)}
            isPending={realizedGains.isPending}
            error={realizedGains.error}
            onRetry={() => void realizedGains.refetch()}
          />
          <KpiCard
            label="Dividenden"
            value={formatMoney(dividends.data?.amount, dividends.data?.currency)}
            hint="Alle Dividendenzahlungen, umgerechnet in die Basiswährung"
            isPending={dividends.isPending}
            error={dividends.error}
            onRetry={() => void dividends.refetch()}
          />
        </Box>

        {valuation.data !== undefined && valuation.data.excludedSymbols.length > 0 && (
          <Alert severity="warning">
            <AlertTitle>Nicht im Marktwert enthalten</AlertTitle>
            Für {valuation.data.excludedSymbols.join(', ')} liefert der Marktdatenanbieter aktuell
            keinen Kurs. Marktwert, Gewinn/Verlust und die geldgewichtete Rendite zählen nur die
            übrigen Positionen.
          </Alert>
        )}

        <Card>
          <CardContent>
            <ZeitraumLeiste wahl={wahl} />
          </CardContent>
        </Card>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          }}
        >
          <KpiCard
            label="Geldgewichtete Rendite (MWR)"
            value={formatPercent(returns.data?.moneyWeightedReturn, { withSign: true })}
            hint="Interner Zinsfuss über alle Ein- und Auszahlungen bis heute, unabhängig vom gewählten Zeitraum"
            tone={toneFor(returns.data?.moneyWeightedReturn)}
            isPending={returns.isPending}
            error={returns.isError ? returns.error : undefined}
            onRetry={() => void returns.refetch()}
          />
          {/*
            Die beiden Karten aus `/history` tragen absichtlich keinen eigenen Fehlerzustand: sie
            hängen an derselben Abfrage wie der Wertverlauf darunter, und dessen Panel nennt Meldung
            und Wiederholen einmal. Drei Kopien derselben Meldung sind dreimal dieselbe Information.
          */}
          <KpiCard
            label="Zeitgewichtete Rendite (TWR)"
            value={formatPercent(verlauf.data?.timeWeightedReturn, { withSign: true })}
            hint={`Verkettete Teilperioden über ${wahl.label}, bereinigt um Ein- und Auszahlungen`}
            tone={toneFor(verlauf.data?.timeWeightedReturn)}
            isPending={verlauf.isPending}
          />
          <KpiCard
            label={`Benchmark ${referenz}`}
            value={formatPercent(verlauf.data?.benchmarkReturn, { withSign: true })}
            hint={`Kursentwicklung der Benchmark über ${wahl.label}, direkt mit der TWR daneben vergleichbar`}
            tone={toneFor(verlauf.data?.benchmarkReturn)}
            isPending={verlauf.isPending}
          />
        </Box>

        <Wertverlauf
          verlauf={verlauf}
          currency={portfolio.baseCurrency}
          zeitraumLabel={wahl.label}
        />

        <Card>
          <CardContent>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2 }}
            >
              <Typography variant="subtitle2" component="h2">
                Dividenden je Jahr
              </Typography>
              {waehrungen.length > 1 && (
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={waehrung}
                  onChange={(_event, value: string | null) => {
                    if (value !== null) {
                      setGewaehlteWaehrung(value)
                    }
                  }}
                  aria-label="Währung der Zahlungen"
                >
                  {waehrungen.map((code) => (
                    <ToggleButton key={code} value={code}>
                      {code}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              )}
            </Stack>

            {transactions.isPending ? (
              <LoadingPanel rows={4} />
            ) : transactions.isError ? (
              <ErrorPanel
                error={transactions.error}
                onRetry={() => void transactions.refetch()}
                title="Transaktionen konnten nicht geladen werden"
              />
            ) : auswertung.jahre.length === 0 ? (
              <EmptyPanel>
                Noch keine Dividende gebucht. Nach der ersten Zahlung stehen hier die Erträge je Jahr
                und Wertpapier.
              </EmptyPanel>
            ) : (
              <Stack spacing={2}>
                <StackedBarChart
                  title={`Erträge in ${waehrung} je Wertpapier`}
                  rows={balken}
                  series={auswertung.symbole}
                  currency={waehrung}
                  empty="Keine Zahlung in dieser Währung."
                />
                <Jahresuebersicht rows={auswertung.jahre} currency={waehrung} />
                <Typography variant="caption" color="text.secondary">
                  Beträge in der Währung der Zahlung, ohne Umrechnung. Die Karte oben zeigt die vom
                  Backend umgerechnete Gesamtsumme in {portfolio.baseCurrency} und kann deshalb von
                  der Summe dieser Tabelle abweichen.
                </Typography>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
    </>
  )
}

/** Zahlenwerk unter dem Diagramm. Dient gleichzeitig als Textalternative zu den Balken. */
function Jahresuebersicht({
  rows,
  currency,
}: {
  rows: readonly DividendenJahr[]
  currency: string
}) {
  const columns: readonly Column<DividendenJahr>[] = [
    { key: 'year', label: 'Jahr', render: (row) => row.jahr, primary: true },
    {
      key: 'count',
      label: 'Zahlungen',
      align: 'right',
      render: (row) => formatQuantity(row.anzahl),
    },
    {
      key: 'amount',
      label: 'Ertrag',
      align: 'right',
      render: (row) => formatMoney(row.betrag, currency),
    },
  ]

  return (
    <ResponsiveTable
      label="Dividenden je Jahr"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.jahr}
    />
  )
}
