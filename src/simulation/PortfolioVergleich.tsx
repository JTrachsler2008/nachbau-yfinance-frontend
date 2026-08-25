import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { SeriesLineChart } from '../charts/SeriesLineChart'
import { verlaufJeSerie, type LinePoint, type Serie } from '../charts/verlauf'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/DataState'
import { formatAmount, formatMonth } from '../format/numbers'
import { SimulationBadge } from './SimulationBadge'
import { VerlaufTabelle } from './VerlaufTabelle'
import { simulationsMeldung } from './fehler'
import { lesePositionen, type GewichtungsZeile } from './positionen'
import { GewichtungenFeld } from './GewichtungenFeld'
import type { ComparePortfoliosInput } from './compareApi'
import { usePortfolioComparison } from './useCompare'

/** Auswählbare Zeiträume. Der Endpunkt lässt 1 bis 100 Jahre zu. */
const zeitraeume = [1, 3, 5, 10] as const

/**
 * Vergleich zweier frei zusammengestellter Portfolios (YOUNGOITV-454).
 *
 * Beide Zusammenstellungen sind hypothetisch und werden nicht gespeichert; der Endpunkt rechnet nur
 * auf Kursreihen. Deshalb steht hier auch nichts über Gebühren, Steuern oder Cash: das Ergebnis ist
 * ein normalisierter Verlauf, kein Depotwert.
 */
