import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { fetchPositions, type Position } from './positionApi'

export const positionKeys = {
  forPortfolio: (portfolioId: number) => ['portfolios', portfolioId, 'positions'] as const,
}

export function usePositions(portfolioId: number): UseQueryResult<Position[]> {
  return useQuery({
    queryKey: positionKeys.forPortfolio(portfolioId),
    queryFn: () => fetchPositions(portfolioId),
  })
}
