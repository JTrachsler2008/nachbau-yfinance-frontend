import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { zeitraumKey, type Zeitraum } from '../zeitraum/zeitraum'
import {
  fetchDividends,
  fetchHistory,
  fetchRealizedGains,
  fetchReturns,
  fetchValuation,
  type CurrencyAmount,
  type PortfolioHistory,
  type PortfolioReturns,
  type PortfolioValuation,
} from './performanceApi'

/**
 * Die Anzeigewährung gehört in den Schlüssel: dasselbe Portfolio hat in CHF und in EUR
 * unterschiedliche Summen, und ein Wechsel der Währung muss neu laden statt den alten Wert unter
 * neuer Beschriftung zu zeigen. Valuation und Returns rechnen immer in der Basiswährung, brauchen
 * deshalb keine Währung im Schlüssel. Der Wertverlauf braucht dafür Zeitraum und Benchmark, aus dem
 * gleichen Grund wie die Risikoanalyse.
 */
export const performanceKeys = {
  realizedGains: (portfolioId: number, currency: string) =>
    ['portfolios', portfolioId, 'realized-gains', currency] as const,
  dividends: (portfolioId: number, currency: string) =>
    ['portfolios', portfolioId, 'dividends', currency] as const,
  valuation: (portfolioId: number) => ['portfolios', portfolioId, 'valuation'] as const,
  returns: (portfolioId: number) => ['portfolios', portfolioId, 'returns'] as const,
  history: (portfolioId: number, zeitraum: Zeitraum, benchmark: string) =>
    ['portfolios', portfolioId, 'history', zeitraumKey(zeitraum), benchmark] as const,
}

export function useRealizedGains(
  portfolioId: number,
  currency: string,
): UseQueryResult<CurrencyAmount> {
  return useQuery({
    queryKey: performanceKeys.realizedGains(portfolioId, currency),
    queryFn: () => fetchRealizedGains(portfolioId, currency),
  })
}

export function useDividends(
  portfolioId: number,
  currency: string,
): UseQueryResult<CurrencyAmount> {
  return useQuery({
    queryKey: performanceKeys.dividends(portfolioId, currency),
    queryFn: () => fetchDividends(portfolioId, currency),
  })
}

/**
 * Marktwert, Einstand und Gewinn/Verlust in der Basiswährung.
 *
 * Kein zweiter Versuch: der Endpunkt holt für jedes Wertpapier einen Livekurs, ein Wiederholversuch
 * würde eine bereits fehlgeschlagene Anfrage einfach noch einmal so lange warten lassen.
 */
export function useValuation(portfolioId: number): UseQueryResult<PortfolioValuation> {
  return useQuery({
    queryKey: performanceKeys.valuation(portfolioId),
    queryFn: () => fetchValuation(portfolioId),
    retry: false,
  })
}

export function useReturns(portfolioId: number): UseQueryResult<PortfolioReturns> {
  return useQuery({
    queryKey: performanceKeys.returns(portfolioId),
    queryFn: () => fetchReturns(portfolioId),
    retry: false,
  })
}

/**
 * Wertverlauf und zeitgewichtete Rendite über den gewählten Zeitraum.
 *
 * Wie die Risikoanalyse langlebig und ohne zweiten Versuch: hinter dem Endpunkt liegt eine
 * historische Neubewertung mit einem Kursabruf je gehaltenem Wertpapier plus einem für die Benchmark.
 * Ein Wiederholversuch würde diese Wartezeit im Fehlerfall verdoppeln, und ein fachlicher 400er fällt
 * beim zweiten Mal genauso aus.
 */
export function useHistory(
  portfolioId: number,
  zeitraum: Zeitraum,
  benchmark: string,
  enabled = true,
): UseQueryResult<PortfolioHistory> {
  return useQuery({
    queryKey: performanceKeys.history(portfolioId, zeitraum, benchmark),
    queryFn: () => fetchHistory(portfolioId, zeitraum, benchmark),
    staleTime: 5 * 60_000,
    retry: false,
    enabled,
  })
}
