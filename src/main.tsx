// Inter selbst gehostet statt per Google-Fonts-CDN: kein externer Request zur Laufzeit, was in einer
// Unternehmensumgebung sowohl datenschutzseitig als auch bei restriktivem Netz robuster ist.
import '@fontsource-variable/inter'

import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { theme } from './theme/theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Kursdaten ändern sich ständig, aber nicht sekündlich. Eine halbe Minute vermeidet
      // Doppelabfragen beim Navigieren, ohne dass Werte sichtbar veralten.
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Root-Element #root nicht gefunden')
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
