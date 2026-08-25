import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAuthToken } from '../api/client'
import { installFakeBackend, type FakeBackend } from '../test/fakeBackend'
import { renderLoggedIn } from '../test/renderApp'

/**
 * Vergleichsseite (YOUNGOITV-454) am Gesamtsystem.
 *
 * Geprüft wird, was die Seite behaupten darf: die vom Backend gelieferten Indexwerte, die Lücken
 * darin und die Verdrahtung der Formulare. Der Anlageklassen-Vergleich hat keine Eingaben und lädt
 * beim Öffnen, der Portfolio-Vergleich schickt seine ganze Zusammenstellung im Body.
 */

let backend: FakeBackend

beforeEach(() => {
  setAuthToken(null)
  backend = installFakeBackend()
})

afterEach(() => {
  backend.restore()
})

function anfragen(pfad: string) {
  return backend.requests.filter((request) => request.url === pfad)
}

function zeile(tabelle: HTMLElement, name: string): HTMLElement {
  return within(tabelle).getByText(name).closest('tr') as HTMLElement
}

describe('Anlageklassen-Vergleich', () => {
  it('nennt Anlageklasse und tatsächlichen Ticker und zeigt Start, Ende und Veränderung', async () => {
    await renderLoggedIn('/szenario')
    const tabelle = await screen.findByRole('table', { name: 'Anlageklassen' })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Vergleiche und Simulation' }),
    ).toBeInTheDocument()

    // Das Label allein ("MSCI World") sagte im Original nichts darüber, welches Symbol gefragt wurde.
    const aktien = zeile(tabelle, 'Aktien (S&P 500) (SPY)')
    expect(within(aktien).getByText('100.00')).toBeInTheDocument()
    expect(within(aktien).getByText('112.25')).toBeInTheDocument()
    expect(within(aktien).getByText('+12.25 %')).toBeInTheDocument()
  })

  it('rechnet eine Reihe mit Lücke auf ihre eigenen Werte, nicht auf die der Nachbarreihe', async () => {
    await renderLoggedIn('/szenario')
    const tabelle = await screen.findByRole('table', { name: 'Anlageklassen' })

    // Gold fehlt im Ausgangsbestand an einem Datum. Der Endwert muss trotzdem der von Gold sein.
    const gold = zeile(tabelle, 'Gold (GLD)')
    expect(within(gold).getByText('101.40')).toBeInTheDocument()
    expect(within(gold).getByText('+1.4 %')).toBeInTheDocument()
  })

  it('gibt dem Diagramm eine Textalternative mit denselben Zahlen', async () => {
    await renderLoggedIn('/szenario')
    await screen.findByRole('table', { name: 'Anlageklassen' })

    expect(
      screen.getByRole('img', {
        name: 'Normalisierter Verlauf über 10 Jahre: Aktien (S&P 500) (SPY) von 100.00 auf 112.25, Gold (GLD) von 100.00 auf 101.40',
      }),
    ).toBeInTheDocument()
  })

  it('sagt bei einer Anlageklasse ohne jeden Kurs "ohne Werte" statt 0', async () => {
    // Der Endpunkt nennt die Klasse in `assetClasses`, liefert aber keinen Punkt dazu.
    backend.simulations.assetClassComparison.assetClasses.push({
      symbol: 'BTC-USD',
      label: 'Bitcoin',
    })
    await renderLoggedIn('/szenario')
    const tabelle = await screen.findByRole('table', { name: 'Anlageklassen' })

    expect(screen.getByRole('img', { name: /Bitcoin \(BTC-USD\) ohne Werte/ })).toBeInTheDocument()
    const bitcoin = zeile(tabelle, 'Bitcoin (BTC-USD)')
    expect(within(bitcoin).getAllByText('–')).toHaveLength(3)
  })

  it('fragt einen gewählten Zeitraum beim Backend nach', async () => {
    const { user } = await renderLoggedIn('/szenario')
    await screen.findByRole('table', { name: 'Anlageklassen' })

    await user.click(screen.getByRole('button', { name: '3 Jahre' }))

    await screen.findByRole('heading', { name: 'Normalisierter Verlauf über 3 Jahre' })
    expect(anfragen('/compare/asset-classes').at(-1)?.params).toEqual({ period: 3 })
  })

  it('zeigt ohne Kurse einen Hinweis statt einer leeren Fläche', async () => {
    backend.simulations.assetClassComparison = { assetClasses: [], series: [] }
    await renderLoggedIn('/szenario')

    expect(
      await screen.findByText(/Für keine der Anlageklassen liegen Kurse vor/),
    ).toBeInTheDocument()
  })

  it('verschweigt den technischen Text eines Serverfehlers', async () => {
    backend.forceStatus('/compare/asset-classes', 500)
    await renderLoggedIn('/szenario')

    expect(await screen.findByText('Der Vergleich konnte nicht geladen werden')).toBeInTheDocument()
    expect(screen.getByText('Serverfehler. Bitte später erneut versuchen.')).toBeInTheDocument()
    // SEC-5: der Wortlaut des Backends kann Klassennamen tragen und gehört nicht in die Oberfläche.
    expect(screen.queryByText(/NullPointerException/)).not.toBeInTheDocument()
  })
})

