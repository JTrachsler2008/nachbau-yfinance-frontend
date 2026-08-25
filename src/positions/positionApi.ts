import { apiClient } from '../api/client'

/**
 * Antwort von `GET /portfolios/{id}/positions` (`PortfolioPositionResponseDto`).
 *
 * Ohne aktuellen Kurs, Marktwert und Gewinn: die hängen an Live-Kursabrufen, die laut
 * Architektur-Plan ausfallen können. Der Bestand selbst kommt aus der Datenbank und ist immer da.
 */
export interface Position {
  id: number
  accountId: number
  accountName: string
  securityId: number
  symbol: string
  securityName: string
  tradingCurrency: string
  sector: string | null
  countryCode: string | null
  totalQuantity: number
  averagePurchasePrice: number
}

export async function fetchPositions(portfolioId: number): Promise<Position[]> {
  const { data } = await apiClient.get<Position[]>(`/portfolios/${portfolioId}/positions`)
  return data
}
