import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAuthToken } from '../api/client'
import { installFakeBackend, type FakeBackend } from '../test/fakeBackend'
import { renderLoggedIn } from '../test/renderApp'

/**
 * Kaufsimulation (YOUNGOITV-456, UC-03) am Gesamtsystem.
 *
 * Der heikle Punkt sind die Währungen: die Antwort trägt keine, und die Oberfläche darf deshalb nur
 * den Beträgen einen Code anschreiben, die das Backend in die Basiswährung des Portfolios umgerechnet
 * hat. Kurs und Kosten stehen in der Handelswährung, die hier niemand kennt.
 *
 * Ausserdem: es wird nichts gebucht. Die Simulation darf keine Transaktion und keinen Cash-Abgang
 * erzeugen.
 */

let backend: FakeBackend

beforeEach(() => {
  setAuthToken(null)
  backend = installFakeBackend()
})

afterEach(() => {
  backend.restore()
})

function anfragen() {
  return backend.requests.filter((request) => request.url === '/simulate/purchase')
}

function karte(label: string): HTMLElement {
  return screen.getByRole('heading', { name: label }).closest('.MuiCard-root') as HTMLElement
}

/** Öffnet den Bereich und simuliert einen Zukauf über die Vorgabemenge. */
async function simuliere(symbol: string) {
  const angemeldet = await renderLoggedIn('/szenario')
  await angemeldet.user.click(screen.getByRole('tab', { name: 'Kaufsimulation' }))
  await screen.findByRole('heading', { name: 'Zukauf simulieren' })

  await angemeldet.user.type(screen.getByLabelText('Symbol'), symbol)
  await angemeldet.user.click(screen.getByRole('button', { name: 'Simulieren' }))
  return angemeldet
}

describe('Kaufsimulation', () => {
  it('fragt Symbol und Menge für das gewählte Portfolio ab und zeigt die Kennzahlen', async () => {
    await simuliere('aapl')
    await screen.findByRole('heading', { name: 'Kurs' })

    // Kleinschreibung im Feld, Grossschreibung in der Anfrage: der Marktdatenanbieter kennt nur
    // Grossbuchstaben.
    expect(anfragen()[0].params).toEqual({ portfolioId: 10, symbol: 'AAPL', quantity: 10 })

    expect(screen.getByRole('heading', { name: 'AAPL' })).toBeInTheDocument()
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    expect(within(karte('Kurs')).getByText('200.00')).toBeInTheDocument()
    expect(within(karte('Kosten')).getByText("2'000.00")).toBeInTheDocument()
    expect(within(karte('Anteil am Bestand')).getByText('+14.67 %')).toBeInTheDocument()
  })

  it('schreibt den Währungscode nur an die Beträge in der Basiswährung', async () => {
    await simuliere('AAPL')
    await screen.findByRole('heading', { name: 'Kurs' })

    expect(within(karte('Depotwert vorher')).getByText("CHF 12'000.00")).toBeInTheDocument()
    expect(within(karte('Depotwert nachher')).getByText("CHF 13'760.00")).toBeInTheDocument()
    expect(within(karte('Zukauf im Depot')).getByText("CHF 1'760.00")).toBeInTheDocument()
    // Kurs und Kosten stehen in der Handelswährung, die die Antwort nicht nennt.
    expect(within(karte('Kurs')).queryByText(/CHF/)).not.toBeInTheDocument()
    expect(within(karte('Kosten')).queryByText(/CHF/)).not.toBeInTheDocument()
    expect(
      within(karte('Kurs')).getByText('Livekurs, in der Handelswährung des Wertpapiers'),
    ).toBeInTheDocument()
  })

  it('stellt die Gewichtung vor und nach dem Zukauf gegenüber', async () => {
    await simuliere('AAPL')
    const tabelle = await screen.findByRole('table', {
      name: 'Gewichtung vor und nach dem Zukauf',
    })

    const nesn = within(tabelle).getByText('NESN').closest('tr') as HTMLElement
    expect(within(nesn).getByText('58.33 %')).toBeInTheDocument()
    expect(within(nesn).getByText('50.87 %')).toBeInTheDocument()
    expect(within(nesn).getByText('-7.46 %')).toBeInTheDocument()

    const aapl = within(tabelle).getByText('AAPL').closest('tr') as HTMLElement
    expect(within(aapl).getByText('+7.46 %')).toBeInTheDocument()

    expect(
      screen.getByRole('img', { name: 'Gewichtung vorher: NESN 58.33 %, AAPL 41.67 %' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Gewichtung nachher: NESN 50.87 %, AAPL 49.13 %' }),
    ).toBeInTheDocument()
  })

  it('bucht nichts und rührt den Cash-Stand nicht an', async () => {
    const buchungenVorher = backend.transactions.length
    const cashVorher = backend.accounts[0].cashAmount

    await simuliere('AAPL')
    await screen.findByRole('heading', { name: 'Kurs' })

    expect(backend.transactions).toHaveLength(buchungenVorher)
    expect(backend.accounts[0].cashAmount).toBe(cashVorher)
    expect(
      backend.requests.some(
        (request) => request.method === 'POST' && request.url.endsWith('/transactions'),
      ),
    ).toBe(false)
    expect(screen.getByText(/Der Zukauf wird nicht gebucht und kostet kein Cash/)).toBeInTheDocument()
  })

  it('übersetzt ein Symbol ohne Livekurs in einen deutschen Satz', async () => {
    await simuliere('XYZ')

    expect(
      await screen.findByText(
        'Für XYZ gibt es keinen aktuellen Kurs. Bitte ein anderes Symbol versuchen.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/No live quote available/)).not.toBeInTheDocument()
  })

  it('meldet ein leeres Symbol am Feld, bevor eine Anfrage entsteht', async () => {
    const { user } = await renderLoggedIn('/szenario')
    await user.click(screen.getByRole('tab', { name: 'Kaufsimulation' }))
    await screen.findByRole('heading', { name: 'Zukauf simulieren' })

    await user.click(screen.getByRole('button', { name: 'Simulieren' }))

    expect(
      await screen.findByText('Bitte ein Symbol eingeben, zum Beispiel AAPL.'),
    ).toBeInTheDocument()
    expect(anfragen()).toHaveLength(0)
  })

  it('meldet eine Menge von 0 am Feld, bevor eine Anfrage entsteht', async () => {
    const { user } = await renderLoggedIn('/szenario')
    await user.click(screen.getByRole('tab', { name: 'Kaufsimulation' }))
    await screen.findByRole('heading', { name: 'Zukauf simulieren' })

    await user.type(screen.getByLabelText('Symbol'), 'AAPL')
    await user.clear(screen.getByLabelText('Menge'))
    await user.type(screen.getByLabelText('Menge'), '0')
    await user.click(screen.getByRole('button', { name: 'Simulieren' }))

    expect(
      await screen.findByText('Bitte eine Menge grösser als 0 eingeben.'),
    ).toBeInTheDocument()
    expect(anfragen()).toHaveLength(0)
  })

  it('sperrt ohne Portfolio nur diesen Bereich und nicht die ganze Seite', async () => {
    // Die Kaufsimulation bewertet einen Bestand, die übrigen Bereiche rechnen nur auf Kursreihen.
    backend.portfolios.length = 0
    const { user } = await renderLoggedIn('/szenario')
    await screen.findByRole('table', { name: 'Anlageklassen' })

    await user.click(screen.getByRole('tab', { name: 'Kaufsimulation' }))

    expect(await screen.findByText(/Noch kein Portfolio vorhanden/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Simulieren' })).not.toBeInTheDocument()
  })
})
