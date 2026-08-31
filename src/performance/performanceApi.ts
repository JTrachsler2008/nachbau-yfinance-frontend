import { apiClient } from '../api/client'
import type { RiskExclusion } from '../risk/riskApi'
import { zeitraumParams, type Zeitraum } from '../zeitraum/zeitraum'

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
 * `timeWeightedReturn` ist hier immer `null` und wird von der Oberfläche nicht gelesen: die
 * zeitgewichtete Rendite braucht einen Zeitraum und kommt deshalb aus `/history`
 * (siehe `PortfolioHistory`). Das Feld bleibt im Vertrag, weil der Endpunkt es weiterhin liefert.
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

/**
 * Ein Tag des Wertverlaufs aus `PortfolioHistoryPointDto`.
 *
 * Jedes Feld ausser `date` kann `null` sein, und `null` heisst durchweg "an diesem Tag nicht
 * bestimmbar", nicht 0. Die Anzeige muss das durchhalten: eine 0 im Wertverlauf sieht wie ein
 * Totalverlust aus, wo in Wahrheit ein Kurs fehlt.
 */
export interface PortfolioHistoryPoint {
  date: string
  /** Marktwert der an diesem Tag gehaltenen Wertpapiere, in der Basiswährung. */
  value: number | null
  /** Kumulierter Nettoeinsatz: Käufe erhöhen ihn, Verkäufe und Dividenden senken ihn. */
  invested: number | null
  /** Zeitgewichtete Entwicklung, Basis 100 am ersten Punkt - also von Ein- und Auszahlungen bereinigt. */
  index: number | null
  /** Kursverlauf der Benchmark, auf denselben Startpunkt normiert. */
  benchmarkIndex: number | null
}

/**
 * Antwort von `GET /portfolios/{id}/history` (`PortfolioHistoryResponseDto`).
 *
 * Wertverlauf und zeitgewichtete Rendite kommen aus einem Aufruf, weil sie eine Rechnung sind: die
 * Rendite ist der Endwert derselben Kette, die die Indexlinie zeichnet. Zwei Abfragen könnten sich
 * widersprechen, und der Kursabruf je Wertpapier liefe zweimal.
 *
 * `seriesFrom` kann nach `from` liegen, etwa wenn ein gehaltenes Wertpapier erst später an die Börse
 * kam oder ein Wechselkurs für die frühen Tage fehlt. Der Grund steht dann in `excluded`.
 */
export interface PortfolioHistory {
  portfolioId: number
  currency: string
  from: string
  to: string
  seriesFrom: string | null
  benchmarkSymbol: string
  timeWeightedReturn: number | null
  benchmarkReturn: number | null
  points: PortfolioHistoryPoint[]
  excluded: RiskExclusion[]
}

export async function fetchHistory(
  portfolioId: number,
  zeitraum: Zeitraum,
  benchmark: string,
): Promise<PortfolioHistory> {
  const { data } = await apiClient.get<PortfolioHistory>(`/portfolios/${portfolioId}/history`, {
    params: zeitraumParams(zeitraum, benchmark),
  })
  return data
}
