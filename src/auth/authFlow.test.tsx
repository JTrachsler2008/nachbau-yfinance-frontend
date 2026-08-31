import { act, cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apiClient, getAuthToken, setAuthToken } from '../api/client'
import { demoUser, installFakeBackend, type FakeBackend } from '../test/fakeBackend'
import { renderApp } from '../test/renderApp'

/**
 * Integrationstests über die ganze App. Sie deckt die Tickets YOUNGOITV-444 (Anmeldung) und
 * YOUNGOITV-445 (Shell und Navigation) ab.
 *
 * jsdom liefert für `matchMedia` immer `matches: false`, die Shell rendert hier also ihre
 * Mobilvariante mit Hamburger-Knopf und temporärem Drawer.
 */

let backend: FakeBackend

beforeEach(() => {
  // Das Token liegt im Modulspeicher und überlebt sonst den vorigen Test.
  setAuthToken(null)
  backend = installFakeBackend()
})

afterEach(() => {
  backend.restore()
})

/** Login-Seite und Shell tragen beide den Titel "Aktienportfolio", das hier ist eindeutig. */
function loginPageMarker() {
  return screen.queryByText('Bitte anmelden')
}

async function fillLogin(username: string, password: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText(/^Benutzername/), username)
  await user.type(await screen.findByLabelText(/^Passwort/), password)
  await user.click(screen.getByRole('button', { name: 'Anmelden' }))
  return user
}

