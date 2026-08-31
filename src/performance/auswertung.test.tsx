import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAuthToken } from '../api/client'
import { vorTagen } from '../format/dates'
import { formatDate } from '../format/numbers'
import {
  installFakeBackend,
  type FakeBackend,
  type FakePortfolioHistory,
  type FakeTransaction,
} from '../test/fakeBackend'
import { renderLoggedIn } from '../test/renderApp'

/**
 * Performance-Seite (YOUNGOITV-452) am Gesamtsystem.
 *
 * Geprüft werden die Zahlen, die die Seite überhaupt behaupten darf: die vom Backend gelieferten
 * Summen, der Wertverlauf samt zeitgewichteter Rendite und die Jahresauswertung aus der Historie.
 * Dazu die Trennung nach Währung, denn eine addierte Mischung aus CHF und USD wäre im Diagramm nicht
 * als Fehler zu erkennen.
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

/**
 * Wartet, bis der Wertverlauf geladen ist.
 *
 * Auf die Tabelle und nicht auf die Überschrift: die steht schon während des Ladens da, die Karten
 * daneben zeigen dann noch ihr Ladeskelett - eine Prüfung darauf wäre grün, bevor es etwas zu sehen
 * gibt.
 */
async function warteAufVerlauf(): Promise<void> {
  await screen.findByRole('table', { name: 'Depotwert und Einsatz' })
}

/** Die letzte Abfrage des Wertverlaufs für Portfolio 10, für die Prüfung der Parameter. */
function letzteVerlaufsabfrage() {
  return backend.requests.filter((request) => request.url === '/portfolios/10/history').at(-1)
}

/**
 * Der Vorgabeverlauf von Portfolio 10 mit geänderten Feldern.
 *
 * Wirft, wenn es ihn nicht gibt: ein `{...undefined}` würde einen Verlauf ohne Punkte hinterlegen und
 * der Test wäre grün, ohne das zu prüfen, was er prüfen soll.
 */
function verlaufMit(werte: Partial<FakePortfolioHistory>): FakePortfolioHistory {
  const vorgabe = backend.history.get(10)
  if (vorgabe === undefined) {
    throw new Error('Portfolio 10 hat im Ausgangsbestand keinen Wertverlauf')
  }
  return { ...vorgabe, ...werte }
}

