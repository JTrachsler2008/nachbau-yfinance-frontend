import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { SeriesLineChart } from '../charts/SeriesLineChart'
import { verlaufJeSerie, type LinePoint, type Serie } from '../charts/verlauf'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/DataState'
import { gestern, vorJahren } from '../format/dates'
import { formatAmount, formatDate, formatMonth } from '../format/numbers'
import { SimulationBadge } from './SimulationBadge'
import { VerlaufTabelle } from './VerlaufTabelle'
import { useAssetClassComparison } from './useCompare'

/** Zeiträume wie im Original als Presets. Der Endpunkt erlaubt 1 bis 100 Jahre. */
const zeitraeume = [1, 3, 5, 10] as const

/** Sentinel-Wert der Zeitraum-Auswahl für "eigenes Intervall", damit ein einziges Bedienelement reicht. */
const BENUTZERDEFINIERT = 'custom'

/**
 * Vergleich der Standard-Anlageklassen (YOUNGOITV-454).
 *
 * Die Reihen sind auf 100 zum ersten Datum mit Kurs normalisiert, laufen also nicht auf einer Währung.
 * Beschriftet wird mit Klasse und tatsächlichem Ticker: das Original zeigte im Auswahlfeld "MSCI
 * World" und "SMI", sendete aber `MSCI` und `SMI` und bekam damit andere oder keine Daten. Das Backend
 * verwendet jetzt `URTH` und `EWL`, und die Oberfläche nennt beides, damit die Zuordnung nachprüfbar
 * bleibt.
 */
export function AnlageklassenVergleich() {
  const [auswahl, setAuswahl] = useState<number | typeof BENUTZERDEFINIERT>(10)
  const [customFrom, setCustomFrom] = useState(vorJahren(1))
  const [customTo, setCustomTo] = useState(gestern())

  const istBenutzerdefiniert = auswahl === BENUTZERDEFINIERT
  const customGueltig = customFrom !== '' && customTo !== '' && customFrom < customTo
  const zeitraum = istBenutzerdefiniert
    ? ({ kind: 'custom', from: customFrom, to: customTo } as const)
    : ({ kind: 'preset', periodYears: auswahl } as const)
  const vergleich = useAssetClassComparison(zeitraum, !istBenutzerdefiniert || customGueltig)
  const zeitraumLabel = istBenutzerdefiniert
    ? `${formatDate(customFrom)}–${formatDate(customTo)}`
    : `${auswahl} ${auswahl === 1 ? 'Jahr' : 'Jahre'}`

  const serien: Serie[] = (vergleich.data?.assetClasses ?? []).map((klasse) => ({
    key: klasse.symbol,
    label: `${klasse.label} (${klasse.symbol})`,
  }))
  const punkte: LinePoint[] = (vergleich.data?.series ?? []).map((punkt) => ({
    label: formatMonth(punkt.date),
    values: punkt.valuesBySymbol,
  }))
  const verlaeufe = verlaufJeSerie(punkte, serien)

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2 }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle2" component="h2">
              Anlageklassen im Vergleich
            </Typography>
            <SimulationBadge />
          </Stack>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={auswahl}
            onChange={(_event, wert: number | typeof BENUTZERDEFINIERT | null) => {
              if (wert !== null) {
                setAuswahl(wert)
              }
            }}
            aria-label="Zeitraum"
          >
            {zeitraeume.map((jahre) => (
              <ToggleButton key={jahre} value={jahre}>
                {jahre} {jahre === 1 ? 'Jahr' : 'Jahre'}
              </ToggleButton>
            ))}
            <ToggleButton value={BENUTZERDEFINIERT}>Benutzerdefiniert</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {istBenutzerdefiniert && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="Von"
              type="date"
              size="small"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              error={!customGueltig}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: gestern() } }}
            />
            <TextField
              label="Bis"
              type="date"
              size="small"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              error={!customGueltig}
              helperText={customGueltig ? undefined : '"Von" muss vor "Bis" liegen, "Bis" höchstens gestern.'}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: gestern() } }}
            />
          </Stack>
        )}

        {vergleich.isPending ? (
          <LoadingPanel
            rows={5}
            hint="Der Vergleich holt Kursreihen über mehrere Jahre und kann einige Sekunden dauern."
          />
        ) : vergleich.isError ? (
          <ErrorPanel
            error={vergleich.error}
            onRetry={() => void vergleich.refetch()}
            title="Der Vergleich konnte nicht geladen werden"
          />
        ) : serien.length === 0 ? (
          <EmptyPanel>
            Für keine der Anlageklassen liegen Kurse vor. Der Vergleich braucht historische Kurse des
            Marktdatenanbieters; ohne sie bleibt die Reihe leer, statt eine erfundene zu zeigen.
          </EmptyPanel>
        ) : (
          <Stack spacing={2}>
            <SeriesLineChart
              title={`Normalisierter Verlauf über ${zeitraumLabel}`}
              points={punkte}
              series={serien}
              formatValue={(wert) => formatAmount(wert)}
              empty="Keine Kursreihe im gewählten Zeitraum."
            />
            <VerlaufTabelle label="Anlageklassen" rows={verlaeufe} />
            <Typography variant="caption" color="text.secondary">
              Jede Reihe startet bei 100 zum ersten Datum, an dem ein Kurs vorliegt. Fehlt ein Kurs
              zwischendurch, bleibt eine Lücke in der Linie, statt sie geradeaus weiterzuziehen. Die
              Werte sind indexiert und tragen deshalb keine Währung.
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}
