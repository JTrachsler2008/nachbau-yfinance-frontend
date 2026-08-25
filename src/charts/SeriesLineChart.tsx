import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { verlaufJeSerie, type LinePoint, type Serie } from './verlauf'
import { useChartColors } from './useChartColors'

interface SeriesLineChartProps {
  /** Überschrift und Grundlage der Beschreibung für Screenreader. */
  title: string
  points: readonly LinePoint[]
  series: readonly Serie[]
  /**
   * Formatiert Achse, Tooltip und Beschreibung. Wird von aussen gesetzt, weil die Reihen je Bereich
   * eine andere Einheit haben: normalisierter Index ohne Währung, Sparplanwerte als Betrag.
   */
  formatValue: (value: number) => string
  empty: string
  height?: number
}

/**
 * Linienverlauf mehrerer Reihen über die Zeit.
 *
 * Lücken bleiben Lücken: `connectNulls` ist aus, damit ein Zeitraum ohne Kursdaten als Unterbrechung
 * sichtbar wird statt als gerade Linie, die eine Entwicklung behauptet, die niemand kennt.
 *
 * Wie die übrigen Diagramme ein `img` mit beschreibendem Namen. Die Beschreibung nennt Anfangs- und
 * Endwert je Reihe, weil das die Aussage einer Linie ist; die Zwischenwerte stehen in der Tabelle
 * unter dem Diagramm.
 */
export function SeriesLineChart({
  title,
  points,
  series,
  formatValue,
  empty,
  height = 300,
}: SeriesLineChartProps) {
  const colors = useChartColors()

  if (points.length === 0 || series.length === 0) {
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

  // Recharts erwartet flache Objekte je Punkt. `label` ist die x-Achse, die übrigen Schlüssel sind
  // die Reihen.
  const data = points.map((point) => ({ label: point.label, ...point.values }))
  const beschreibung = verlaufJeSerie(points, series)
    .map((verlauf) =>
      verlauf.start === null || verlauf.ende === null
        ? `${verlauf.label} ohne Werte`
        : `${verlauf.label} von ${formatValue(verlauf.start)} auf ${formatValue(verlauf.ende)}`,
    )
    .join(', ')

  return (
    <Box>
      <Typography variant="subtitle2" component="h3" gutterBottom>
        {title}
      </Typography>
      <Box role="img" aria-label={`${title}: ${beschreibung}`} sx={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            accessibilityLayer={false}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis
              dataKey="label"
              stroke={colors.axis}
              tickLine={false}
              // Bei zehn Jahren Monatsraster sind es über hundert Punkte. Ohne Mindestabstand
              // überlagern sich die Beschriftungen zu einem Streifen.
              minTickGap={32}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke={colors.axis}
              tickLine={false}
              width={72}
              domain={['auto', 'auto']}
              tickFormatter={(value) => formatValue(Number(value))}
            />
            <Tooltip
              formatter={(value) => formatValue(Number(value))}
              contentStyle={{
                backgroundColor: colors.tooltipBackground,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 10,
                color: colors.text,
              }}
            />
            <Legend />
            {series.map((serie, index) => (
              <Line
                key={serie.key}
                type="monotone"
                dataKey={serie.key}
                name={serie.label}
                stroke={colors.serie(index)}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}
