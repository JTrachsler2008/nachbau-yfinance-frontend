import { describe, expect, it } from 'vitest'
import { anteil, fasseZusammen, ohneAngabe } from './slices'

/**
 * Aggregation für die Ringdiagramme.
 *
 * Als reine Funktion prüfbar, und genau deshalb liegt sie neben den Komponenten: die Regeln
 * (absteigend, Datenlücke zuletzt, keine Nullsegmente) sind Fachlogik der Darstellung und sollen
 * nicht erst über gerendertes SVG belegt werden.
 */

interface Zeile {
  sektor: string | null
  wert: number
}

const wert = (zeile: Zeile): number => zeile.wert
const sektor = (zeile: Zeile): string | null => zeile.sektor

describe('fasseZusammen', () => {
  it('summiert je Merkmal und sortiert absteigend', () => {
    const zeilen: Zeile[] = [
      { sektor: 'Technologie', wert: 100 },
      { sektor: 'Finanzen', wert: 400 },
      { sektor: 'Technologie', wert: 250 },
    ]

    expect(fasseZusammen(zeilen, sektor, wert)).toEqual([
      { key: 'Finanzen', label: 'Finanzen', value: 400 },
      { key: 'Technologie', label: 'Technologie', value: 350 },
    ])
  })

  it('stellt "Ohne Angabe" ans Ende, auch wenn es das grösste Segment ist', () => {
    const zeilen: Zeile[] = [
      { sektor: null, wert: 900 },
      { sektor: 'Finanzen', wert: 100 },
      { sektor: 'Technologie', wert: 50 },
    ]

    expect(fasseZusammen(zeilen, sektor, wert).map((slice) => slice.key)).toEqual([
      'Finanzen',
      'Technologie',
      ohneAngabe,
    ])
  })

  it('behandelt null und leeren Text als dieselbe Datenlücke', () => {
    const zeilen: Zeile[] = [
      { sektor: null, wert: 10 },
      { sektor: '', wert: 5 },
    ]

    expect(fasseZusammen(zeilen, sektor, wert)).toEqual([
      { key: ohneAngabe, label: ohneAngabe, value: 15 },
    ])
  })

  it('lässt Segmente ohne Wert weg', () => {
    const zeilen: Zeile[] = [
      { sektor: 'Technologie', wert: 0 },
      // Zwei Zeilen, die sich gegenseitig aufheben: die Gruppe bleibt zwar, ihr Wert ist aber 0.
      { sektor: 'Finanzen', wert: 40 },
      { sektor: 'Finanzen', wert: -40 },
      { sektor: 'Immobilien', wert: 7 },
    ]

    expect(fasseZusammen(zeilen, sektor, wert).map((slice) => slice.key)).toEqual(['Immobilien'])
  })

  it('liefert für keine Zeile kein Segment', () => {
    expect(fasseZusammen([], sektor, wert)).toEqual([])
  })
})

describe('anteil', () => {
  it('rechnet den Anteil an der Summe in Prozent', () => {
    const slices = fasseZusammen(
      [
        { sektor: 'Technologie', wert: 300 },
        { sektor: 'Finanzen', wert: 100 },
      ],
      sektor,
      wert,
    )

    expect(anteil(300, slices)).toBe(75)
    expect(anteil(100, slices)).toBe(25)
  })

  it('liefert ohne Summe keinen Anteil statt einer Division durch null', () => {
    expect(anteil(0, [])).toBeNull()
  })
})
