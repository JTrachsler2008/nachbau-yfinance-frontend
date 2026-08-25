import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { theme } from '../theme/theme'

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
