import { apiClient } from '../api/client'

/**
 * Simulationsendpunkte (`/simulate`).
 *
 * Alle drei sind hypothetisch und ohne Persistenz: nichts davon verändert ein Portfolio. Nur die
 * Kaufsimulation kennt überhaupt ein Portfolio, und zwar lesend, um den Bestand als Vergleichsgrösse
 * zu bewerten.
 *
 * Keine der drei Antworten trägt eine Währung. Die Beträge stehen in der Handelswährung der
 * jeweiligen Wertpapiere, bei der Kaufsimulation zusätzlich in der Basiswährung des Portfolios
 * (siehe die Felder unten). Die Oberfläche darf deshalb keinen Währungscode an Beträge schreiben,
 * die sie nicht kennt.
 */

export const rebalancingModes = ['INTERVAL', 'THRESHOLD'] as const

export type RebalancingMode = (typeof rebalancingModes)[number]

export const rebalancingModeLabels: Record<RebalancingMode, string> = {
  INTERVAL: 'Periodisch',
  THRESHOLD: 'Toleranzband',
}

/**
 * Parameter des Sparplans, so wie der Endpunkt sie erwartet.
 *
 * `positions` ist bewusst schon die Zeichenkette `SYMBOL:gewicht,SYMBOL:gewicht`: genau das liest der
 * Controller aus dem Query-String. Der Aufbau steckt in `positionenParameter`, damit das Format an
 * einer Stelle steht und geprüft werden kann.
 */
export interface SparplanParams {
  startDate: string
  amount: number
  intervalMonths: number
  positions: string
  rebalancing: boolean
  rebalancingIntervalMonths: number
  rebalancingMode: RebalancingMode
  rebalancingBandPercent: number
}

/** `SparplanChartPointDto`. `month` ist immer der Erste des Monats. */
export interface SparplanChartPoint {
  month: string
  portfolioValue: number | null
  invested: number | null
}

/**
 * Auslöser eines Rebalancings, wie der Service ihn schreibt: `"intervall"` oder `"schwelle"`.
 *
 * Der Wert kommt kleingeschrieben und ohne Erklärung. Statt ihn so anzuzeigen wird hier übersetzt.
 * Ein unbekannter Wert fällt auf den Rohwert zurück, damit eine Erweiterung des Backends sichtbar
 * bleibt statt in einer Tabellenzelle zu verschwinden.
 */
export function rebalancingReasonLabel(reason: string): string {
  if (reason === 'intervall') {
    return 'Rhythmus erreicht'
  }
  return reason === 'schwelle' ? 'Toleranzband verlassen' : reason
}

/** `RebalancingEventDto`. `trades` nennt je Symbol die verschobene Menge, negativ für Verkauf. */
export interface RebalancingEvent {
  month: string
  reason: string
  portfolioValueBefore: number | null
  trades: Readonly<Record<string, number>>
}

export interface SparplanResult {
  chartData: SparplanChartPoint[]
  endValue: number | null
  invested: number | null
  gain: number | null
  totalReturnPercent: number | null
  cagrPercent: number | null
  maxDrawdownPercent: number | null
  /** Echo der Anfrage, damit die Ergebnisdarstellung nicht auf das Formular schauen muss. */
  rebalancing: boolean
  rebalancingMode: RebalancingMode
  rebalancingBandPercent: number | null
  rebalancingCount: number
  rebalancingEvents: RebalancingEvent[]
  /** Sollgewichtung in Prozent, aus den übergebenen Gewichten normalisiert. */
  targetAllocationPercent: Readonly<Record<string, number>>
  /** Istgewichtung am Ende des Zeitraums, also nach allen Einzahlungen und Rebalancings. */
  currentAllocationPercent: Readonly<Record<string, number>>
}

export async function fetchSparplan(params: SparplanParams): Promise<SparplanResult> {
  const { data } = await apiClient.get<SparplanResult>('/simulate/sparplan', { params })
  return data
}

/** `WeightItemDto`. Der Wert steht in der Basiswährung des Portfolios. */
export interface WeightItem {
  symbol: string
  value: number | null
  percent: number | null
}

export interface PurchaseSimulation {
  symbol: string
  securityName: string
  /** In der Handelswährung des Wertpapiers. */
  currentPrice: number | null
  quantity: number | null
  /** Kurs mal Menge, ebenfalls in der Handelswährung. */
  cost: number | null
  /** Bestand vorher, in der Basiswährung des Portfolios. */
  currentPortfolioValue: number | null
  simulatedPortfolioValue: number | null
  /** Die Kosten, umgerechnet in die Basiswährung. Nicht die Änderung eines Gewinns. */
  valueChange: number | null
  /** Anteil des Zukaufs am bisherigen Bestand, in Prozent. */
  returnChangePercent: number | null
  currentWeights: WeightItem[]
  simulatedWeights: WeightItem[]
}

export async function fetchPurchaseSimulation(
  portfolioId: number,
  symbol: string,
  quantity: number,
): Promise<PurchaseSimulation> {
  const { data } = await apiClient.get<PurchaseSimulation>('/simulate/purchase', {
    params: { portfolioId, symbol, quantity },
  })
  return data
}

/** `BacktestChartPointDto`. `portfolioValue` ist Kurs mal simulierter Menge. */
export interface BacktestPoint {
  date: string
  price: number | null
  portfolioValue: number | null
}

export interface BacktestResult {
  symbol: string
  buyDate: string
  quantity: number | null
  priceAtBuy: number | null
  currentPrice: number | null
  investedAmount: number | null
  currentValue: number | null
  gainLoss: number | null
  returnPercent: number | null
  priceHistory: BacktestPoint[]
}

export async function fetchBacktest(
  symbol: string,
  quantity: number,
  purchaseDate: string,
): Promise<BacktestResult> {
  const { data } = await apiClient.get<BacktestResult>('/simulate/backtest', {
    params: { symbol, quantity, purchaseDate },
  })
  return data
}