function hinweisfeld(titel: string): HTMLElement {
  return screen.getByText(titel).closest('.MuiAlert-root') as HTMLElement
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

  /**
   * Zins und Dividende sind zwei verschiedene Erträge und dürfen nicht in einer Zahl landen.
   *
   * Geprüft wird beides zusammen mit der Kennzeichnung netto gegen brutto: die zwei Summen sind nicht
   * nach derselben Regel gebildet, und ohne den Zusatz an der Karte würde man sie als vergleichbar
   * lesen.
   */
  it('zeigt den Zinsertrag als eigene Zahl neben den Dividenden', async () => {
    await renderLoggedIn('/performance')
    // Erst auf die Seite warten: bis das Portfolio geladen ist, steht keine der Karten im Dokument.
    await screen.findByRole('heading', { level: 1, name: 'Performance' })

    // Aus defaultAnalytics(): 96.25 Zinsertrag, 214.50 Dividenden.
    expect(await within(karte('Zinsertrag')).findByText('CHF 96.25')).toBeInTheDocument()
    expect(within(karte('Dividenden')).getByText('CHF 214.50')).toBeInTheDocument()
    expect(within(karte('Zinsertrag')).getByText(/netto nach Gebühr und Steuer/)).toBeInTheDocument()
    expect(within(karte('Dividenden')).getByText(/brutto/)).toBeInTheDocument()

    // Eigener Endpunkt und nicht eine zweite Zahl aus /dividends.
    expect(backend.requests.some((request) => request.url === '/portfolios/10/interest')).toBe(true)
  })

  it('zeigt die zeitgewichtete Rendite und die Benchmark des gewählten Zeitraums', async () => {
    await renderLoggedIn('/performance')
    await warteAufVerlauf()

    // Aus defaultHistory(): Indexlinie bis 116.40, Benchmark bis 111.25.
    expect(within(karte('Zeitgewichtete Rendite (TWR)')).getByText('+16.4 %')).toBeInTheDocument()
    expect(within(karte('Benchmark SPY')).getByText('+11.25 %')).toBeInTheDocument()
    // Welche Zahl am Zeitraum hängt und welche nicht, muss an der Karte stehen: MWR und TWR daneben
    // wären sonst zwei Renditen desselben Portfolios ohne erkennbaren Unterschied.
    expect(
      within(karte('Zeitgewichtete Rendite (TWR)')).getByText(/über 1 Jahr/),
    ).toBeInTheDocument()
    expect(
      within(karte('Geldgewichtete Rendite (MWR)')).getByText(/unabhängig vom gewählten Zeitraum/),
    ).toBeInTheDocument()
  })

  it('zeichnet Depotwert gegen Einsatz und die Entwicklung gegen die Benchmark', async () => {
    await renderLoggedIn('/performance')
    await warteAufVerlauf()

    // Der letzte Depotwert ist der Marktwert der Karte oben, der Einsatz dessen Einstand: die Lücke
    // zwischen den Linien am rechten Rand ist genau der ausgewiesene Gewinn von 276.60.
    expect(
      screen.getByRole('img', {
        name: "Depotwert und Einsatz in CHF: Depotwert von CHF 2'800.00 auf CHF 3'260.00, Einsatz von CHF 2'983.40 auf CHF 2'983.40",
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'Entwicklung im Vergleich, Basis 100: Portfolio von 100.00 auf 116.40, Benchmark SPY von 100.00 auf 111.25',
      }),
    ).toBeInTheDocument()

    // Textalternative mit Beträgen statt Indexpunkten, sonst wäre die Einheit der Tabelle geraten.
    const tabelle = screen.getByRole('table', { name: 'Depotwert und Einsatz' })
    const zeile = within(tabelle).getByText('Depotwert').closest('tr') as HTMLElement
    expect(within(zeile).getByText("CHF 2'800.00")).toBeInTheDocument()
    expect(within(zeile).getByText("CHF 3'260.00")).toBeInTheDocument()
    expect(within(zeile).getByText('+16.43 %')).toBeInTheDocument()
  })

  it('überträgt den gewählten Zeitraum in die Abfrage des Wertverlaufs', async () => {
    const { user } = await renderLoggedIn('/performance')
    await warteAufVerlauf()

    expect(letzteVerlaufsabfrage()?.params).toEqual({ lookbackDays: 365, benchmark: 'SPY' })

    await user.click(within(screen.getByRole('group', { name: 'Zeitraum' })).getByText('3 Monate'))

    expect(
      await screen.findByRole('heading', { name: 'Wertverlauf (3 Monate)' }),
    ).toBeInTheDocument()
    expect(letzteVerlaufsabfrage()?.params).toEqual({ lookbackDays: 90, benchmark: 'SPY' })
  })

  it('nennt den verkürzten Zeitraum und die nicht bewertbaren Wertpapiere', async () => {
    // Ein Datum innerhalb des Jahres statt eines festen: sonst wäre der Test in einem Jahr grün, ohne
    // dass der Hinweis noch erscheint.
    const spaeterBeginn = vorTagen(30)
    backend.history.set(
      10,
      verlaufMit({
        seriesFrom: spaeterBeginn,
        seriesFromReason: 'MISSING_DATA',
        excluded: [{ symbol: 'AAPL', reason: 'NO_PRICE_HISTORY' }],
      }),
    )
    await renderLoggedIn('/performance')
    await warteAufVerlauf()

    const hinweis = hinweisfeld('Nicht der ganze Zeitraum ist bewertbar')
    expect(
      within(hinweis).getByText(new RegExp(`beginnt erst am ${formatDate(spaeterBeginn)}`)),
    ).toBeInTheDocument()
    expect(hinweis.className).toContain('MuiAlert-colorWarning')

    const ausschluss = hinweisfeld('Nicht im Wertverlauf enthalten')
    expect(within(ausschluss).getByText(/Keine Kurshistorie im Zeitraum/)).toBeInTheDocument()
    expect(within(ausschluss).getByText('AAPL')).toBeInTheDocument()
  })

  /**
   * Der andere Grund für einen späteren Beginn: das Depot lag bis dahin leer. Getrennt geprüft, weil
   * die Oberfläche ihn getrennt behandeln muss - derselbe Satz in Warnfarbe würde eine normale
   * Vorgeschichte wie ein Datenproblem aussehen lassen.
   */
  it('erklärt einen späteren Beginn ohne Bestand als Vorgeschichte und nicht als Mangel', async () => {
    const ersterKauf = vorTagen(30)
    backend.history.set(
      10,
      verlaufMit({ seriesFrom: ersterKauf, seriesFromReason: 'NOT_INVESTED' }),
    )
    await renderLoggedIn('/performance')
    await warteAufVerlauf()

    const hinweis = hinweisfeld('Das Depot war nicht den ganzen Zeitraum am Markt')
    expect(
      within(hinweis).getByText(new RegExp(`beginnt am ${formatDate(ersterKauf)}`)),
    ).toBeInTheDocument()
    expect(hinweis.className).toContain('MuiAlert-colorInfo')
    expect(screen.queryByText('Nicht der ganze Zeitraum ist bewertbar')).not.toBeInTheDocument()
    expect(screen.queryByText('Nicht im Wertverlauf enthalten')).not.toBeInTheDocument()
  })

  it('erfindet ohne eingesetztes Kapital keine zeitgewichtete Rendite', async () => {
    // Ohne Eintrag antwortet das Fake-Backend wie das echte für ein Portfolio ohne Bestand.
    backend.history.delete(10)
    await renderLoggedIn('/performance')
    await warteAufVerlauf()

    expect(within(karte('Zeitgewichtete Rendite (TWR)')).getByText('–')).toBeInTheDocument()
    // Die Benchmark hängt nicht am Bestand, ihre Linie bleibt deshalb stehen.
    expect(within(karte('Benchmark SPY')).getByText('+11.25 %')).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: 'Entwicklung im Vergleich, Basis 100: Portfolio ohne Werte, Benchmark SPY von 100.00 auf 111.25',
      }),
    ).toBeInTheDocument()
    // Ein Depotwert von 0 ist dagegen eine Aussage und steht als 0 da, nicht als Lücke.
    expect(
      screen.getByRole('img', { name: /Depotwert von CHF 0.00 auf CHF 0.00/ }),
    ).toBeInTheDocument()
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