export function PortfolioVergleich() {
  const [nameA, setNameA] = useState('60 / 40')
  const [nameB, setNameB] = useState('Nur Aktien')
  const [zeilenA, setZeilenA] = useState<GewichtungsZeile[]>([
    { id: 1, symbol: 'SPY', gewicht: '60' },
    { id: 2, symbol: 'AGG', gewicht: '40' },
  ])
  const [zeilenB, setZeilenB] = useState<GewichtungsZeile[]>([
    { id: 1, symbol: 'SPY', gewicht: '100' },
  ])
  const [periodYears, setPeriodYears] = useState<number>(10)

  const [fehlerA, setFehlerA] = useState<string | null>(null)
  const [fehlerB, setFehlerB] = useState<string | null>(null)
  const [nameFehler, setNameFehler] = useState<Record<'a' | 'b', string | null>>({
    a: null,
    b: null,
  })

  const [input, setInput] = useState<ComparePortfoliosInput | null>(null)
  const vergleich = usePortfolioComparison(input)

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setFehlerA(null)
    setFehlerB(null)
    setNameFehler({ a: null, b: null })

    if (nameA.trim() === '' || nameB.trim() === '') {
      setNameFehler({
        a: nameA.trim() === '' ? 'Bitte einen Namen eingeben.' : null,
        b: nameB.trim() === '' ? 'Bitte einen Namen eingeben.' : null,
      })
      return
    }

    const a = lesePositionen(zeilenA)
    const b = lesePositionen(zeilenB)
    if (!a.ok || !b.ok) {
      // Beide Seiten gleichzeitig melden: wer zwei Listen ausfüllt, will nicht zweimal abschicken,
      // um zwei Meldungen zu sehen.
      setFehlerA(a.ok ? null : a.fehler)
      setFehlerB(b.ok ? null : b.fehler)
      return
    }

    setInput({
      portfolioA: { name: nameA.trim(), positions: a.positionen },
      portfolioB: { name: nameB.trim(), positions: b.positionen },
      periodYears,
    })
  }

  const serien: Serie[] =
    vergleich.data === undefined
      ? []
      : [
          { key: 'portfolioAValue', label: vergleich.data.nameA },
          { key: 'portfolioBValue', label: vergleich.data.nameB },
        ]
  const punkte: LinePoint[] = (vergleich.data?.series ?? []).map((punkt) => ({
    label: formatMonth(punkt.date),
    values: { portfolioAValue: punkt.portfolioAValue, portfolioBValue: punkt.portfolioBValue },
  }))

  const fachlich = simulationsMeldung(vergleich.error, `${nameA} / ${nameB}`)

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" component="h2">
            Zwei eigene Portfolios vergleichen
          </Typography>
          <SimulationBadge />
        </Stack>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={3}>
            <Box
              sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}
            >
              <Stack spacing={2}>
                <TextField
                  label="Name Portfolio A"
                  size="small"
                  value={nameA}
                  onChange={(event) => setNameA(event.target.value)}
                  error={nameFehler.a !== null}
                  helperText={nameFehler.a ?? 'Frei wählbar, erscheint in der Legende.'}
                  fullWidth
                />
                <GewichtungenFeld
                  label="Portfolio A"
                  zeilen={zeilenA}
                  onChange={setZeilenA}
                  fehler={fehlerA}
                  hint="Gewichte sind relativ, das Backend normalisiert sie auf 100 Prozent."
                />
              </Stack>

              <Stack spacing={2}>
                <TextField
                  label="Name Portfolio B"
                  size="small"
                  value={nameB}
                  onChange={(event) => setNameB(event.target.value)}
                  error={nameFehler.b !== null}
                  helperText={nameFehler.b ?? 'Frei wählbar, erscheint in der Legende.'}
                  fullWidth
                />
                <GewichtungenFeld
                  label="Portfolio B"
                  zeilen={zeilenB}
                  onChange={setZeilenB}
                  fehler={fehlerB}
                  hint="Tickersymbole des Marktdatenanbieters, etwa SPY, AGG oder GLD."
                />
              </Stack>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
              <TextField
                select
                label="Zeitraum"
                size="small"
                value={periodYears}
                onChange={(event) => setPeriodYears(Number(event.target.value))}
                sx={{ minWidth: 160 }}
              >
                {zeitraeume.map((jahre) => (
                  <MenuItem key={jahre} value={jahre}>
                    {jahre} {jahre === 1 ? 'Jahr' : 'Jahre'}
                  </MenuItem>
                ))}
              </TextField>
              <Button type="submit" variant="contained" loading={vergleich.isFetching}>
                Vergleichen
              </Button>
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ mt: 3 }}>
          {input === null ? (
            <EmptyPanel>
              Noch kein Vergleich gerechnet. Zusammenstellungen prüfen und auf "Vergleichen" klicken.
            </EmptyPanel>
          ) : vergleich.isPending || vergleich.isFetching ? (
            <LoadingPanel
              rows={4}
              hint="Der Vergleich holt für jedes Symbol eine Kursreihe und kann einige Sekunden dauern."
            />
          ) : vergleich.isError ? (
            fachlich !== null ? (
              <EmptyPanel>{fachlich}</EmptyPanel>
            ) : (
              <ErrorPanel
                error={vergleich.error}
                onRetry={() => void vergleich.refetch()}
                title="Der Vergleich konnte nicht gerechnet werden"
              />
            )
          ) : punkte.length === 0 ? (
            <EmptyPanel>
              Zu diesen Symbolen liegen im gewählten Zeitraum keine Kurse vor. Ohne Kurse gibt es
              keinen Verlauf.
            </EmptyPanel>
          ) : (
            <Stack spacing={2}>
              <SeriesLineChart
                title="Normalisierter Verlauf beider Zusammenstellungen"
                points={punkte}
                series={serien}
                formatValue={(wert) => formatAmount(wert)}
                empty="Keine Kursreihe im gewählten Zeitraum."
              />
              <VerlaufTabelle label="Portfolios im Vergleich" rows={verlaufJeSerie(punkte, serien)} />
              <Typography variant="caption" color="text.secondary">
                Beide Reihen starten bei 100. Fehlt einem Symbol der Kurs zu einem Datum, fällt das
                ganze Portfolio an diesem Datum aus der Reihe, weil eine Teilsumme kein
                Portfoliowert wäre.
              </Typography>
            </Stack>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
