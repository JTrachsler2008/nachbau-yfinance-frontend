import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { accountKeys } from '../accounts/useAccounts'
import { positionKeys } from '../positions/usePositions'
import {
  createTransaction,
  fetchLots,
  fetchPortfolioTransactions,
  type CreatedTransaction,
  type Lot,
  type PortfolioTransaction,
  type TransactionInput,
} from './transactionApi'

export const transactionKeys = {
  forPortfolio: (portfolioId: number) => ['portfolios', portfolioId, 'transactions'] as const,
  lots: (accountId: number, securityId: number) =>
    ['accounts', accountId, 'positions', securityId, 'lots'] as const,
}

export function useTransactions(portfolioId: number): UseQueryResult<PortfolioTransaction[]> {
  return useQuery({
    queryKey: transactionKeys.forPortfolio(portfolioId),
    queryFn: () => fetchPortfolioTransactions(portfolioId),
  })
}

/**
 * Offene FIFO-Tranchen einer Position.
 *
 * `enabled` statt bedingtem Aufruf des Hooks: Regeln für Hooks verbieten den bedingten Aufruf, und
 * der Dialog kennt Konto und Wertpapier erst, wenn eine Position gewählt wurde.
 */
export function useLots(
  accountId: number | null,
  securityId: number | null,
): UseQueryResult<Lot[]> {
  return useQuery({
    queryKey: transactionKeys.lots(accountId ?? 0, securityId ?? 0),
    queryFn: () => fetchLots(accountId as number, securityId as number),
    enabled: accountId !== null && securityId !== null,
  })
}

/**
 * Buchung anlegen.
 *
 * Eine Buchung verändert Cash-Stand, Bestand, Tranchen und die Historie in einem Zug. Deshalb wird
 * hier alles vier invalidiert, sonst zeigt die Konten-Seite nach einem Kauf noch den alten Stand.
 */
export function useCreateTransaction(portfolioId: number) {
  const queryClient = useQueryClient()
  return useMutation<CreatedTransaction, unknown, { accountId: number; input: TransactionInput }>({
    mutationFn: ({ accountId, input }) => createTransaction(accountId, input),
    onSuccess: async (_created, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: transactionKeys.forPortfolio(portfolioId) }),
        queryClient.invalidateQueries({ queryKey: positionKeys.forPortfolio(portfolioId) }),
        queryClient.invalidateQueries({ queryKey: accountKeys.forPortfolio(portfolioId) }),
        queryClient.invalidateQueries({
          queryKey: ['accounts', variables.accountId, 'positions'],
        }),
      ])
    },
  })
}
