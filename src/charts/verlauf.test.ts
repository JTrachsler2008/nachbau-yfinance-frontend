import { describe, expect, it } from 'vitest'
import { verlaufJeSerie, type LinePoint, type Serie } from './verlauf'

/**
 * Zusammenfassung einer Verlaufsreihe (YOUNGOITV-454).
 *
 * Der Kern ist der Umgang mit Lücken: das Backend lässt ein Symbol ohne Kurs an einem Datum weg
 * oder schreibt `null`, und beides darf nicht als 0 gelesen werden. Aus einer 0 als Startwert würde
 * eine erfundene Rendite, aus einer 0 am Ende ein erfundener Totalverlust.
 */

const serien: Serie[] = [{ key: 'a', label: 'Reihe A' }]

describe('verlaufJeSerie', () => {
  it('nimmt den ersten und den letzten Wert der Reihe', () => {
    const punkte: LinePoint[] = [
      { label: '01.2024', values: { a: 100 } },
      { label: '02.2024', values: { a: 120 } },
      { label: '03.2024', values: { a: 125 } },
    ]

    expect(verlaufJeSerie(punkte, serien)).toEqual([
      { key: 'a', label: 'Reihe A', start: 100, ende: 125, veraenderungProzent: 25 },
    ])
  })

  it('überspringt Lücken statt sie als 0 zu lesen', () => {
    // Erst kein Wert, dann eine Lücke mitten in der Reihe: einmal als `null`, einmal als fehlender
    // Schlüssel, weil das Backend beides liefert.
    const punkte: LinePoint[] = [
      { label: '01.2024', values: { a: null } },
      { label: '02.2024', values: { a: 50 } },
      { label: '03.2024', values: {} },
      { label: '04.2024', values: { a: 75 } },
    ]

    const [verlauf] = verlaufJeSerie(punkte, serien)
    expect(verlauf.start).toBe(50)
    expect(verlauf.ende).toBe(75)
    expect(verlauf.veraenderungProzent).toBe(50)
  })

  it('lässt eine Reihe ohne einen einzigen Wert leer statt sie auf 0 zu setzen', () => {
    const punkte: LinePoint[] = [
      { label: '01.2024', values: { b: 100 } },
      { label: '02.2024', values: { b: 110 } },
    ]

    expect(verlaufJeSerie(punkte, serien)).toEqual([
      { key: 'a', label: 'Reihe A', start: null, ende: null, veraenderungProzent: null },
    ])
  })

  it('erfindet keine Veränderung, wenn die Reihe bei 0 beginnt', () => {
    // Beim Sparplan ist der Depotwert vor der ersten Einzahlung 0. Eine Rendite darauf wäre
    // unendlich, nicht null Prozent.
    const punkte: LinePoint[] = [
      { label: '01.2024', values: { a: 0 } },
      { label: '02.2024', values: { a: 500 } },
    ]

    const [verlauf] = verlaufJeSerie(punkte, serien)
    expect(verlauf.start).toBe(0)
    expect(verlauf.ende).toBe(500)
    expect(verlauf.veraenderungProzent).toBeNull()
  })

  it('rechnet einen Rückgang negativ', () => {
    const punkte: LinePoint[] = [
      { label: '01.2024', values: { a: 200 } },
      { label: '02.2024', values: { a: 150 } },
    ]

    expect(verlaufJeSerie(punkte, serien)[0].veraenderungProzent).toBe(-25)
  })

  it('behält die Reihenfolge der Serien, nicht die der Schlüssel in den Punkten', () => {
    // Legende, Tabelle und Farbwahl hängen an dieser Reihenfolge.
    const punkte: LinePoint[] = [{ label: '01.2024', values: { b: 2, a: 1 } }]
    const zwei: Serie[] = [
      { key: 'a', label: 'Reihe A' },
      { key: 'b', label: 'Reihe B' },
    ]

    expect(verlaufJeSerie(punkte, zwei).map((verlauf) => verlauf.key)).toEqual(['a', 'b'])
  })

  it('gibt ohne Punkte für jede Serie eine leere Zusammenfassung', () => {
    // Der Ladezustand ruft die Funktion mit einer leeren Reihe auf, bevor Daten da sind.
    expect(verlaufJeSerie([], serien)).toEqual([
      { key: 'a', label: 'Reihe A', start: null, ende: null, veraenderungProzent: null },
    ])
  })
})
