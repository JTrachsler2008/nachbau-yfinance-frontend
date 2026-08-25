import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { apiClient, setAuthToken } from '../api/client'
import { installFakeBackend, type FakeBackend } from '../test/fakeBackend'
import { renderLoggedIn } from '../test/renderApp'

/**
 * Globale Fehlerbehandlung (YOUNGOITV-457).
 *
 * Die beiden Zweige, die nicht an ein Formular gehören: der 403 führt mit einem Hinweis zur
 * Übersicht zurück, der 500er zeigt einen neutralen Toast. Geprüft am Gesamtsystem, weil hier das
 * Zusammenspiel von Interceptor, Router und Snackbar die eigentliche Leistung ist.
 */

let backend: FakeBackend

beforeEach(() => {
  setAuthToken(null)
  backend = installFakeBackend()
})

afterEach(() => {
  backend.restore()
})

const keinZugriff = 'Kein Zugriff auf dieses Portfolio. Es gehört einem anderen Benutzer.'
const serverfehler = 'Etwas ist schiefgelaufen. Bitte später erneut versuchen.'

describe('Globale Meldungen', () => {
  it('führt bei fehlendem Zugriff mit Hinweis zurück zur Übersicht', async () => {
    backend.forceStatus('/portfolios/10/transactions', 403)
    await renderLoggedIn('/transaktionen')

    expect(await screen.findByText(keinZugriff)).toBeInTheDocument()
    // Weg von der Seite, die den 403 ausgelöst hat: das Dashboard hängt an derselben Auswahl,
    // arbeitet aber mit anderen Endpunkten.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeInTheDocument()
  })

  it('leitet auf der Übersicht nicht auf sich selbst um', async () => {
    backend.forceStatus('/portfolios/10/positions', 403)
    await renderLoggedIn('/')

    expect(await screen.findByText(keinZugriff)).toBeInTheDocument()
    // Eine Umleitung auf die eigene Seite würde die Meldung nur wegblinken lassen.
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
  })

  it('zeigt bei einem Serverfehler einen neutralen Toast ohne Backend-Text', async () => {
    backend.forceStatus('/portfolios/10/transactions', 500)
    await renderLoggedIn('/transaktionen')

    expect(await screen.findByText(serverfehler)).toBeInTheDocument()
    // SEC-5: weder Klassenname noch Auszug eines Stacktrace darf in der Oberfläche stehen.
    expect(screen.queryByText(/NullPointerException/)).not.toBeInTheDocument()
    expect(screen.queryByText(/java\.lang/)).not.toBeInTheDocument()
    // Und kein Sprung weg von der Seite: ein 500er ist kein Berechtigungsproblem.
    expect(screen.getByRole('heading', { level: 1, name: 'Transaktionen' })).toBeInTheDocument()
  })

  it('behandelt eine abgelaufene Sitzung als Abmeldung und nicht als Serverfehler', async () => {
    await renderLoggedIn('/transaktionen')
    backend.expireSession()

    // Steht für die nächste Datenanfrage der Seite. Der 401 kommt ausserhalb eines React-Ereignisses
    // zurück, deshalb act.
    await act(async () => {
      await apiClient.get('/portfolios').catch(() => undefined)
    })

    expect(await screen.findByText('Bitte anmelden')).toBeInTheDocument()
    expect(screen.queryByText(serverfehler)).not.toBeInTheDocument()
  })
})
