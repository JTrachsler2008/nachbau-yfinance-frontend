import axios, { type AxiosInstance } from 'axios'

/**
 * Fehlerstruktur des Backends. Entspricht `ErrorResponseDto` aus dem `GlobalExceptionHandler`
 * (Ticket YOUNGOITV-416), das für fachliche und technische Fehler dieselbe Struktur liefert.
 * `fieldErrors` ist nur bei Bean-Validation-Fehlern befüllt, sonst null.
 */
export interface BackendErrorBody {
  timestamp: string
  status: number
  error: string
  message: string
  fieldErrors: Record<string, string> | null
}

/**
 * Einheitlicher Fehlertyp für die UI. Die Komponenten sollen nicht mit `AxiosError` und dessen
 * verschachtelter `response.data`-Struktur arbeiten müssen.
 */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Readonly<Record<string, string>> | null

  constructor(message: string, status: number, fieldErrors: Record<string, string> | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }

  /** Netzwerkfehler oder Backend nicht erreichbar, also gar keine HTTP-Antwort erhalten. */
  get isNetworkError(): boolean {
    return this.status === 0
  }
}

/**
 * Basis-URL des Backends, konfigurierbar über `VITE_API_BASE_URL`.
 *
 * Standard ist der relative Pfad `/api`, den der Vite-Dev-Server auf `localhost:8080` weiterleitet
 * (siehe `vite.config.ts`). Der Umweg ist notwendig, weil das Backend keine CORS-Konfiguration hat
 * und ein direkter Aufruf von `localhost:5173` nach `localhost:8080` vom Browser blockiert würde.
 */
export const apiBaseUrl: string = import.meta.env.VITE_API_BASE_URL ?? '/api'

/**
 * Auth-Token bewusst nur im Speicher, nicht in `localStorage`. Der Architektur-Plan verlangt das
 * ausdrücklich (Behebung von SEC-1/SEC-2): ein Token in `localStorage` ist per XSS auslesbar.
 * Folge: nach einem Reload muss neu angemeldet werden, solange kein Refresh-Mechanismus existiert.
 */
let authToken: string | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

export function getAuthToken(): string | null {
  return authToken
}

/** Pfad des Login-Endpunkts. Als Konstante, weil der 401-Haken ihn ausnehmen muss. */
export const loginPath = '/auth/login'

/**
 * Reaktion auf ein abgelaufenes oder ungültiges Token. Der Client kennt den Router bewusst nicht,
 * deshalb registriert der `AuthProvider` hier eine Funktion, die abmeldet und zur Login-Seite
 * umleitet (UI/UX-Plan, Fehlerzustand 401).
 */
let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

/**
 * Reaktion auf einen Serverfehler (5xx) und auf einen verletzten Owner-Check (403).
 *
 * Beide gehören nicht an ein Formularfeld: ein 500er hat mit der Eingabe nichts zu tun, und ein 403
 * bedeutet aus Nutzersicht fast immer einen veralteten oder fremden Link (UI/UX-Plan,
 * Fehlerbehandlungsstrategie). Der Client kennt weder Router noch Snackbar, deshalb registriert der
 * `NotificationProvider` hier eine Funktion, wie es der `AuthProvider` für den 401 tut.
 */
let globalErrorHandler: ((error: ApiError) => void) | null = null

export function setGlobalErrorHandler(handler: ((error: ApiError) => void) | null): void {
  globalErrorHandler = handler
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  if (authToken !== null) {
    config.headers.Authorization = `Bearer ${authToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    // Der Login selbst antwortet bei falschen Zugangsdaten mit 401. Dort darf der Haken nicht
    // greifen, sonst würde die Login-Seite sich selbst als abgelaufene Sitzung behandeln.
    if (apiError.status === 401 && !isLoginRequest(error) && unauthorizedHandler !== null) {
      unauthorizedHandler()
    }
    if ((apiError.status === 403 || apiError.status >= 500) && globalErrorHandler !== null) {
      globalErrorHandler(apiError)
    }
    // Trotz Meldung weiterwerfen: die aufrufende Stelle muss ihren eigenen Fehlerzustand zeigen
    // können, sonst bliebe eine Tabelle mit veralteten Daten stehen (UI/UX-Plan, kein stilles
    // Verschlucken).
    return Promise.reject(apiError)
  },
)

function isLoginRequest(error: unknown): boolean {
  return axios.isAxiosError(error) && error.config?.url === loginPath
}

/** Übersetzt alles, was axios wirft, in einen `ApiError` mit der Message des Backends. */
function toApiError(error: unknown): ApiError {
  if (!axios.isAxiosError<Partial<BackendErrorBody>>(error)) {
    return new ApiError(error instanceof Error ? error.message : 'Unbekannter Fehler', 0)
  }

  const response = error.response
  if (response === undefined) {
    return new ApiError('Backend nicht erreichbar', 0)
  }

  // Fallback auf die axios-Message, falls die Antwort nicht der Backend-Struktur entspricht
  // (etwa ein Fehler eines Reverse Proxy, der HTML statt JSON liefert).
  return new ApiError(
    response.data?.message ?? error.message,
    response.status,
    response.data?.fieldErrors ?? null,
  )
}