describe('Portfolio-Vergleich', () => {
  it('schickt beide Zusammenstellungen im Body und beschriftet die Reihen mit den Namen', async () => {
    const { user } = await renderLoggedIn('/szenario')
    await screen.findByRole('table', { name: 'Anlageklassen' })

    await user.click(screen.getByRole('button', { name: 'Vergleichen' }))
    const tabelle = await screen.findByRole('table', { name: 'Portfolios im Vergleich' })

    expect(anfragen('/compare/portfolios')[0].body).toEqual({
      portfolioA: {
        name: '60 / 40',
        positions: [
          { symbol: 'SPY', weight: 60 },
          { symbol: 'AGG', weight: 40 },
        ],
      },
      portfolioB: { name: 'Nur Aktien', positions: [{ symbol: 'SPY', weight: 100 }] },
      periodYears: 10,
    })

    const a = zeile(tabelle, '60 / 40')
    expect(within(a).getByText('105.80')).toBeInTheDocument()
    expect(within(a).getByText('+5.8 %')).toBeInTheDocument()
  })

  it('überspringt ein Datum ohne Kurs, statt die Reihe dort enden zu lassen', async () => {
    const { user } = await renderLoggedIn('/szenario')
    await screen.findByRole('table', { name: 'Anlageklassen' })

    await user.click(screen.getByRole('button', { name: 'Vergleichen' }))
    const tabelle = await screen.findByRole('table', { name: 'Portfolios im Vergleich' })

    // Portfolio B hat im Ausgangsbestand an einem Datum keinen Wert. Der Endwert steht danach.
    const b = zeile(tabelle, 'Nur Aktien')
    expect(within(b).getByText('112.25')).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'Normalisierter Verlauf beider Zusammenstellungen: 60 / 40 von 100.00 auf 105.80, Nur Aktien von 100.00 auf 112.25',
      }),
    ).toBeInTheDocument()
  })

  it('meldet eine unvollständige Zeile am Feld, bevor eine Anfrage entsteht', async () => {
    const { user } = await renderLoggedIn('/szenario')
    await screen.findByRole('table', { name: 'Anlageklassen' })

    await user.clear(screen.getByLabelText('Portfolio B Gewicht 1'))
    await user.click(screen.getByRole('button', { name: 'Vergleichen' }))

    expect(
      await screen.findByText('Das Gewicht von SPY muss eine Zahl grösser als 0 sein.'),
    ).toBeInTheDocument()
    expect(anfragen('/compare/portfolios')).toHaveLength(0)
  })

  it('meldet beide Seiten gleichzeitig, damit nicht zweimal abgeschickt werden muss', async () => {
    const { user } = await renderLoggedIn('/szenario')
    await screen.findByRole('table', { name: 'Anlageklassen' })

    await user.clear(screen.getByLabelText('Portfolio A Symbol 1'))
    await user.clear(screen.getByLabelText('Portfolio B Gewicht 1'))
    await user.click(screen.getByRole('button', { name: 'Vergleichen' }))

    expect(
      await screen.findByText('Bitte ein Symbol eingeben, zum Beispiel SPY.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Das Gewicht von SPY muss eine Zahl grösser als 0 sein.'),
    ).toBeInTheDocument()
    expect(anfragen('/compare/portfolios')).toHaveLength(0)
  })
})
