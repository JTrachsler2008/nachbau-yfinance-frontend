import { describe, expect, it } from 'vitest'
import { AA_NON_TEXT, AA_NORMAL_TEXT, contrastRatio, flatten } from '../test/contrast'
import { theme } from './theme'

/**
 * Prueft die Farbentscheidungen aus `planung/design-theme.md` gegen WCAG AA.
 *
 * Die Werte werden aus dem Theme gelesen und nicht als Literale wiederholt. Nur so schlaegt der
 * Test an, wenn jemand eine Farbe im Theme aendert. Anlass: zwei Farben des Originals verfehlten
 * AA fuer normalen Text (gedimmter Text 2.85:1, Gewinn-Gruen 3.30:1).
 */

function paletteOf(scheme: 'light' | 'dark') {
  const colorScheme = theme.colorSchemes[scheme]
  if (colorScheme === undefined) {
    throw new Error(`Farbschema ${scheme} ist im Theme nicht definiert`)
  }
  return colorScheme.palette
}

const light = paletteOf('light')
const dark = paletteOf('dark')

/** Alle Flaechen, auf denen Text tatsaechlich liegen kann: Seite, Karte und abgesetzte Flaeche. */
const lightSurfaces = [
  ['background.default', light.background.default],
  ['background.paper', light.background.paper],
  ['finance.surfaceMuted', light.finance.surfaceMuted],
] as const

const darkSurfaces = [
  ['background.default', dark.background.default],
  ['background.paper', dark.background.paper],
  ['finance.surfaceMuted', dark.finance.surfaceMuted],
] as const

describe('Light Mode, Text auf allen Flaechen', () => {
  const textTokens = [
    ['text.primary', light.text.primary],
    ['text.secondary', light.text.secondary],
    ['finance.gainText', light.finance.gainText],
    ['finance.lossText', light.finance.lossText],
  ] as const

  for (const [tokenName, color] of textTokens) {
    for (const [surfaceName, surface] of lightSurfaces) {
      it(`${tokenName} auf ${surfaceName} erfuellt AA`, () => {
        expect(contrastRatio(color, surface)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
      })
    }
  }
})

describe('Dark Mode, Text auf allen Flaechen', () => {
  const textTokens = [
    ['text.primary', dark.text.primary],
    ['text.secondary', dark.text.secondary],
    ['finance.gainText', dark.finance.gainText],
    ['finance.lossText', dark.finance.lossText],
  ] as const

  for (const [tokenName, color] of textTokens) {
    for (const [surfaceName, surface] of darkSurfaces) {
      it(`${tokenName} auf ${surfaceName} erfuellt AA`, () => {
        expect(contrastRatio(color, surface)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
      })
    }
  }
})

describe('Badges', () => {
  const badgeNames = ['badgeBuy', 'badgeSell', 'badgeDividend'] as const

  for (const badgeName of badgeNames) {
    it(`${badgeName} ist im Light Mode lesbar`, () => {
      const badge = light.finance[badgeName]
      expect(contrastRatio(badge.color, badge.background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    })

    it(`${badgeName} ist im Dark Mode lesbar`, () => {
      const badge = dark.finance[badgeName]
      // Die Flaeche ist teiltransparent, also erst auf die Karte legen, dann den Text dagegen messen.
      const composited = flatten(badge.background, dark.background.paper)
      expect(contrastRatio(badge.color, composited)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    })
  }
})

describe('Diagramm-Palette', () => {
  it('hat in beiden Modi acht Farben', () => {
    expect(light.finance.chart).toHaveLength(8)
    expect(dark.finance.chart).toHaveLength(8)
  })

  it('beginnt in beiden Modi nicht mit einer Semantikfarbe', () => {
    // Sonst wuerde eine kategoriale Einfaerbung (Sektor, Land, Waehrung) mit der
    // Gewinn-/Verlust-Semantik verwechselt.
    for (const palette of [light, dark]) {
      const semantic = [
        palette.finance.gainText,
        palette.finance.lossText,
        palette.success.main,
        palette.error.main,
      ]
      expect(semantic).not.toContain(palette.finance.chart[0])
    }
  })

  it('enthaelt keine Farbe doppelt', () => {
    expect(new Set(light.finance.chart).size).toBe(light.finance.chart.length)
    expect(new Set(dark.finance.chart).size).toBe(dark.finance.chart.length)
  })

  for (const scheme of ['light', 'dark'] as const) {
    const palette = scheme === 'light' ? light : dark
    palette.finance.chart.forEach((color, index) => {
      it(`${scheme} Diagrammfarbe ${index} erreicht 3:1 gegen die Karte`, () => {
        // Diagrammflaechen sind grafische Objekte, fuer die AA 3:1 verlangt, nicht 4.5:1.
        expect(contrastRatio(color, palette.background.paper)).toBeGreaterThanOrEqual(AA_NON_TEXT)
      })
    })
  }
})

describe('Buttons', () => {
  it('primary.contrastText ist auf primary.main in beiden Modi lesbar', () => {
    expect(
      contrastRatio(light.primary.contrastText, light.primary.main),
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    expect(contrastRatio(dark.primary.contrastText, dark.primary.main)).toBeGreaterThanOrEqual(
      AA_NORMAL_TEXT,
    )
  })
})
