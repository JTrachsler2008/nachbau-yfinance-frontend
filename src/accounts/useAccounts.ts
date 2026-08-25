import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import {
  createAccount,
  fetchAccounts,
  moveCash,
  type Account,
  type AccountInput,
} from './accountApi'

export const accountKeys = {
  /** Konten hängen am Portfolio, deshalb steht die ID im Schlüssel. */
  forPortfolio: (portfolioId: number) => ['portfolios', portfolioId, 'accounts'] as const,
}

export function useAccounts(portfolioId: number): UseQueryResult<Account[]> {
  return useQuery({
    queryKey: accountKeys.forPortfolio(portfolioId),
    queryFn: () => fetchAccounts(portfolioId),
  })
}

export function useCreateAccount(portfolioId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AccountInput) => createAccount(portfolioId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountKeys.forPortfolio(portfolioId) })
    },
  })
}

export function useMoveCash(portfolioId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: {
      accountId: number
      direction: 'deposit' | 'withdraw'
      amount: number
    }) => moveCash(variables.accountId, variables.direction, variables.amount),
    onSuccess: async () => {
      // Der Cash-Stand steckt in der Kontenliste, nicht in einer eigenen Abfrage.
      await queryClient.invalidateQueries({ queryKey: accountKeys.forPortfolio(portfolioId) })
    },
  })
}
