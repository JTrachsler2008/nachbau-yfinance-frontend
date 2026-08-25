import { apiClient } from '../api/client'
import type { UserRole } from '../auth/authApi'
import type { Security } from '../securities/securityApi'

/**
 * Endpunkte der Stammdatenpflege (YOUNGOITV-460).
 *
 * Alle drei sind im Backend Admin-exklusiv, geprüft wird das serverseitig
 * (`AdminCheckService.requireAdmin`, `UserServiceImpl.updateRole`). Das Frontend blendet den Bereich
 * nur aus, es entscheidet nichts.
 */

/** Anlagearten aus dem fachlichen Plan. Das Backend nimmt jeden nicht leeren String an. */
export const assetTypes = ['STOCK', 'ETF', 'FUND', 'BOND'] as const

export type AssetType = (typeof assetTypes)[number]

/** `SecurityCreateRequestDto`. Leere optionale Felder gehen als `null`, nicht als Leerstring. */
export interface SecurityInput {
  symbol: string
  isin: string | null
  name: string
  assetType: string
  exchangeCode: string | null
  tradingCurrency: string
  countryCode: string | null
  sector: string | null
  /** Nur bei `assetType` BOND erlaubt, sonst antwortet das Backend mit 400. */
  couponRate: number | null
  /** Nur bei `assetType` BOND erlaubt, ISO-Datum. */
  maturityDate: string | null
}

/** `FxRateCreateRequestDto`. */
export interface FxRateInput {
  baseCurrency: string
  quoteCurrency: string
  rateDate: string
  rate: number
}

/** `FxRateResponseDto`. */
export interface FxRate {
  id: number
  baseCurrency: string
  quoteCurrency: string
  rateDate: string
  rate: number
}

export async function createSecurity(input: SecurityInput): Promise<Security> {
  const { data } = await apiClient.post<Security>('/securities', input)
  return data
}

export async function createFxRate(input: FxRateInput): Promise<FxRate> {
  const { data } = await apiClient.post<FxRate>('/fx-rates', input)
  return data
}

/**
 * Sucht den jüngsten Kurs am oder vor dem Stichtag.
 *
 * Der Endpunkt liefert bewusst keinen Bestand, sondern genau einen Kurs: eine Liste aller
 * hinterlegten Kurse gibt es im Backend nicht. Die Suche ist deshalb die einzige Möglichkeit
 * nachzusehen, ob ein Kurs schon erfasst ist, und `rateDate` in der Antwort verrät, ob der Treffer
 * vom Stichtag selbst stammt oder älter ist.
 */
export async function findFxRate(base: string, quote: string, date: string): Promise<FxRate> {
  const { data } = await apiClient.get<FxRate>('/fx-rates', { params: { base, quote, date } })
  return data
}

/** `UserResponseDto`. */
export interface AdminUser {
  id: number
  username: string
  email: string
  role: UserRole
  createdAt: string
}

/**
 * Setzt die Rolle eines Benutzers.
 *
 * Angesprochen wird der Benutzer über seine Nummer, weil das Backend keinen Endpunkt zum Auflisten
 * oder Suchen von Benutzern hat. Die Antwort trägt Name und E-Mail, damit die Oberfläche danach
 * zeigen kann, wen sie tatsächlich geändert hat.
 */
export async function updateUserRole(id: number, role: UserRole): Promise<AdminUser> {
  const { data } = await apiClient.patch<AdminUser>(`/users/${id}/role`, { role })
  return data
}
