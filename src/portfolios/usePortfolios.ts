import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import {
  createPortfolio,
  deletePortfolio,
  fetchPortfolios,
  updatePortfolio,
  type Portfolio,
  type PortfolioInput,
} from './portfolioApi'

/**
 * Query-Schlüssel als Konstanten.
 *
 * Nötig, weil das Invalidieren nach einer Mutation denselben Schlüssel treffen muss wie die
 * Abfrage. Als Zeichenketten-Literale verstreut über Dateien wäre ein Tippfehler ein stiller Fehler:
 * die Liste würde einfach nicht neu geladen.
 */
export const portfolioKeys = {
  all: ['portfolios'] as const,
}

export function usePortfolios(): UseQueryResult<Portfolio[]> {
  return useQuery({ queryKey: portfolioKeys.all, queryFn: fetchPortfolios })
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PortfolioInput) => createPortfolio(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portfolioKeys.all })
    },
  })
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<PortfolioInput> }) =>
      updatePortfolio(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portfolioKeys.all })
    },
  })
}

export function useDeletePortfolio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePortfolio(id),
    onSuccess: async () => {
      // Ohne Schlüssel und damit alles: Konten, Positionen und Transaktionen des gelöschten
      // Portfolios sind mit ihm weg, und alles davon liegt im Cache.
      await queryClient.invalidateQueries()
    },
  })
}
