import { apiClient } from '../api/client'

/** Antwort von `GET /portfolios/{id}/accounts` (`AccountResponseDto`). */
export interface Account {
  id: number
  name: string
  currency: string
  cashAmount: number
}

export interface AccountInput {
  name: string
  currency: string
}

export async function fetchAccounts(portfolioId: number): Promise<Account[]> {
  const { data } = await apiClient.get<Account[]>(`/portfolios/${portfolioId}/accounts`)
  return data
}

export async function createAccount(portfolioId: number, input: AccountInput): Promise<Account> {
  const { data } = await apiClient.post<Account>(`/portfolios/${portfolioId}/accounts`, input)
  return data
}

/**
 * Cash-Bewegung. Ein- und Auszahlung unterscheiden sich nur im Pfad, beide erwarten einen positiven
 * Betrag (`CashMovementRequestDto`: `@DecimalMin(value = "0.0", inclusive = false)`).
 */
export async function moveCash(
  accountId: number,
  direction: 'deposit' | 'withdraw',
  amount: number,
): Promise<Account> {
  const { data } = await apiClient.post<Account>(`/accounts/${accountId}/${direction}`, { amount })
  return data
}
