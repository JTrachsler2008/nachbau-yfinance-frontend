import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAuthToken } from '../api/client'
import { demoUser, installFakeBackend, type FakeBackend } from '../test/fakeBackend'
import { renderLoggedIn } from '../test/renderApp'

/**
 * Rollenabhängige Oberfläche für Portfolio-Manager (YOUNGOITV-459).
 *
 * Der wichtigste Test ist der auf die Kennzeichnung: ein Mandat gehört einem anderen Menschen, und
 * der User-Rollen-Plan verlangt ausdrücklich, dass ein Manager es nicht für sein eigenes hält.
 * Deshalb wird nicht nur geprüft, dass die Mandate erscheinen, sondern auch, dass sie getrennt
 * stehen, den Eigentümer nennen und im aktiven Zustand in der Kopfzeile ausgewiesen sind.
 *
 * Die Rolle kommt aus `GET /users/me` und wird hier über den Nachbau des Backends gesetzt, nicht im
 * Frontend gemockt: nur so läuft der echte Weg vom Login über die Rolle bis zur zweiten Abfrage.
 */

const zeitpunkt = '2026-08-25T10:00:00Z'

let backend: FakeBackend

beforeEach(() => {
  setAuthToken(null)
  backend = installFakeBackend()
})

afterEach(() => {
  backend.restore()
})

/** Ein Portfolio von "wanda", das der Demo-Benutzer betreut. */
function mandatAnlegen(): void {
  const betreuer = backend.users.find((user) => user.username === demoUser.username)
  if (betreuer === undefined) {
    throw new Error('Der Demo-Benutzer fehlt im Nachbau des Backends')
  }
  backend.portfolios.push({
    id: 20,
    name: 'Vorsorge Wanda',
    baseCurrency: 'CHF',
    description: null,
    ownerUsername: 'wanda',
    managerUserId: betreuer.id,
    managerUsername: betreuer.username,
    createdAt: zeitpunkt,
    updatedAt: zeitpunkt,
  })
}

async function openMenu(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Portfolio wählen' }))
}

function dialog() {
  return within(screen.getByRole('dialog'))
}

describe('Mandanten-Übersicht für Manager', () => {
  it('zeigt die Mandate als eigene Sektion mit dem Namen des Eigentümers', async () => {
    backend.setRole(demoUser.username, 'MANAGER')
    mandatAnlegen()
    const { user } = await renderLoggedIn('/konten')
    await screen.findByText('Hauptdepot (CHF)')

    await openMenu(user)

    expect(screen.getByText('Eigene Portfolios')).toBeInTheDocument()
    expect(screen.getByText('Meine Mandanten')).toBeInTheDocument()
    const mandat = screen.getByRole('menuitem', { name: /Vorsorge Wanda/ })
    // Der Name allein sagt nicht, wessen Geld gemeint ist, deshalb steht der Eigentümer dabei.
    expect(within(mandat).getByText('CHF, Eigentümer wanda')).toBeInTheDocument()
  })

  it('weist das ausgewählte Mandat in der Kopfzeile als Mandat aus', async () => {
    backend.setRole(demoUser.username, 'MANAGER')
    mandatAnlegen()
    const { user } = await renderLoggedIn('/konten')
    await screen.findByText('Hauptdepot (CHF)')

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: /Vorsorge Wanda/ }))

    expect(await screen.findByText('Vorsorge Wanda (CHF)')).toBeInTheDocument()
    // Dauerhaft sichtbar neben der Auswahl, nicht nur im geöffneten Menü.
    expect(screen.getByText('Mandat von wanda')).toBeInTheDocument()
  })

  it('fragt die Mandate für einen Privatanleger nicht ab', async () => {
    // Das Backend antwortet einem Privatanleger mit einer leeren Liste. Die Anfrage wäre trotzdem
    // bei jeder Anmeldung umsonst, und die Sektion darf nicht leer erscheinen.
    const { user } = await renderLoggedIn('/konten')
    await screen.findByText('Hauptdepot (CHF)')

    await openMenu(user)

    expect(screen.queryByText('Meine Mandanten')).not.toBeInTheDocument()
    expect(screen.queryByText('Eigene Portfolios')).not.toBeInTheDocument()
    expect(backend.requests.some((request) => request.url === '/portfolios/managed')).toBe(false)
  })

  it('wählt für einen Manager ohne eigene Portfolios ein Mandat aus', async () => {
    backend.setRole(demoUser.username, 'MANAGER')
    backend.portfolios.length = 0
    mandatAnlegen()
    await renderLoggedIn('/konten')

    // Ohne die zweite Liste stünde hier "Kein Portfolio" und die ganze Oberfläche wäre leer,
    // obwohl der Manager ein Mandat hat.
    expect(await screen.findByText('Vorsorge Wanda (CHF)')).toBeInTheDocument()
    expect(screen.getByText('Mandat von wanda')).toBeInTheDocument()
  })

  it('meldet eine gescheiterte Mandatsabfrage, ohne die eigenen Portfolios zu verstecken', async () => {
    backend.setRole(demoUser.username, 'MANAGER')
    mandatAnlegen()
    backend.forceStatus('/portfolios/managed', 500)
    const { user } = await renderLoggedIn('/konten')
    await screen.findByText('Hauptdepot (CHF)')

    await openMenu(user)

    // Stillschweigend als "keine Mandate" durchgehen wäre die schlechteste Auskunft: der Manager
    // hielte seine Mandate für verschwunden.
    expect(screen.getByRole('menuitem', { name: /Mandate nicht geladen/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Hauptdepot/ })).toBeInTheDocument()
  })

  it('bietet bei einem Mandat keine Manager-Zuordnung an', async () => {
    backend.setRole(demoUser.username, 'MANAGER')
    mandatAnlegen()
    const { user } = await renderLoggedIn('/konten')
    await screen.findByText('Hauptdepot (CHF)')

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: /Vorsorge Wanda/ }))
    await screen.findByText('Vorsorge Wanda (CHF)')
    await openMenu(user)

    // Der Server lässt hier nur den Eigentümer zu, ein Manager bekäme 403.
    expect(screen.queryByRole('menuitem', { name: /^Portfolio-Manager/ })).not.toBeInTheDocument()
    // Die übrigen Aktionen bleiben: der Plan stellt den Manager dem Eigentümer gleich.
    expect(screen.getByRole('menuitem', { name: 'Portfolio bearbeiten' })).toBeInTheDocument()
  })
})