describe('Route-Guard', () => {
  it('zeigt ohne Anmeldung die Login-Seite statt des Dashboards', async () => {
    renderApp('/')

    expect(await screen.findByText('Bitte anmelden')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument()
    // Ohne Anmeldung geht einzig der Start-Refresh hinaus, der prüft, ob ein Cookie eine Sitzung
    // fortsetzt. Keine einzige Datenanfrage - die würde mit 401 antworten und nichts anzeigen.
    expect(backend.requests.map((request) => request.url)).toEqual(['/auth/refresh'])
  })

  it('leitet unbekannte Pfade auf das Dashboard und damit auf die Anmeldung', async () => {
    renderApp('/gibtesnicht')

    expect(await screen.findByText('Bitte anmelden')).toBeInTheDocument()
  })
})

describe('Anmelden', () => {
  it('führt mit richtigen Zugangsdaten in die Shell und zeigt den Benutzernamen', async () => {
    renderApp('/')
    await fillLogin(demoUser.username, demoUser.password)

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(loginPageMarker()).not.toBeInTheDocument()
    expect(screen.getByText(demoUser.username)).toBeInTheDocument()
  })

  it('schickt den Token als Bearer-Header an die Folgeanfrage', async () => {
    renderApp('/')
    await fillLogin(demoUser.username, demoUser.password)
    await screen.findByRole('heading', { name: 'Dashboard' })

    const me = backend.requests.find((request) => request.url === '/users/me')
    expect(me?.authorization).toBe(`Bearer test-token.${demoUser.username}`)
    // Der Login selbst läuft ohne Header, sonst würde ein altes Token mitgeschickt.
    const login = backend.requests.find((request) => request.url === '/auth/login')
    expect(login?.authorization).toBeUndefined()
  })

  it('meldet falsche Zugangsdaten auf Deutsch und bleibt auf der Login-Seite', async () => {
    renderApp('/')
    await fillLogin(demoUser.username, 'falschespasswort')

    expect(await screen.findByText('Benutzername oder Passwort ist falsch')).toBeInTheDocument()
    // Der 401 des Logins darf nicht als abgelaufene Sitzung behandelt werden, die Seite bleibt
    // stehen und die Eingaben des Benutzers auch.
    expect(loginPageMarker()).toBeInTheDocument()
    expect(await screen.findByLabelText(/^Benutzername/)).toHaveValue(demoUser.username)
    expect(getAuthToken()).toBeNull()
  })

  it('springt nach dem Anmelden auf die ursprünglich angeforderte Seite', async () => {
    renderApp('/risiko')
    await screen.findByText('Bitte anmelden')

    await fillLogin(demoUser.username, demoUser.password)

    expect(await screen.findByRole('heading', { name: 'Risiko' })).toBeInTheDocument()
  })

  it('verwirft das Token, wenn der Abruf des Profils scheitert', async () => {
    // Halb angemeldeter Zustand: das Login liefert ein Token, der Folgeaufruf scheitert trotzdem.
    backend.expireSession()
    renderApp('/')

    await fillLogin(demoUser.username, demoUser.password)

    expect(await screen.findByText('Benutzername oder Passwort ist falsch')).toBeInTheDocument()
    expect(getAuthToken()).toBeNull()
    expect(loginPageMarker()).toBeInTheDocument()
  })
})

/**
 * Ein Reload wirft den ganzen Modulspeicher weg, das Zugriffs-Token also mit. Im Test heisst das:
 * Baum abräumen, Token vergessen, neu rendern. Das Cookie-Glas des Nachbaus bleibt stehen, genau wie
 * der Browser sein Cookie behält.
 */
function reload(route = '/') {
  cleanup()
  setAuthToken(null)
  renderApp(route)
}

describe('Sitzung über einen Reload', () => {
  it('bleibt angemeldet und lädt die Seite ohne Login-Formular', async () => {
    renderApp('/')
    await fillLogin(demoUser.username, demoUser.password)
    await screen.findByRole('heading', { name: 'Dashboard' })

    reload('/risiko')

    expect(await screen.findByRole('heading', { name: 'Risiko' })).toBeInTheDocument()
    expect(loginPageMarker()).not.toBeInTheDocument()
    // Das neue Zugriffs-Token kommt aus dem Refresh, nicht aus einer zweiten Anmeldung.
    expect(getAuthToken()).toBe(`test-token.${demoUser.username}`)
    expect(backend.requests.filter((request) => request.url === '/auth/login')).toHaveLength(1)
  })

  it('führt ohne Cookie zur Anmeldung', async () => {
    renderApp('/')
    await fillLogin(demoUser.username, demoUser.password)
    await screen.findByRole('heading', { name: 'Dashboard' })

    // Ein anderer Browser oder ein gelöschtes Cookie: der Refresh hat nichts vorzulegen.
    backend.clearCookies()
    reload('/risiko')

    expect(await screen.findByText('Bitte anmelden')).toBeInTheDocument()
    expect(getAuthToken()).toBeNull()
  })

  it('löst einen abgefangenen Refresh-Token nur einmal ein', async () => {
    renderApp('/')
    await fillLogin(demoUser.username, demoUser.password)
    await screen.findByRole('heading', { name: 'Dashboard' })

    // Zwei Reloads hintereinander: der zweite gelingt nur, wenn der erste Refresh einen neuen Token
    // ins Cookie gelegt hat. Ohne Rotation wäre das nicht zu unterscheiden.
    reload()
    await screen.findByRole('heading', { name: 'Dashboard' })
    reload()

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })
})

describe('Abgelaufenes Zugriffs-Token', () => {
  it('wird still erneuert und die Anfrage wiederholt', async () => {
    renderApp('/')
    await fillLogin(demoUser.username, demoUser.password)
    await screen.findByRole('heading', { name: 'Dashboard' })

    const vorher = backend.requests.length
    backend.expireAccessTokenOnce()
    let status: number | undefined
    await act(async () => {
      status = (await apiClient.get('/portfolios')).status
    })

    // Der Aufrufer merkt vom 401 nichts, er bekommt seine Antwort.
    expect(status).toBe(200)
    // Und die Sitzung bleibt: kein Sprung auf die Login-Seite.
    expect(loginPageMarker()).not.toBeInTheDocument()
    expect(getAuthToken()).not.toBeNull()
    expect(backend.requests.slice(vorher).map((request) => request.url)).toEqual([
      '/portfolios',
      '/auth/refresh',
      '/portfolios',
    ])
  })

  it('meldet ab, wenn auch der Refresh scheitert', async () => {
    renderApp('/')
    await fillLogin(demoUser.username, demoUser.password)
    await screen.findByRole('heading', { name: 'Dashboard' })

    backend.expireSession()
    await act(async () => {
      await apiClient.get('/portfolios').catch(() => undefined)
    })

    expect(await screen.findByText('Bitte anmelden')).toBeInTheDocument()
    expect(getAuthToken()).toBeNull()
  })
})

describe('Abmelden', () => {
  it('bringt zurück zur Login-Seite und vergisst den Token', async () => {
    renderApp('/')
    const user = await fillLogin(demoUser.username, demoUser.password)
    await screen.findByRole('heading', { name: 'Dashboard' })

    await user.click(screen.getByRole('button', { name: 'Abmelden' }))

    expect(await screen.findByText('Bitte anmelden')).toBeInTheDocument()
    expect(getAuthToken()).toBeNull()
  })

  it('entwertet den Refresh-Token, ein Reload führt zur Anmeldung', async () => {
    renderApp('/')
    const user = await fillLogin(demoUser.username, demoUser.password)
    await screen.findByRole('heading', { name: 'Dashboard' })

    await user.click(screen.getByRole('button', { name: 'Abmelden' }))
    await screen.findByText('Bitte anmelden')

    // Ohne den Aufruf beim Server bliebe das Cookie liegen und der nächste Seitenaufruf hätte die
    // Sitzung fortgesetzt, die der Benutzer gerade beendet hat.
    await waitFor(() => {
      expect(backend.hasRefreshCookie()).toBe(false)
    })
    reload()
    expect(await screen.findByText('Bitte anmelden')).toBeInTheDocument()
  })

  it('führt ein abgelaufenes Token bei der nächsten Anfrage zurück zur Anmeldung', async () => {
    renderApp('/')
    await fillLogin(demoUser.username, demoUser.password)
    await screen.findByRole('heading', { name: 'Dashboard' })

    backend.expireSession()
    // Steht für jede Datenanfrage einer späteren Seite. Der 401 kommt ausserhalb eines
    // React-Ereignisses zurück, deshalb act.
    await act(async () => {
      await apiClient.get('/portfolios').catch(() => undefined)
    })

    expect(await screen.findByText('Bitte anmelden')).toBeInTheDocument()
    expect(getAuthToken()).toBeNull()
  })
})

describe('Navigation', () => {
  it('öffnet den Drawer und wechselt auf eine andere Seite', async () => {
    renderApp('/')
    const user = await fillLogin(demoUser.username, demoUser.password)
    await screen.findByRole('heading', { name: 'Dashboard' })

    await user.click(screen.getByRole('button', { name: 'Navigation öffnen' }))
    await user.click(await screen.findByRole('link', { name: 'Risiko' }))

    // Titel und Bedienelement der Zielseite. Ihre Zahlen prüft `risk/risiko.test.tsx`, hier geht es
    // um den Wechsel selbst.
    expect(await screen.findByRole('heading', { name: 'Risiko' })).toBeInTheDocument()
    expect(await screen.findByRole('group', { name: 'Zeitraum' })).toBeInTheDocument()
  })

  it('markiert den aktiven Eintrag mit aria-current', async () => {
    renderApp('/')
    const user = await fillLogin(demoUser.username, demoUser.password)
    await screen.findByRole('heading', { name: 'Dashboard' })

    await user.click(screen.getByRole('button', { name: 'Navigation öffnen' }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
        'aria-current',
        'page',
      )
    })
    expect(screen.getByRole('link', { name: 'Performance' })).not.toHaveAttribute('aria-current')
  })
})

