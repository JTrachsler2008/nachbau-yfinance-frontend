import { apiClient } from '../api/client'

/**
 * Kennzahlen eines einzelnen Wertpapiers aus `SecurityRiskResponseDto`.
 *
 * Jedes Feld kann `null` sein. Das heisst "aus den vorliegenden Kursen nicht bestimmbar" und ist im
 * Backend absichtlich von einer 0 unterschieden. Die Anzeige muss diesen Unterschied durchhalten,
 * sonst behauptet eine Volatilität von 0.00 % Ruhe, wo in Wahrheit die Daten fehlen.
 */
export interface SecurityRisk {
  symbol: string
  securityName: string
  /** Anteil am Marktwert der auswertbaren Titel in Prozent. */
  weight: number | null
  annualizedReturn: number | null
  volatility: number | null
  sharpeRatio: number | null
  beta: number | null
  maxDrawdown: number | null
  valueAtRisk95: number | null
}

/** Ein Symbol, das nicht in die Rechnung eingehen konnte, mit dem Grund als stabiler Kennung. */
export interface RiskExclusion {
  symbol: string
  reason: string
}

/**
 * Antwort von `GET /portfolios/{id}/risk` (`RiskAnalysisResponseDto`).
 *
 * `from` und `to` kommen mit zurück, obwohl der Aufruf nur `lookbackDays` sendet: der Endpunkt rechnet
 * bis gestern und in Kalendertagen, und der Zeitraum, über den tatsächlich gerechnet wurde, gehört
 * neben die Zahlen. `observations` ist die Zahl der gefundenen Handelstage und damit das Mass dafür,
 * wie belastbar die Kennzahlen sind.
 */
export interface RiskAnalysis {
  portfolioId: number
  portfolioName: string
  currency: string
  from: string
  to: string
  benchmarkSymbol: string
  benchmarkReturn: number | null
  benchmarkVolatility: number | null
  observations: number
  riskFreeRate: number | null
  annualizedReturn: number | null
  volatility: number | null
  sharpeRatio: number | null
  beta: number | null
  maxDrawdown: number | null
  valueAtRisk95: number | null
  diversificationBenefit: number | null
  securities: SecurityRisk[]
  excluded: RiskExclusion[]
}

export async function fetchRiskAnalysis(
  portfolioId: number,
  lookbackDays: number,
  benchmark: string,
): Promise<RiskAnalysis> {
  const { data } = await apiClient.get<RiskAnalysis>(`/portfolios/${portfolioId}/risk`, {
    params: { lookbackDays, benchmark },
  })
  return data
}
