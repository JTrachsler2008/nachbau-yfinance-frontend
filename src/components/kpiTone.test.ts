import { describe, expect, it } from 'vitest'
import { toneFor } from './kpiTone'

describe('toneFor', () => {
  it('färbt Gewinn und Verlust', () => {
    expect(toneFor(12.5)).toBe('gain')
    expect(toneFor(-12.5)).toBe('loss')
  })

  it('lässt die Null neutral, damit "nichts realisiert" nicht wie ein Gewinn aussieht', () => {
    expect(toneFor(0)).toBe('neutral')
  })

  it('lässt einen fehlenden Wert neutral', () => {
    expect(toneFor(null)).toBe('neutral')
    expect(toneFor(undefined)).toBe('neutral')
  })

  it('nimmt auch die Zeichenkette, die ein Backend mit BigDecimal-Klartext liefert', () => {
    expect(toneFor('-0.01')).toBe('loss')
  })
})
