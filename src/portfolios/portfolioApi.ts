import { apiClient } from '../api/client'

/** Antwort von `GET /portfolios` (`PortfolioResponseDto`). */
export interface Portfolio {
  id: number
  name: string
  baseCurrency: string
  description: string | null
  /**
   * Benutzername des Eigentümers.
   *
   * Nötig, damit ein Portfolio-Manager ein betreutes Portfolio nicht für sein eigenes hält: in der
   * Mandatsliste steht sonst nur ein Name wie "Altersvorsorge" (YOUNGOITV-459).
   */
  ownerUsername: string
  /** Gesetzt, wenn dem Portfolio ein Portfolio-Manager zugeordnet ist (YOUNGOITV-442). */
  managerUserId: number | null
  managerUsername: string | null
  createdAt: string
  updatedAt: string
}

export interface PortfolioInput {
  name: string
  baseCurrency: string
  description: string | null
}

export async function fetchPortfolios(): Promise<Portfolio[]> {
  const { data } = await apiClient.get<Portfolio[]>('/portfolios')
  return data
}

/**
 * Mandate des angemeldeten Portfolio-Managers (`GET /portfolios/managed`).
 *
 * Eine zweite Abfrage und keine Erweiterung von `fetchPortfolios`, weil das Backend die beiden
 * Listen getrennt liefert und die Oberfläche sie getrennt anzeigen muss: ein Mandat gehört einem
 * anderen Menschen, und diese Unterscheidung darf nicht in einer gemischten Liste verschwinden.
 *
 * Wer nicht die Rolle MANAGER trägt, erhält eine leere Liste und keinen Fehler.
 */
export async function fetchManagedPortfolios(): Promise<Portfolio[]> {
  const { data } = await apiClient.get<Portfolio[]>('/portfolios/managed')
  return data
}

/**
 * Ordnet dem Portfolio einen Manager zu, `null` entfernt die Zuordnung
 * (`PATCH /portfolios/{id}/manager`).
 *
 * Der Server lässt nur den Eigentümer zu, nicht den bereits zugeordneten Manager, und nur
 * Zielbenutzer mit der Rolle MANAGER. Beides bleibt seine Entscheidung, die Oberfläche versteckt den
 * Aufruf lediglich dort, wo er ohnehin scheitern würde.
 */
export async function assignManager(
  id: number,
  managerUserId: number | null,
): Promise<Portfolio> {
  const { data } = await apiClient.patch<Portfolio>(`/portfolios/${id}/manager`, { managerUserId })
  return data
}

export async function createPortfolio(input: PortfolioInput): Promise<Portfolio> {
  const { data } = await apiClient.post<Portfolio>('/portfolios', input)
  return data
}

/**
 * Teilaktualisierung. Der Endpunkt ist ein PATCH, nicht gesetzte Felder bleiben unverändert
 * (`PortfolioUpdateRequestDto` hat keine Pflichtfelder).
 */
export async function updatePortfolio(
  id: number,
  input: Partial<PortfolioInput>,
): Promise<Portfolio> {
  const { data } = await apiClient.patch<Portfolio>(`/portfolios/${id}`, input)
  return data
}

export async function deletePortfolio(id: number): Promise<void> {
  await apiClient.delete(`/portfolios/${id}`)
}
