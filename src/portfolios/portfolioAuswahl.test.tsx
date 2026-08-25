import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAuthToken } from '../api/client'
import { installFakeBackend, type FakeBackend } from '../test/fakeBackend'
import { renderLoggedIn } from '../test/renderApp'
import { selectedPortfolioStorageKey } from './SelectedPortfolioContext'

/**
 * Portfolio-Auswahl in der Kopfzeile (YOUNGOITV-446).
 *
 * Der wichtigste Test ist der auf die veraltete gemerkte ID: das Original las die gespeicherte
 * Auswahl blind aus dem `localStorage` und arbeitete danach mit einer ID weiter, die dem angemeldeten
 * Benutzer nicht gehören musste.
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

async function openMenu(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Portfolio wählen' }))
}

describe('Portfolio-Auswahl', () => {
  it('zeigt ohne gemerkte Auswahl das erste Portfolio des Benutzers', async () => {
    await renderLoggedIn('/konten')

    expect(await screen.findByText('Hauptdepot (CHF)')).toBeInTheDocument()
  })

  it('nimmt die gemerkte Auswahl wieder auf', async () => {
    window.localStorage.setItem(selectedPortfolioStorageKey, '11')
    await renderLoggedIn('/konten')

    expect(await screen.findByText('Zweitdepot (EUR)')).toBeInTheDocument()
    expect(await screen.findByText('Cash EUR')).toBeInTheDocument()
  })

  it('fällt bei einer gemerkten ID zurück, die es in der Liste nicht gibt', async () => {
    // So sieht es aus, wenn ein anderer Benutzer denselben Browser nutzt oder das Portfolio
    // gelöscht wurde. Die ID kommt aus dem Browserspeicher und ist damit nichts, worauf sich die
    // Anwendung verlassen darf.
    window.localStorage.setItem(selectedPortfolioStorageKey, '999')
    await renderLoggedIn('/konten')

    expect(await screen.findByText('Hauptdepot (CHF)')).toBeInTheDocument()
    expect(backend.requests.some((request) => request.url === '/portfolios/999/accounts')).toBe(
      false,
    )
  })

  it('wechselt das Portfolio und lädt dessen Konten', async () => {
    const { user } = await renderLoggedIn('/konten')
    await screen.findByText('Cash CHF')

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: /Zweitdepot/ }))

    expect(await screen.findByText('Cash EUR')).toBeInTheDocument()
    expect(screen.queryByText('Cash CHF')).not.toBeInTheDocument()
    expect(await screen.findByText('Zweitdepot (EUR)')).toBeInTheDocument()
  })

  it('merkt den Wechsel für den nächsten Aufruf', async () => {
    const { user } = await renderLoggedIn('/konten')
    await screen.findByText('Cash CHF')

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: /Zweitdepot/ }))

    await waitFor(() => {
      expect(window.localStorage.getItem(selectedPortfolioStorageKey)).toBe('11')
    })
  })

  it('legt ein Portfolio an und macht es sofort aktiv', async () => {
    const { user } = await renderLoggedIn('/konten')
    await screen.findByText('Hauptdepot (CHF)')

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Neues Portfolio' }))

    await user.type(dialog().getByLabelText(/^Name/), 'Vorsorge')
    await user.click(dialog().getByRole('button', { name: 'Anlegen' }))

    expect(await screen.findByText('Vorsorge (CHF)')).toBeInTheDocument()
    expect(backend.portfolios.map((portfolio) => portfolio.name)).toContain('Vorsorge')
  })

  it('speichert eine Umbenennung als PATCH und zeigt sie in der Kopfzeile', async () => {
    const { user } = await renderLoggedIn('/konten')
    await screen.findByText('Hauptdepot (CHF)')

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Portfolio bearbeiten' }))

    const nameField = dialog().getByLabelText(/^Name/)
    await user.clear(nameField)
    await user.type(nameField, 'Hauptdepot 2026')
    await user.click(dialog().getByRole('button', { name: 'Speichern' }))

    expect(await screen.findByText('Hauptdepot 2026 (CHF)')).toBeInTheDocument()
    expect(
      backend.requests.some(
        (request) => request.method === 'PATCH' && request.url === '/portfolios/10',
      ),
    ).toBe(true)
  })

  it('löscht erst nach Bestätigung und wechselt danach auf das verbleibende Portfolio', async () => {
    const { user } = await renderLoggedIn('/konten')
    await screen.findByText('Cash CHF')

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Portfolio löschen' }))

    // Der Dialog nennt das betroffene Portfolio, anders als das window.confirm des Originals.
    expect(dialog().getByText('Hauptdepot')).toBeInTheDocument()
    expect(backend.portfolios).toHaveLength(2)

    await user.click(dialog().getByRole('button', { name: 'Löschen' }))

    expect(await screen.findByText('Zweitdepot (EUR)')).toBeInTheDocument()
    expect(backend.portfolios.map((portfolio) => portfolio.name)).toEqual(['Zweitdepot'])
    expect(await screen.findByText('Cash EUR')).toBeInTheDocument()
  })

  it('bricht das Löschen ohne Aufruf ab, wenn abgebrochen wird', async () => {
    const { user } = await renderLoggedIn('/konten')
    await screen.findByText('Cash CHF')

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Portfolio löschen' }))
    await user.click(dialog().getByRole('button', { name: 'Abbrechen' }))

    expect(backend.requests.some((request) => request.method === 'DELETE')).toBe(false)
    expect(backend.portfolios).toHaveLength(2)
  })
})
