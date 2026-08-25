import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import {
  comparePortfolios,
  fetchAssetClassComparison,
  type AssetClassComparison,
  type ComparePortfoliosInput,
  type PortfolioComparison,
} from './compareApi'

/**
 * Die Zusammenstellung steht mit im Schlüssel, nicht nur der Zeitraum: zwei verschiedene Portfolios
 * sind zwei verschiedene Antworten, und ohne Unterscheidung zeigte die Seite nach einer Änderung noch
 * den alten Verlauf.
 */
export const compareKeys = {
  assetClasses: (period: number) => ['compare', 'asset-classes', period] as const,
  portfolios: (input: ComparePortfoliosInput | null) => ['compare', 'portfolios', input] as const,
}

/**
 * Beide Abfragen laufen über mehrere externe Kursreihen und dauern spürbar. Deshalb bleiben ihre
 * Ergebnisse länger frisch als die 30 Sekunden der Grundeinstellung: ein Zurückwechseln auf den Tab
 * soll nicht jedes Mal neu rechnen lassen.
 */
const langsameAbfrage = {
  staleTime: 5 * 60_000,
  // Kein zweiter Versuch: ein fachlicher 400er fällt wieder gleich aus, und ein Netzwerkfehler
  // würde eine lange laufende Abfrage verdoppeln.
  retry: false,
} as const

export function useAssetClassComparison(period: number): UseQueryResult<AssetClassComparison> {
  return useQuery({
    queryKey: compareKeys.assetClasses(period),
    queryFn: () => fetchAssetClassComparison(period),
    ...langsameAbfrage,
  })
}

/**
 * Vergleich zweier hypothetischer Portfolios.
 *
 * `enabled` statt eines bedingten Hooks: der Vergleich soll erst auf Knopfdruck laufen, weil er ohne
 * eine vollständige Zusammenstellung sinnlos ist und Rechenzeit kostet.
 */
export function usePortfolioComparison(
  input: ComparePortfoliosInput | null,
): UseQueryResult<PortfolioComparison> {
  return useQuery({
    queryKey: compareKeys.portfolios(input),
    queryFn: () => comparePortfolios(input as ComparePortfoliosInput),
    enabled: input !== null,
    ...langsameAbfrage,
  })
}
