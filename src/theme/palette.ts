import { alpha } from '@mui/material/styles'

/** Farbwerte eines Transaktions-Badges (Flaeche plus Schrift). */
export interface FinanceBadge {
  background: string
  color: string
}

/**
 * Finanz-spezifische Farb-Tokens, die MUI nicht mitbringt.
 *
 * Bewusst Teil der Palette und nicht hart im Komponentencode: nur so zieht der Dark Mode sie mit,
 * und die im Original verbreitete Inline-`style={{}}`-Praxis kehrt nicht zurueck.
 * Herleitung und Kontrastwerte siehe `planung/design-theme.md`.
 */
export interface FinancePalette {
  /**
   * Gewinn-**Zahlen**. Dunkler als `success.main`, weil `#16a34a` auf Weiss nur 3.30:1 erreicht und
   * damit WCAG AA fuer normalen Text verfehlt. Der gewaehlte Ton haelt AA auf allen drei
   * Light-Flaechen: 7.13:1 auf der Karte, 6.68:1 auf der abgesetzten Flaeche, 6.30:1 auf dem
   * Seitengrund. Der naechsthellere Ton `#15803d` waere auf dem Seitengrund mit 4.43:1 durchgefallen.
   */
  gainText: string
  /**
   * Verlust-Zahlen. Aus demselben Grund eine Stufe dunkler als `error.main`: `#dc2626` erreicht auf
   * dem Seitengrund nur 4.27:1. Dieser Ton liegt dort bei 5.71:1.
   */
  lossText: string
  /** Abgesetzte Flaeche fuer Tabellenkopf und Hover-Zeile. */
  surfaceMuted: string
  badgeBuy: FinanceBadge
  badgeSell: FinanceBadge
  badgeDividend: FinanceBadge
  /**
   * Kategoriale Diagrammfarben fuer Recharts. Recharts kennt das MUI-Theme nicht, deshalb muessen
   * Diagrammfarben eigens als Token vorliegen, sonst bleiben sie beim Moduswechsel haengen.
   * Beginnt bewusst nicht mit Gruen oder Rot, damit eine kategoriale Einfaerbung (Sektor, Land,
   * Waehrung) nicht mit der Gewinn-/Verlust-Semantik verwechselt wird.
   */
  chart: readonly string[]
}

/**
 * Light: die Palette des Originals (`yfinance-frontend/src/index.css`), unveraendert uebernommen
 * bis auf die zwei Kontrast-Korrekturen (`text.secondary`, `gainText`).
 */
export const lightFinance: FinancePalette = {
  gainText: '#166534',
  lossText: '#b91c1c',
  surfaceMuted: '#faf7f4',
  // Badge-Schrift nutzt denselben Ton wie die Zahlen, damit es nicht zwei Gruen- und zwei Rottoene
  // fuer dieselbe Bedeutung gibt.
  badgeBuy: { background: '#dcfce7', color: '#166534' },
  badgeSell: { background: '#fee2e2', color: '#b91c1c' },
  badgeDividend: { background: '#dbeafe', color: '#1d4ed8' },
  chart: ['#2563eb', '#d97706', '#7c3aed', '#0891b2', '#16a34a', '#c026d3', '#65a30d', '#dc2626'],
}

/**
 * Dark: warm gehalten statt neutral-blaugrau. Ein MUI-Default-Dunkel (`#121212`) wuerde neben der
 * warmen Light-Palette wie eine andere Anwendung wirken. Die Semantikfarben sind aufgehellt, weil
 * die Light-Werte auf dunklem Grund zu wenig Kontrast liefern.
 */
export const darkFinance: FinancePalette = {
  gainText: '#4ade80',
  lossText: '#f87171',
  surfaceMuted: '#2b2521',
  // Feste Pastelltoene wie #dcfce7 wirken auf dunklem Grund grell, daher die Semantikfarbe
  // transparent als Flaeche.
  badgeBuy: { background: alpha('#4ade80', 0.15), color: '#4ade80' },
  badgeSell: { background: alpha('#f87171', 0.15), color: '#f87171' },
  badgeDividend: { background: alpha('#60a5fa', 0.15), color: '#60a5fa' },
  chart: ['#60a5fa', '#fbbf24', '#a78bfa', '#22d3ee', '#4ade80', '#e879f9', '#a3e635', '#f87171'],
}
