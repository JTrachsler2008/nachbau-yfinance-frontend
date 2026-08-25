import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import {
  assignManager,
  createPortfolio,
  deletePortfolio,
  fetchManagedPortfolios,
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
  /** Beginnt mit `all`, damit ein Invalidieren von `all` die Mandatsliste mitnimmt. */
  managed: ['portfolios', 'managed'] as const,
}

export function usePortfolios(): UseQueryResult<Portfolio[]> {
  return useQuery({ queryKey: portfolioKeys.all, queryFn: fetchPortfolios })
}

/**
 * Mandate des angemeldeten Managers (YOUNGOITV-459).
 *
 * `enabled` statt eines Aufrufs in jedem Fall: der Endpunkt antwortet einem Privatanleger mit einer
 * leeren Liste, die Anfrage wäre aber bei jeder Anmeldung umsonst. Fällt die Rolle weg, hört die
 * Abfrage auf, statt weiter im Hintergrund zu laufen.
 */
export function useManagedPortfolios(enabled: boolean): UseQueryResult<Portfolio[]> {
  return useQuery({
    queryKey: portfolioKeys.managed,
    queryFn: fetchManagedPortfolios,
    enabled,
  })
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

/**
 * Manager zuordnen oder die Zuordnung entfernen.
 *
 * Invalidiert `all` und damit auch die Mandatsliste: nach dem Zuordnen betreut der Manager ein
 * Portfolio mehr, nach dem Entfernen eines weniger.
 */
export function useAssignManager() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, managerUserId }: { id: number; managerUserId: number | null }) =>
      assignManager(id, managerUserId),
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
