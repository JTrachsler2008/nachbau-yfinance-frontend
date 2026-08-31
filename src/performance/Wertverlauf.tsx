import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { UseQueryResult } from '@tanstack/react-query'
import { SeriesLineChart } from '../charts/SeriesLineChart'
import { VerlaufTabelle } from '../charts/VerlaufTabelle'
import { verlaufJeSerie, type LinePoint, type Serie } from '../charts/verlauf'
import { ErrorPanel, LoadingPanel } from '../components/DataState'
import { formatAmount, formatDate, formatMoney } from '../format/numbers'
import { ausschlussGrund } from '../risk/ausschluesse'
import type { PortfolioHistory } from './performanceApi'

/**
 * Wertverlauf des Portfolios als zwei Linien-Diagramme.
 *
 * Zwei und nicht eines, weil sie zwei Fragen beantworten und zwei Einheiten haben. Das erste zeigt
 * Depotwert gegen Einsatz in der Basiswährung: der Abstand zwischen den Linien ist der Gewinn, und
 * eine steigende Wertlinie allein sagt nichts darüber, ob sie durch Kursgewinne oder durch Zukäufe
 * gestiegen ist. Das zweite zeigt die bereinigte Entwicklung gegen die Benchmark, beide auf 100
 * normiert - nur so ist ein Depot mit monatlichen Einzahlungen überhaupt mit einem Index vergleichbar.
 *
 * Lücken bleiben Lücken (`connectNulls` ist im Diagramm aus): ein Tag, an dem ein gehaltenes
 * Wertpapier keinen Kurs hat, hat keinen Depotwert, und eine durchgezogene Linie würde dort eine
 * Entwicklung behaupten, die niemand kennt.
 */
export function Wertverlauf({
  verlauf,
  currency,
  zeitraumLabel,
}: {
  verlauf: UseQueryResult<PortfolioHistory>
  currency: string
  zeitraumLabel: string
}) {
  const daten = verlauf.data
  const referenz = daten?.benchmarkSymbol ?? ''

  const punkte: LinePoint[] = (daten?.points ?? []).map((punkt) => ({
    label: formatDate(punkt.date),
    values: {
      value: punkt.value,
      invested: punkt.invested,
      index: punkt.index,
      benchmark: punkt.benchmarkIndex,
    },
  }))

  const geldSerien: Serie[] = [
    { key: 'value', label: 'Depotwert' },
    { key: 'invested', label: 'Einsatz' },
  ]
  const indexSerien: Serie[] = [
    { key: 'index', label: 'Portfolio' },
    { key: 'benchmark', label: `Benchmark ${referenz}` },
  ]

  // Die Reihe beginnt später als angefragt, wenn an den früheren Tagen ein Kurs oder ein Wechselkurs
  // fehlte. Das gehört sichtbar dazu: sonst wirkt der Zeitraum kürzer gewählt, als er war.
  const beginntSpaeter =
    daten !== undefined && daten.seriesFrom !== null && daten.seriesFrom > daten.from
  const ausschluesse = daten?.excluded ?? []

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle2" component="h2">
            Wertverlauf ({zeitraumLabel})
          </Typography>

          {verlauf.isPending ? (
            <LoadingPanel rows={6} />
          ) : verlauf.isError ? (
            <ErrorPanel
              error={verlauf.error}
              onRetry={() => void verlauf.refetch()}
              title="Der Wertverlauf konnte nicht geladen werden"
            />
          ) : (
            <>
              {(beginntSpaeter || ausschluesse.length > 0) && (
                <Alert severity="warning">
                  <AlertTitle>Nicht der ganze Zeitraum ist bewertbar</AlertTitle>
                  {beginntSpaeter && (
                    <Typography variant="body2" gutterBottom>
                      Die Linie beginnt erst am {formatDate(daten.seriesFrom)} statt am{' '}
                      {formatDate(daten.from)}. Für die Tage davor fehlte zu mindestens einem
                      gehaltenen Wertpapier ein Kurs oder ein Wechselkurs. Die zeitgewichtete Rendite
                      bezieht sich deshalb ebenfalls erst auf diesen Tag.
                    </Typography>
                  )}
                  {ausschluesse.map((ausschluss) => (
                    <Typography key={ausschluss.symbol} variant="body2">
                      <strong>{ausschluss.symbol}</strong>: {ausschlussGrund(ausschluss.reason)}
                    </Typography>
                  ))}
                </Alert>
              )}

              <SeriesLineChart
                title={`Depotwert und Einsatz in ${currency}`}
                points={punkte}
                series={geldSerien}
                formatValue={(wert) => formatMoney(wert, currency)}
                empty="Für diesen Zeitraum liegt kein bewertbarer Tag vor."
              />

              {/*
                Nur eine Tabelle, und zwar zu den Beträgen. Für die zweite Linie stehen Start (100),
                Ende und Veränderung schon als Kennzahlen oben auf der Seite - eine Tabelle daneben
                wäre dieselbe Aussage ein zweites Mal.
              */}
              <VerlaufTabelle
                label="Depotwert und Einsatz"
                rows={verlaufJeSerie(punkte, geldSerien)}
                formatWert={(wert) => formatMoney(wert, currency)}
              />

              <SeriesLineChart
                title="Entwicklung im Vergleich, Basis 100"
                points={punkte}
                series={indexSerien}
                formatValue={formatAmount}
                empty="Ohne bewertbaren Tag gibt es keine Vergleichslinie."
              />

              <Typography variant="caption" color="text.secondary">
                Der Depotwert zählt nur die Wertpapiere, nicht den Kontostand - wie der Marktwert
                oben. Die Vergleichslinie ist von Ein- und Auszahlungen bereinigt und deshalb die
                einzige der beiden, die sich mit einem Index vergleichen lässt.
              </Typography>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
