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

/**
 * Antwort von `GET /portfolios/{id}/valuation` (`PortfolioValuationResponseDto`), immer in der
 * Basiswährung des Portfolios.
 *
 * `marketValue`/`costBasis`/`unrealizedGainLoss` sind `null`, wenn für kein einziges Wertpapier ein
 * Kurs vorlag - nicht 0, das wäre eine Aussage, die die Daten nicht stützen. `excludedSymbols` nennt,
 * welche Wertpapiere aus der Summe fehlen.
 */
export interface PortfolioValuation {
  portfolioId: number
  currency: string
  marketValue: number | null
  costBasis: number | null
  unrealizedGainLoss: number | null
  excludedSymbols: string[]
}

export async function fetchValuation(portfolioId: number): Promise<PortfolioValuation> {
  const { data } = await apiClient.get<PortfolioValuation>(`/portfolios/${portfolioId}/valuation`)
  return data
}

/**
 * Antwort von `GET /portfolios/{id}/returns` (`PortfolioReturnsResponseDto`), in Prozent.
 *
 * `timeWeightedReturn` ist absichtlich immer `null`: die dafür nötige Zerlegung der Historie in
 * Teilperioden mit je eigener historischer Neubewertung ist noch nicht umgesetzt (siehe Backend-
 * Javadoc). Ein geschätzter Wert wäre schlimmer als keiner, weil er sich von einem korrekten nicht
 * unterscheiden liesse.
 */
export interface PortfolioReturns {
  portfolioId: number
  currency: string
  timeWeightedReturn: number | null
  moneyWeightedReturn: number | null
}

export async function fetchReturns(portfolioId: number): Promise<PortfolioReturns> {
  const { data } = await apiClient.get<PortfolioReturns>(`/portfolios/${portfolioId}/returns`)
  return data
}
