import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  SelectedPortfolioContext,
  selectedPortfolioStorageKey,
  type SelectedPortfolioValue,
} from './SelectedPortfolioContext'
import { usePortfolios } from './usePortfolios'

function readStoredId(): number | null {
  const raw = window.localStorage.getItem(selectedPortfolioStorageKey)
  if (raw === null) {
    return null
  }
  const parsed = Number(raw)
  return Number.isInteger(parsed) ? parsed : null
}

/**
 * Hält das aktive Portfolio.
 *
 * Die Auswahl wird lokal gemerkt, damit sie einen Seitenwechsel überlebt, aber **immer** gegen die
 * vom Server gelieferte Liste geprüft. Das Original las `localStorage` blind und arbeitete danach
 * mit einer Konto-ID weiter, die dem angemeldeten User gar nicht gehören musste (UI/UX-Plan,
 * Auth-Flow). Passt die gemerkte ID nicht zur Liste, wird auf das erste Portfolio zurückgefallen.
 *
 * Im Unterschied zum Token ist die ID nicht schützenswert: sie ist keine Berechtigung, der Server
 * prüft die Zugehörigkeit bei jedem Aufruf selbst.
 */
export function SelectedPortfolioProvider({ children }: { children: ReactNode }) {
  const query = usePortfolios()
  const [requestedId, setRequestedId] = useState<number | null>(readStoredId)

  // Memoisiert, weil das Literal [] sonst bei jedem Render eine neue Referenz wäre und der
  // Kontextwert damit ebenfalls, was jeden Verbraucher unnötig neu rendern liesse.
  const portfolios = useMemo(() => query.data ?? [], [query.data])
  const selected =
    portfolios.find((portfolio) => portfolio.id === requestedId) ?? portfolios[0] ?? null

  const select = useCallback((id: number): void => {
    setRequestedId(id)
    window.localStorage.setItem(selectedPortfolioStorageKey, String(id))
  }, [])

  const refetch = useCallback((): void => {
    void query.refetch()
  }, [query])

  const value = useMemo<SelectedPortfolioValue>(
    () => ({
      portfolios,
      selected,
      select,
      isLoading: query.isPending,
      error: query.error,
      refetch,
    }),
    [portfolios, selected, select, query.isPending, query.error, refetch],
  )

  return (
    <SelectedPortfolioContext.Provider value={value}>{children}</SelectedPortfolioContext.Provider>
  )
}
