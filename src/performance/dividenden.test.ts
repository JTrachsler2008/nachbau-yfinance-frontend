import { describe, expect, it } from 'vitest'
import type { PortfolioTransaction } from '../transactions/transactionApi'
import { dividendenJeJahr, dividendenWaehrungen } from './dividenden'

/**
 * Jahresauswertung der Dividenden.
 *
 * Geprüft wird vor allem, was die Auswertung nicht tut: über Währungen hinweg summieren und andere
 * Buchungsarten mitzählen. Beides wäre eine falsche Zahl, die im Diagramm plausibel aussieht.
 */

let laufendeId = 500

function buchung(werte: Partial<PortfolioTransaction>): PortfolioTransaction {
  laufendeId += 1
  return {
    id: laufendeId,
    accountId: 100,
    accountName: 'Cash CHF',
    securityId: 201,
    symbol: 'NESN',
    securityName: 'Nestlé SA',
    transactionType: 'DIVIDEND',
    quantity: 10,
    price: 3,
    fee: null,
    tax: null,
    splitRatio: null,
    transactionCurrency: 'CHF',
    fxRateToPortfolio: null,
    transactionDate: '2026-04-10',
    ...werte,
  }
}

describe('dividendenJeJahr', () => {
  it('summiert Preis mal Menge je Jahr und Symbol, Jahre aufsteigend', () => {
    const auswertung = dividendenJeJahr(
      [
        buchung({ transactionDate: '2026-04-10', price: 3, quantity: 10 }),
        buchung({ transactionDate: '2025-04-10', price: 2, quantity: 10 }),
        buchung({ transactionDate: '2026-05-20', price: 20, quantity: 5, symbol: 'ZURN' }),
      ],
      'CHF',
    )

    expect(auswertung.jahre).toEqual([
      { jahr: '2025', anzahl: 1, betrag: 20, jeSymbol: { NESN: 20 } },
      { jahr: '2026', anzahl: 2, betrag: 130, jeSymbol: { NESN: 30, ZURN: 100 } },
    ])
    expect(auswertung.symbole).toEqual(['NESN', 'ZURN'])
  })

  it('zählt nur Dividenden und ignoriert Kauf, Verkauf und Split', () => {
    const auswertung = dividendenJeJahr(
      [
        buchung({ transactionType: 'BUY', price: 90, quantity: 10 }),
        buchung({ transactionType: 'SELL', price: 95, quantity: 10 }),
        buchung({ transactionType: 'SPLIT', price: null, quantity: 0, splitRatio: 2 }),
        buchung({ price: 3, quantity: 10 }),
      ],
      'CHF',
    )

    expect(auswertung.jahre).toEqual([
      { jahr: '2026', anzahl: 1, betrag: 30, jeSymbol: { NESN: 30 } },
    ])
  })

  it('nimmt nur die verlangte Währung, statt fremde Beträge dazuzuaddieren', () => {
    const buchungen = [
      buchung({ price: 3, quantity: 10, transactionCurrency: 'CHF' }),
      buchung({ price: 1, quantity: 10, transactionCurrency: 'USD', symbol: 'AAPL' }),
    ]

    expect(dividendenJeJahr(buchungen, 'CHF').jahre[0].betrag).toBe(30)
    expect(dividendenJeJahr(buchungen, 'USD').jahre[0].betrag).toBe(10)
    expect(dividendenJeJahr(buchungen, 'USD').symbole).toEqual(['AAPL'])
  })

  it('lässt eine Zahlung ohne Preis weg, statt sie als 0 zu zählen', () => {
    const auswertung = dividendenJeJahr([buchung({ price: null })], 'CHF')

    expect(auswertung.jahre).toEqual([])
    expect(auswertung.symbole).toEqual([])
  })

  it('liefert ohne Zahlungen eine leere Auswertung', () => {
    expect(dividendenJeJahr([], 'CHF')).toEqual({ jahre: [], symbole: [] })
  })
})

describe('dividendenWaehrungen', () => {
  it('sammelt die Währungen der Dividenden, sortiert und ohne Doppelte', () => {
    const waehrungen = dividendenWaehrungen([
      buchung({ transactionCurrency: 'USD' }),
      buchung({ transactionCurrency: 'CHF' }),
      buchung({ transactionCurrency: 'USD' }),
      // Ein Kauf in EUR darf die Auswahl nicht um eine Währung erweitern, in der es keine Zahlung gibt.
      buchung({ transactionType: 'BUY', transactionCurrency: 'EUR' }),
    ])

    expect(waehrungen).toEqual(['CHF', 'USD'])
  })
})
