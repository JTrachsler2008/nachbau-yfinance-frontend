import { formatQuantity } from '../format/numbers'
import type { WeightItem } from './simulationApi'

/**
 * Soll/Ist-Vergleich der Gewichtung eines simulierten Sparplans.
 *
 * Beide Seiten kommen als Map vom Backend, und sie sind nicht zwingend gleich besetzt: ein Symbol
 * ohne Kursdaten steht in der Sollgewichtung, erreicht aber nie einen Bestand, und ein verkauftes
 * Symbol kann umgekehrt aus dem Ist verschwinden. Deshalb wird über die Vereinigung beider
 * Schlüsselmengen gelaufen statt über eine davon.
 */

export interface AllokationsZeile {
  symbol: string
  soll: number | null
  ist: number | null
  /** Ist minus Soll in Prozentpunkten. Genau darauf reagiert das Rebalancing mit Toleranzband. */
  abweichungPunkte: number | null
}

export function allokationZeilen(
  soll: Readonly<Record<string, number>>,
  ist: Readonly<Record<string, number>>,
): AllokationsZeile[] {
  const symbole = [...new Set([...Object.keys(soll), ...Object.keys(ist)])]

  return symbole
    .map((symbol) => {
      const sollWert = soll[symbol] ?? null
      const istWert = ist[symbol] ?? null
      return {
        symbol,
        soll: sollWert,
        ist: istWert,
        // Fehlt eine Seite, gibt es keine Abweichung, sondern eine Lücke. Ein fehlendes Soll als 0 zu
        // lesen würde eine Abweichung von der vollen Istgewichtung behaupten.
        abweichungPunkte: sollWert === null || istWert === null ? null : istWert - sollWert,
      }
    })
    // Nach Sollgewichtung absteigend, damit die Tabelle wie die Zielvorgabe gelesen werden kann.
    // Zeilen ohne Soll stehen am Ende, dort alphabetisch.
    .sort((left, right) => {
      if (left.soll === right.soll) {
        return left.symbol.localeCompare(right.symbol)
      }
      if (left.soll === null) {
        return 1
      }
      if (right.soll === null) {
        return -1
      }
      return right.soll - left.soll
    })
}

export interface GewichtsZeile {
  symbol: string
  vorher: number | null
  nachher: number | null
  /** Nachher minus vorher in Prozentpunkten. */
  veraenderungPunkte: number | null
}

/** Prozentwerte je Symbol. Positionen ohne Anteil fallen weg, statt als 0 zu erscheinen. */
function prozentJeSymbol(items: readonly WeightItem[]): Record<string, number> {
  const werte: Record<string, number> = {}
  for (const item of items) {
    if (item.percent !== null) {
      werte[item.symbol] = item.percent
    }
  }
  return werte
}

/**
 * Gewichtung vor und nach einem simulierten Zukauf.
 *
 * Dieselbe Mechanik wie beim Soll/Ist-Vergleich, nur andere Bedeutung der beiden Seiten: das neue
 * Symbol steht nur im Nachher, und eine Position ohne Livekurs schliesst das Backend aus beiden
 * Listen aus. Deshalb wieder über die Vereinigung beider Symbolmengen.
 */
export function gewichteVergleich(
  vorher: readonly WeightItem[],
  nachher: readonly WeightItem[],
): GewichtsZeile[] {
  return allokationZeilen(prozentJeSymbol(vorher), prozentJeSymbol(nachher)).map((zeile) => ({
    symbol: zeile.symbol,
    vorher: zeile.soll,
    nachher: zeile.ist,
    veraenderungPunkte: zeile.abweichungPunkte,
  }))
}

/**
 * Die Umschichtungen eines Rebalancing-Ereignisses als Text, etwa `AGG +1.2, SPY -0.8`.
 *
 * Die Mengen sind Stückzahlen mit Bruchteilen, positiv für einen Zukauf. Das Vorzeichen wird für
 * positive Werte ausgeschrieben, weil erst der Kontrast zum Minus die Richtung lesbar macht.
 */
export function umschichtungenText(trades: Readonly<Record<string, number>>): string {
  const eintraege = Object.entries(trades)
    .filter(([, menge]) => menge !== 0)
    .sort(([links], [rechts]) => links.localeCompare(rechts))
  if (eintraege.length === 0) {
    return 'Keine Umschichtung'
  }
  return eintraege
    .map(([symbol, menge]) => `${symbol} ${menge > 0 ? '+' : ''}${formatQuantity(menge)}`)
    .join(', ')
}
