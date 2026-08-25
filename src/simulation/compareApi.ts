import { apiClient } from '../api/client'

/**
 * Vergleichsendpunkte (`/compare`).
 *
 * Beide Endpunkte sind rein lesend und ohne Portfoliobezug: sie rechnen auf Kursreihen, nicht auf
 * Beständen. Deshalb tragen sie auch keine Währung, sondern normalisierte Indexwerte mit Basis 100
 * zum ersten Datum, an dem ein Symbol einen Kurs hat.
 */

/** `AssetClassDefinitionDto`. Das Label nennt die Anlageklasse, das Symbol den echten Ticker. */
export interface AssetClassDefinition {
  symbol: string
  label: string
}

/**
 * `NormalizedSeriesPointDto`. Ein Symbol ohne Kurs an diesem Datum fehlt in der Map, statt mit 0
 * dabei zu sein.
 */
export interface NormalizedSeriesPoint {
  date: string
  valuesBySymbol: Readonly<Record<string, number>>
}

export interface AssetClassComparison {
  /** Nur Anlageklassen, für die das Backend überhaupt Kurse hatte. Kann leer sein. */
  assetClasses: AssetClassDefinition[]
  series: NormalizedSeriesPoint[]
}

export async function fetchAssetClassComparison(period: number): Promise<AssetClassComparison> {
  const { data } = await apiClient.get<AssetClassComparison>('/compare/asset-classes', {
    params: { period },
  })
  return data
}

/** `WeightedSymbolDto`. Das Gewicht ist eine beliebige positive Zahl, das Backend normalisiert. */
export interface WeightedSymbol {
  symbol: string
  weight: number
}

/** `PortfolioCompositionDto`: ein hypothetisches Portfolio, das nirgends gespeichert wird. */
export interface PortfolioComposition {
  name: string
  positions: WeightedSymbol[]
}

export interface ComparePortfoliosInput {
  portfolioA: PortfolioComposition
  portfolioB: PortfolioComposition
  periodYears: number
}

/** `PortfolioComparisonPointDto`. `null` steht für ein Portfolio ohne Kurs an diesem Datum. */
export interface PortfolioComparisonPoint {
  date: string
  portfolioAValue: number | null
  portfolioBValue: number | null
}

export interface PortfolioComparison {
  nameA: string
  nameB: string
  series: PortfolioComparisonPoint[]
}

/**
 * Vergleicht zwei frei zusammengestellte Portfolios.
 *
 * POST, obwohl nichts entsteht: die Zusammenstellung ist bis zu zwanzig Positionen lang und gehört
 * nicht in eine URL. Das Backend speichert nichts, der Aufruf bleibt eine Abfrage.
 */
export async function comparePortfolios(input: ComparePortfoliosInput): Promise<PortfolioComparison> {
  const { data } = await apiClient.post<PortfolioComparison>('/compare/portfolios', input)
  return data
}
