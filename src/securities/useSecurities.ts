import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchSecurities, type Security } from './securityApi'

export const securityKeys = {
  all: ['securities'] as const,
}

/**
 * Wertpapier-Stammdaten.
 *
 * Lange `staleTime`, weil Symbol, Name und Währung eines Wertpapiers sich praktisch nie ändern.
 * Ohne das würde die Liste bei jedem Öffnen des Transaktionsdialogs neu geholt.
 */
export function useSecurities(): UseQueryResult<Security[]> {
  return useQuery({
    queryKey: securityKeys.all,
    queryFn: fetchSecurities,
    staleTime: 10 * 60 * 1000,
  })
}
