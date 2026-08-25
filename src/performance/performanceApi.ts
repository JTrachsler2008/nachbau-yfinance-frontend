import { apiClient } from '../api/client'

/**
 * Antwort von `GET /portfolios/{id}/realized-gains` und `GET /portfolios/{id}/dividends`
 * (`CurrencyAmountResponseDto`).
 *
 * Die Währung kommt mit zurück, obwohl der Aufruf sie vorgibt: so steht in der Oberfläche die
 * Währung, in der das Backend tatsächlich gerechnet hat, und nicht die, die angefragt wurde.
 */
export interface CurrencyAmount {
  amount: number
  currency: string
}

export async function fetchRealizedGains(
  portfolioId: number,
  currency: string,
): Promise<CurrencyAmount> {
  const { data } = await apiClient.get<CurrencyAmount>(
    `/portfolios/${portfolioId}/realized-gains`,
    { params: { currency } },
  )
  return data
}

export async function fetchDividends(
  portfolioId: number,
  currency: string,
): Promise<CurrencyAmount> {
  const { data } = await apiClient.get<CurrencyAmount>(`/portfolios/${portfolioId}/dividends`, {
    params: { currency },
  })
  return data
}
