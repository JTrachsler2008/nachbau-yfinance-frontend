import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { theme } from '../theme/theme'
import { demoUser } from './fakeBackend'

/**
 * Rendert die gesamte Anwendung mit derselben Provider-Reihenfolge wie `main.tsx`, nur mit
 * `MemoryRouter` statt `BrowserRouter`.
 *
 * Bewusst die ganze App und nicht einzelne Seiten: geprüft werden sollen Route-Guard, Umleitungen
 * und der Weg von der Login-Seite in die Shell, und das sind gerade die Verbindungen zwischen den
 * Komponenten.
 */
export function renderApp(initialRoute = '/') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Im Test kein Wiederholen, sonst warten Fehlerfälle unnötig auf einen zweiten Versuch.
        retry: false,
      },
    },
  })

  const view = render(
    <ThemeProvider theme={theme} defaultMode="light">
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  )

  return { ...view, queryClient }
}

/**
 * Rendert die Anwendung und meldet den Demo-Benutzer über das Login-Formular an.
 *
 * Der Anmeldezustand hängt am `AuthProvider` und lässt sich nicht von aussen setzen, weil das Token
 * absichtlich nur im Modulspeicher lebt (SEC-1/SEC-2). Der Weg über das Formular ist deshalb kein
 * Umstand, sondern der einzige echte: der Route-Guard schickt `initialRoute` als `state.from` mit,
 * nach dem Anmelden landet der Test genau dort.
 *
 * Setzt voraus, dass `installFakeBackend()` vorher aufgerufen wurde.
 */
export async function renderLoggedIn(initialRoute = '/') {
  const view = renderApp(initialRoute)
  const user = userEvent.setup()

  // findBy und nicht getBy: beim Start prüft der `AuthProvider` erst per Refresh, ob ein Cookie eine
  // Sitzung fortsetzt. Solange das läuft, steht statt des Formulars ein Platzhalter.
  await user.type(await screen.findByLabelText(/^Benutzername/), demoUser.username)
  await user.type(screen.getByLabelText(/^Passwort/), demoUser.password)
  await user.click(screen.getByRole('button', { name: 'Anmelden' }))
  // Der Abmelden-Knopf steht nur in der Shell, ist also der Beweis, dass die Anmeldung durch ist.
  await screen.findByRole('button', { name: 'Abmelden' })

  return { ...view, user }
}
