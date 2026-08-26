import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAuthToken } from '../api/client'
import { installFakeBackend, type FakeBackend, type FakeTransaction } from '../test/fakeBackend'
import { renderLoggedIn } from '../test/renderApp'

/**
 * Performance-Seite (YOUNGOITV-452) am Gesamtsystem.
 *
 * Geprüft werden die beiden Zahlen, die die Seite überhaupt behaupten darf: die vom Backend
 * gelieferten Summen und die Jahresauswertung aus der Historie. Dazu die Trennung nach Währung,
 * denn eine addierte Mischung aus CHF und USD wäre im Diagramm nicht als Fehler zu erkennen.
 */

let backend: FakeBackend

beforeEach(() => {
  setAuthToken(null)
  backend = installFakeBackend()
})

afterEach(() => {
  backend.restore()
})

let laufendeId = 310

/** Eine Dividendenbuchung im Ausgangsbestand des Fake-Backends. */
function dividende(werte: Partial<FakeTransaction>): FakeTransaction {
  laufendeId += 1
  return {
    id: laufendeId,
    accountId: 100,
    securityId: 201,
    transactionType: 'DIVIDEND',
    quantity: 15,
    price: 3,
    fee: null,
    tax: null,
    splitRatio: null,
    transactionCurrency: 'CHF',
    // Wie im Backend: beim Buchen nicht gefüllt, deshalb rechnet die Seite nicht damit.
    fxRateToPortfolio: null,
    transactionDate: '2026-04-10',
    ...werte,
  }
}

/**
 * Zahlungen in zwei Jahren und zwei Währungen.
 *
 * Werden dem Bestand hinzugefügt statt ihn zu ersetzen: die Käufe im Ausgangsbestand halten die
 * Positionen und Konten stimmig, und die Seite muss sie ohnehin von den Dividenden trennen können.
 */
function bucheDividenden(): void {
  backend.transactions.push(
    dividende({ transactionDate: '2025-04-10', price: 3, quantity: 15 }),
    dividende({ transactionDate: '2026-04-10', price: 3.5, quantity: 15 }),
    dividende({ transactionDate: '2026-05-10', price: 20, quantity: 5, securityId: 202 }),
    dividende({
      transactionDate: '2026-03-01',
      price: 1,
      quantity: 10,
      accountId: 101,
      securityId: 200,
      transactionCurrency: 'USD',
    }),
  )
}

function karte(label: string): HTMLElement {
  const titel = screen.getByRole('heading', { name: label })
  return titel.closest('.MuiCard-root') as HTMLElement
}

function jahreszeile(jahr: string): HTMLElement {
  const tabelle = screen.getByRole('table', { name: 'Dividenden je Jahr' })
  return within(tabelle).getByText(jahr).closest('tr') as HTMLElement
}

describe('Performance-Seite', () => {
  it('zeigt die vom Backend gelieferten Summen in der Basiswährung', async () => {
    bucheDividenden()
    await renderLoggedIn('/performance')
    await screen.findByRole('table', { name: 'Dividenden je Jahr' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Performance' })).toBeInTheDocument()
    expect(within(karte('Realisierte Gewinne')).getByText('CHF -128.40')).toBeInTheDocument()
    expect(within(karte('Dividenden')).getByText('CHF 214.50')).toBeInTheDocument()
    // Aus defaultValuations()/defaultReturns(): 3260 Marktwert, 276.60 Gewinn, 8.25 % MWR.
    expect(within(karte('Marktwert')).getByText("CHF 3'260.00")).toBeInTheDocument()
    expect(within(karte('Gewinn/Verlust (unrealisiert)')).getByText('CHF 276.60')).toBeInTheDocument()
    expect(within(karte('Geldgewichtete Rendite (MWR)')).getByText('+8.25 %')).toBeInTheDocument()
  })

  it('benennt die weiterhin fehlende zeitgewichtete Rendite statt sie zu schätzen', async () => {
    await renderLoggedIn('/performance')

    expect(await screen.findByText('Ohne TWR, Total Return und Wertverlauf')).toBeInTheDocument()
    expect(within(karte('Zeitgewichtete Rendite (TWR)')).getByText('–')).toBeInTheDocument()
  })

  it('fasst die Zahlungen je Jahr zusammen und stellt sie als Diagramm und Tabelle dar', async () => {
    bucheDividenden()
    await renderLoggedIn('/performance')
    await screen.findByRole('table', { name: 'Dividenden je Jahr' })

    // 15 * 3 im Jahr 2025, dann 15 * 3.50 plus 5 * 20 im Jahr 2026.
    expect(within(jahreszeile('2025')).getByText('CHF 45.00')).toBeInTheDocument()
    expect(within(jahreszeile('2025')).getByText('1')).toBeInTheDocument()
    expect(within(jahreszeile('2026')).getByText('CHF 152.50')).toBeInTheDocument()
    expect(within(jahreszeile('2026')).getByText('2')).toBeInTheDocument()

    // Textalternative des Diagramms: dieselben Summen, damit ein Screenreader nicht leer ausgeht.
    expect(
      screen.getByRole('img', {
        name: 'Erträge in CHF je Wertpapier: 2025 CHF 45.00, 2026 CHF 152.50',
      }),
    ).toBeInTheDocument()
  })

  it('trennt die Währungen und addiert die USD-Zahlung nicht zu den CHF-Beträgen', async () => {
    bucheDividenden()
    const { user } = await renderLoggedIn('/performance')
    await screen.findByRole('table', { name: 'Dividenden je Jahr' })

    await user.click(screen.getByRole('button', { name: 'USD' }))

    expect(within(jahreszeile('2026')).getByText('USD 10.00')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Erträge in USD je Wertpapier: 2026 USD 10.00' }),
    ).toBeInTheDocument()
    // 2025 gab es keine Zahlung in USD, das Jahr fällt weg statt mit 0 zu erscheinen.
    const tabelle = screen.getByRole('table', { name: 'Dividenden je Jahr' })
    expect(within(tabelle).queryByText('2025')).not.toBeInTheDocument()
  })

  it('zeigt ohne Dividenden einen Hinweis statt eines leeren Diagramms', async () => {
    await renderLoggedIn('/performance')

    expect(await screen.findByText(/Noch keine Dividende gebucht/)).toBeInTheDocument()
    // Ohne mehrere Währungen gibt es auch nichts umzuschalten.
    expect(
      screen.queryByRole('group', { name: 'Währung der Zahlungen' }),
    ).not.toBeInTheDocument()
  })
})
