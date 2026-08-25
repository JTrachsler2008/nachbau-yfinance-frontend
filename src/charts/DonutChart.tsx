import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatMoney, formatPercent } from '../format/numbers'
import { anteil, type Slice } from './slices'
import { useChartColors } from './useChartColors'

interface DonutChartProps {
  /** Überschrift des Diagramms und Grundlage der Beschreibung für Screenreader. */
  title: string
  slices: readonly Slice[]
  /** Währung der Werte. Alle Segmente müssen dieselbe haben, sonst wären die Anteile falsch. */
  currency: string
  /** Gewähltes Segment. Bleibt weg, wenn das Diagramm nichts filtert. */
  selected?: string | null
  onSelect?: (key: string | null) => void
  /** Text, wenn es nichts zu zeigen gibt. */
  empty: string
}

/**
 * Ringdiagramm mit klickbarer Legende.
 *
 * Die Legende ist bewusst nicht die von Recharts, sondern eine Reihe von Chips: der UI/UX-Plan
 * verlangt klickbare Donuts als Filter, und ein SVG-Segment ist mit der Tastatur nicht erreichbar.
 * Die Chips sind es, tragen den Anteil als Text und dienen damit gleichzeitig als Textalternative
 * zum Diagramm. Das Diagramm selbst ist deshalb ein `img` mit beschreibendem Namen, damit ein
 * Screenreader die Zahlen einmal und nicht zweimal vorliest.
 */
export function DonutChart({
  title,
  slices,
  currency,
  selected,
  onSelect,
  empty,
}: DonutChartProps) {
  const colors = useChartColors()

  if (slices.length === 0) {
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

  const beschreibung = slices
    .map((slice) => `${slice.label} ${formatPercent(anteil(slice.value, slices))}`)
    .join(', ')

  return (
    <Box>
      <Typography variant="subtitle2" component="h3" gutterBottom>
        {title}
      </Typography>

      <Box role="img" aria-label={`${title}: ${beschreibung}`} sx={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices as Slice[]}
              dataKey="value"
              nameKey="label"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              // Ohne Animation, weil sie hier nichts erklärt und bei jedem Filterklick neu anläuft.
              isAnimationActive={false}
              onClick={
                onSelect === undefined
                  ? undefined
                  : (_data, index) => {
                      const geklickt = slices[index]
                      if (geklickt !== undefined) {
                        onSelect(geklickt.key === selected ? null : geklickt.key)
                      }
                    }
              }
            >
              {slices.map((slice, index) => (
                <Cell
                  key={slice.key}
                  fill={colors.serie(index)}
                  stroke={colors.tooltipBackground}
                  // Gewähltes Segment bleibt voll, die übrigen treten zurück.
                  opacity={
                    selected === null || selected === undefined || selected === slice.key ? 1 : 0.35
                  }
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatMoney(Number(value), currency)}
              contentStyle={{
                backgroundColor: colors.tooltipBackground,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 10,
                color: colors.text,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>

      <Stack direction="row" spacing={0} useFlexGap sx={{ flexWrap: 'wrap', gap: 1, mt: 1 }}>
        {slices.map((slice, index) => {
          const istGewaehlt = slice.key === selected
          return (
            <Chip
              key={slice.key}
              size="small"
              variant={istGewaehlt ? 'filled' : 'outlined'}
              aria-pressed={onSelect === undefined ? undefined : istGewaehlt}
              onClick={
                onSelect === undefined
                  ? undefined
                  : () => onSelect(istGewaehlt ? null : slice.key)
              }
              icon={
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: colors.serie(index),
                  }}
                />
              }
              label={`${slice.label} ${formatPercent(anteil(slice.value, slices))}`}
            />
          )
        })}
      </Stack>
    </Box>
  )
}