describe('Manager zuordnen', () => {
  it('ordnet den Manager über seine Benutzernummer zu', async () => {
    const carla = backend.addUser('carla', 'MANAGER')
    const { user } = await renderLoggedIn('/konten')
    await screen.findByText('Hauptdepot (CHF)')

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: /^Portfolio-Manager/ }))

    expect(dialog().getByText('Für Hauptdepot ist kein Manager zugeordnet.')).toBeInTheDocument()
    await user.type(dialog().getByLabelText(/^Benutzernummer/), String(carla.id))
    await user.click(dialog().getByRole('button', { name: 'Zuordnen' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(backend.portfolios[0].managerUsername).toBe('carla')
    expect(
      backend.requests.some(
        (request) => request.method === 'PATCH' && request.url === '/portfolios/10/manager',
      ),
    ).toBe(true)

    // Die Auswahl zeigt danach, wer betreut, ohne dass ein Neuladen nötig ist.
    await openMenu(user)
    expect(await screen.findByText('carla')).toBeInTheDocument()
  })

  it('nennt den Grund, wenn der Zielbenutzer kein Manager ist', async () => {
    const dieter = backend.addUser('dieter', 'PRIVATANLEGER')
    const { user } = await renderLoggedIn('/konten')
    await screen.findByText('Hauptdepot (CHF)')

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: /^Portfolio-Manager/ }))
    await user.type(dialog().getByLabelText(/^Benutzernummer/), String(dieter.id))
    await user.click(dialog().getByRole('button', { name: 'Zuordnen' }))

    expect(await screen.findByText(/nicht die Rolle Portfolio-Manager/)).toBeInTheDocument()
    // Der englische Wortlaut des Backends bleibt draussen, er nennt eine Rolle als Codewort.
    expect(screen.queryByText(/does not have the MANAGER role/)).not.toBeInTheDocument()
    expect(backend.portfolios[0].managerUserId).toBeNull()
  })

  it('entfernt eine bestehende Zuordnung', async () => {
    const carla = backend.addUser('carla', 'MANAGER')
    backend.portfolios[0].managerUserId = carla.id
    backend.portfolios[0].managerUsername = carla.username
    const { user } = await renderLoggedIn('/konten')
    await screen.findByText('Hauptdepot (CHF)')

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: /^Portfolio-Manager/ }))

    expect(dialog().getByText('Hauptdepot wird von carla betreut.')).toBeInTheDocument()
    await user.click(dialog().getByRole('button', { name: 'Zuordnung entfernen' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(backend.portfolios[0].managerUserId).toBeNull()
    expect(backend.portfolios[0].managerUsername).toBeNull()
  })

  it('sendet ohne Benutzernummer keine Anfrage', async () => {
    const { user } = await renderLoggedIn('/konten')
    await screen.findByText('Hauptdepot (CHF)')

    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: /^Portfolio-Manager/ }))
    await user.click(dialog().getByRole('button', { name: 'Zuordnen' }))

    // Ein leeres Feld darf nicht als "Manager entfernen" durchgehen, denn genau das würde der
    // Endpunkt aus einem fehlenden Wert lesen.
    expect(dialog().getByText(/ganze Zahl grösser als 0/)).toBeInTheDocument()
    expect(backend.requests.some((request) => request.url === '/portfolios/10/manager')).toBe(false)
  })
})
