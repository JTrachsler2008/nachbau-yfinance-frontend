import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useAccounts } from '../accounts/useAccounts'
import { DonutChart } from '../charts/DonutChart'
import { fasseZusammen } from '../charts/slices'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/DataState'
import { KpiCard } from '../components/KpiCard'
import { toneFor } from '../components/kpiTone'
import { PageHeader } from '../components/PageHeader'
import { ResponsiveTable, type Column } from '../components/ResponsiveTable'
import { landName } from '../format/countries'
import { formatMoney, formatPercent, formatQuantity, missingValue } from '../format/numbers'
import { useDividends, useRealizedGains, useReturns, useValuation } from '../performance/usePerformance'
import type { Position } from '../positions/positionApi'
import { usePositions } from '../positions/usePositions'
import { PortfolioGate } from '../portfolios/PortfolioGate'
import type { Portfolio } from '../portfolios/portfolioApi'

/**
 * Übersicht über das aktive Portfolio (YOUNGOITV-451).
 *
 * Marktwert und Gewinn/Verlust kommen über `GET /portfolios/{id}/valuation`, in der Basiswährung -
 * anders als der weiterhin nur je Handelswährung summierte Einstandswert darunter, weil eine Summe
 * über Währungen hinweg einen Kurs und eine Umrechnung braucht, die das Backend jetzt liefert. Die
 * zeitgewichtete Rendite (TWR) steht bewusst nicht hier, sondern auf der Performance-Seite: sie ist
 * der Endwert der Teilperioden aus `GET /portfolios/{id}/history` und hängt deshalb an einem
 * gewählten Zeitraum, den das Dashboard nicht anbietet - anders als die geldgewichtete Rendite (MWR)
 * oben, die immer die gesamte Historie bis heute betrachtet.
 */
export function DashboardPage() {
  return <PortfolioGate>{(portfolio) => <Uebersicht portfolio={portfolio} />}</PortfolioGate>
}

/** Einstandswert einer Position in ihrer Handelswährung, Gebühren inbegriffen. */
function einstand(position: Position): number {
  return position.totalQuantity * position.averagePurchasePrice
}