describe('Registrieren', () => {
  it('legt ein Konto an und meldet direkt an', async () => {
    renderApp('/')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Registrieren' }))
    await user.type(await screen.findByLabelText(/^Benutzername/), 'neuling')
    await user.type(screen.getByLabelText(/^E-Mail/), 'neuling@example.test')
    await user.type(screen.getByLabelText(/^Passwort/), 'geheim1234')
    await user.click(screen.getByRole('button', { name: 'Konto anlegen' }))

    // Der frisch angelegte Benutzer ist angemeldet, hat aber noch kein Portfolio: die Kopfzeile
    // steht, der Seiteninhalt bleibt hinter dem `PortfolioGate` und nennt den nächsten Schritt.
    // Fremde Portfolios sieht er nicht, `GET /portfolios` liefert nur eigene.
    expect(await screen.findByRole('button', { name: 'Abmelden' })).toBeInTheDocument()
    expect(screen.getByText('neuling')).toBeInTheDocument()
    expect(await screen.findByText(/Noch kein Portfolio vorhanden/)).toBeInTheDocument()
    expect(backend.users.map((entry) => entry.username)).toContain('neuling')
  })

  it('verhindert ein zu kurzes Passwort schon vor der Anfrage', async () => {
    renderApp('/registrieren')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText(/^Benutzername/), 'neuling')
    await user.type(screen.getByLabelText(/^E-Mail/), 'neuling@example.test')
    await user.type(screen.getByLabelText(/^Passwort/), 'kurz')

    expect(screen.getByRole('button', { name: 'Konto anlegen' })).toBeDisabled()
    // Nur der Start-Refresh, keine Registrierung: das Formular hält die zu kurze Eingabe selbst auf.
    expect(backend.requests.map((request) => request.url)).toEqual(['/auth/refresh'])
  })

  it('meldet einen bereits vergebenen Benutzernamen verständlich', async () => {
    renderApp('/registrieren')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText(/^Benutzername/), demoUser.username)
    await user.type(screen.getByLabelText(/^E-Mail/), 'zweiter@example.test')
    await user.type(screen.getByLabelText(/^Passwort/), 'geheim1234')
    await user.click(screen.getByRole('button', { name: 'Konto anlegen' }))

    // Statt "Username 'demo' is already taken" aus dem Backend.
    expect(
      await screen.findByText('Benutzername oder E-Mail ist bereits vergeben'),
    ).toBeInTheDocument()
  })
})
