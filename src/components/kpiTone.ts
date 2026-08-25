import { signOf, type Numeric } from '../format/numbers'

/** Farbe der Zahl auf einer Kennzahlenkarte. `neutral` für Werte ohne Gewinn-/Verlust-Bedeutung. */
export type KpiTone = 'gain' | 'loss' | 'neutral'

/**
 * Farbe für eine Gewinn- oder Verlustzahl.
 *
 * Die Null bleibt neutral: grün gefärbt würde "nichts realisiert" wie ein Gewinn aussehen.
 *
 * In einer eigenen Datei neben `KpiCard`, weil ein Modul, das sowohl Komponenten als auch anderes
 * exportiert, das Fast Refresh der Entwicklungsumgebung aushebelt.
 */
export function toneFor(value: Numeric): KpiTone {
  const vorzeichen = signOf(value)
  if (vorzeichen === 'positive') {
    return 'gain'
  }
  return vorzeichen === 'negative' ? 'loss' : 'neutral'
}