function Uebersicht({ portfolio }: { portfolio: Portfolio }) {
  const positions = usePositions(portfolio.id)
  const accounts = useAccounts(portfolio.id)
  const realizedGains = useRealizedGains(portfolio.id, portfolio.baseCurrency)
  const dividends = useDividends(portfolio.id, portfolio.baseCurrency)
  const valuation = useValuation(portfolio.id)
  const returns = useReturns(portfolio.id)

  const [gewaehlteWaehrung, setGewaehlteWaehrung] = useState<string | null>(null)
  const [sektor, setSektor] = useState<string | null>(null)
  const [land, setLand] = useState<string | null>(null)

  // Über useMemo, weil beides in Abhängigkeitslisten weiter unten steht: `?? []` erzeugt vor der
  // ersten Antwort bei jedem Render ein neues Array und würde die Memos wertlos machen.
  const alleBestaende = useMemo(() => positions.data ?? [], [positions.data])
  const alleKonten = useMemo(() => accounts.data ?? [], [accounts.data])

  const bestandsWaehrungen = useMemo(
    () => [...new Set(alleBestaende.map((position) => position.tradingCurrency))].sort(),
    [alleBestaende],
  )

  /**
   * Die Auswahl wird abgeleitet und nicht in einem Effekt nachgezogen: wechselt das Portfolio, ist
   * eine gemerkte Währung womöglich gar nicht mehr vorhanden, und ein Effekt würde die Seite erst
   * einmal mit leerem Bestand rendern.
   */
  const waehrung =
    gewaehlteWaehrung !== null && bestandsWaehrungen.includes(gewaehlteWaehrung)
      ? gewaehlteWaehrung
      : bestandsWaehrungen.includes(portfolio.baseCurrency)
        ? portfolio.baseCurrency
        : (bestandsWaehrungen[0] ?? portfolio.baseCurrency)

  const bestaende = useMemo(
    () => alleBestaende.filter((position) => position.tradingCurrency === waehrung),
    [alleBestaende, waehrung],
  )
  const einstandSumme = bestaende.reduce((summe, position) => summe + einstand(position), 0)
  const cashSumme = alleKonten
    .filter((account) => account.currency === waehrung)
    .reduce((summe, account) => summe + account.cashAmount, 0)

  const sektoren = useMemo(
    () => fasseZusammen(bestaende, (position) => position.sector, einstand),
    [bestaende],
  )
  const laender = useMemo(
    () => fasseZusammen(bestaende, (position) => landName(position.countryCode), einstand),
    [bestaende],
  )

  const gefiltert = bestaende.filter(
    (position) =>
      (sektor === null || position.sector === sektor) &&
      (land === null || landName(position.countryCode) === land),
  )

  function hebeFilterAuf(): void {
    setSektor(null)
    setLand(null)
  }

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Portfolio ${portfolio.name}`} />

      <Stack spacing={3}>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
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
            label="Geldgewichtete Rendite (MWR)"
            value={formatPercent(returns.data?.moneyWeightedReturn, { withSign: true })}
            hint="Interner Zinsfuss über alle Ein- und Auszahlungen bis heute"
            tone={toneFor(returns.data?.moneyWeightedReturn)}
            isPending={returns.isPending}
            error={returns.isError ? returns.error : undefined}
            onRetry={() => void returns.refetch()}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          }}
        >
          <KpiCard
            label="Einstandswert Bestände"
            value={formatMoney(einstandSumme, waehrung)}
            hint={`${bestaende.length} Position(en) in ${waehrung}`}
            isPending={positions.isPending}
            error={positions.error}
            onRetry={() => void positions.refetch()}
          />
          <KpiCard
            label="Cash"
            value={formatMoney(cashSumme, waehrung)}
            hint={`Konten in ${waehrung}`}
            isPending={accounts.isPending}
            error={accounts.error}
            onRetry={() => void accounts.refetch()}
          />
          <KpiCard
            label="Realisierte Gewinne"
            value={formatMoney(realizedGains.data?.amount, realizedGains.data?.currency)}
            hint="Gesamte Historie, vom Backend umgerechnet"
            tone={toneFor(realizedGains.data?.amount)}
            isPending={realizedGains.isPending}
            error={realizedGains.error}
            onRetry={() => void realizedGains.refetch()}
          />
          <KpiCard
            label="Dividenden"
            value={formatMoney(dividends.data?.amount, dividends.data?.currency)}
            hint="Gesamte Historie, vom Backend umgerechnet"
            isPending={dividends.isPending}
            error={dividends.error}
            onRetry={() => void dividends.refetch()}
          />
        </Box>

        {valuation.data !== undefined && valuation.data.excludedSymbols.length > 0 && (
          <Alert severity="warning">
            <AlertTitle>Nicht im Marktwert enthalten</AlertTitle>
            Für {valuation.data.excludedSymbols.join(', ')} liefert der Marktdatenanbieter aktuell
            keinen Kurs. Marktwert, Gewinn/Verlust und die geldgewichtete Rendite oben zählen nur die
            übrigen Positionen.
          </Alert>
        )}

        <Card>
          <CardContent>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2 }}
            >
              <Typography variant="subtitle2" component="h2">
                Aufteilung nach Einstandswert
              </Typography>
              {bestandsWaehrungen.length > 1 && (
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={waehrung}
                  onChange={(_event, value: string | null) => {
                    // null kommt beim Klick auf die schon aktive Schaltfläche. Dann bleibt die
                    // Auswahl stehen, sonst gäbe es einen Zustand ohne Währung und ohne Diagramm.
                    if (value !== null) {
                      setGewaehlteWaehrung(value)
                      hebeFilterAuf()
                    }
                  }}
                  aria-label="Handelswährung"
                >
                  {bestandsWaehrungen.map((code) => (
                    <ToggleButton key={code} value={code}>
                      {code}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              )}
            </Stack>

            {positions.isPending ? (
              <LoadingPanel rows={3} />
            ) : positions.isError ? (
              <ErrorPanel
                error={positions.error}
                onRetry={() => void positions.refetch()}
                title="Bestände konnten nicht geladen werden"
              />
            ) : (
              <>
                <Box
                  sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}
                >
                  <DonutChart
                    title="Sektor"
                    slices={sektoren}
                    currency={waehrung}
                    selected={sektor}
                    onSelect={setSektor}
                    empty="Kein Bestand in dieser Währung."
                  />
                  <DonutChart
                    title="Land"
                    slices={laender}
                    currency={waehrung}
                    selected={land}
                    onSelect={setLand}
                    empty="Kein Bestand in dieser Währung."
                  />
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 2 }}
                >
                  Anteile innerhalb der Handelswährung {waehrung}. Über Währungen hinweg wird nicht
                  summiert, weil das Backend für Bestände keine Umrechnung anbietet.
                </Typography>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: { sm: 'baseline' }, justifyContent: 'space-between', mb: 2, px: 1 }}
            >
              <Typography variant="subtitle2" component="h2">
                Positionen
              </Typography>
              {(sektor !== null || land !== null) && (
                <Button size="small" onClick={hebeFilterAuf}>
                  Filter aufheben
                </Button>
              )}
            </Stack>

            {positions.isPending ? (
              <LoadingPanel rows={4} />
            ) : positions.isError ? (
              <ErrorPanel
                error={positions.error}
                onRetry={() => void positions.refetch()}
                title="Bestände konnten nicht geladen werden"
              />
            ) : gefiltert.length === 0 ? (
              <EmptyPanel>
                {alleBestaende.length === 0
                  ? 'Noch kein Bestand. Auf der Transaktionen-Seite einen Kauf buchen, danach steht hier die Aufteilung.'
                  : 'Keine Position passt zum gewählten Filter.'}
              </EmptyPanel>
            ) : (
              <Positionen rows={gefiltert} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
            <Typography variant="subtitle2" component="h2" sx={{ mb: 2, px: 1 }}>
              Bestand je Währung
            </Typography>
            {positions.isPending || accounts.isPending ? (
              <LoadingPanel rows={2} />
            ) : (
              <Waehrungen positions={alleBestaende} accounts={alleKonten} />
            )}
          </CardContent>
        </Card>
      </Stack>
    </>
  )
}

function Positionen({ rows }: { rows: readonly Position[] }) {
  const columns: readonly Column<Position>[] = [
    { key: 'symbol', label: 'Symbol', render: (row) => row.symbol, primary: true },
    { key: 'name', label: 'Wertpapier', render: (row) => row.securityName },
    {
      key: 'sector',
      label: 'Sektor',
      render: (row) => row.sector ?? missingValue,
      hideOnMobile: true,
    },
    {
      key: 'country',
      label: 'Land',
      render: (row) => landName(row.countryCode) ?? missingValue,
      hideOnMobile: true,
    },
    {
      key: 'quantity',
      label: 'Menge',
      align: 'right',
      render: (row) => formatQuantity(row.totalQuantity),
    },
    {
      key: 'average',
      label: 'Ø Kaufpreis',
      align: 'right',
      render: (row) => formatMoney(row.averagePurchasePrice, row.tradingCurrency),
    },
    {
      key: 'total',
      label: 'Einstandswert',
      align: 'right',
      render: (row) => formatMoney(einstand(row), row.tradingCurrency),
      hideOnMobile: true,
    },
    {
      key: 'marketValue',
      label: 'Marktwert',
      align: 'right',
      render: (row) => formatMoney(row.marketValue, row.tradingCurrency),
    },
    {
      key: 'gain',
      label: 'Gewinn/Verlust',
      align: 'right',
      render: (row) => formatMoney(row.unrealizedGainLoss, row.tradingCurrency),
    },
  ]

  return (
    <ResponsiveTable
      label="Positionen"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      actions={(row) => (
        // Verlinkt in die Tranchen-Ansicht der Transaktionen-Seite, über Query-Parameter wie im
        // Original (UI/UX-Plan, FIFO-Tranchen-Detail).
        <Button
          size="small"
          component={RouterLink}
          to={`/transaktionen?konto=${row.accountId}&wertpapier=${row.securityId}`}
        >
          Tranchen
        </Button>
      )}
    />
  )
}

interface WaehrungsZeile {
  currency: string
  anzahl: number
  einstandSumme: number
  cash: number
}

/**
 * Bestand und Cash je Währung.
 *
 * Bewusst ohne Anteilsspalte und ohne Gesamtzeile: beides bräuchte eine Umrechnung. Die Tabelle
 * stellt die Währungen nebeneinander, statt sie zu einer Zahl zu verschmelzen, die es nicht gibt.
 */
function Waehrungen({
  positions,
  accounts,
}: {
  positions: readonly Position[]
  accounts: readonly { currency: string; cashAmount: number }[]
}) {
  const codes = [
    ...new Set([
      ...positions.map((position) => position.tradingCurrency),
      ...accounts.map((account) => account.currency),
    ]),
  ].sort()

  const rows: WaehrungsZeile[] = codes.map((currency) => ({
    currency,
    anzahl: positions.filter((position) => position.tradingCurrency === currency).length,
    einstandSumme: positions
      .filter((position) => position.tradingCurrency === currency)
      .reduce((summe, position) => summe + einstand(position), 0),
    cash: accounts
      .filter((account) => account.currency === currency)
      .reduce((summe, account) => summe + account.cashAmount, 0),
  }))

  if (rows.length === 0) {
    return <EmptyPanel>Noch kein Konto und kein Bestand in diesem Portfolio.</EmptyPanel>
  }

  const columns: readonly Column<WaehrungsZeile>[] = [
    { key: 'currency', label: 'Währung', render: (row) => row.currency, primary: true },
    {
      key: 'count',
      label: 'Positionen',
      align: 'right',
      render: (row) => formatQuantity(row.anzahl),
    },
    {
      key: 'total',
      label: 'Einstandswert',
      align: 'right',
      render: (row) => formatMoney(row.einstandSumme, row.currency),
    },
    {
      key: 'cash',
      label: 'Cash',
      align: 'right',
      render: (row) => formatMoney(row.cash, row.currency),
    },
  ]

  return (
    <ResponsiveTable
      label="Bestand je Währung"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.currency}
    />
  )
}
