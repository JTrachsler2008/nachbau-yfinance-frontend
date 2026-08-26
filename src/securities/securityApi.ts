import { apiClient } from '../api/client'

/** Antwort von `GET /securities` und `GET /securities/{symbol}` (`SecurityResponseDto`). */
export interface Security {
  id: number
  symbol: string
  isin: string | null
  name: string
  assetType: string
  exchangeCode: string | null
  tradingCurrency: string
  countryCode: string | null
  sector: string | null
  couponRate: number | null
  maturityDate: string | null
}

/**
 * Alle Wertpapier-Stammdaten.
 *
 * Bewusst eine einzige Abfrage ohne Suchparameter: der Stammdatenbestand einer Anwendung dieser
 * Grösse passt in eine Antwort, und für den Verkauf zählt ohnehin nur die Teilmenge mit einer
 * offenen Position. Für den Kauf gibt es die echte Live-Suche, siehe `searchSecurities`.
 */
export async function fetchSecurities(): Promise<Security[]> {
  const { data } = await apiClient.get<Security[]>('/securities')
  return data
}

/** Antwort von `GET /securities/search` (`SecuritySearchResultDto`). */
export interface SecuritySearchResult {
  symbol: string
  name: string
  exchange: string | null
  quoteType: string
}

/**
 * Live-Suche beim Marktdatenanbieter, für die Vorschläge im Kauffeld.
 *
 * Anders als `fetchSecurities` kein Blick in die eigene Stammdatenliste: das Ergebnis kann Symbole
 * enthalten, die es hier noch gar nicht gibt, und genau darum geht es beim Kauf.
 */
export async function searchSecurities(query: string): Promise<SecuritySearchResult[]> {
  const { data } = await apiClient.get<SecuritySearchResult[]>('/securities/search', {
    params: { query },
  })
  return data
}

/**
 * Legt ein Wertpapier aus der Live-Suche an, oder liefert das bereits vorhandene.
 *
 * Nimmt bewusst nur das Symbol: Name, Anlageart, Handelswährung, Sektor und Land bestimmt das
 * Backend selbst aus Live-Marktdaten, damit hier nichts erfunden wird, was der Marktdatenanbieter
 * nicht bestätigt.
 */
export async function lookupOrCreateSecurity(symbol: string): Promise<Security> {
  const { data } = await apiClient.post<Security>('/securities/lookup-or-create', { symbol })
  return data
}
