import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

/**
 * Wahr unterhalb des `sm`-Breakpoints, also auf Telefonen (MUI-Standard: 600px).
 *
 * Die Grenze steht an einer Stelle, weil das Responsive-Konzept (YOUNGOITV-458) sie mehrfach
 * braucht: Datentabellen werden dort zu Karten, Formulardialoge nehmen den ganzen Bildschirm und
 * Diagramme werden flacher. Drei eigene Abfragen wären drei Gelegenheiten, verschiedene Breakpoints
 * zu erwischen, und die Oberfläche bräche dann an verschiedenen Breiten um.
 *
 * Nur für Verhalten, das sich nicht in CSS ausdrücken lässt. Reine Layoutfragen gehören weiter in
 * die `sx`-Objekte mit `{ xs: ..., md: ... }`, denn die brauchen kein erneutes Rendern.
 */
export function useIsMobile(): boolean {
  const theme = useTheme()
  return useMediaQuery(theme.breakpoints.down('sm'))
}
