import { describe, expect, it } from 'vitest'
import { allokationZeilen, gewichteVergleich, umschichtungenText } from './allokation'
import type { WeightItem } from './simulationApi'

/**
 * Soll/Ist-Vergleich und Umschichtungen (YOUNGOITV-455, YOUNGOITV-456).
 *
 * Beide Seiten sind nicht zwingend gleich besetzt, und genau daran hängen die Tests: eine fehlende
 * Seite ist eine Lücke und keine 0. Ein fehlendes Soll als 0 zu lesen würde eine Abweichung von der
 * vollen Istgewichtung behaupten.
 */

describe('allokationZeilen', () => {
  it('stellt Soll und Ist gegenüber und rechnet die Abweichung in Prozentpunkten', () => {
    expect(allokationZeilen({ SPY: 60, AGG: 40 }, { SPY: 62.5, AGG: 37.5 })).toEqual([
      { symbol: 'SPY', soll: 60, ist: 62.5, abweichungPunkte: 2.5 },
      { symbol: 'AGG', soll: 40, ist: 37.5, abweichungPunkte: -2.5 },
    ])
  })

  it('nimmt ein Symbol auf, das nur im Ist steht, und lässt seine Abweichung offen', () => {
    // Kommt vor, wenn das Backend eine Position hält, die nicht in der Zielvorgabe steht.
    expect(allokationZeilen({ SPY: 100 }, { SPY: 90, GLD: 10 })).toEqual([
      { symbol: 'SPY', soll: 100, ist: 90, abweichungPunkte: -10 },
      { symbol: 'GLD', soll: null, ist: 10, abweichungPunkte: null },
    ])
  })

  it('nimmt ein Symbol auf, das nur im Soll steht', () => {
    // Ein Symbol ohne Kursdaten steht in der Sollgewichtung, erreicht aber nie einen Bestand.
    expect(allokationZeilen({ SPY: 60, XYZ: 40 }, { SPY: 100 })).toEqual([
      { symbol: 'SPY', soll: 60, ist: 100, abweichungPunkte: 40 },
      { symbol: 'XYZ', soll: 40, ist: null, abweichungPunkte: null },
    ])
  })

  it('sortiert nach Sollgewichtung, bei Gleichstand alphabetisch, Zeilen ohne Soll ans Ende', () => {
    const zeilen = allokationZeilen(
      { ZURN: 50, AAPL: 50 },
      { ZURN: 40, AAPL: 45, GLD: 10, BTC: 5 },
    )

    expect(zeilen.map((zeile) => zeile.symbol)).toEqual(['AAPL', 'ZURN', 'BTC', 'GLD'])
  })
})

describe('gewichteVergleich', () => {
  const vorher: WeightItem[] = [
    { symbol: 'NESN', value: 7000, percent: 60 },
    { symbol: 'AAPL', value: 5000, percent: 40 },
  ]

  it('stellt die Gewichtung vor und nach dem Zukauf gegenüber', () => {
    const nachher: WeightItem[] = [
      { symbol: 'NESN', value: 7000, percent: 50 },
      { symbol: 'AAPL', value: 6760, percent: 50 },
    ]

    expect(gewichteVergleich(vorher, nachher)).toEqual([
      { symbol: 'NESN', vorher: 60, nachher: 50, veraenderungPunkte: -10 },
      { symbol: 'AAPL', vorher: 40, nachher: 50, veraenderungPunkte: 10 },
    ])
  })

  it('zeigt ein neu hinzugekauftes Symbol ohne erfundenen Ausgangswert', () => {
    const nachher: WeightItem[] = [
      { symbol: 'NESN', value: 7000, percent: 55 },
      { symbol: 'AAPL', value: 5000, percent: 40 },
      { symbol: 'GLD', value: 700, percent: 5 },
    ]

    expect(gewichteVergleich(vorher, nachher)).toContainEqual({
      symbol: 'GLD',
      vorher: null,
      nachher: 5,
      veraenderungPunkte: null,
    })
  })

  it('lässt eine Position ohne Anteil weg, statt sie als 0 Prozent zu zeigen', () => {
    // Positionen ohne Livekurs schliesst der Endpunkt aus der Gewichtung aus.
    const ohneKurs: WeightItem[] = [
      { symbol: 'NESN', value: 7000, percent: 100 },
      { symbol: 'ZURN', value: null, percent: null },
    ]

    expect(gewichteVergleich(ohneKurs, ohneKurs).map((zeile) => zeile.symbol)).toEqual(['NESN'])
  })
})

describe('umschichtungenText', () => {
  it('nennt Zukauf mit Vorzeichen und Verkauf mit Minus, alphabetisch', () => {
    expect(umschichtungenText({ SPY: -0.5, AGG: 1.25 })).toBe('AGG +1.25, SPY -0.5')
  })

  it('lässt eine Menge von 0 weg, weil sie keine Umschichtung ist', () => {
    expect(umschichtungenText({ SPY: -0.5, AGG: 1.25, GLD: 0 })).toBe('AGG +1.25, SPY -0.5')
  })

  it('sagt es, wenn nichts umgeschichtet wurde', () => {
    expect(umschichtungenText({})).toBe('Keine Umschichtung')
    expect(umschichtungenText({ SPY: 0, AGG: 0 })).toBe('Keine Umschichtung')
  })
})
