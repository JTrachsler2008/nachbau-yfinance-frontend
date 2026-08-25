import { parseAmount } from '../format/numbers'
import type { WeightedSymbol } from './compareApi'

/**
 * Eingabe und Prüfung einer Positionsliste mit Gewichten.
 *
 * Sowohl der Sparplan als auch der Portfolio-Vergleich lassen den Benutzer eine Liste aus Symbol und
 * Gewicht zusammenstellen. Die Prüfung steht deshalb einmal hier und nicht zweimal im Formular.
 *
 * Die Grenzen sind die des Backends: höchstens zwanzig Positionen, jedes Gewicht positiv. Sie werden
 * vorab geprüft, damit eine offensichtlich unvollständige Eingabe eine Meldung am Feld ergibt und
 * nicht einen englischen 400er aus dem Controller.
 */

/** Eine Zeile im Formular. Als Text, weil das Feld Text hält und erst beim Senden geprüft wird. */
export interface GewichtungsZeile {
  /** Nur für React und die Beschriftung der Zeile, nicht Teil der Anfrage. */
  id: number
  symbol: string
  gewicht: string
}

/** Grenze des Controllers (`MAX_POSITIONS`). */
export const maxPositionen = 20

/**
 * Zeichen, die ein Ticker enthalten darf.
 *
 * Eng gefasst, weil der Sparplan die Liste als `SYMBOL:gewicht,SYMBOL:gewicht` in einem
 * Query-Parameter überträgt: ein Komma oder Doppelpunkt im Symbol würde dort still eine zweite
 * Position erzeugen. Punkt, Bindestrich, Dach und Gleichheitszeichen bleiben erlaubt, sonst fielen
 * gängige Ticker wie `BRK.B`, `BTC-USD`, `^GSPC` oder `EURUSD=X` durch.
 */
const erlaubtesSymbol = /^[A-Z0-9.\-^=]+$/

export type SymbolErgebnis = { ok: true; symbol: string } | { ok: false; fehler: string }

/**
 * Liest ein einzelnes Tickerfeld und gibt es in Grossbuchstaben zurück.
 *
 * Kaufsimulation und Backtest brauchen genau ein Symbol ohne Gewicht. Die Zeichenregel liegt trotzdem
 * hier, damit sie an einer Stelle steht und nicht in drei Formularen leicht verschieden.
 */
export function leseSymbol(text: string): SymbolErgebnis {
  const symbol = text.trim().toUpperCase()
  if (symbol === '') {
    return { ok: false, fehler: 'Bitte ein Symbol eingeben, zum Beispiel AAPL.' }
  }
  if (!erlaubtesSymbol.test(symbol)) {
    return {
      ok: false,
      fehler: `${symbol} ist kein gültiges Symbol. Erlaubt sind Buchstaben, Zahlen und . - ^ =`,
    }
  }
  return { ok: true, symbol }
}

export type PositionenErgebnis =
  | { ok: true; positionen: WeightedSymbol[] }
  | { ok: false; fehler: string }

/**
 * Liest die Zeilen als Positionsliste.
 *
 * Vollständig leere Zeilen fallen weg: das Formular hält immer eine Leerzeile zum Weitertippen bereit,
 * und die soll nicht als Fehler gelten. Eine halb gefüllte Zeile dagegen schon, denn dort wollte
 * jemand etwas eingeben.
 */
export function lesePositionen(zeilen: readonly GewichtungsZeile[]): PositionenErgebnis {
  const positionen: WeightedSymbol[] = []

  for (const zeile of zeilen) {
    const symbol = zeile.symbol.trim().toUpperCase()
    const gewichtText = zeile.gewicht.trim()
    if (symbol === '' && gewichtText === '') {
      continue
    }
    if (symbol === '') {
      return { ok: false, fehler: 'Bitte ein Symbol eingeben, zum Beispiel SPY.' }
    }
    const geprueft = leseSymbol(symbol)
    if (!geprueft.ok) {
      return { ok: false, fehler: geprueft.fehler }
    }
    if (positionen.some((vorhanden) => vorhanden.symbol === symbol)) {
      // Das Backend würde die zweite Zeile über die erste legen, ohne es zu sagen.
      return { ok: false, fehler: `${symbol} steht zweimal in der Liste.` }
    }
    const gewicht = parseAmount(gewichtText)
    if (gewicht === null || gewicht <= 0) {
      return { ok: false, fehler: `Das Gewicht von ${symbol} muss eine Zahl grösser als 0 sein.` }
    }
    positionen.push({ symbol, weight: gewicht })
  }

  if (positionen.length === 0) {
    return { ok: false, fehler: 'Bitte mindestens eine Position eingeben.' }
  }
  if (positionen.length > maxPositionen) {
    return { ok: false, fehler: `Höchstens ${maxPositionen} Positionen sind möglich.` }
  }

  return { ok: true, positionen }
}

/** Baut den Query-Parameter des Sparplans: `SPY:60,AGG:40`. */
export function positionenParameter(positionen: readonly WeightedSymbol[]): string {
  return positionen.map((position) => `${position.symbol}:${position.weight}`).join(',')
}

/** Anteil einer Position an der Summe aller Gewichte, in Prozent. Ohne Summe gibt es keinen Anteil. */
export function gewichtAnteil(
  position: WeightedSymbol,
  positionen: readonly WeightedSymbol[],
): number | null {
  const summe = positionen.reduce((total, kandidat) => total + kandidat.weight, 0)
  return summe === 0 ? null : (position.weight / summe) * 100
}
