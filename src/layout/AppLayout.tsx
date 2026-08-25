import { SelectedPortfolioProvider } from '../portfolios/SelectedPortfolioProvider'
import { AppShell } from './AppShell'

/**
 * Layout-Route des angemeldeten Bereichs.
 *
 * Der `SelectedPortfolioProvider` steht hier und nicht in `main.tsx`, weil die Portfolio-Abfrage ein
 * Token braucht: aussen um den Auth-Guard gesetzt würde sie beim ersten Aufruf der Login-Seite
 * anlaufen und mit 401 scheitern. Er steht ausserhalb von `AppShell`, damit sowohl die
 * Portfolio-Auswahl in der Kopfzeile als auch jede Seite im `Outlet` dasselbe aktive Portfolio sehen.
 */
export function AppLayout() {
  return (
    <SelectedPortfolioProvider>
      <AppShell />
    </SelectedPortfolioProvider>
  )
}
