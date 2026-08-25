import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { SeriesLineChart } from '../charts/SeriesLineChart'
import { verlaufJeSerie, type LinePoint, type Serie } from '../charts/verlauf'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/DataState'
import { formatAmount, formatMonth } from '../format/numbers'
import { SimulationBadge } from './SimulationBadge'
import { VerlaufTabelle } from './VerlaufTabelle'
import { useAssetClassComparison } from './useCompare'

/** Zeiträume wie im Original als Presets. Der Endpunkt erlaubt 1 bis 100 Jahre. */
const zeitraeume = [1, 3, 5, 10] as const

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
  const [period, setPeriod] = useState<number>(10)
  const vergleich = useAssetClassComparison(period)

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
            value={period}
            onChange={(_event, wert: number | null) => {
              if (wert !== null) {
                setPeriod(wert)
              }
            }}
            aria-label="Zeitraum"
          >
            {zeitraeume.map((jahre) => (
              <ToggleButton key={jahre} value={jahre}>
                {jahre} {jahre === 1 ? 'Jahr' : 'Jahre'}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

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
              title={`Normalisierter Verlauf über ${period} ${period === 1 ? 'Jahr' : 'Jahre'}`}
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
