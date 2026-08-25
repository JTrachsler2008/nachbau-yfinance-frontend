import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatAmount, formatMoney } from '../format/numbers'
import { useChartColors } from './useChartColors'

export interface StackedRow {
  /** Beschriftung auf der x-Achse, etwa das Jahr. */
  label: string
  /** Wert je Reihe. Eine Reihe ohne Eintrag zählt als 0. */
  values: Readonly<Record<string, number>>
}

interface StackedBarChartProps {
  /** Überschrift und Grundlage der Beschreibung für Screenreader. */
  title: string
  rows: readonly StackedRow[]
  /** Reihen in Zeichenreihenfolge, etwa die Symbole der Wertpapiere. */
  series: readonly string[]
  currency: string
  empty: string
}

/**
 * Gestapelte Balken über eine Kategorie, etwa Dividenden je Jahr aufgeteilt nach Wertpapier.
 *
 * Die Daten kommen als `label` plus Wertobjekt herein und werden erst hier zu den flachen Objekten
 * verflacht, die Recharts erwartet. So braucht die aufrufende Seite keine Index-Signatur und kann
 * ihre Aggregation typisiert halten.
 *
 * Das Diagramm ist ein `img` mit beschreibendem Namen: die Zahlen stehen zusätzlich in der Tabelle
 * unter dem Diagramm, und Recharts' eigene Tastaturschicht würde einen Fokuspunkt anbieten, der für
 * einen Screenreader hinter dem `img` verschwindet.
 */
export function StackedBarChart({
  title,
  rows,
  series,
  currency,
  empty,
}: StackedBarChartProps) {
  const colors = useChartColors()

  if (rows.length === 0 || series.length === 0) {
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

  const data = rows.map((row) => ({ label: row.label, ...row.values }))
  const beschreibung = rows
    .map((row) => {
      const summe = series.reduce((total, name) => total + (row.values[name] ?? 0), 0)
      return `${row.label} ${formatMoney(summe, currency)}`
    })
    .join(', ')

  return (
    <Box>
      <Typography variant="subtitle2" component="h3" gutterBottom>
        {title}
      </Typography>
      <Box role="img" aria-label={`${title}: ${beschreibung}`} sx={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} accessibilityLayer={false} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis dataKey="label" stroke={colors.axis} tickLine={false} />
            <YAxis
              stroke={colors.axis}
              tickLine={false}
              width={72}
              tickFormatter={(value) => formatAmount(Number(value))}
            />
            <Tooltip
              formatter={(value) => formatMoney(Number(value), currency)}
              contentStyle={{
                backgroundColor: colors.tooltipBackground,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 10,
                color: colors.text,
              }}
            />
            <Legend />
            {series.map((name, index) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="stapel"
                fill={colors.serie(index)}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}
