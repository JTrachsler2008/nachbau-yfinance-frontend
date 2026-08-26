import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import {
  fetchDividends,
  fetchRealizedGains,
  fetchReturns,
  fetchValuation,
  type CurrencyAmount,
  type PortfolioReturns,
  type PortfolioValuation,
} from './performanceApi'

/**
 * Die Anzeigewährung gehört in den Schlüssel: dasselbe Portfolio hat in CHF und in EUR
 * unterschiedliche Summen, und ein Wechsel der Währung muss neu laden statt den alten Wert unter
 * neuer Beschriftung zu zeigen. Valuation und Returns rechnen immer in der Basiswährung, brauchen
 * deshalb keine Währung im Schlüssel.
 */
export const performanceKeys = {
  realizedGains: (portfolioId: number, currency: string) =>
    ['portfolios', portfolioId, 'realized-gains', currency] as const,
  dividends: (portfolioId: number, currency: string) =>
    ['portfolios', portfolioId, 'dividends', currency] as const,
  valuation: (portfolioId: number) => ['portfolios', portfolioId, 'valuation'] as const,
  returns: (portfolioId: number) => ['portfolios', portfolioId, 'returns'] as const,
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
