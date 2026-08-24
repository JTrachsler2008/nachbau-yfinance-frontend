import { describe, expect, it } from 'vitest'
import { contrastRatio } from './contrast'

/**
 * Selbsttest der Hilfsfunktion. Ohne ihn koennte eine fehlerhafte Kontrastrechnung die
 * Palettentests stillschweigend gruen faerben, was schlimmer waere als kein Test.
 */
describe('contrastRatio', () => {
  it('liefert 21 fuer Schwarz auf Weiss', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2)
  })

  it('liefert 1 fuer identische Farben', () => {
    expect(contrastRatio('#3a332c', '#3a332c')).toBeCloseTo(1, 5)
  })

  it('ist richtungsunabhaengig bei deckenden Farben', () => {
    expect(contrastRatio('#15803d', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#15803d'), 5)
  })

  it('trifft einen bekannten Referenzwert', () => {
    // #767676 auf Weiss ist der klassische WCAG-Grenzfall und liegt bei 4.54:1.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 1)
  })

  it('rechnet teiltransparenten Vordergrund gegen den Grund', () => {
    // Voll transparent heisst: der Grund bleibt sichtbar, Kontrast also 1.
    expect(contrastRatio('rgba(255, 255, 255, 0)', '#221e1a')).toBeCloseTo(1, 5)
    // Halb deckendes Weiss auf dunklem Grund muss deutlich ueber 1 liegen.
    expect(contrastRatio('rgba(255, 255, 255, 0.5)', '#221e1a')).toBeGreaterThan(3)
  })

  it('weist unbekannte Farbformate zurueck statt still zu rechnen', () => {
    expect(() => contrastRatio('rebeccapurple', '#ffffff')).toThrow(/Farbformat/)
    expect(() => contrastRatio('#abc', '#ffffff')).toThrow(/Farbformat/)
  })
})
