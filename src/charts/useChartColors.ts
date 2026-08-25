import { useColorScheme, useTheme } from '@mui/material/styles'

/** Farben eines Diagramms, aufgelöst für den gerade aktiven Farbmodus. */
export interface ChartColors {
  /** Kategoriale Reihe. Wiederholt sich, wenn es mehr Kategorien als Farben gibt. */
  serie: (index: number) => string
  gain: string
  loss: string
  axis: string
  grid: string
  /** Fläche und Rand des Tooltips, damit er im Dark Mode nicht weiss aufblitzt. */
  tooltipBackground: string
  tooltipBorder: string
  text: string
}

/**
 * Diagrammfarben aus dem Theme.
 *
 * Recharts kennt das MUI-Theme nicht und erwartet Farben als Zeichenkette. Ohne diesen Umweg
 * stünden Diagrammfarben hart im Komponentencode, also genau die Inline-Style-Praxis, die der
 * UI/UX-Plan am Original beanstandet.
 *
 * Bewusst die aufgelösten Farbwerte und nicht `theme.vars.*`: `theme.palette` gehört im
 * CSS-Variablen-Modus immer zum Standard-Farbschema und würde im Dark Mode die hellen Werte
 * liefern. Deshalb wird über `useColorScheme` das aktive Schema bestimmt und dessen Palette
 * genommen. Ein CSS-`var()` in einem SVG-Attribut wäre die Alternative, hängt aber daran, dass der
 * Browser Präsentationsattribute als CSS-Deklaration auswertet, und ein Fehlschlag wäre eine
 * schwarze Fläche statt einer sichtbaren Warnung.
 */
export function useChartColors(): ChartColors {
  const theme = useTheme()
  const { colorScheme } = useColorScheme()
  // Beim ersten Rendern ist der Modus noch unbekannt, weil der gespeicherte Wert erst clientseitig
  // gelesen wird. Bis dahin gilt Hell, wie beim `ModeToggle`.
  const scheme = colorScheme === 'dark' ? theme.colorSchemes.dark : theme.colorSchemes.light
  const palette = scheme?.palette ?? theme.palette
  const chart = palette.finance.chart

  return {
    serie: (index: number) => chart[index % chart.length],
    gain: palette.finance.gainText,
    loss: palette.finance.lossText,
    axis: palette.text.secondary,
    grid: palette.divider,
    tooltipBackground: palette.background.paper,
    tooltipBorder: palette.divider,
    text: palette.text.primary,
  }
}
