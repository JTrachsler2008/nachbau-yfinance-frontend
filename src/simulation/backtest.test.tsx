import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAuthToken } from '../api/client'
import { gestern, heute, vorJahren } from '../format/dates'
import { formatDate } from '../format/numbers'
import { installFakeBackend, type FakeBackend } from '../test/fakeBackend'
import { renderLoggedIn } from '../test/renderApp'

/**
 * Historischer Backtest (YOUNGOITV-456, UC-03) am Gesamtsystem.
 *
 * Der Bereich braucht kein Portfolio und bucht nichts, deshalb geht es hier um zwei Dinge: das
 * Kaufdatum muss in der Vergangenheit liegen, bevor eine Anfrage entsteht, und die Beträge dürfen
 * keinen Währungscode tragen, weil die Antwort keine Währung mitliefert.
 *
 * Das Datumsfeld wird mit `fireEvent.change` gesetzt. Ein `input type="date"` nimmt keine
 * Zeichenfolge über Tastendrücke an, und genau dieses Feld muss geprüft werden.
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
  return backend.requests.filter((request) => request.url === '/simulate/backtest')
}

function karte(label: string): HTMLElement {
  return screen.getByRole('heading', { name: label }).closest('.MuiCard-root') as HTMLElement
}

/** Öffnet den Bereich, ohne schon zu rechnen. */
async function oeffneBacktest() {
  const angemeldet = await renderLoggedIn('/szenario')
  await angemeldet.user.click(screen.getByRole('tab', { name: 'Backtest' }))
  await screen.findByRole('heading', { name: 'Kauf in der Vergangenheit' })
  return angemeldet
}

/** Öffnet den Bereich und rechnet über die Vorgaben, nur das Symbol kommt von aussen. */
async function rechne(symbol: string) {
  const angemeldet = await oeffneBacktest()
  await angemeldet.user.type(screen.getByLabelText('Symbol'), symbol)
  await angemeldet.user.click(screen.getByRole('button', { name: 'Rechnen' }))
  return angemeldet
}

describe('Historischer Backtest', () => {
  it('rechnet erst auf Knopfdruck und nicht schon beim Öffnen', async () => {
    await oeffneBacktest()

    expect(screen.getByText(/Noch nichts gerechnet/)).toBeInTheDocument()
    expect(anfragen()).toHaveLength(0)
  })

  it('schickt Symbol, Menge und Kaufdatum und zeigt die Kennzahlen der Antwort', async () => {
    await rechne('aapl')
    await screen.findByRole('heading', { name: 'Kurs beim Kauf' })

    expect(anfragen()[0].params).toEqual({
      symbol: 'AAPL',
      quantity: 10,
      purchaseDate: vorJahren(3),
    })

    expect(within(karte('Kurs beim Kauf')).getByText('150.00')).toBeInTheDocument()
    expect(within(karte('Kurs heute')).getByText('200.00')).toBeInTheDocument()
    expect(within(karte('Eingesetzt')).getByText("1'500.00")).toBeInTheDocument()
    expect(within(karte('Wert heute')).getByText("2'000.00")).toBeInTheDocument()
    expect(within(karte('Gewinn')).getByText('500.00')).toBeInTheDocument()
    expect(within(karte('Rendite')).getByText('+33.33 %')).toBeInTheDocument()
  })

  it('nennt Menge und Kaufdatum zum Ergebnis, damit die Zahlen zuordenbar bleiben', async () => {
    await rechne('AAPL')

    expect(await screen.findByRole('heading', { name: 'AAPL' })).toBeInTheDocument()
    expect(
      screen.getByText(`10 Stück, gekauft am ${formatDate(vorJahren(3))}`),
    ).toBeInTheDocument()
  })

  it('zeichnet den Einsatz als eigene Reihe und nennt keine Währung', async () => {
    await rechne('AAPL')
    await screen.findByRole('heading', { name: 'Kurs beim Kauf' })

    // Der Einsatz bleibt bei einem einmaligen Kauf über die ganze Reihe gleich, er ist die Nulllinie.
    expect(
      screen.getByRole('img', {
        name: "Wert der Position seit dem Kauf: Wert der Position von 1'500.00 auf 2'000.00, Eingesetzt von 1'500.00 auf 1'500.00",
      }),
    ).toBeInTheDocument()
    expect(within(karte('Wert heute')).queryByText(/CHF/)).not.toBeInTheDocument()
    expect(
      screen.getByText(/ohne Währungscode, weil die Antwort keine Währung mitliefert/),
    ).toBeInTheDocument()
  })

  it('zeigt ohne Kursreihe einen Hinweis statt einer leeren Fläche', async () => {
    backend.simulations.backtest.priceHistory = []
    await rechne('AAPL')

    expect(
      await screen.findByText('Ab diesem Datum liegen keine Kurse vor.'),
    ).toBeInTheDocument()
  })

  it('übersetzt fehlende historische Kurse in einen deutschen Satz', async () => {
    await rechne('XYZ')

    expect(
      await screen.findByText(
        'Für XYZ sind keine historischen Kurse verfügbar. Bitte ein anderes Symbol oder ein späteres Kaufdatum versuchen.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/No historical prices available/)).not.toBeInTheDocument()
  })

  it('lässt den heutigen Tag als Kaufdatum nicht zu, weil der Endpunkt bis gestern rechnet', async () => {
    const { user } = await oeffneBacktest()

    const datum = screen.getByLabelText('Kaufdatum')
    expect(datum).toHaveAttribute('max', gestern())

    await user.type(screen.getByLabelText('Symbol'), 'AAPL')
    fireEvent.change(datum, { target: { value: heute() } })
    await user.click(screen.getByRole('button', { name: 'Rechnen' }))

    expect(
      await screen.findByText('Das Kaufdatum muss vor dem heutigen Tag liegen.'),
    ).toBeInTheDocument()
    expect(anfragen()).toHaveLength(0)
  })

  it('meldet ein fehlendes Kaufdatum am Feld', async () => {
    const { user } = await oeffneBacktest()

    await user.type(screen.getByLabelText('Symbol'), 'AAPL')
    fireEvent.change(screen.getByLabelText('Kaufdatum'), { target: { value: '' } })
    await user.click(screen.getByRole('button', { name: 'Rechnen' }))

    expect(await screen.findByText('Bitte ein Kaufdatum wählen.')).toBeInTheDocument()
    expect(anfragen()).toHaveLength(0)
  })

  it('meldet ein leeres Symbol und eine Menge von 0, bevor eine Anfrage entsteht', async () => {
    const { user } = await oeffneBacktest()

    await user.click(screen.getByRole('button', { name: 'Rechnen' }))
    expect(
      await screen.findByText('Bitte ein Symbol eingeben, zum Beispiel AAPL.'),
    ).toBeInTheDocument()

    await user.type(screen.getByLabelText('Symbol'), 'AAPL')
    await user.clear(screen.getByLabelText('Menge'))
    await user.type(screen.getByLabelText('Menge'), '0')
    await user.click(screen.getByRole('button', { name: 'Rechnen' }))

    expect(await screen.findByText('Bitte eine Menge grösser als 0 eingeben.')).toBeInTheDocument()
    expect(anfragen()).toHaveLength(0)
  })
})
