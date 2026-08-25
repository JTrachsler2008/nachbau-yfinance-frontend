import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  SelectedPortfolioContext,
  selectedPortfolioStorageKey,
  type SelectedPortfolioValue,
} from './SelectedPortfolioContext'
import { useManagedPortfolios, usePortfolios } from './usePortfolios'

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
 *
 * Ein Manager sieht zusätzlich seine Mandate (YOUNGOITV-459). Sie sind auswählbar wie eigene
 * Portfolios, bleiben aber als eigene Liste erkennbar.
 */
export function SelectedPortfolioProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth()
  const query = usePortfolios()
  const managedQuery = useManagedPortfolios(role === 'MANAGER')
  const [requestedId, setRequestedId] = useState<number | null>(readStoredId)

  // Memoisiert, weil das Literal [] sonst bei jedem Render eine neue Referenz wäre und der
  // Kontextwert damit ebenfalls, was jeden Verbraucher unnötig neu rendern liesse.
  const portfolios = useMemo(() => query.data ?? [], [query.data])
  const mandates = useMemo(() => managedQuery.data ?? [], [managedQuery.data])
  // Eigene zuerst, dann Mandate: die gemerkte ID wird gegen beide Listen geprüft, und ein Manager
  // ohne eigene Portfolios landet auf einem Mandat statt vor einer leeren Oberfläche.
  const auswaehlbar = useMemo(() => [...portfolios, ...mandates], [portfolios, mandates])
  const selected =
    auswaehlbar.find((portfolio) => portfolio.id === requestedId) ?? auswaehlbar[0] ?? null
  const isMandate = selected !== null && mandates.some((mandat) => mandat.id === selected.id)

  const select = useCallback((id: number): void => {
    setRequestedId(id)
    window.localStorage.setItem(selectedPortfolioStorageKey, String(id))
  }, [])

  const refetch = useCallback((): void => {
    void query.refetch()
    void managedQuery.refetch()
  }, [query, managedQuery])

  const value = useMemo<SelectedPortfolioValue>(
    () => ({
      portfolios,
      mandates,
      selected,
      isMandate,
      select,
      // `isPending` für die eigene Liste, aber `isLoading` für die Mandate: eine abgeschaltete
      // Abfrage bleibt in React Query dauerhaft "pending" und liesse die Oberfläche für jeden
      // Privatanleger endlos laden.
      isLoading: query.isPending || managedQuery.isLoading,
      error: query.error,
      mandatesError: managedQuery.error,
      refetch,
    }),
    [
      portfolios,
      mandates,
      selected,
      isMandate,
      select,
      query.isPending,
      query.error,
      managedQuery.isLoading,
      managedQuery.error,
      refetch,
    ],
  )

  return (
    <SelectedPortfolioContext.Provider value={value}>{children}</SelectedPortfolioContext.Provider>
  )
}
