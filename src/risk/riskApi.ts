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
  /**
   * Höchststand und Tiefpunkt von `maxDrawdown`. Zusammen mit `maxDrawdown` selbst `null`, wenn der
   * Rückgang nicht bestimmbar ist - ein Rückgang an einem Tag liest sich anders als einer über ein
   * Jahr, auch bei derselben Prozentzahl.
   */
  maxDrawdownPeakDate: string | null
  maxDrawdownTroughDate: string | null
  valueAtRisk95: number | null
  diversificationBenefit: number | null
  securities: SecurityRisk[]
  excluded: RiskExclusion[]
}

/**
 * Zeitraum der Risikoanalyse: entweder ein Preset in Kalendertagen zurück, oder ein frei gewähltes
 * Intervall. Eine Vereinigung statt zwei paralleler Felder, damit nie versehentlich beides zugleich
 * an den Endpunkt geht - der nimmt zwar `from`/`to` vorrangig, aber eine Oberfläche, die "3 Monate"
 * UND ein eigenes Datum gleichzeitig anzeigen könnte, wäre für sich schon irreführend.
 */
export type Zeitraum = { kind: 'preset'; lookbackDays: number } | { kind: 'custom'; from: string; to: string }

export async function fetchRiskAnalysis(
  portfolioId: number,
  zeitraum: Zeitraum,
  benchmark: string,
): Promise<RiskAnalysis> {
  const params =
    zeitraum.kind === 'preset'
      ? { lookbackDays: zeitraum.lookbackDays, benchmark }
      : { from: zeitraum.from, to: zeitraum.to, benchmark }
  const { data } = await apiClient.get<RiskAnalysis>(`/portfolios/${portfolioId}/risk`, { params })
  return data
}
