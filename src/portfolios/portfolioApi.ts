import { apiClient } from '../api/client'

/** Antwort von `GET /portfolios` (`PortfolioResponseDto`). */
export interface Portfolio {
  id: number
  name: string
  baseCurrency: string
  description: string | null
  /** Gesetzt, wenn dem Portfolio ein Portfolio-Manager zugeordnet ist (YOUNGOITV-442). */
  managerUserId: number | null
  managerUsername: string | null
  createdAt: string
  updatedAt: string
}

export interface PortfolioInput {
  name: string
  baseCurrency: string
  description: string | null
}

export async function fetchPortfolios(): Promise<Portfolio[]> {
  const { data } = await apiClient.get<Portfolio[]>('/portfolios')
  return data
}

export async function createPortfolio(input: PortfolioInput): Promise<Portfolio> {
  const { data } = await apiClient.post<Portfolio>('/portfolios', input)
  return data
}

/**
 * Teilaktualisierung. Der Endpunkt ist ein PATCH, nicht gesetzte Felder bleiben unverändert
 * (`PortfolioUpdateRequestDto` hat keine Pflichtfelder).
 */
export async function updatePortfolio(
  id: number,
  input: Partial<PortfolioInput>,
): Promise<Portfolio> {
  const { data } = await apiClient.patch<Portfolio>(`/portfolios/${id}`, input)
  return data
}

export async function deletePortfolio(id: number): Promise<void> {
  await apiClient.delete(`/portfolios/${id}`)
}
