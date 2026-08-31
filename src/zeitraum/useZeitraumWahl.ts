import { useState } from 'react'
import { gestern, vorJahren } from '../format/dates'
import { formatDate } from '../format/numbers'
import { BENUTZERDEFINIERT, benchmarkVorschlaege, zeitraeume, type Zeitraum } from './zeitraum'

export interface ZeitraumWahl {
  /** Der Zeitraum, wie er an den Endpunkt geht. */
  zeitraum: Zeitraum
  /**
   * Ob abgefragt werden darf. Bei einem unvollständigen oder verdrehten eigenen Intervall `false`:
   * sonst liefe bei jedem Tastendruck im Datumsfeld eine Anfrage, die das Backend mit 400 ablehnt.
   */
  gueltig: boolean
  /** Beschriftung für Hinweise neben den Zahlen, etwa "3 Monate" oder "01.01.2024-31.03.2024". */
  label: string
  benchmark: string
  auswahl: number | typeof BENUTZERDEFINIERT
  setAuswahl: (auswahl: number | typeof BENUTZERDEFINIERT) => void
  customFrom: string
  setCustomFrom: (from: string) => void
  customTo: string
  setCustomTo: (to: string) => void
  setBenchmark: (benchmark: string) => void
}

/**
 * Zustand der Zeitraum- und Benchmarkwahl.
 *
 * Als Hook und nicht als Zustand in der Seite, weil die Ableitungen (gültig, Beschriftung, welche der
 * beiden Formen gilt) zur Auswahl gehören und nicht zur Seite. Risiko- und Performance-Seite hatten
 * sonst zwei Fassungen derselben vier Zeilen, die auseinanderlaufen können.
 *
 * In eigener Datei neben der Leiste, nicht darin: eine Datei, die Hook und Komponente zugleich
 * ausliefert, nimmt dem Entwicklungsserver das gezielte Nachladen (`react/only-export-components`).
 */
export function useZeitraumWahl(lookbackDays = 365): ZeitraumWahl {
  const [auswahl, setAuswahl] = useState<number | typeof BENUTZERDEFINIERT>(lookbackDays)
  const [customFrom, setCustomFrom] = useState(vorJahren(1))
  const [customTo, setCustomTo] = useState(gestern())
  const [benchmark, setBenchmark] = useState<string>(benchmarkVorschlaege[0])

  const istBenutzerdefiniert = auswahl === BENUTZERDEFINIERT
  const gueltig =
    !istBenutzerdefiniert || (customFrom !== '' && customTo !== '' && customFrom < customTo)
  const zeitraum: Zeitraum = istBenutzerdefiniert
    ? { kind: 'custom', from: customFrom, to: customTo }
    : { kind: 'preset', lookbackDays: auswahl }
  const label = istBenutzerdefiniert
    ? `${formatDate(customFrom)}–${formatDate(customTo)}`
    : (zeitraeume.find((eintrag) => eintrag.tage === auswahl)?.label ?? '')

  return {
    zeitraum,
    gueltig,
    label,
    benchmark,
    auswahl,
    setAuswahl,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    setBenchmark,
  }
}
