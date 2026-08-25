import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import {
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { useIsMobile } from '../components/useIsMobile'
import { formatPercent } from '../format/numbers'
import { useChartColors } from './useChartColors'

/** Ein Punkt der Risiko-Rendite-Ebene. Beide Werte in Prozent, wie das Backend sie liefert. */
export interface RiskReturnPoint {
  key: string
  label: string
  volatility: number
  annualizedReturn: number
}

/**
 * Eine Punktmenge mit eigener Farbe und eigenem Eintrag in der Legende.
 *
 * Gruppen und nicht ein Punkt je Farbe: Recharts baut die Legende aus den Reihen, und mit einer Reihe
 * je Wertpapier stünde bei zwanzig Positionen eine zwanzigzeilige Legende neben dem Diagramm. Die
 * Zuordnung der einzelnen Punkte übernimmt die Beschriftung am Punkt.
 */
export interface RiskReturnGroup {
  key: string
  label: string
  points: readonly RiskReturnPoint[]
  /** Punkte am Symbol beschriften. Für eine Gruppe mit einem einzigen Punkt unnötig. */
  labelPoints?: boolean
}

/** Höhe auf Telefonen, wie bei den übrigen Diagrammen (Responsive-Konzept, YOUNGOITV-458). */
const mobileHeight = 240

/**
 * Streudiagramm Volatilität gegen Rendite.
 *
 * Die Aussage steckt in der Lage zueinander: ein Titel links oben trägt mehr Rendite bei weniger
 * Schwankung als einer rechts unten, und das Portfolio liegt bei gelungener Streuung links von seinen
 * Bestandteilen. Genau dafür braucht das Diagramm die Benchmark als dritten Punkt, denn ohne
 * Bezugsgrösse ist eine Volatilität von 18 % weder hoch noch niedrig.
 *
 * Beide Achsen mit `domain={['auto', 'auto']}`: eine bei 0 beginnende Renditeachse würde bei lauter
 * positiven Renditen die Unterschiede zusammendrücken, und negative Renditen gibt es hier ohnehin.
 *
 * Wie die übrigen Diagramme ein `img` mit beschreibendem Namen, dessen Text alle Punkte nennt. Die
 * Zahlen stehen zusätzlich in der Tabelle darunter.
 */
export function RiskReturnScatter({
  title,
  groups,
  empty,
  height = 320,
}: {
  title: string
  groups: readonly RiskReturnGroup[]
  empty: string
  height?: number
}) {
  const colors = useChartColors()
  const isMobile = useIsMobile()
  const chartHeight = isMobile ? Math.min(mobileHeight, height) : height

  const gefuellt = groups.filter((group) => group.points.length > 0)

  if (gefuellt.length === 0) {
    return (
      <Box>
        <Typography variant="subtitle2" component="h3" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {empty}
        </Typography>
      </Box>
    )
  }

  const beschreibung = gefuellt
    .flatMap((group) =>
      group.points.map(
        (point) =>
          `${point.label} ${formatPercent(point.volatility)} Volatilität bei ${formatPercent(point.annualizedReturn, { withSign: true })} Rendite`,
      ),
    )
    .join(', ')

  return (
    <Box>
      <Typography variant="subtitle2" component="h3" gutterBottom>
        {title}
      </Typography>
      <Box role="img" aria-label={`${title}: ${beschreibung}`} sx={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart accessibilityLayer={false} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke={colors.grid} />
            <XAxis
              type="number"
              dataKey="volatility"
              name="Volatilität"
              stroke={colors.axis}
              tickLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(value) => formatPercent(Number(value))}
            />
            <YAxis
              type="number"
              dataKey="annualizedReturn"
              name="Rendite"
              stroke={colors.axis}
              tickLine={false}
              width={72}
              domain={['auto', 'auto']}
              tickFormatter={(value) => formatPercent(Number(value))}
            />
            {/* Ohne dritte Grösse, aber mit fester Punktgrösse: sonst skaliert Recharts die Punkte
                nach einem Wert, den es hier nicht gibt. */}
            <ZAxis range={[90, 90]} />
            <Tooltip
              formatter={(value) => formatPercent(Number(value))}
              contentStyle={{
                backgroundColor: colors.tooltipBackground,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 10,
                color: colors.text,
              }}
            />
            <Legend />
            {gefuellt.map((group, index) => (
              <Scatter
                key={group.key}
                name={group.label}
                data={group.points as RiskReturnPoint[]}
                fill={colors.serie(index)}
                isAnimationActive={false}
              >
                {group.labelPoints === true && (
                  <LabelList dataKey="label" position="top" fill={colors.text} fontSize={12} />
                )}
              </Scatter>
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}
