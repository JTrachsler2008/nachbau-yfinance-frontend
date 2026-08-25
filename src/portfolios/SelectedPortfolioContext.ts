import { createContext } from 'react'
import type { Portfolio } from './portfolioApi'

export interface SelectedPortfolioValue {
  /** Alle Portfolios des angemeldeten Users, leer solange geladen wird. */
  portfolios: readonly Portfolio[]
  /** Das aktive Portfolio, oder null solange keines geladen oder keines vorhanden ist. */
  selected: Portfolio | null
  select: (id: number) => void
  isLoading: boolean
  error: unknown
  refetch: () => void
}

/**
 * Das aktive Portfolio als Kontext.
 *
 * Der Kontext liegt in einer eigenen Datei, damit die Provider-Datei nur Komponenten exportiert und
 * Fast Refresh sie ersetzen kann.
 */
export const SelectedPortfolioContext = createContext<SelectedPortfolioValue | null>(null)

/** Schlüssel, unter dem die Auswahl lokal gemerkt wird. */
export const selectedPortfolioStorageKey = 'nachbau.selectedPortfolioId'
