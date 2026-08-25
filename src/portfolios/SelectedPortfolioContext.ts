import { createContext } from 'react'
import type { Portfolio } from './portfolioApi'

export interface SelectedPortfolioValue {
  /** Eigene Portfolios des angemeldeten Users, leer solange geladen wird. */
  portfolios: readonly Portfolio[]
  /**
   * Betreute Portfolios anderer Eigentümer (YOUNGOITV-459), nur für die Rolle MANAGER gefüllt.
   *
   * Getrennt von `portfolios` und nicht eingemischt, weil ein Mandat einem anderen Menschen gehört
   * und die Oberfläche das sichtbar machen muss.
   */
  mandates: readonly Portfolio[]
  /** Das aktive Portfolio, oder null solange keines geladen oder keines vorhanden ist. */
  selected: Portfolio | null
  /** Ob das aktive Portfolio ein Mandat ist, also einem anderen Benutzer gehört. */
  isMandate: boolean
  select: (id: number) => void
  isLoading: boolean
  error: unknown
  /**
   * Fehler der Mandatsabfrage, getrennt von `error`.
   *
   * Eine gescheiterte Mandatsliste darf die eigenen Portfolios nicht verdecken, aber auch nicht
   * stillschweigend als "keine Mandate" durchgehen: sonst hielte ein Manager seine Mandate für
   * verschwunden.
   */
  mandatesError: unknown
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
