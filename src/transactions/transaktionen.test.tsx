import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAuthToken } from '../api/client'
import { installFakeBackend, type FakeBackend } from '../test/fakeBackend'
import { renderLoggedIn } from '../test/renderApp'

/**
 * Transaktionen-Seite (YOUNGOITV-448, -449, -450) am Gesamtsystem.
 *
 * Der Weg geht durch Route, Portfolio-Auswahl, React Query, Formular und Fake-Backend, weil hier die
 * teuren Fehler liegen: eine Buchung, die durchgeht, aber die Anzeige nicht aktualisiert, und eine
 * fachliche Fehlermeldung, die als "Request failed with status code 400" beim Benutzer landet.
 */

let backend: FakeBackend

beforeEach(() => {
  setAuthToken(null)
  backend = installFakeBackend()
})

afterEach(() => {
  backend.restore()
})

function dialog() {
  return within(screen.getByRole('dialog'))
}

/**
 * Wählt im Autocomplete ein bereits gehaltenes Wertpapier über sein Symbol.
 *
 * Gilt für jeden Typ ausser Kauf: die Optionsliste ist dort die Bestandsliste des gewählten Kontos
 * und steht sofort, kein Tippen nötig. Sie hängt im Portal ausserhalb des Dialogs, deshalb wird sie
 * über `screen` gesucht und nicht über `dialog()`.
 */
async function waehleWertpapier(user: UserEvent, symbol: string): Promise<void> {
  await user.click(dialog().getByRole('combobox', { name: /^Wertpapier/ }))
  await user.click(await screen.findByRole('option', { name: new RegExp(`^${symbol} `) }))
}

/**
 * Wählt beim Kauf ein Wertpapier über die Live-Suche.
 *
 * Anders als `waehleWertpapier`: hier muss erst getippt werden, die Vorschläge kommen debounced vom
 * (Fake-)Marktdatenanbieter. Der abschliessende `waitFor` deckt das anschliessende Anlegen/Auflösen
 * ab (`lookupOrCreate`) - der Buchen-Knopf bleibt so lange deaktiviert.
 */
async function sucheUndWaehleWertpapier(user: UserEvent, symbol: string): Promise<void> {
  const feld = dialog().getByRole('combobox', { name: /^Wertpapier/ })
  await user.click(feld)
  await user.type(feld, symbol)
  await user.click(await screen.findByRole('option', { name: new RegExp(`^${symbol} `) }, { timeout: 3000 }))
  await waitFor(() => {
    expect(dialog().getByRole('button', { name: 'Buchen' })).not.toBeDisabled()
  })
}

