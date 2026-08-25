import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAuthToken } from '../api/client'
import { vorJahren } from '../format/dates'
import { installFakeBackend, type FakeBackend } from '../test/fakeBackend'
import { renderLoggedIn } from '../test/renderApp'

/**
 * Sparplan-Simulation (YOUNGOITV-455) am Gesamtsystem.
 *
 * Zwei Dinge stehen im Mittelpunkt: die Parameter müssen so am Endpunkt ankommen, wie das Formular
 * sie zeigt (insbesondere die Positionsliste als `SYMBOL:gewicht`), und die Rebalancing-Karte darf
 * nur behaupten, was die Antwort hergibt. Gerechnet wird nichts in der Oberfläche.
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
  return backend.requests.filter((request) => request.url === '/simulate/sparplan')
}

function karte(label: string): HTMLElement {
  return screen.getByRole('heading', { name: label }).closest('.MuiCard-root') as HTMLElement
}

/** Öffnet den Sparplan-Bereich der Vergleichsseite. */
async function oeffneSparplan() {
  const angemeldet = await renderLoggedIn('/szenario')
  await angemeldet.user.click(screen.getByRole('tab', { name: 'Sparplan' }))
  await screen.findByRole('heading', { name: 'Sparplan' })
  return angemeldet
}

describe('Sparplan-Simulation', () => {
  it('schickt die Vorgaben des Formulars als Parameter und zeigt die Kennzahlen der Antwort', async () => {
    const { user } = await oeffneSparplan()

    await user.click(screen.getByRole('button', { name: 'Simulieren' }))
    await screen.findByRole('heading', { name: 'Endwert' })

    expect(anfragen()[0].params).toEqual({
      startDate: vorJahren(5),
      amount: 500,
      intervalMonths: 1,
      // Die Liste als Query-Parameter, genau so liest sie der Controller.
      positions: 'SPY:60,AGG:40',
      rebalancing: false,
      rebalancingIntervalMonths: 12,
      rebalancingMode: 'INTERVAL',
      rebalancingBandPercent: 10,
    })

    expect(within(karte('Endwert')).getByText("2'150.00")).toBeInTheDocument()
    expect(within(karte('Eingezahlt')).getByText("2'000.00")).toBeInTheDocument()
    expect(within(karte('Gewinn')).getByText('150.00')).toBeInTheDocument()
    expect(within(karte('Gesamtrendite')).getByText('+7.5 %')).toBeInTheDocument()
    expect(within(karte('Rendite pro Jahr')).getByText('+22.2 %')).toBeInTheDocument()
    expect(within(karte('Maximaler Rückgang')).getByText('3.4 %')).toBeInTheDocument()
  })

  it('schreibt keinen Währungscode an die Beträge, weil die Antwort keine Währung mitliefert', async () => {
    const { user } = await oeffneSparplan()

    await user.click(screen.getByRole('button', { name: 'Simulieren' }))
    await screen.findByRole('heading', { name: 'Endwert' })

    expect(within(karte('Endwert')).queryByText(/CHF/)).not.toBeInTheDocument()
    expect(
      screen.getByText(/Die Beträge stehen in der Währung der Kursreihen/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: "Depotwert und Einzahlungen: Depotwert von 500.00 auf 2'150.00, Eingezahlt von 500.00 auf 2'000.00",
      }),
    ).toBeInTheDocument()
  })

  it('stellt Soll und Ist am Ende gegenüber', async () => {
    const { user } = await oeffneSparplan()

    await user.click(screen.getByRole('button', { name: 'Simulieren' }))
    const tabelle = await screen.findByRole('table', { name: 'Soll und Ist' })

    const spy = within(tabelle).getByText('SPY').closest('tr') as HTMLElement
    expect(within(spy).getByText('60.0 %')).toBeInTheDocument()
    expect(within(spy).getByText('62.5 %')).toBeInTheDocument()
    expect(within(spy).getByText('+2.5 %')).toBeInTheDocument()

    const agg = within(tabelle).getByText('AGG').closest('tr') as HTMLElement
    expect(within(agg).getByText('-2.5 %')).toBeInTheDocument()
  })

  it('sagt ohne Rebalancing, dass ohne gerechnet wurde, statt Ereignisse zu zeigen', async () => {
    const { user } = await oeffneSparplan()

    await user.click(screen.getByRole('button', { name: 'Simulieren' }))
    await screen.findByRole('heading', { name: 'Endwert' })

    expect(screen.getByText(/Ohne Rebalancing gerechnet/)).toBeInTheDocument()
    expect(
      screen.queryByRole('table', { name: 'Rebalancing-Ereignisse' }),
    ).not.toBeInTheDocument()
  })

  it('schickt eingeschaltetes Rebalancing mit und listet die Umschichtungen auf', async () => {
    const { user } = await oeffneSparplan()

    await user.click(screen.getByRole('switch', { name: 'Rebalancing' }))
    await user.click(screen.getByRole('button', { name: 'Simulieren' }))
    const tabelle = await screen.findByRole('table', { name: 'Rebalancing-Ereignisse' })

    expect(anfragen()[0].params?.rebalancing).toBe(true)
    expect(anfragen()[0].params?.rebalancingIntervalMonths).toBe(12)
    expect(screen.getByText('Periodisch, 1 mal umgeschichtet.')).toBeInTheDocument()

    const ereignis = within(tabelle).getByText('01.03.2024').closest('tr') as HTMLElement
    // Der Auslöser kommt als kleingeschriebenes "intervall" und wird übersetzt.
    expect(within(ereignis).getByText('Rhythmus erreicht')).toBeInTheDocument()
    expect(within(ereignis).getByText("1'480.00")).toBeInTheDocument()
    // GLD steht mit 0 in der Antwort und gehört nicht in die Aufzählung.
    expect(within(ereignis).getByText('AGG +1.25, SPY -0.5')).toBeInTheDocument()
  })

  it('schickt beim Toleranzband die Prozentpunkte statt des Rhythmus', async () => {
    const { user } = await oeffneSparplan()

    await user.click(screen.getByRole('switch', { name: 'Rebalancing' }))
    await user.click(screen.getByRole('combobox', { name: 'Rebalancing-Art' }))
    await user.click(await screen.findByRole('option', { name: 'Toleranzband' }))
    await user.clear(screen.getByLabelText('Toleranzband in Prozentpunkten'))
    await user.type(screen.getByLabelText('Toleranzband in Prozentpunkten'), '5')
    await user.click(screen.getByRole('button', { name: 'Simulieren' }))
    await screen.findByRole('heading', { name: 'Endwert' })

    expect(anfragen()[0].params?.rebalancingMode).toBe('THRESHOLD')
    expect(anfragen()[0].params?.rebalancingBandPercent).toBe(5)
  })

  it('meldet ein Symbol mit Komma am Feld, statt es in den Query-Parameter zu lassen', async () => {
    // Ein Komma im Ticker würde in `SYMBOL:gewicht,SYMBOL:gewicht` still eine zweite Position machen.
    const { user } = await oeffneSparplan()

    await user.clear(screen.getByLabelText('Positionen Symbol 1'))
    await user.type(screen.getByLabelText('Positionen Symbol 1'), 'SPY,AGG')
    await user.click(screen.getByRole('button', { name: 'Simulieren' }))

    expect(
      await screen.findByText(
        'SPY,AGG ist kein gültiges Symbol. Erlaubt sind Buchstaben, Zahlen und . - ^ =',
      ),
    ).toBeInTheDocument()
    expect(anfragen()).toHaveLength(0)
  })

  it('meldet einen fehlenden Betrag, bevor eine Anfrage entsteht', async () => {
    const { user } = await oeffneSparplan()

    await user.clear(screen.getByLabelText('Betrag je Einzahlung'))
    await user.click(screen.getByRole('button', { name: 'Simulieren' }))

    expect(
      await screen.findByText('Bitte einen Betrag grösser als 0 eingeben.'),
    ).toBeInTheDocument()
    expect(anfragen()).toHaveLength(0)
  })

  it('übersetzt einen fachlichen 400er in einen deutschen Hinweis', async () => {
    backend.forceStatus('/simulate/sparplan', 400)
    const { user } = await oeffneSparplan()

    await user.click(screen.getByRole('button', { name: 'Simulieren' }))

    expect(
      await screen.findByText(
        'Mit diesen Parametern lässt sich die Simulation nicht rechnen. Bitte Eingaben prüfen.',
      ),
    ).toBeInTheDocument()
    // Der englische Wortlaut des Backends bleibt aussen vor.
    expect(screen.queryByText(/Forced status/)).not.toBeInTheDocument()
  })
})
