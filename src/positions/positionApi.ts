import { apiClient } from '../api/client'

/**
 * Antwort von `GET /portfolios/{id}/positions` (`PortfolioPositionResponseDto`).
 *
 * Bestandsdaten (`totalQuantity`, `averagePurchasePrice`) kommen aus der Datenbank und sind immer da.
 * `currentPrice`/`marketValue`/`unrealizedGainLoss` hängen an einem Live-Kursabruf, der laut
 * Architektur-Plan ausfallen kann - dann sind genau diese drei Felder `null`, der Rest der Position
 * bleibt trotzdem sichtbar. Beide Werte in der Handelswährung des Wertpapiers, nicht in der
 * Basiswährung des Portfolios.
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
  currentPrice: number | null
  marketValue: number | null
  unrealizedGainLoss: number | null
}

export async function fetchPositions(portfolioId: number): Promise<Position[]> {
  const { data } = await apiClient.get<Position[]>(`/portfolios/${portfolioId}/positions`)
  return data
}
