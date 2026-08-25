import type { ReactNode } from 'react'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/DataState'
import type { Portfolio } from './portfolioApi'
import { useSelectedPortfolio } from './useSelectedPortfolio'

/**
 * Gibt den Seiteninhalt erst frei, wenn ein Portfolio ausgewählt ist.
 *
 * Praktisch jede Fachseite braucht eine Portfolio-ID für ihre Abfragen. Ohne diese Klammer müsste
 * jede Seite dieselben vier Zustände (lädt, Fehler, keines vorhanden, vorhanden) selbst behandeln,
 * und ein frisch registrierter Benutzer ohne Portfolio sähe eine leere Seite.
 */
export function PortfolioGate({ children }: { children: (portfolio: Portfolio) => ReactNode }) {
  const { selected, isLoading, error, refetch } = useSelectedPortfolio()

  if (isLoading) {
    return <LoadingPanel rows={4} />
  }

  if (error !== null && error !== undefined) {
    return <ErrorPanel error={error} onRetry={refetch} title="Portfolios konnten nicht geladen werden" />
  }

  if (selected === null) {
    return (
      <EmptyPanel>
        Noch kein Portfolio vorhanden. Oben in der Kopfzeile über die Portfolio-Auswahl eines
        anlegen, danach stehen Konten, Transaktionen und Auswertungen bereit.
      </EmptyPanel>
    )
  }

  return <>{children(selected)}</>
}
