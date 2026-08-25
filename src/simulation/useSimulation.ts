import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import {
  fetchBacktest,
  fetchPurchaseSimulation,
  fetchSparplan,
  type BacktestResult,
  type PurchaseSimulation,
  type SparplanParams,
  type SparplanResult,
} from './simulationApi'

/**
 * Alle drei Simulationen laufen erst auf Knopfdruck. Die Parameter stehen deshalb im Schlüssel und
 * `null` heisst "noch nichts abgeschickt".
 */
export const simulationKeys = {
  sparplan: (params: SparplanParams | null) => ['simulate', 'sparplan', params] as const,
  purchase: (portfolioId: number | null, symbol: string | null, quantity: number | null) =>
    ['simulate', 'purchase', portfolioId, symbol, quantity] as const,
  backtest: (symbol: string | null, quantity: number | null, purchaseDate: string | null) =>
    ['simulate', 'backtest', symbol, quantity, purchaseDate] as const,
}

/**
 * Wie bei den Vergleichen: kein zweiter Versuch. Diese Abfragen holen historische Kurse über mehrere
 * Jahre, ein automatischer Wiederholungslauf verdoppelt nur die Wartezeit. Ein hinterlegtes Ergebnis
 * bleibt fünf Minuten frisch, damit ein Tabwechsel es nicht neu berechnet.
 */
const langsameAbfrage = {
  staleTime: 5 * 60_000,
  retry: false,
} as const

export function useSparplan(params: SparplanParams | null): UseQueryResult<SparplanResult> {
  return useQuery({
    queryKey: simulationKeys.sparplan(params),
    queryFn: () => fetchSparplan(params as SparplanParams),
    enabled: params !== null,
    ...langsameAbfrage,
  })
}

/**
 * Kaufsimulation. Braucht ein Portfolio, weil der Endpunkt den Bestand als Vergleichsgrösse bewertet
 * und dabei prüft, wem das Portfolio gehört.
 */
export function usePurchaseSimulation(
  portfolioId: number,
  symbol: string | null,
  quantity: number | null,
): UseQueryResult<PurchaseSimulation> {
  return useQuery({
    queryKey: simulationKeys.purchase(portfolioId, symbol, quantity),
    queryFn: () => fetchPurchaseSimulation(portfolioId, symbol as string, quantity as number),
    enabled: symbol !== null && quantity !== null,
    ...langsameAbfrage,
  })
}

export function useBacktest(
  symbol: string | null,
  quantity: number | null,
  purchaseDate: string | null,
): UseQueryResult<BacktestResult> {
  return useQuery({
    queryKey: simulationKeys.backtest(symbol, quantity, purchaseDate),
    queryFn: () => fetchBacktest(symbol as string, quantity as number, purchaseDate as string),
    enabled: symbol !== null && quantity !== null && purchaseDate !== null,
    ...langsameAbfrage,
  })
}
