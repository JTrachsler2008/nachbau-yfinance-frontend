import { describe, expect, it } from 'vitest'
import { ausschlussGrund } from './ausschluesse'

/**
 * Die Übersetzung der Ausschlussgründe.
 *
 * Geprüft wird vor allem der letzte Zweig: eine künftige Kennung aus dem Backend darf nicht als
 * leerer Eintrag in der Liste landen, denn dass ein Wertpapier fehlt, ist die wichtigere Hälfte der
 * Aussage.
 */
describe('ausschlussGrund', () => {
  it('nennt die drei bekannten Gründe auf Deutsch und ohne Kennung', () => {
    expect(ausschlussGrund('NO_PRICE_HISTORY')).toMatch(/^Keine Kurshistorie im Zeitraum\./)
    expect(ausschlussGrund('TOO_FEW_OBSERVATIONS')).toMatch(/^Zu wenige Handelstage im Zeitraum\./)
    expect(ausschlussGrund('NO_FX_RATE')).toMatch(/^Kein Wechselkurs/)
    for (const reason of ['NO_PRICE_HISTORY', 'TOO_FEW_OBSERVATIONS', 'NO_FX_RATE']) {
      expect(ausschlussGrund(reason)).not.toContain(reason)
    }
  })

  it('nennt die Zahl, an der die Auswertung scheitert', () => {
    // 20 ist die Grenze des Backends (MIN_OBSERVATIONS). Steht sie nicht dabei, klingt "zu wenige"
    // nach einer Meinung statt nach einer Regel.
    expect(ausschlussGrund('TOO_FEW_OBSERVATIONS')).toContain('20')
  })

  it('gibt eine unbekannte Kennung unverändert weiter, statt sie zu verschweigen', () => {
    const text = ausschlussGrund('SOMETHING_NEW')

    expect(text).toContain('Nicht auswertbar')
    expect(text).toContain('SOMETHING_NEW')
  })
})
