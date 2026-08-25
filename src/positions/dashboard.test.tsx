import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAuthToken } from '../api/client'
import { installFakeBackend, type FakeBackend } from '../test/fakeBackend'
import { renderLoggedIn } from '../test/renderApp'

/**
 * Dashboard (YOUNGOITV-451) am Gesamtsystem.
 *
 * Im Mittelpunkt stehen die beiden Zusagen, die die Seite an ihre Zahlen macht: es wird nur innerhalb
 * einer Handelswährung summiert, und eine einzelne gescheiterte Kennzahl nimmt nicht die ganze Seite
 * mit. Beides ist an gerenderten Werten prüfbar und wäre in einem Komponententest ohne Backend nicht
 * zu sehen.
 */

let backend: FakeBackend

beforeEach(() => {
  setAuthToken(null)
  backend = installFakeBackend()
})

afterEach(() => {
  backend.restore()
})

/** Die Karte zu einer Kennzahl. Über die Überschrift, weil die Zahl selbst geprüft werden soll. */
function karte(label: string): HTMLElement {
  const titel = screen.getByRole('heading', { name: label })
  return titel.closest('.MuiCard-root') as HTMLElement
}

/**
 * Wartet, bis die Seite hinter der Portfolio-Auswahl steht und die Bestandsabfrage beantwortet ist.
 *
 * `renderLoggedIn` kommt schon zurück, sobald die Shell da ist; solange die Portfolios laden, zeigt
 * `PortfolioGate` nur einen Ladezustand und keine der Karten existiert.
 */
async function dashboardGeladen(): Promise<void> {
  await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
  await screen.findByRole('table', { name: 'Positionen' })
}

