import { apiClient } from '../api/client'

/**
 * Werte des `TransactionType`-Enums im Backend, in der Reihenfolge der Auswahlliste.
 *
 * Nicht in der Reihenfolge des Enums, sondern nach Häufigkeit gruppiert: Kauf und Verkauf zuerst, dann
 * die laufenden Erträge, dann die seltenen Kapitalmassnahmen. Wer eine Anleihe bucht, findet Coupon
 * und Rückzahlung so neben der Dividende statt am Ende einer Liste hinter Fusion.
 */
export const transactionTypes = [
  'BUY',
  'SELL',
  'DIVIDEND',
  'COUPON',
  'REDEMPTION',
  'SPLIT',
  'ACQUISITION',
  'MERGER',
] as const

export type TransactionType = (typeof transactionTypes)[number]

/** Deutsche Beschriftung je Typ. Der Enum-Wert selbst bleibt englisch, er geht so ans Backend. */
export const transactionTypeLabels: Record<TransactionType, string> = {
  BUY: 'Kauf',
  SELL: 'Verkauf',
  DIVIDEND: 'Dividende',
  COUPON: 'Coupon (Zinszahlung)',
  REDEMPTION: 'Rückzahlung (Fälligkeit)',
  SPLIT: 'Split',
  ACQUISITION: 'Übernahme',
  MERGER: 'Fusion',
}

/** Antwort von `GET /portfolios/{id}/transactions` (`PortfolioTransactionResponseDto`). */
export interface PortfolioTransaction {
  id: number
  accountId: number
  accountName: string
  securityId: number
  symbol: string
  securityName: string
  transactionType: TransactionType
  quantity: number
  price: number | null
  fee: number | null
  tax: number | null
  splitRatio: number | null
  transactionCurrency: string
  fxRateToPortfolio: number | null
  transactionDate: string
}

/**
 * Eingabe für `POST /accounts/{id}/transactions` (`TransactionRequestDto`).
 *
 * `price`, `fee`, `tax` und `splitRatio` sind im Backend optional. `price` weggelassen heisst: das
 * Backend sucht den historischen Kurs zum Datum. Deshalb `null` und nicht `0` für "nicht angegeben",
 * eine 0 wäre ein Preis von null Franken.
 */
export interface TransactionInput {
  securityId: number
  transactionType: TransactionType
  quantity: number
  price: number | null
  fee: number | null
  tax: number | null
  splitRatio: number | null
  transactionCurrency: string
  transactionDate: string
}

/** Antwort von `POST /accounts/{id}/transactions` (`TransactionResponseDto`). */
export interface CreatedTransaction {
  id: number
  securityId: number
  transactionType: TransactionType
  quantity: number
  price: number | null
  transactionDate: string
}

/** Antwort von `GET /accounts/{a}/positions/{s}/lots` (`LotResponseDto`). */
export interface Lot {
  quantity: number
  purchasePrice: number
  purchaseDate: string
}

export async function fetchPortfolioTransactions(portfolioId: number): Promise<PortfolioTransaction[]> {
  const { data } = await apiClient.get<PortfolioTransaction[]>(
    `/portfolios/${portfolioId}/transactions`,
  )
  return data
}

export async function createTransaction(
  accountId: number,
  input: TransactionInput,
): Promise<CreatedTransaction> {
  const { data } = await apiClient.post<CreatedTransaction>(
    `/accounts/${accountId}/transactions`,
    input,
  )
  return data
}

export async function fetchLots(accountId: number, securityId: number): Promise<Lot[]> {
  const { data } = await apiClient.get<Lot[]>(
    `/accounts/${accountId}/positions/${securityId}/lots`,
  )
  return data
}
