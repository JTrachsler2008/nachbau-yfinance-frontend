import { createTheme } from '@mui/material/styles'
import { darkFinance, lightFinance, type FinancePalette } from './palette'

declare module '@mui/material/styles' {
  interface Palette {
    finance: FinancePalette
  }

  interface PaletteOptions {
    finance?: FinancePalette
  }

  /** Aktiviert die Typisierung von `theme.vars` für den CSS-Variablen-Modus. */
  interface CssThemeVariables {
    enabled: true
  }
}

/** Radien-Stufen. Ersetzt die sechs verschiedenen Werte des Originals (4, 5, 6, 10, 20, 99px). */
const radius = {
  /** Karten, Paper, Dialoge, Tabellen-Container. */
  large: 14,
  /** Buttons, Textfelder, Selects, Tabs. */
  medium: 10,
  /** Badges, Chips, Statuspunkte. */
  pill: 999,
} as const

/**
 * Tabellarische Ziffern. Ohne das haben Ziffern unterschiedliche Breiten und Beträge verspringen in
 * Tabellenspalten optisch gegeneinander, was bei langen Positionslisten stört. Wird über die
 * `MuiTableCell`-Überschreibung global gesetzt und ist hier zusätzlich für Einzelfälle exportiert.
 */
export const tabularNums = { fontVariantNumeric: 'tabular-nums' } as const

/**
 * Kleinstes Touch-Ziel in Pixeln. Der UI/UX-Plan verlangt mindestens 44x44px für alles, was
 * angetippt wird (Responsive-Konzept, YOUNGOITV-458).
 */
export const touchTarget = 44

/**
 * Nur für Geräte mit grobem Zeigegerät, also Finger statt Mauszeiger.
 *
 * Die Vergrösserung hängt an der Eingabeart und nicht am Breakpoint: ein Tablet in Landschaft ist
 * breit und wird trotzdem angetippt, ein schmales Browserfenster auf dem Desktop nicht. An eine
 * Bildschirmbreite gebunden wäre die Regel an beiden Enden falsch. Mit der Maus bleiben die
 * kompakten Masse, weil ein Zeiger genauer trifft als eine Fingerkuppe und 44px hohe Chips in einer
 * Diagrammlegende sonst nur Platz kosten.
 */
const coarsePointer = '@media (pointer: coarse)'

export const theme = createTheme({
  // 'data' statt des Standards 'media': nur damit lässt sich der Modus manuell umschalten.
  // Mit 'media' würde er ausschliesslich der Systemeinstellung folgen.
  cssVariables: { colorSchemeSelector: 'data' },

  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#1a1a1a', contrastText: '#ffffff' },
        secondary: { main: '#2563eb' },
        success: { main: '#16a34a' },
        error: { main: '#dc2626' },
        info: { main: '#2563eb' },
        background: { default: '#f5f0eb', paper: '#ffffff' },
        divider: '#e8e2da',
        text: { primary: '#1a1a1a', secondary: '#6b6560' },
        finance: lightFinance,
      },
    },
    dark: {
      palette: {
        // Invertiert: Creme-Buttons mit dunkler Schrift statt Fast-Schwarz auf Hell.
        primary: { main: '#f2ede7', contrastText: '#181513' },
        secondary: { main: '#60a5fa' },
        success: { main: '#4ade80' },
        error: { main: '#f87171' },
        info: { main: '#60a5fa' },
        background: { default: '#181513', paper: '#221e1a' },
        divider: '#3a332c',
        text: { primary: '#f2ede7', secondary: '#a89f95' },
        finance: darkFinance,
      },
    },
  },

  shape: { borderRadius: radius.large },

  typography: {
    fontFamily: '"Inter Variable", Inter, "Segoe UI", system-ui, -apple-system, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    // Materials Grossbuchstaben-Konvention wirkt hier fremd, das Original hat sie nicht.
    button: { textTransform: 'none', fontWeight: 600 },
  },

  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        // Rand statt Schatten: das Original arbeitet ebenso, und graue Schatten wirken auf warmem
        // Creme schmutzig.
        root: ({ theme }) => ({
          borderRadius: radius.large,
          border: `1px solid ${theme.vars.palette.divider}`,
          backgroundImage: 'none',
        }),
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.medium,
          [coarsePointer]: { minHeight: touchTarget },
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        // Ein Icon-Knopf mit `size="small"` ist 34px hoch. Das ist der kleinste Knopf der
        // Oberfläche und trifft die Grenze des Plans am deutlichsten.
        root: {
          [coarsePointer]: { minWidth: touchTarget, minHeight: touchTarget },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: radius.medium },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: radius.pill,
          // Nur die klickbaren: die Legenden der Ringdiagramme sind Filter und laut Plan
          // ausdrücklich Touch-Ziele. Ein Chip, der nur einen Status anzeigt, bleibt klein.
          [coarsePointer]: { '&.MuiChip-clickable': { minHeight: touchTarget } },
        },
      },
    },

    MuiToggleButton: {
      styleOverrides: {
        root: {
          [coarsePointer]: { minWidth: touchTarget, minHeight: touchTarget },
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        // Die Portfolio-Auswahl und jedes Select öffnen eine solche Liste.
        root: {
          [coarsePointer]: { minHeight: touchTarget },
        },
      },
    },

    MuiFormControlLabel: {
      styleOverrides: {
        // Das Label ist die Klickfläche eines Schalters oder einer Checkbox. MUIs Switch ist
        // 38px hoch und reisst die Grenze damit knapp.
        root: {
          [coarsePointer]: { minHeight: touchTarget },
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          ...tabularNums,
          borderColor: theme.vars.palette.divider,
        }),
        head: ({ theme }) => ({
          backgroundColor: theme.vars.palette.finance.surfaceMuted,
          fontWeight: 600,
        }),
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&:hover': { backgroundColor: theme.vars.palette.finance.surfaceMuted },
        }),
      },
    },
  },
})