describe('Transaktionen-Seite', () => {
  it('zeigt Bestände mit Menge und Kaufpreis, nach Symbol sortiert', async () => {
    await renderLoggedIn('/transaktionen')

    const table = await screen.findByRole('table', { name: 'Bestände' })
    const symbole = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0].textContent)
    expect(symbole).toEqual(['AAPL', 'NESN'])

    const nesn = within(table).getByText('NESN').closest('tr') as HTMLElement
    expect(within(nesn).getByText('Nestlé SA')).toBeInTheDocument()
    expect(within(nesn).getByText('Cash CHF')).toBeInTheDocument()
    expect(within(nesn).getByText('15')).toBeInTheDocument()
    expect(within(nesn).getByText('CHF 93.00')).toBeInTheDocument()

    // Das Wertpapier des zweiten Portfolios hat keinen Bestand, ZURN darf hier nicht stehen.
    expect(within(table).queryByText('ZURN')).not.toBeInTheDocument()
  })

  it('zeigt die Historie über alle Konten hinweg, neueste zuerst', async () => {
    await renderLoggedIn('/transaktionen')

    const table = await screen.findByRole('table', { name: 'Transaktionen' })
    const daten = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0].textContent)
    expect(daten).toEqual(['10.03.2026', '20.02.2026', '15.01.2026'])

    const neueste = within(table).getByText('10.03.2026').closest('tr') as HTMLElement
    expect(within(neueste).getByText('Kauf')).toBeInTheDocument()
    expect(within(neueste).getByText('NESN')).toBeInTheDocument()
    // 5 * 96 + 6 Gebühr, in der Währung der Buchung und nicht der des Portfolios.
    expect(within(neueste).getByText('CHF 486.00')).toBeInTheDocument()

    const inUsd = within(table).getByText('20.02.2026').closest('tr') as HTMLElement
    expect(within(inUsd).getByText("USD 1'805.00")).toBeInTheDocument()
  })

  it('filtert die Historie nach Konto', async () => {
    const { user } = await renderLoggedIn('/transaktionen')
    await screen.findByRole('table', { name: 'Transaktionen' })

    await user.click(screen.getByRole('combobox', { name: /^Konto/ }))
    await user.click(await screen.findByRole('option', { name: 'Cash USD' }))

    const table = await screen.findByRole('table', { name: 'Transaktionen' })
    await waitFor(() => {
      expect(within(table).getAllByRole('row')).toHaveLength(2)
    })
    expect(within(table).getByText('20.02.2026')).toBeInTheDocument()
    expect(within(table).queryByText('10.03.2026')).not.toBeInTheDocument()
  })

  it('bucht einen Kauf und aktualisiert Bestand, Historie und Cash-Stand', async () => {
    const { user } = await renderLoggedIn('/transaktionen')
    await screen.findByRole('table', { name: 'Bestände' })

    await user.click(screen.getByRole('button', { name: 'Neue Transaktion' }))
    await sucheUndWaehleWertpapier(user, 'ZURN')
    await user.type(dialog().getByLabelText(/^Menge/), '4')
    await user.type(dialog().getByLabelText(/^Preis je Stück/), '500')
    await user.type(dialog().getByLabelText(/^Gebühr/), '10')
    await user.click(dialog().getByRole('button', { name: 'Buchen' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    const table = await screen.findByRole('table', { name: 'Bestände' })
    const zurn = within(table).getByText('ZURN').closest('tr') as HTMLElement
    expect(within(zurn).getByText('4')).toBeInTheDocument()
    // (4 * 500 + 10 Gebühr) / 4: der Kaufpreis der Position enthält die Gebühr.
    expect(within(zurn).getByText('CHF 502.50')).toBeInTheDocument()

    // 12'450.50 - 2'010.00
    expect(backend.accounts[0].cashAmount).toBe(10440.5)
    expect(backend.transactions).toHaveLength(4)
  })

  it('erklärt einen fehlenden Kurs am Preisfeld statt als Nicht-gefunden-Meldung', async () => {
    const { user } = await renderLoggedIn('/transaktionen')
    await screen.findByRole('table', { name: 'Bestände' })

    await user.click(screen.getByRole('button', { name: 'Neue Transaktion' }))
    await sucheUndWaehleWertpapier(user, 'ZURN')
    await user.type(dialog().getByLabelText(/^Menge/), '1')
    // Preis leer lassen: das Backend soll den hinterlegten Kurs suchen und findet für heute keinen.
    await user.click(dialog().getByRole('button', { name: 'Buchen' }))

    expect(
      await dialog().findByText(
        'Für dieses Datum ist kein Kurs hinterlegt. Bitte den Preis von Hand eintragen.',
      ),
    ).toBeInTheDocument()
    expect(backend.transactions).toHaveLength(3)
  })

  it('übersetzt fehlendes Cash in eine Handlungsanweisung', async () => {
    const { user } = await renderLoggedIn('/transaktionen')
    await screen.findByRole('table', { name: 'Bestände' })

    await user.click(screen.getByRole('button', { name: 'Neue Transaktion' }))
    await sucheUndWaehleWertpapier(user, 'ZURN')
    await user.type(dialog().getByLabelText(/^Menge/), '100')
    await user.type(dialog().getByLabelText(/^Preis je Stück/), '500')
    await user.click(dialog().getByRole('button', { name: 'Buchen' }))

    expect(
      await dialog().findByText(
        'Das Konto hat nicht genug Cash für diesen Kauf. Zuerst einzahlen oder die Menge verringern.',
      ),
    ).toBeInTheDocument()
    // Die englische Meldung des Backends darf nirgends stehen.
    expect(screen.queryByText(/insufficient cash/)).not.toBeInTheDocument()
  })

  it('prüft die Menge vor dem Absenden', async () => {
    const { user } = await renderLoggedIn('/transaktionen')
    await screen.findByRole('table', { name: 'Bestände' })

    await user.click(screen.getByRole('button', { name: 'Neue Transaktion' }))
    await sucheUndWaehleWertpapier(user, 'NESN')
    await user.type(dialog().getByLabelText(/^Menge/), '0')
    await user.click(dialog().getByRole('button', { name: 'Buchen' }))

    expect(await dialog().findByText('Die Menge muss grösser als 0 sein.')).toBeInTheDocument()
    expect(backend.requests.some((request) => request.method === 'POST' && request.url.endsWith('/transactions'))).toBe(
      false,
    )
  })

  it('sucht beim Kauf live und legt ein noch unbekanntes Symbol automatisch an', async () => {
    const { user } = await renderLoggedIn('/transaktionen')
    await screen.findByRole('table', { name: 'Bestände' })
    expect(backend.securities.some((candidate) => candidate.symbol === 'TSLA')).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Neue Transaktion' }))
    await sucheUndWaehleWertpapier(user, 'TSLA')
    await user.type(dialog().getByLabelText(/^Menge/), '2')
    await user.type(dialog().getByLabelText(/^Preis je Stück/), '300')
    await user.click(dialog().getByRole('button', { name: 'Buchen' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(backend.securities.some((candidate) => candidate.symbol === 'TSLA')).toBe(true)
    const table = await screen.findByRole('table', { name: 'Bestände' })
    expect(within(table).getByText('TSLA')).toBeInTheDocument()
  })

  it('meldet ein Symbol ohne Live-Kurs statt eine leere Auswahl zu buchen', async () => {
    backend.forceStatus('/lookup-or-create', 404)
    const { user } = await renderLoggedIn('/transaktionen')
    await screen.findByRole('table', { name: 'Bestände' })

    await user.click(screen.getByRole('button', { name: 'Neue Transaktion' }))
    const feld = dialog().getByRole('combobox', { name: /^Wertpapier/ })
    await user.click(feld)
    await user.type(feld, 'ZURN')
    await user.click(await screen.findByRole('option', { name: /^ZURN / }, { timeout: 3000 }))

    expect(
      await dialog().findByText(/ZURN konnte nicht angelegt werden\. Kein Live-Kurs/),
    ).toBeInTheDocument()
  })

  it('beschränkt die Auswahl beim Verkauf auf gehaltene Wertpapiere im gewählten Konto', async () => {
    const { user } = await renderLoggedIn('/transaktionen')
    await screen.findByRole('table', { name: 'Bestände' })

    await user.click(screen.getByRole('button', { name: 'Neue Transaktion' }))
    await user.click(dialog().getByRole('combobox', { name: /^Typ/ }))
    await user.click(await screen.findByRole('option', { name: 'Verkauf' }))

    // Voreingestelltes Konto ist Cash CHF (100), dort steht nur NESN im Bestand.
    await user.click(dialog().getByRole('combobox', { name: /^Wertpapier/ }))
    expect(await screen.findByRole('option', { name: /^NESN / })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /^ZURN / })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /^AAPL / })).not.toBeInTheDocument()
  })

  it('wechselt die Bestandsauswahl beim Verkauf mit dem gewählten Konto', async () => {
    const { user } = await renderLoggedIn('/transaktionen')
    await screen.findByRole('table', { name: 'Bestände' })

    await user.click(screen.getByRole('button', { name: 'Neue Transaktion' }))
    await user.click(dialog().getByRole('combobox', { name: /^Typ/ }))
    await user.click(await screen.findByRole('option', { name: 'Verkauf' }))
    await user.click(dialog().getByRole('combobox', { name: /^Konto/ }))
    await user.click(await screen.findByRole('option', { name: /^Cash USD/ }))

    await user.click(dialog().getByRole('combobox', { name: /^Wertpapier/ }))
    expect(await screen.findByRole('option', { name: /^AAPL / })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /^NESN / })).not.toBeInTheDocument()
  })

  it('verlangt ein Wertpapier, bevor gebucht wird', async () => {
    const { user } = await renderLoggedIn('/transaktionen')
    await screen.findByRole('table', { name: 'Bestände' })

    await user.click(screen.getByRole('button', { name: 'Neue Transaktion' }))
    await user.type(dialog().getByLabelText(/^Menge/), '5')
    await user.click(dialog().getByRole('button', { name: 'Buchen' }))

    expect(await dialog().findByText('Bitte ein Wertpapier auswählen.')).toBeInTheDocument()
  })

  it('tauscht beim Split die Mengenfelder gegen das Verhältnis', async () => {
    const { user } = await renderLoggedIn('/transaktionen')
    await screen.findByRole('table', { name: 'Bestände' })

    await user.click(screen.getByRole('button', { name: 'Neue Transaktion' }))
    expect(dialog().getByLabelText(/^Menge/)).toBeInTheDocument()
    expect(dialog().getByLabelText(/^Gebühr/)).toBeInTheDocument()

    await user.click(dialog().getByRole('combobox', { name: /^Typ/ }))
    await user.click(await screen.findByRole('option', { name: 'Split' }))

    expect(dialog().queryByLabelText(/^Menge/)).not.toBeInTheDocument()
    expect(dialog().queryByLabelText(/^Preis je Stück/)).not.toBeInTheDocument()
    // Gebühr und Steuer wertet das Backend beim Split nicht aus, deshalb sind sie weg.
    expect(dialog().queryByLabelText(/^Gebühr/)).not.toBeInTheDocument()
    expect(dialog().getByLabelText(/^Splitverhältnis/)).toBeInTheDocument()
  })

  it('bucht einen Split und verdoppelt den Bestand', async () => {
    const { user } = await renderLoggedIn('/transaktionen')
    await screen.findByRole('table', { name: 'Bestände' })

    await user.click(screen.getByRole('button', { name: 'Neue Transaktion' }))
    await user.click(dialog().getByRole('combobox', { name: /^Typ/ }))
    await user.click(await screen.findByRole('option', { name: 'Split' }))
    await waehleWertpapier(user, 'NESN')
    await user.type(dialog().getByLabelText(/^Splitverhältnis/), '2')
    await user.click(dialog().getByRole('button', { name: 'Buchen' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    const table = await screen.findByRole('table', { name: 'Bestände' })
    const nesn = within(table).getByText('NESN').closest('tr') as HTMLElement
    expect(within(nesn).getByText('30')).toBeInTheDocument()
    expect(within(nesn).getByText('CHF 46.50')).toBeInTheDocument()
  })

  it('zeigt die offenen Tranchen einer Position mit Summe und gewichtetem Mittel', async () => {
    const { user } = await renderLoggedIn('/transaktionen')
    const table = await screen.findByRole('table', { name: 'Bestände' })

    const nesn = within(table).getByText('NESN').closest('tr') as HTMLElement
    await user.click(within(nesn).getByRole('button', { name: 'Tranchen' }))

    const tranchen = await screen.findByRole('table', { name: 'Offene Tranchen' })
    const daten = within(tranchen)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0].textContent)
    // Aufsteigend: in dieser Reihenfolge trifft ein Verkauf die Stücke.
    expect(daten).toEqual(['15.01.2026', '10.03.2026'])

    expect(dialog().getByText('CHF 900.00')).toBeInTheDocument()
    expect(dialog().getByText("CHF 1'380.00")).toBeInTheDocument()
    // Gewichtetes Mittel der Tranchen (92), nicht das averagePurchasePrice der Position (93).
    expect(dialog().getByText('CHF 92.00')).toBeInTheDocument()
  })

  it('merkt sich die Tranchen-Auswahl in der Adresse, damit ein Dashboard-Link sie öffnen kann', async () => {
    await renderLoggedIn('/transaktionen?konto=100&wertpapier=201')

    expect(await screen.findByRole('table', { name: 'Offene Tranchen' })).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveTextContent('Tranchen NESN in Cash CHF')
  })

  it('öffnet für eine unbekannte Kombination in der Adresse keinen Dialog', async () => {
    await renderLoggedIn('/transaktionen?konto=100&wertpapier=999')

    await screen.findByRole('table', { name: 'Bestände' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // Kein Abruf auf eine Position, die dem Portfolio nicht gehört.
    expect(backend.requests.some((request) => request.url.includes('/lots'))).toBe(false)
  })

  it('verlangt ohne Konto zuerst ein Konto und lässt nicht buchen', async () => {
    backend.accounts.length = 0
    backend.positions.length = 0
    backend.transactions.length = 0
    await renderLoggedIn('/transaktionen')

    expect(await screen.findByText(/Buchen braucht ein Konto/, { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Neue Transaktion' })).toBeDisabled()
    expect(screen.queryByRole('table', { name: 'Bestände' })).not.toBeInTheDocument()
  })

  it('erklärt einen leeren Bestand statt eine leere Tabelle zu zeigen', async () => {
    backend.positions.length = 0
    backend.transactions.length = 0
    await renderLoggedIn('/transaktionen')

    expect(await screen.findByText(/Noch kein Bestand/, { exact: false })).toBeInTheDocument()
    expect(
      screen.getByText('Noch keine Transaktion in diesem Portfolio.'),
    ).toBeInTheDocument()
  })
})
