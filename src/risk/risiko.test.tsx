import { screen, within } from '@testing-library/react'
import type { AxiosAdapter } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apiClient, setAuthToken } from '../api/client'
import { installFakeBackend, type FakeBackend } from '../test/fakeBackend'
import { renderLoggedIn } from '../test/renderApp'

/**
 * Risiko-Seite (YOUNGOITV-453) am Gesamtsystem.
 *
 * Die Kennzahlen selbst rechnet das Backend, hier zählt dreierlei: dass die Zahlen unverfälscht und
 * mit der richtigen Einheit ankommen, dass Zeitraum und Benchmark tatsächlich in der Abfrage landen
 * (eine Beschriftung "Beta zu URTH" über einem Beta gegen SPY wäre die schlimmste Form von falsch),
 * und dass jede Lücke als Lücke erscheint statt als 0.
 */

let backend: FakeBackend

beforeEach(() => {
  setAuthToken(null)
  backend = installFakeBackend()
})

afterEach(() => {
  backend.restore()
})

function karte(label: string): HTMLElement {
  const titel = screen.getByRole('heading', { name: label })
  return titel.closest('.MuiCard-root') as HTMLElement
}

function wertpapierzeile(symbol: string): HTMLElement {
  const tabelle = screen.getByRole('table', { name: 'Kennzahlen je Wertpapier' })
  return within(tabelle).getByText(symbol).closest('tr') as HTMLElement
}

/** Die letzte Risikoabfrage. In ihren Parametern steckt die Verdrahtung der Bedienelemente. */
function letzteAbfrage() {
  return backend.requests.filter((request) => request.url === '/portfolios/10/risk').at(-1)
}

/**
 * Hält die Risikoabfrage an und gibt sie erst auf Zuruf frei.
 *
 * Nur so ist der Ladezustand überhaupt prüfbar: das Fake-Backend antwortet im nächsten Microtask,
 * der Hinweis auf die Wartezeit wäre also schon wieder verschwunden, bevor ein `findBy` das erste
 * Mal nachsieht. Der Adapter wird umhüllt und nicht ersetzt, damit alle übrigen Endpunkte weiter
 * antworten; `backend.restore()` setzt ihn im `afterEach` ohnehin zurück.
 */
function haltRisikoAn(): () => void {
  const umhuellt = apiClient.defaults.adapter as AxiosAdapter
  let freigeben = (): void => {}
  const gehalten = new Promise<void>((resolve) => {
    freigeben = () => {
      resolve()
    }
  })
  apiClient.defaults.adapter = async (config) => {
    if ((config.url ?? '').endsWith('/risk')) {
      await gehalten
    }
    return umhuellt(config)
  }
  return freigeben
}

