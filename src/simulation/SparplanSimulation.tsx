import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { SeriesLineChart } from '../charts/SeriesLineChart'
import type { LinePoint, Serie } from '../charts/verlauf'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/DataState'
import { KpiCard } from '../components/KpiCard'
import { toneFor } from '../components/kpiTone'
import { ResponsiveTable, type Column } from '../components/ResponsiveTable'
import { heute, vorJahren } from '../format/dates'
import { formatAmount, formatDate, formatMonth, formatPercent, parseAmount } from '../format/numbers'
import { SimulationBadge } from './SimulationBadge'
import { allokationZeilen, umschichtungenText, type AllokationsZeile } from './allokation'
import { simulationsMeldung } from './fehler'
import { GewichtungenFeld } from './GewichtungenFeld'
import { lesePositionen, positionenParameter, type GewichtungsZeile } from './positionen'
import {
  rebalancingModeLabels,
  rebalancingModes,
  rebalancingReasonLabel,
  type RebalancingEvent,
  type RebalancingMode,
  type SparplanParams,
} from './simulationApi'
import { useSparplan } from './useSimulation'

/** Einzahlungsrhythmen. Der Endpunkt nimmt jede Monatszahl, diese vier deckt der Alltag ab. */
const intervalle = [
  { monate: 1, label: 'monatlich' },
  { monate: 3, label: 'quartalsweise' },
  { monate: 6, label: 'halbjährlich' },
  { monate: 12, label: 'jährlich' },
] as const

/** Grenze des Controllers: weiter zurück gibt es keine Simulation. */
const maxJahreZurueck = 40

/**
 * Sparplan-Simulation mit Rebalancing (YOUNGOITV-455, UC-03).
 *
 * Rein hypothetisch: die Simulation kennt kein Portfolio, keine Konten und keine Buchungen, sie legt
 * die Einzahlungen auf historische Kurse und schreibt nichts zurück. Deshalb trägt jede Ergebniskarte
 * die Marke "Simulation".
 *
 * Beide Rebalancing-Arten des Backends sind wählbar: periodisch alle X Monate und über ein
 * Toleranzband, das nur bei einer Abweichung von mehr als X Prozentpunkten umschichtet. Je Art ist nur
 * das Feld sichtbar, das sie auswertet, damit kein eingetippter Wert stillschweigend verfällt.
 */
