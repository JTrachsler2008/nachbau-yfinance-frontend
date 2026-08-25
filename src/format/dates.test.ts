import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gestern, heute, vorJahren, vorTagen } from './dates'

/**
 * Datumshilfen der Formulare (YOUNGOITV-455, YOUNGOITV-456).
 *
 * Die Uhr wird auf einen späten Abend gestellt, denn genau dort schlägt der Fehler zu, den diese
 * Funktionen vermeiden: `toISOString` rechnet auf UTC um und liefert in der Schweiz abends bereits
 * das Datum von morgen. Ein `max`-Attribut wäre damit einen Tag zu weit und liesse ein Kaufdatum zu,
 * das der Endpunkt mit 400 abweist.
 *
 * Die Zeit wird mit lokalen Feldern gesetzt, damit der Test in jeder Zeitzone dieselbe Erwartung hat.
 */

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 25, 23, 30))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('heute', () => {
  it('nennt den lokalen Tag, auch am späten Abend', () => {
    expect(heute()).toBe('2026-08-25')
  })
})

describe('gestern', () => {
  it('nennt den Vortag', () => {
    expect(gestern()).toBe('2026-08-24')
  })

  it('geht über eine Monatsgrenze zurück', () => {
    vi.setSystemTime(new Date(2026, 8, 1, 23, 30))

    expect(gestern()).toBe('2026-08-31')
  })
})

describe('vorTagen', () => {
  it('zählt Kalendertage zurück, nicht Handelstage', () => {
    expect(vorTagen(1)).toBe('2026-08-24')
    expect(vorTagen(365)).toBe('2025-08-25')
  })

  it('rechnet über Monats- und Jahresgrenzen', () => {
    vi.setSystemTime(new Date(2026, 0, 5, 23, 30))

    expect(vorTagen(10)).toBe('2025-12-26')
  })
})

describe('vorJahren', () => {
  it('nimmt dasselbe Kalenderdatum im früheren Jahr', () => {
    expect(vorJahren(5)).toBe('2021-08-25')
    expect(vorJahren(40)).toBe('1986-08-25')
  })
})