describe('Risiko-Seite', () => {
  it('zeigt die Kennzahlen des Backends mit ihrer Einheit', async () => {
    await renderLoggedIn('/risiko')
    await screen.findByRole('table', { name: 'Kennzahlen je Wertpapier' })

    expect(screen.getByRole('heading', { level: 1, name: 'Risiko' })).toBeInTheDocument()
    expect(within(karte('Rendite p.a.')).getByText('+13.18 %')).toBeInTheDocument()
    expect(within(karte('Volatilität p.a.')).getByText('19.85 %')).toBeInTheDocument()
    // Sharpe und Beta sind Verhältniszahlen und tragen deshalb kein Prozentzeichen.
    expect(within(karte('Sharpe Ratio')).getByText('0.46')).toBeInTheDocument()
    expect(within(karte('Beta zu SPY')).getByText('0.99')).toBeInTheDocument()
    expect(within(karte('Maximaler Rückgang')).getByText('-17.9 %')).toBeInTheDocument()
    expect(within(karte('Value at Risk 95 %')).getByText('-1.95 %')).toBeInTheDocument()
  })

  it('nennt Zeitpunkt und Dauer des maximalen Rückgangs, nicht nur die Prozentzahl', async () => {
    await renderLoggedIn('/risiko')
    await screen.findByRole('table', { name: 'Kennzahlen je Wertpapier' })

    // Aus defaultRisk(): 2026-03-12 bis 2026-04-09, das sind 28 Tage.
    expect(
      within(karte('Maximaler Rückgang')).getByText('12.03.2026 bis 09.04.2026 (28 Tage)'),
    ).toBeInTheDocument()
  })

  it('nennt Vergleichsgrösse und Annahme zu Sharpe und Volatilität', async () => {
    await renderLoggedIn('/risiko')
    await screen.findByRole('table', { name: 'Kennzahlen je Wertpapier' })

    // Eine Volatilität ohne Bezugsgrösse ist weder hoch noch niedrig, deshalb steht die der
    // Benchmark daneben und der risikofreie Zins beim Sharpe, der ohne ihn nicht nachvollziehbar ist.
    expect(within(karte('Volatilität p.a.')).getByText(/Benchmark SPY: 17.4 %/)).toBeInTheDocument()
    expect(
      within(karte('Sharpe Ratio')).getByText(/risikofreien Zins von 4.0 %/),
    ).toBeInTheDocument()
  })

  it('überträgt den gewählten Zeitraum in die Abfrage', async () => {
    const { user } = await renderLoggedIn('/risiko')
    await screen.findByRole('table', { name: 'Kennzahlen je Wertpapier' })

    expect(letzteAbfrage()?.params).toEqual({ lookbackDays: 365, benchmark: 'SPY' })

    await user.click(within(screen.getByRole('group', { name: 'Zeitraum' })).getByText('3 Monate'))

    expect(
      await screen.findByRole('heading', { name: 'Volatilität gegen Rendite über 3 Monate' }),
    ).toBeInTheDocument()
    expect(letzteAbfrage()?.params).toEqual({ lookbackDays: 90, benchmark: 'SPY' })
  })

  it('rechnet mit einem frei gewählten Zeitraum statt einem Preset', async () => {
    const { user } = await renderLoggedIn('/risiko')
    await screen.findByRole('table', { name: 'Kennzahlen je Wertpapier' })

    await user.click(within(screen.getByRole('group', { name: 'Zeitraum' })).getByText('Benutzerdefiniert'))
    const von = screen.getByLabelText('Von')
    const bis = screen.getByLabelText('Bis')
    await user.clear(von)
    await user.type(von, '2025-01-01')
    await user.clear(bis)
    await user.type(bis, '2025-06-30')

    await screen.findByRole('heading', { name: 'Volatilität gegen Rendite über 01.01.2025–30.06.2025' })
    expect(letzteAbfrage()?.params).toEqual({ from: '2025-01-01', to: '2025-06-30', benchmark: 'SPY' })
  })

  it('lässt ein "Von" nach dem "Bis" nicht abfragen', async () => {
    const { user } = await renderLoggedIn('/risiko')
    await screen.findByRole('table', { name: 'Kennzahlen je Wertpapier' })

    await user.click(within(screen.getByRole('group', { name: 'Zeitraum' })).getByText('Benutzerdefiniert'))
    await user.clear(screen.getByLabelText('Von'))
    await user.type(screen.getByLabelText('Von'), '2025-06-30')
    await user.clear(screen.getByLabelText('Bis'))
    await user.type(screen.getByLabelText('Bis'), '2025-01-01')

    expect(screen.getByText(/"Von" muss vor "Bis" liegen/)).toBeInTheDocument()
    // Keine Anfrage mit dieser ungültigen Kombination - unabhängig davon, was während des Tippens
    // an Zwischenzuständen ausgelöst wurde.
    expect(
      backend.requests.some(
        (request) =>
          request.url === '/portfolios/10/risk' &&
          (request.params as Record<string, unknown> | undefined)?.from === '2025-06-30' &&
          (request.params as Record<string, unknown> | undefined)?.to === '2025-01-01',
      ),
    ).toBe(false)
  })

  it('überträgt die vorgeschlagene Benchmark in die Abfrage und in die Beschriftung', async () => {
    const { user } = await renderLoggedIn('/risiko')
    await screen.findByRole('table', { name: 'Kennzahlen je Wertpapier' })

    await user.click(screen.getByRole('combobox', { name: 'Benchmark' }))
    await user.click(await screen.findByRole('option', { name: 'URTH' }))

    expect(await screen.findByRole('heading', { name: 'Beta zu URTH' })).toBeInTheDocument()
    expect(letzteAbfrage()?.params).toEqual({ lookbackDays: 365, benchmark: 'URTH' })
  })

  it('akzeptiert eine frei eingetippte Benchmark ausserhalb der Vorschläge', async () => {
    const { user } = await renderLoggedIn('/risiko')
    await screen.findByRole('table', { name: 'Kennzahlen je Wertpapier' })

    const feld = screen.getByRole('combobox', { name: 'Benchmark' })
    await user.clear(feld)
    await user.type(feld, 'qqq')

    expect(await screen.findByRole('heading', { name: 'Beta zu QQQ' })).toBeInTheDocument()
    expect(letzteAbfrage()?.params).toEqual({ lookbackDays: 365, benchmark: 'QQQ' })
  })

  it('stellt Portfolio, Benchmark und Wertpapiere als Punkte gegenüber', async () => {
    await renderLoggedIn('/risiko')
    await screen.findByRole('table', { name: 'Kennzahlen je Wertpapier' })

    // Textalternative des Streudiagramms: dieselben Punkte in Worten, weil aus einer Punktwolke ohne
    // sie nichts hervorgeht.
    expect(
      screen.getByRole('img', {
        name:
          'Volatilität gegen Rendite über 1 Jahr: Portfolio 19.85 % Volatilität bei +13.18 % Rendite, ' +
          'SPY 17.4 % Volatilität bei +11.25 % Rendite, NESN 14.2 % Volatilität bei +5.4 % Rendite, ' +
          'AAPL 26.8 % Volatilität bei +18.6 % Rendite',
      }),
    ).toBeInTheDocument()
  })

  it('führt die Kennzahlen je Wertpapier einzeln auf', async () => {
    await renderLoggedIn('/risiko')
    await screen.findByRole('table', { name: 'Kennzahlen je Wertpapier' })

    const nesn = wertpapierzeile('NESN')
    expect(within(nesn).getByText('41.05 %')).toBeInTheDocument()
    expect(within(nesn).getByText('14.2 %')).toBeInTheDocument()
    expect(within(nesn).getByText('0.62')).toBeInTheDocument()
    const aapl = wertpapierzeile('AAPL')
    expect(within(aapl).getByText('26.8 %')).toBeInTheDocument()
    expect(within(aapl).getByText('-22.4 %')).toBeInTheDocument()
    expect(within(aapl).getByText('1.24')).toBeInTheDocument()

    // Der Diversifikationsgewinn ist die Aussage über das Zusammenspiel und steht deshalb dabei.
    expect(screen.getByText(/Gerechnet auf 248 Handelstagen/)).toBeInTheDocument()
    expect(screen.getByText(/Die Streuung bringt 1.78 %/)).toBeInTheDocument()
  })

  it('behauptet ohne zweites Wertpapier keinen Diversifikationsgewinn', async () => {
    const analyse = backend.risk.get(10)
    if (analyse !== undefined) {
      analyse.securities = analyse.securities.slice(0, 1)
      analyse.diversificationBenefit = null
    }
    await renderLoggedIn('/risiko')
    await screen.findByRole('table', { name: 'Kennzahlen je Wertpapier' })

    expect(screen.getByText(/erst ab zwei auswertbaren Wertpapieren/)).toBeInTheDocument()
    expect(screen.queryByText(/Die Streuung bringt/)).not.toBeInTheDocument()
  })

  it('übersetzt die Ausschlussgründe und nennt auch eine unbekannte Kennung', async () => {
    backend.risk.get(10)?.excluded.push(
      { symbol: 'ZUEG', reason: 'NO_PRICE_HISTORY' },
      { symbol: 'FOO', reason: 'ETWAS_NEUES' },
    )
    await renderLoggedIn('/risiko')
    await screen.findByRole('table', { name: 'Kennzahlen je Wertpapier' })

    expect(screen.getByText('Nicht in der Rechnung enthalten')).toBeInTheDocument()
    expect(screen.getByText('ZUEG')).toBeInTheDocument()
    expect(screen.getByText(/Keine Kurshistorie im Zeitraum/)).toBeInTheDocument()
    expect(screen.getByText(/Kennung ETWAS_NEUES/)).toBeInTheDocument()
  })

  it('lässt fehlende Kennzahlen leer statt sie auf 0 zu setzen', async () => {
    // Kein Eintrag heisst im Fake-Backend die leere Analyse, also die Antwort auf ein Portfolio
    // ohne verwertbare Positionen.
    backend.risk.delete(10)
    await renderLoggedIn('/risiko')

    expect(await screen.findByText(/Noch kein Wertpapier im Bestand/)).toBeInTheDocument()
    expect(within(karte('Volatilität p.a.')).getByText('–')).toBeInTheDocument()
    expect(within(karte('Beta zu SPY')).getByText('–')).toBeInTheDocument()
    // Ohne Wertpapiere gibt es keine Tabelle und kein Diagramm, sondern den Hinweis darüber.
    expect(screen.queryByRole('table', { name: 'Kennzahlen je Wertpapier' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /Volatilität gegen Rendite/ }),
    ).not.toBeInTheDocument()
  })

  it('meldet einen Serverfehler einmal für die ganze Gruppe und ohne Backend-Wortlaut', async () => {
    backend.forceStatus('/risk', 500)
    await renderLoggedIn('/risiko')

    expect(
      await screen.findByText('Die Risikoanalyse konnte nicht geladen werden'),
    ).toBeInTheDocument()
    expect(screen.getByText('Serverfehler. Bitte später erneut versuchen.')).toBeInTheDocument()
    // Sechs Karten mit derselben Meldung wären sechsmal dieselbe Information.
    expect(screen.queryByRole('heading', { name: 'Volatilität p.a.' })).not.toBeInTheDocument()
    // Der Zeitraum bleibt bedienbar: die Auswahl ist der einzige Weg zurück zu einer Antwort.
    expect(screen.getByRole('group', { name: 'Zeitraum' })).toBeInTheDocument()
  })

  it('kündigt die Wartezeit des Kursabrufs an, statt nur Platzhalter zu zeigen', async () => {
    const freigeben = haltRisikoAn()
    await renderLoggedIn('/risiko')

    expect(await screen.findByText(/kann einige Sekunden dauern/)).toBeInTheDocument()
    // Die Karten stehen währenddessen mit Platzhaltern da und nicht mit "–": es fehlt nichts, es
    // dauert nur.
    expect(screen.getByRole('heading', { name: 'Volatilität p.a.' })).toBeInTheDocument()

    freigeben()

    expect(await screen.findByRole('table', { name: 'Kennzahlen je Wertpapier' })).toBeInTheDocument()
  })

  it('benennt die Grenzen der Methode', async () => {
    await renderLoggedIn('/risiko')

    // Der Bestand von heute über den Zeitraum zurückgerechnet: das ist die Methode des Originals,
    // und wer im Zeitraum umgeschichtet hat, muss wissen, dass er nicht sein damaliges Risiko sieht.
    expect(await screen.findByText(/zurückprojiziert über den/)).toBeInTheDocument()
    expect(screen.getByText(/Wechselkursbewegungen sind/)).toBeInTheDocument()
  })
})