export function SparplanSimulation() {
  const [startDate, setStartDate] = useState(vorJahren(5))
  const [amountText, setAmountText] = useState('500')
  const [intervalMonths, setIntervalMonths] = useState<number>(1)
  const [zeilen, setZeilen] = useState<GewichtungsZeile[]>([
    { id: 1, symbol: 'SPY', gewicht: '60' },
    { id: 2, symbol: 'AGG', gewicht: '40' },
  ])
  const [rebalancing, setRebalancing] = useState(false)
  const [rebalancingMode, setRebalancingMode] = useState<RebalancingMode>('INTERVAL')
  const [intervalText, setIntervalText] = useState('12')
  const [bandText, setBandText] = useState('10')

  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [positionsFehler, setPositionsFehler] = useState<string | null>(null)

  const [params, setParams] = useState<SparplanParams | null>(null)
  const sparplan = useSparplan(params)

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setFehler({})
    setPositionsFehler(null)

    if (startDate === '') {
      setFehler({ startDate: 'Bitte ein Startdatum wählen.' })
      return
    }
    if (startDate >= heute()) {
      setFehler({ startDate: 'Der Start muss in der Vergangenheit liegen.' })
      return
    }
    if (startDate < vorJahren(maxJahreZurueck)) {
      setFehler({
        startDate: `Der Start darf höchstens ${maxJahreZurueck} Jahre zurückliegen.`,
      })
      return
    }

    const amount = parseAmount(amountText)
    if (amount === null || amount <= 0) {
      setFehler({ amount: 'Bitte einen Betrag grösser als 0 eingeben.' })
      return
    }

    const positionen = lesePositionen(zeilen)
    if (!positionen.ok) {
      setPositionsFehler(positionen.fehler)
      return
    }

    const rebalancingIntervalMonths = parseAmount(intervalText)
    if (rebalancing && rebalancingMode === 'INTERVAL') {
      if (rebalancingIntervalMonths === null || rebalancingIntervalMonths < 1) {
        setFehler({ interval: 'Bitte mindestens 1 Monat angeben.' })
        return
      }
    }
    const rebalancingBandPercent = parseAmount(bandText)
    if (rebalancing && rebalancingMode === 'THRESHOLD') {
      if (rebalancingBandPercent === null || rebalancingBandPercent <= 0) {
        setFehler({ band: 'Bitte ein Toleranzband grösser als 0 angeben.' })
        return
      }
    }

    setParams({
      startDate,
      amount,
      intervalMonths,
      positions: positionenParameter(positionen.positionen),
      rebalancing,
      // Der Endpunkt verlangt beide Werte, auch wenn er je Modus nur einen auswertet. Die Vorgaben
      // des Controllers werden hier gespiegelt, damit die Anfrage vollständig ist.
      rebalancingIntervalMonths: rebalancingIntervalMonths ?? 12,
      rebalancingMode,
      rebalancingBandPercent: rebalancingBandPercent ?? 10,
    })
  }

  const ergebnis = sparplan.data
  const punkte: LinePoint[] = (ergebnis?.chartData ?? []).map((punkt) => ({
    label: formatMonth(punkt.month),
    values: { portfolioValue: punkt.portfolioValue, invested: punkt.invested },
  }))
  const serien: Serie[] = [
    { key: 'portfolioValue', label: 'Depotwert' },
    { key: 'invested', label: 'Eingezahlt' },
  ]
  const fachlich = simulationsMeldung(sparplan.error, 'diesen Sparplan')

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" component="h2">
              Sparplan
            </Typography>
            <SimulationBadge />
          </Stack>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={3}>
              <Box
                sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' } }}
              >
                <TextField
                  label="Start"
                  type="date"
                  size="small"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: heute() } }}
                  error={fehler.startDate !== undefined}
                  helperText={fehler.startDate ?? 'Erste Einzahlung, höchstens 40 Jahre zurück.'}
                />
                <TextField
                  label="Betrag je Einzahlung"
                  size="small"
                  inputMode="decimal"
                  value={amountText}
                  onChange={(event) => setAmountText(event.target.value)}
                  error={fehler.amount !== undefined}
                  helperText={fehler.amount ?? 'In der Währung der Kurse, siehe Hinweis unten.'}
                />
                <TextField
                  select
                  label="Rhythmus"
                  size="small"
                  value={intervalMonths}
                  onChange={(event) => setIntervalMonths(Number(event.target.value))}
                >
                  {intervalle.map((intervall) => (
                    <MenuItem key={intervall.monate} value={intervall.monate}>
                      {intervall.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <GewichtungenFeld
                label="Positionen"
                zeilen={zeilen}
                onChange={setZeilen}
                fehler={positionsFehler}
                hint="Tickersymbole des Marktdatenanbieters, etwa SPY, AGG oder GLD. Die Gewichte sind relativ."
              />

              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={rebalancing}
                      onChange={(event) => setRebalancing(event.target.checked)}
                    />
                  }
                  label="Rebalancing"
                />
                {rebalancing && (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                    <TextField
                      select
                      label="Rebalancing-Art"
                      size="small"
                      value={rebalancingMode}
                      onChange={(event) => setRebalancingMode(event.target.value as RebalancingMode)}
                      sx={{ minWidth: 180 }}
                    >
                      {rebalancingModes.map((modus) => (
                        <MenuItem key={modus} value={modus}>
                          {rebalancingModeLabels[modus]}
                        </MenuItem>
                      ))}
                    </TextField>
                    {rebalancingMode === 'INTERVAL' ? (
                      <TextField
                        label="Alle x Monate"
                        size="small"
                        inputMode="numeric"
                        value={intervalText}
                        onChange={(event) => setIntervalText(event.target.value)}
                        error={fehler.interval !== undefined}
                        helperText={fehler.interval ?? 'Umschichtung nach festem Rhythmus.'}
                      />
                    ) : (
                      <TextField
                        label="Toleranzband in Prozentpunkten"
                        size="small"
                        inputMode="decimal"
                        value={bandText}
                        onChange={(event) => setBandText(event.target.value)}
                        error={fehler.band !== undefined}
                        helperText={
                          fehler.band ?? 'Umschichtung erst bei grösserer Abweichung vom Sollgewicht.'
                        }
                      />
                    )}
                  </Stack>
                )}
              </Box>

              <Box>
                <Button type="submit" variant="contained" loading={sparplan.isFetching}>
                  Simulieren
                </Button>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {params === null ? (
        <EmptyPanel>
          Noch nichts gerechnet. Parameter setzen und auf "Simulieren" klicken. Es wird nichts
          gespeichert und kein Portfolio verändert.
        </EmptyPanel>
      ) : sparplan.isPending || sparplan.isFetching ? (
        <LoadingPanel
          rows={6}
          hint="Die Simulation holt für jedes Symbol eine Kursreihe über den gesamten Zeitraum und kann einige Sekunden dauern."
        />
      ) : sparplan.isError ? (
        fachlich !== null ? (
          <EmptyPanel>{fachlich}</EmptyPanel>
        ) : (
          <ErrorPanel
            error={sparplan.error}
            onRetry={() => void sparplan.refetch()}
            title="Die Simulation konnte nicht gerechnet werden"
          />
        )
      ) : ergebnis === undefined ? null : (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
            }}
          >
            <KpiCard
              label="Endwert"
              value={formatAmount(ergebnis.endValue)}
              hint="Depotwert am Ende des Zeitraums"
            />
            <KpiCard
              label="Eingezahlt"
              value={formatAmount(ergebnis.invested)}
              hint="Summe aller Einzahlungen"
            />
            <KpiCard
              label="Gewinn"
              value={formatAmount(ergebnis.gain)}
              tone={toneFor(ergebnis.gain)}
              hint="Endwert minus Einzahlungen"
            />
            <KpiCard
              label="Gesamtrendite"
              value={formatPercent(ergebnis.totalReturnPercent, { withSign: true })}
              tone={toneFor(ergebnis.totalReturnPercent)}
              hint="Auf die Summe der Einzahlungen"
            />
            <KpiCard
              label="Rendite pro Jahr"
              value={formatPercent(ergebnis.cagrPercent, { withSign: true })}
              tone={toneFor(ergebnis.cagrPercent)}
              hint="CAGR über den Zeitraum"
            />
            <KpiCard
              label="Maximaler Rückgang"
              value={formatPercent(ergebnis.maxDrawdownPercent)}
              hint="Tiefster Einbruch vom bisherigen Höchststand"
            />
          </Box>

          <Card>
            <CardContent>
              <Stack spacing={2}>
                <SeriesLineChart
                  title="Depotwert und Einzahlungen"
                  points={punkte}
                  series={serien}
                  formatValue={(wert) => formatAmount(wert)}
                  empty="Für den gewählten Zeitraum liegen keine Kurse vor."
                />
                <Typography variant="caption" color="text.secondary">
                  Die Beträge stehen in der Währung der Kursreihen und tragen deshalb keinen
                  Währungscode: der Endpunkt liefert keine Währung mit, und bei Symbolen
                  verschiedener Handelswährungen gäbe es auch keine gemeinsame.
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle2" component="h2" gutterBottom>
                Soll und Ist am Ende
              </Typography>
              <Allokation
                rows={allokationZeilen(
                  ergebnis.targetAllocationPercent,
                  ergebnis.currentAllocationPercent,
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle2" component="h2" gutterBottom>
                Rebalancing
              </Typography>
              {!ergebnis.rebalancing ? (
                <EmptyPanel>
                  Ohne Rebalancing gerechnet. Die Gewichtung verschiebt sich dann mit den Kursen.
                </EmptyPanel>
              ) : ergebnis.rebalancingEvents.length === 0 ? (
                <EmptyPanel>
                  {rebalancingModeLabels[ergebnis.rebalancingMode]} war eingeschaltet, hat aber nie
                  ausgelöst. Beim Toleranzband heisst das: die Abweichung blieb immer innerhalb von{' '}
                  {formatPercent(ergebnis.rebalancingBandPercent)}.
                </EmptyPanel>
              ) : (
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    {rebalancingModeLabels[ergebnis.rebalancingMode]}, {ergebnis.rebalancingCount} mal
                    umgeschichtet.
                  </Typography>
                  <Ereignisse rows={ergebnis.rebalancingEvents} />
                </Stack>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  )
}

function Allokation({ rows }: { rows: readonly AllokationsZeile[] }) {
  const columns: readonly Column<AllokationsZeile>[] = [
    { key: 'symbol', label: 'Symbol', render: (row) => row.symbol, primary: true },
    { key: 'soll', label: 'Soll', align: 'right', render: (row) => formatPercent(row.soll) },
    { key: 'ist', label: 'Ist', align: 'right', render: (row) => formatPercent(row.ist) },
    {
      key: 'abweichung',
      label: 'Abweichung',
      align: 'right',
      render: (row) => formatPercent(row.abweichungPunkte, { withSign: true }),
    },
  ]

  return (
    <ResponsiveTable
      label="Soll und Ist"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.symbol}
    />
  )
}

function Ereignisse({ rows }: { rows: readonly RebalancingEvent[] }) {
  const columns: readonly Column<RebalancingEvent>[] = [
    { key: 'month', label: 'Monat', render: (row) => formatDate(row.month), primary: true },
    { key: 'reason', label: 'Auslöser', render: (row) => rebalancingReasonLabel(row.reason) },
    {
      key: 'value',
      label: 'Wert davor',
      align: 'right',
      render: (row) => formatAmount(row.portfolioValueBefore),
    },
    {
      key: 'trades',
      label: 'Umschichtung',
      render: (row) => umschichtungenText(row.trades),
    },
  ]

  return (
    <ResponsiveTable
      label="Rebalancing-Ereignisse"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.month}
    />
  )
}