describe('Dashboard', () => {
  it('zeigt Einstandswert, Cash und die beiden Auswertungen des Backends', async () => {
    await renderLoggedIn('/')
    await dashboardGeladen()

    // 15 * 93, nur die CHF-Position. Der USD-Bestand steht bewusst nicht mit drin.
    expect(within(karte('Einstandswert Bestände')).getByText("CHF 1'395.00")).toBeInTheDocument()
    expect(within(karte('Einstandswert Bestände')).getByText('1 Position(en) in CHF')).toBeInTheDocument()
    expect(within(karte('Cash')).getByText("CHF 12'450.50")).toBeInTheDocument()
    expect(within(karte('Realisierte Gewinne')).getByText('CHF -128.40')).toBeInTheDocument()
    expect(within(karte('Dividenden')).getByText('CHF 214.50')).toBeInTheDocument()
  })

  it('fragt die Auswertungen in der Basiswährung des Portfolios ab', async () => {
    await renderLoggedIn('/')
    await dashboardGeladen()
    expect(within(karte('Dividenden')).getByText('CHF 214.50')).toBeInTheDocument()

    // Ohne den Parameter antwortet das Backend mit 400: der Endpunkt verlangt die Anzeigewährung.
    for (const pfad of ['/portfolios/10/realized-gains', '/portfolios/10/dividends']) {
      const abfrage = backend.requests.find((request) => request.url === pfad)
      expect(abfrage?.params).toEqual({ currency: 'CHF' })
    }
  })

  it('benennt die fehlenden marktabhängigen Kennzahlen statt sie zu schätzen', async () => {
    await renderLoggedIn('/')

    expect(
      await screen.findByText('Marktwert, Gewinn/Verlust und TWR/MWR fehlen'),
    ).toBeInTheDocument()
  })

  it('teilt nach Sektor und Land auf und filtert die Positionen über die Legende', async () => {
    // Runde Werte, damit die Anteile im Test lesbar bleiben: NESN 1500, ZURN 500, zusammen 2000.
    backend.positions[0].averagePurchasePrice = 100
    backend.positions.push({
      id: 402,
      accountId: 100,
      securityId: 202,
      totalQuantity: 5,
      averagePurchasePrice: 100,
    })
    const { user } = await renderLoggedIn('/')

    expect(
      await screen.findByRole('img', { name: 'Sektor: Basiskonsumgüter 75.0 %, Finanzen 25.0 %' }),
    ).toBeInTheDocument()
    // Länderschlüssel als Name, nicht als Code: ZURN und NESN sind beide in der Schweiz.
    expect(screen.getByRole('img', { name: 'Land: Schweiz 100.0 %' })).toBeInTheDocument()

    const tabelle = () => screen.getByRole('table', { name: 'Positionen' })
    expect(within(tabelle()).getByText('NESN')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Finanzen 25.0 %' }))

    expect(within(tabelle()).getByText('ZURN')).toBeInTheDocument()
    expect(within(tabelle()).queryByText('NESN')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Filter aufheben' }))
    expect(within(tabelle()).getByText('NESN')).toBeInTheDocument()
  })

  it('wechselt die Handelswährung, ohne über Währungen hinweg zu summieren', async () => {
    const { user } = await renderLoggedIn('/')
    await dashboardGeladen()

    await user.click(screen.getByRole('button', { name: 'USD' }))

    // 10 * 180.50 aus dem USD-Konto, und das Cash desselben Kontos.
    expect(within(karte('Einstandswert Bestände')).getByText("USD 1'805.00")).toBeInTheDocument()
    expect(within(karte('Cash')).getByText('USD 800.00')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Sektor: Technologie 100.0 %' })).toBeInTheDocument()

    const tabelle = screen.getByRole('table', { name: 'Positionen' })
    expect(within(tabelle).getByText('AAPL')).toBeInTheDocument()
    expect(within(tabelle).queryByText('NESN')).not.toBeInTheDocument()

    // Die Karten des Backends bleiben in der Basiswährung, sie hängen nicht an dieser Auswahl.
    expect(within(karte('Dividenden')).getByText('CHF 214.50')).toBeInTheDocument()
  })

  it('stellt die Währungen nebeneinander, statt sie zu einer Summe zu verschmelzen', async () => {
    await renderLoggedIn('/')

    const tabelle = await screen.findByRole('table', { name: 'Bestand je Währung' })
    const chf = within(tabelle).getByText('CHF').closest('tr') as HTMLElement
    expect(within(chf).getByText("CHF 1'395.00")).toBeInTheDocument()
    expect(within(chf).getByText("CHF 12'450.50")).toBeInTheDocument()

    const usd = within(tabelle).getByText('USD').closest('tr') as HTMLElement
    expect(within(usd).getByText("USD 1'805.00")).toBeInTheDocument()
    expect(within(usd).getByText('USD 800.00')).toBeInTheDocument()

    // Keine Gesamtzeile: eine Summe über CHF und USD gibt es nicht.
    expect(within(tabelle).queryByText('Gesamt')).not.toBeInTheDocument()
  })

  it('hält die übrigen Kennzahlen, wenn die Bestände scheitern, und zeigt keine Backend-Interna', async () => {
    backend.forceStatus('/portfolios/10/positions', 500)
    await renderLoggedIn('/')
    // Ohne Bestände gibt es keine Positionstabelle, deshalb nur bis zur Überschrift warten.
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })

    expect(
      await within(karte('Einstandswert Bestände')).findByText('Konnte nicht geladen werden.'),
    ).toBeInTheDocument()
    // Die Karten mit eigener Abfrage bleiben stehen, die Seite fällt nicht als Ganzes aus.
    expect(within(karte('Dividenden')).getByText('CHF 214.50')).toBeInTheDocument()

    expect(
      await screen.findByText('Etwas ist schiefgelaufen. Bitte später erneut versuchen.'),
    ).toBeInTheDocument()
    // SEC-5: die Meldung des Backends trägt Klassennamen und darf nirgends in der Oberfläche stehen.
    expect(screen.queryByText(/NullPointerException/)).not.toBeInTheDocument()
    expect(screen.queryByText(/BigDecimal/)).not.toBeInTheDocument()
  })
})
