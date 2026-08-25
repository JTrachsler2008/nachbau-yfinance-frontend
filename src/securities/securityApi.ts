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
 * Bewusst eine einzige Abfrage ohne Suchparameter: das Backend hat keinen Such-Endpunkt, und der
 * Stammdatenbestand einer Anwendung dieser Grösse passt in eine Antwort. Das Filtern übernimmt das
 * Autocomplete im Browser, was zugleich das Tippen ohne Wartezeit beantwortet. Das Original hat je
 * Tastendruck einen Request abgesetzt und dafür eigenen Debounce-Code gebraucht.
 */
export async function fetchSecurities(): Promise<Security[]> {
  const { data } = await apiClient.get<Security[]>('/securities')
  return data
}
