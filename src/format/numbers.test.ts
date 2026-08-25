import { describe, expect, it } from 'vitest'
import {
  formatAmount,
  formatDate,
  formatMonth,
  formatMoney,
  formatPercent,
  formatQuantity,
  missingValue,
  parseAmount,
  signOf,
} from './numbers'

describe('formatAmount', () => {
  it('nutzt Schweizer Tausender- und Dezimaltrennung', () => {
    expect(formatAmount(1234567.5)).toBe("1'234'567.50")
  })

  it('erzwingt zwei Nachkommastellen', () => {
    expect(formatAmount(12)).toBe('12.00')
  })

  it('nimmt auch eine Zeichenkette, falls das Backend BigDecimal als Text liefert', () => {
    expect(formatAmount('1234.5')).toBe("1'234.50")
  })

  it('zeigt fehlende Werte als Platzhalter statt als NaN', () => {
    // Tritt auf, wenn der MarketDataProvider Optional.empty() liefert und ein Kursfeld null ist.
    expect(formatAmount(null)).toBe(missingValue)
    expect(formatAmount(undefined)).toBe(missingValue)
    expect(formatAmount('keine Zahl')).toBe(missingValue)
    expect(formatAmount(Number.NaN)).toBe(missingValue)
  })

  it('behandelt die Null als echten Wert und nicht als fehlend', () => {
    expect(formatAmount(0)).toBe('0.00')
  })
})

describe('formatMoney', () => {
  it('stellt den Währungscode voran', () => {
    expect(formatMoney(1234.5, 'CHF')).toBe("CHF 1'234.50")
  })

  it('lässt den Code weg, wenn keiner bekannt ist', () => {
    expect(formatMoney(1234.5, null)).toBe("1'234.50")
  })

  it('hängt keinen Code an einen fehlenden Betrag', () => {
    expect(formatMoney(null, 'CHF')).toBe(missingValue)
  })
})

describe('formatQuantity', () => {
  it('zeigt ganze Stückzahlen ohne Nachkommastellen', () => {
    expect(formatQuantity(120)).toBe('120')
  })

  it('zeigt Bruchteile, wie sie bei Sparplänen entstehen', () => {
    expect(formatQuantity(3.4567)).toBe('3.4567')
  })

  it('rundet auf vier Nachkommastellen', () => {
    expect(formatQuantity(3.456789)).toBe('3.4568')
  })
})

describe('formatPercent', () => {
  it('hängt das Prozentzeichen an', () => {
    expect(formatPercent(4.25)).toBe('4.25 %')
  })

  it('zeigt auf Wunsch das Vorzeichen, für Veränderungen', () => {
    expect(formatPercent(4.2, { withSign: true })).toBe('+4.2 %')
    expect(formatPercent(-4.2, { withSign: true })).toBe('-4.2 %')
  })

  it('zeigt fehlende Werte als Platzhalter', () => {
    expect(formatPercent(null)).toBe(missingValue)
  })
})

describe('formatDate', () => {
  it('dreht ein ISO-Datum auf die deutsche Schreibweise', () => {
    expect(formatDate('2026-08-25')).toBe('25.08.2026')
  })

  it('kürzt einen Zeitstempel auf das Datum', () => {
    expect(formatDate('2026-08-25T10:15:30')).toBe('25.08.2026')
  })

  it('gibt unbekannte Formate unverändert zurück statt sie zu verfälschen', () => {
    expect(formatDate('irgendwas')).toBe('irgendwas')
  })

  it('zeigt fehlende Daten als Platzhalter', () => {
    expect(formatDate(null)).toBe(missingValue)
  })
})

describe('formatMonth', () => {
  it('lässt den technischen Tag eines Monatsrasters weg', () => {
    // Das Backend liefert für Monatsreihen immer den Ersten des Monats. In der Achsenbeschriftung
    // eines Zehnjahresverlaufs kostet der Tag nur Platz.
    expect(formatMonth('2024-03-01')).toBe('03.2024')
  })

  it('gibt unbekannte Formate unverändert zurück statt sie zu verfälschen', () => {
    expect(formatMonth('irgendwas')).toBe('irgendwas')
  })

  it('zeigt fehlende Daten als Platzhalter', () => {
    expect(formatMonth(null)).toBe(missingValue)
    expect(formatMonth('')).toBe(missingValue)
  })
})

describe('signOf', () => {
  it('unterscheidet Gewinn, Verlust und Null', () => {
    expect(signOf(1)).toBe('positive')
    expect(signOf(-1)).toBe('negative')
    expect(signOf(0)).toBe('neutral')
  })

  it('behandelt fehlende Werte als neutral, damit sie nicht grün oder rot erscheinen', () => {
    expect(signOf(null)).toBe('neutral')
  })
})

describe('parseAmount', () => {
  it('liest einen Betrag mit Punkt als Dezimaltrenner', () => {
    expect(parseAmount('1234.50')).toBe(1234.5)
  })

  it('nimmt auch das Komma, weil de-CH-Tastaturen es auf dem Zahlenblock haben', () => {
    expect(parseAmount('1234,50')).toBe(1234.5)
  })

  it('nimmt die eigene Anzeige wieder an, samt Apostroph als Tausendertrennung', () => {
    // Wer den angezeigten Cash-Stand kopiert und einfügt, soll keine Fehlermeldung bekommen.
    expect(parseAmount("12'450.50")).toBe(12450.5)
  })

  it('erlaubt ein Vorzeichen', () => {
    expect(parseAmount('-50')).toBe(-50)
    expect(parseAmount('+50')).toBe(50)
  })

  it('gibt null statt 0 für Eingaben, die keine Zahl sind', () => {
    // Wichtig: eine stille 0 würde aus einem Tippfehler eine Buchung über 0 machen.
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('   ')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('12.34.56')).toBeNull()
    expect(parseAmount('1e5')).toBeNull()
  })
})
