import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { RiskReturnScatter, type RiskReturnGroup, type RiskReturnPoint } from '../charts/RiskReturnScatter'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/DataState'
import { KpiCard } from '../components/KpiCard'
import { toneFor } from '../components/kpiTone'
import { PageHeader } from '../components/PageHeader'
import { ResponsiveTable, type Column } from '../components/ResponsiveTable'
import { formatAmount, formatDate, formatPercent } from '../format/numbers'
import { PortfolioGate } from '../portfolios/PortfolioGate'
import type { Portfolio } from '../portfolios/portfolioApi'
import { ausschlussGrund } from '../risk/ausschluesse'
import type { SecurityRisk } from '../risk/riskApi'
import { useRiskAnalysis } from '../risk/useRisk'

/**
 * Zeiträume als Presets in Kalendertagen, weil der Endpunkt `lookbackDays` so versteht (30 bis 3650).
 * Der UI/UX-Plan nennt 3 Monate bis 5 Jahre; ein freies Datumsintervall bietet der Endpunkt nicht, und
 * ein Feld, das die Eingabe anschliessend auf einen Zeitraum bis gestern zurechtbiegt, wäre eine
 * vorgetäuschte Freiheit.
 */
const zeitraeume = [
  { tage: 90, label: '3 Monate' },
  { tage: 365, label: '1 Jahr' },
  { tage: 1095, label: '3 Jahre' },
  { tage: 1825, label: '5 Jahre' },
] as const

/**
 * Auswahl der Benchmark. Dieselben Ticker wie beim Anlageklassen-Vergleich (YOUNGOITV-454), damit ein
 * Beta gegen "MSCI World" hier und eine Linie dort auf derselben Kursreihe beruhen. Beschriftet mit
 * Name und Ticker, weil das Original Namen anzeigte und Symbole sendete, die es nicht gab.
 */
const benchmarks = [
  { symbol: 'SPY', label: 'S&P 500 (SPY)' },
  { symbol: 'URTH', label: 'MSCI World (URTH)' },
  { symbol: 'EWL', label: 'SMI Schweiz (EWL)' },
] as const

/**
 * Risiko-Seite des aktiven Portfolios (YOUNGOITV-453).
 *
 * Alle Kennzahlen kommen aus einem einzigen Aufruf von `GET /portfolios/{id}/risk`. Deshalb sitzt der
 * Fehlerzustand an der ganzen Gruppe und nicht in jeder Karte: sechs Karten mit derselben Meldung
 * wären sechsmal dieselbe Information.
 *
 * Was das Backend nicht bestimmen kann, bleibt leer. Ein Beta ohne Benchmark-Kurse steht als "–" da
 * und nicht als 1.00, wie es im Original der Fall war, und die Ausschlussliste nennt jedes Wertpapier,
 * das nicht in die Rechnung eingehen konnte.
 */
export function RisikoPage() {
  return <PortfolioGate>{(portfolio) => <Risiko portfolio={portfolio} />}</PortfolioGate>
}

