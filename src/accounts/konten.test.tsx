import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAuthToken } from '../api/client'
import { installFakeBackend, type FakeBackend } from '../test/fakeBackend'
import { renderLoggedIn } from '../test/renderApp'

/**
 * Konten-Seite (YOUNGOITV-447) am Gesamtsystem.
 *
 * Geprüft wird über die ganze Kette Route, Portfolio-Auswahl, React Query und Dialoge, weil genau
 * dort die Fehler des Originals lagen: Cash-Bewegungen ohne Aktualisierung der Anzeige und ein
 * Sammeltext "Nicht genug Cash oder Fehler" für jeden Fehlerfall.
 */

let backend: FakeBackend

beforeEach(() => {
  setAuthToken(null)
  backend = installFakeBackend()
})

afterEach(() => {
  backend.restore()
})

/** Der Dialog ist die einzige Stelle, an der Beschriftungen doppelt vorkommen, daher gescoped. */
function dialog() {
  return within(screen.getByRole('dialog'))
}

describe('Konten-Seite', () => {
  it('zeigt die Konten des aktiven Portfolios mit Schweizer Betragsformat', async () => {
    await renderLoggedIn('/konten')

    const table = await screen.findByRole('table', { name: 'Konten' })
    expect(within(table).getByText('Cash CHF')).toBeInTheDocument()
    expect(within(table).getByText("CHF 12'450.50")).toBeInTheDocument()
    // Der Betrag trägt die Kontowährung, nicht die Basiswährung des Portfolios.
    expect(within(table).getByText('USD 800.00')).toBeInTheDocument()

    // Das Konto des zweiten Portfolios darf hier nicht auftauchen.
    expect(screen.queryByText('Cash EUR')).not.toBeInTheDocument()
  })

  it('summiert Cash je Währung und rechnet bewusst nicht um', async () => {
    await renderLoggedIn('/konten')
    await screen.findByRole('table', { name: 'Konten' })

    expect(screen.getByText('Cash je Währung')).toBeInTheDocument()
    expect(
      screen.getByText('Keine Gesamtsumme über alle Währungen, weil dafür Tageskurse nötig wären.'),
    ).toBeInTheDocument()
  })

  it('bucht eine Einzahlung und aktualisiert den angezeigten Stand', async () => {
    const { user } = await renderLoggedIn('/konten')
    const table = await screen.findByRole('table', { name: 'Konten' })

    const row = within(table).getByText('Cash CHF').closest('tr')
    expect(row).not.toBeNull()
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Einzahlen' }))

    await user.type(dialog().getByLabelText(/^Betrag/), '550')
    await user.click(dialog().getByRole('button', { name: 'Einzahlen' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(await screen.findByText("CHF 13'000.50")).toBeInTheDocument()
    expect(backend.accounts[0].cashAmount).toBe(13000.5)
  })

  it('meldet eine zu hohe Auszahlung am Betragsfeld und schickt sie nicht ab', async () => {
    const { user } = await renderLoggedIn('/konten')
    const table = await screen.findByRole('table', { name: 'Konten' })

    const row = within(table).getByText('Cash CHF').closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Auszahlen' }))

    await user.type(dialog().getByLabelText(/^Betrag/), '99999')
    await user.click(dialog().getByRole('button', { name: 'Auszahlen' }))

    expect(
      await dialog().findByText("Der Betrag übersteigt den Cash-Stand von CHF 12'450.50."),
    ).toBeInTheDocument()
    // Kein Aufruf: der Fehler steht fest, bevor eine Serverrunde nötig ist.
    expect(backend.requests.some((request) => request.url.endsWith('/withdraw'))).toBe(false)
  })

  it('verlangt einen positiven Betrag', async () => {
    const { user } = await renderLoggedIn('/konten')
    const table = await screen.findByRole('table', { name: 'Konten' })

    const row = within(table).getByText('Cash CHF').closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Einzahlen' }))

    await user.type(dialog().getByLabelText(/^Betrag/), '0')
    await user.click(dialog().getByRole('button', { name: 'Einzahlen' }))

    expect(await dialog().findByText('Der Betrag muss grösser als 0 sein.')).toBeInTheDocument()
    expect(backend.requests.some((request) => request.url.endsWith('/deposit'))).toBe(false)
  })

  it('zeigt einen fachlichen 400 am Feld und lädt den veralteten Stand neu', async () => {
    const { user } = await renderLoggedIn('/konten')
    const table = await screen.findByRole('table', { name: 'Konten' })

    const row = within(table).getByText('Cash CHF').closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Auszahlen' }))

    // Der Stand ändert sich hinter dem Rücken der Oberfläche, etwa durch einen zweiten Tab. Die
    // Vorprüfung im Dialog lässt den Betrag deshalb durch, das Backend nicht.
    backend.accounts[0].cashAmount = 20

    await user.type(dialog().getByLabelText(/^Betrag/), '100')
    await user.click(dialog().getByRole('button', { name: 'Auszahlen' }))

    expect(
      await dialog().findByText(
        'Der Betrag übersteigt den Cash-Stand. Der angezeigte Stand war veraltet und wurde neu geladen.',
      ),
    ).toBeInTheDocument()
    expect(await screen.findByText('CHF 20.00')).toBeInTheDocument()
  })

  it('legt ein Konto an und zeigt es ohne Neuladen in der Tabelle', async () => {
    const { user } = await renderLoggedIn('/konten')
    await screen.findByRole('table', { name: 'Konten' })

    await user.click(screen.getByRole('button', { name: 'Neues Konto' }))
    await user.type(dialog().getByLabelText(/^Name/), 'Cash GBP')

    // Vorbelegt ist die Basiswährung des Portfolios, hier CHF.
    await user.click(dialog().getByRole('combobox', { name: /^Kontowährung/ }))
    await user.click(screen.getByRole('option', { name: 'GBP' }))
    await user.click(dialog().getByRole('button', { name: 'Anlegen' }))

    expect(await screen.findByText('Cash GBP')).toBeInTheDocument()
    expect(screen.getByText('GBP 0.00')).toBeInTheDocument()
  })

  it('erklärt den Leerzustand statt eine leere Tabelle zu zeigen', async () => {
    backend.accounts.length = 0
    await renderLoggedIn('/konten')

    expect(
      await screen.findByText(/Noch kein Konto in diesem Portfolio/, { exact: false }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Konten' })).not.toBeInTheDocument()
  })

  it('verweist ohne Portfolio auf die Portfolio-Auswahl in der Kopfzeile', async () => {
    backend.portfolios.length = 0
    backend.accounts.length = 0
    await renderLoggedIn('/konten')

    expect(
      await screen.findByText(/Noch kein Portfolio vorhanden/, { exact: false }),
    ).toBeInTheDocument()
    // Ohne Portfolio darf keine Kontenabfrage laufen, sonst gäbe es einen 404 auf /portfolios/undefined.
    expect(backend.requests.some((request) => request.url.includes('/accounts'))).toBe(false)
  })
})
