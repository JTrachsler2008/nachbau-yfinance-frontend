import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchDividends, fetchRealizedGains, type CurrencyAmount } from './performanceApi'

/**
 * Die Anzeigewährung gehört in den Schlüssel: dasselbe Portfolio hat in CHF und in EUR
 * unterschiedliche Summen, und ein Wechsel der Währung muss neu laden statt den alten Wert unter
 * neuer Beschriftung zu zeigen.
 */
export const performanceKeys = {
  realizedGains: (portfolioId: number, currency: string) =>
    ['portfolios', portfolioId, 'realized-gains', currency] as const,
  dividends: (portfolioId: number, currency: string) =>
    ['portfolios', portfolioId, 'dividends', currency] as const,
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
