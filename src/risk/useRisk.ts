import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { zeitraumKey, type Zeitraum } from '../zeitraum/zeitraum'
import { fetchRiskAnalysis, type RiskAnalysis } from './riskApi'

/**
 * Zeitraum und Benchmark gehören mit in den Schlüssel: dasselbe Portfolio hat über ein Jahr andere
 * Kennzahlen als über fünf, und ein Beta gegen SPY ist ein anderes als gegen QQQ. Ohne beide Teile
 * zeigte die Seite nach dem Umschalten die alten Zahlen unter neuer Beschriftung.
 */
export const riskKeys = {
  analysis: (portfolioId: number, zeitraum: Zeitraum, benchmark: string) =>
    ['portfolios', portfolioId, 'risk', zeitraumKey(zeitraum), benchmark] as const,
}

/**
 * Risikoanalyse des Portfolios.
 *
 * Wie die Vergleichsabfragen langlebig und ohne zweiten Versuch: hinter dem Endpunkt liegt ein
 * Kursabruf je Wertpapier plus einer für die Benchmark, das dauert spürbar. Ein Wiederholversuch
 * würde diese Wartezeit im Fehlerfall verdoppeln, und ein fachlicher 400er fällt beim zweiten Mal
 * genauso aus.
 */
export function useRiskAnalysis(
  portfolioId: number,
  zeitraum: Zeitraum,
  benchmark: string,
  enabled = true,
): UseQueryResult<RiskAnalysis> {
  return useQuery({
    queryKey: riskKeys.analysis(portfolioId, zeitraum, benchmark),
    queryFn: () => fetchRiskAnalysis(portfolioId, zeitraum, benchmark),
    staleTime: 5 * 60_000,
    retry: false,
    enabled,
  })
}