function Risiko({ portfolio }: { portfolio: Portfolio }) {
  const [lookbackDays, setLookbackDays] = useState<number>(365)
  const [benchmark, setBenchmark] = useState<string>(benchmarks[0].symbol)
  const analyse = useRiskAnalysis(portfolio.id, lookbackDays, benchmark)
  const daten = analyse.data

  const zeitraum = zeitraeume.find((eintrag) => eintrag.tage === lookbackDays)?.label ?? ''
  // Das Symbol aus der Antwort und nicht aus dem Zustand: so steht in der Beschriftung die Benchmark,
  // gegen die tatsächlich gerechnet wurde.
  const referenz = daten?.benchmarkSymbol ?? benchmark
  const wertpapiere = daten?.securities ?? []
  const ausschluesse = daten?.excluded ?? []

  const gruppen: RiskReturnGroup[] = [
    {
      key: 'portfolio',
      label: 'Portfolio',
      points: punkt('portfolio', 'Portfolio', daten?.volatility, daten?.annualizedReturn),
    },
    {
      key: 'benchmark',
      label: `Benchmark ${referenz}`,
      points: punkt('benchmark', referenz, daten?.benchmarkVolatility, daten?.benchmarkReturn),
    },
    {
      key: 'securities',
      label: 'Wertpapiere',
      points: wertpapiere.flatMap((wertpapier) =>
        punkt(wertpapier.symbol, wertpapier.symbol, wertpapier.volatility, wertpapier.annualizedReturn),
      ),
      labelPoints: true,
    },
  ]

  return (
    <>
      <PageHeader title="Risiko" subtitle={`Portfolio ${portfolio.name}`} />

      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
              <ToggleButtonGroup
                size="small"
                exclusive
                value={lookbackDays}
                onChange={(_event, wert: number | null) => {
                  if (wert !== null) {
                    setLookbackDays(wert)
                  }
                }}
                aria-label="Zeitraum"
              >
                {zeitraeume.map((eintrag) => (
                  <ToggleButton key={eintrag.tage} value={eintrag.tage}>
                    {eintrag.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <TextField
                select
                size="small"
                label="Benchmark"
                value={benchmark}
                onChange={(event) => setBenchmark(event.target.value)}
                sx={{ minWidth: 220 }}
              >
                {benchmarks.map((eintrag) => (
                  <MenuItem key={eintrag.symbol} value={eintrag.symbol}>
                    {eintrag.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </CardContent>
        </Card>

        {analyse.isError ? (
          <ErrorPanel
            error={analyse.error}
            onRetry={() => void analyse.refetch()}
            title="Die Risikoanalyse konnte nicht geladen werden"
          />
        ) : (
          <>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
              }}
            >
              <KpiCard
                label="Rendite p.a."
                value={formatPercent(daten?.annualizedReturn, { withSign: true })}
                hint={`Verkettete Tagesrenditen, hochgerechnet auf 252 Handelstage (${zeitraum})`}
                tone={toneFor(daten?.annualizedReturn)}
                isPending={analyse.isPending}
              />
              <KpiCard
                label="Volatilität p.a."
                value={formatPercent(daten?.volatility)}
                hint={`Schwankung der Tagesrenditen, annualisiert. Benchmark ${referenz}: ${formatPercent(daten?.benchmarkVolatility)}`}
                isPending={analyse.isPending}
              />
              <KpiCard
                label="Sharpe Ratio"
                value={formatAmount(daten?.sharpeRatio)}
                hint={`Rendite über dem risikofreien Zins von ${formatPercent(daten?.riskFreeRate)} je Einheit Schwankung`}
                tone={toneFor(daten?.sharpeRatio)}
                isPending={analyse.isPending}
              />
              <KpiCard
                label={`Beta zu ${referenz}`}
                value={formatAmount(daten?.beta)}
                hint="Über 1 schwankt das Portfolio stärker als die Benchmark, unter 1 schwächer"
                isPending={analyse.isPending}
              />
              <KpiCard
                label="Maximaler Rückgang"
                value={formatPercent(daten?.maxDrawdown)}
                hint="Grösster Verlust gegenüber dem bis dahin höchsten Stand im Zeitraum"
                tone={toneFor(daten?.maxDrawdown)}
                isPending={analyse.isPending}
              />
              <KpiCard
                label="Value at Risk 95 %"
                value={formatPercent(daten?.valueAtRisk95)}
                hint="An einem von zwanzig Handelstagen fiel die Tagesrendite schlechter aus"
                tone={toneFor(daten?.valueAtRisk95)}
                isPending={analyse.isPending}
              />
            </Box>

            <Card>
              <CardContent>
                <Typography variant="subtitle2" component="h2" sx={{ mb: 2 }}>
                  Risiko und Rendite je Wertpapier
                </Typography>

                {analyse.isPending ? (
                  <LoadingPanel
                    rows={5}
                    hint="Die Analyse holt für jedes Wertpapier und für die Benchmark eine Kursreihe und kann einige Sekunden dauern."
                  />
                ) : wertpapiere.length === 0 ? (
                  <EmptyPanel>
                    {ausschluesse.length > 0
                      ? 'Für kein Wertpapier des Portfolios liessen sich Kennzahlen rechnen. Die Liste darunter nennt für jedes den Grund.'
                      : 'Noch kein Wertpapier im Bestand. Nach dem ersten Kauf stehen hier Volatilität, Sharpe Ratio, Beta und die Verlustkennzahlen.'}
                  </EmptyPanel>
                ) : (
                  <Stack spacing={2}>
                    <RiskReturnScatter
                      title={`Volatilität gegen Rendite über ${zeitraum}`}
                      groups={gruppen}
                      empty="Für keinen Punkt liegen Rendite und Volatilität zusammen vor."
                    />
                    <Wertpapiertabelle rows={wertpapiere} />
                    <Typography variant="caption" color="text.secondary">
                      {daten !== undefined && (
                        <>
                          Gerechnet auf {daten.observations} Handelstagen zwischen{' '}
                          {formatDate(daten.from)} und {formatDate(daten.to)}.{' '}
                        </>
                      )}
                      {daten?.diversificationBenefit !== null &&
                      daten?.diversificationBenefit !== undefined ? (
                        <>
                          Die Streuung bringt {formatPercent(daten.diversificationBenefit)}: so viel
                          unter der gewichteten Summe der Einzelvolatilitäten liegt das Portfolio, weil
                          sich die Titel nicht gleichzeitig gleich bewegen.
                        </>
                      ) : (
                        <>
                          Ein Diversifikationsgewinn ist erst ab zwei auswertbaren Wertpapieren eine
                          sinnvolle Frage und bleibt darunter leer.
                        </>
                      )}
                    </Typography>
                  </Stack>
                )}
              </CardContent>
            </Card>

            {ausschluesse.length > 0 && (
              <Alert severity="warning">
                <AlertTitle>Nicht in der Rechnung enthalten</AlertTitle>
                <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
                  {ausschluesse.map((eintrag) => (
                    <li key={`${eintrag.symbol}-${eintrag.reason}`}>
                      <strong>{eintrag.symbol}</strong>: {ausschlussGrund(eintrag.reason)}
                    </li>
                  ))}
                </Stack>
              </Alert>
            )}
          </>
        )}

        <Alert severity="info">
          <AlertTitle>Wie die Zahlen zu lesen sind</AlertTitle>
          Gerechnet wird mit dem <strong>heutigen</strong> Bestand, zurückprojiziert über den
          Zeitraum. Wer zwischendurch umgeschichtet hat, sieht also nicht das Risiko des damaligen
          Portfolios, sondern das des heutigen, gemessen am Verhalten der Kurse in diesem Zeitraum.
          Grundlage sind Kursrenditen in der jeweiligen Handelswährung; Wechselkursbewegungen sind
          nicht enthalten, weil die Wechselkurse als einzelne Stichtage erfasst sind und eine
          fortgeschriebene Reihe eine Währungsschwankung von null vortäuschen würde. Ein Radar-Profil
          fehlt bewusst: es müsste Prozentwerte und Verhältniszahlen auf eine gemeinsame Achse
          normieren, und diese Skalierung wäre eine Erfindung der Oberfläche.
        </Alert>
      </Stack>
    </>
  )
}

/**
 * Ein Punkt für das Streudiagramm, oder keiner.
 *
 * Als Liste, damit ein unvollständiger Punkt über `flatMap` einfach wegfällt: fehlt eine der beiden
 * Achsen, gibt es keine Stelle in der Ebene, und eine ersetzte 0 würde einen Titel ohne Kursdaten als
 * schwankungsfrei bei Nullrendite zeichnen.
 */
function punkt(
  key: string,
  label: string,
  volatility: number | null | undefined,
  annualizedReturn: number | null | undefined,
): RiskReturnPoint[] {
  if (
    volatility === null ||
    volatility === undefined ||
    annualizedReturn === null ||
    annualizedReturn === undefined
  ) {
    return []
  }
  return [{ key, label, volatility, annualizedReturn }]
}

/** Zahlenwerk unter dem Diagramm. Gleichzeitig die Textalternative zu den Punkten. */
function Wertpapiertabelle({ rows }: { rows: readonly SecurityRisk[] }) {
  const columns: readonly Column<SecurityRisk>[] = [
    { key: 'symbol', label: 'Symbol', render: (row) => row.symbol, primary: true },
    {
      key: 'name',
      label: 'Name',
      render: (row) => row.securityName,
      // Auf Mobile steht das Symbol als Kartenüberschrift darüber, der Name wäre eine Wiederholung.
      hideOnMobile: true,
    },
    {
      key: 'weight',
      label: 'Anteil',
      align: 'right',
      render: (row) => formatPercent(row.weight),
    },
    {
      key: 'return',
      label: 'Rendite p.a.',
      align: 'right',
      render: (row) => formatPercent(row.annualizedReturn, { withSign: true }),
    },
    {
      key: 'volatility',
      label: 'Volatilität',
      align: 'right',
      render: (row) => formatPercent(row.volatility),
    },
    {
      key: 'sharpe',
      label: 'Sharpe',
      align: 'right',
      render: (row) => formatAmount(row.sharpeRatio),
    },
    { key: 'beta', label: 'Beta', align: 'right', render: (row) => formatAmount(row.beta) },
    {
      key: 'drawdown',
      label: 'Max. Rückgang',
      align: 'right',
      render: (row) => formatPercent(row.maxDrawdown),
    },
    {
      key: 'var',
      label: 'VaR 95 %',
      align: 'right',
      render: (row) => formatPercent(row.valueAtRisk95),
    },
  ]

  return (
    <ResponsiveTable
      label="Kennzahlen je Wertpapier"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.symbol}
    />
  )
}
