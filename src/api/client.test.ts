import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ApiError,
  apiBaseUrl,
  apiClient,
  getAuthToken,
  setAuthToken,
  type BackendErrorBody,
} from './client'

/**
 * Getestet wird über einen ausgetauschten axios-Adapter, nicht über eine nachgebaute Kopie der
 * Umsetzungslogik. So läuft die echte Interceptor-Kette des exportierten `apiClient` durch, und
 * ein Fehler in der Verdrahtung der Interceptoren fällt auf.
 */

const originalAdapter = apiClient.defaults.adapter

function installAdapter(adapter: AxiosAdapter): void {
  apiClient.defaults.adapter = adapter
}

/** Antwortet erfolgreich und merkt sich die Anfrage, damit Header geprüft werden können. */
function captureRequest(): { seen: () => InternalAxiosRequestConfig } {
  let captured: InternalAxiosRequestConfig | undefined
  installAdapter((config) => {
    captured = config
    return Promise.resolve({
      data: null,
      status: 200,
      statusText: 'OK',
      headers: new AxiosHeaders(),
      config,
    })
  })
  return {
    seen: () => {
      if (captured === undefined) {
        throw new Error('Es wurde keine Anfrage an den Adapter gestellt')
      }
      return captured
    },
  }
}

/** Antwortet mit einem HTTP-Fehler, so wie der echte axios-Adapter ihn wirft. */
function respondWithStatus(status: number, data: unknown, message: string): void {
  installAdapter((config) =>
    Promise.reject(
      new AxiosError(message, AxiosError.ERR_BAD_RESPONSE, config, null, {
        data,
        status,
        statusText: 'Error',
        headers: new AxiosHeaders(),
        config,
      }),
    ),
  )
}

async function captureApiError(request: Promise<unknown>): Promise<ApiError> {
  try {
    await request
  } catch (error) {
    if (error instanceof ApiError) {
      return error
    }
    throw new Error(`Erwartet wurde ein ApiError, erhalten wurde: ${String(error)}`)
  }
  throw new Error('Erwartet wurde ein Fehler, die Anfrage war aber erfolgreich')
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  setAuthToken(null)
})

describe('Konfiguration', () => {
  it('nutzt ohne VITE_API_BASE_URL den relativen Pfad /api', () => {
    // Der relative Pfad ist Voraussetzung dafür, dass der Dev-Proxy greift und die fehlende
    // CORS-Konfiguration des Backends nicht auffällt.
    expect(apiBaseUrl).toBe('/api')
    expect(apiClient.defaults.baseURL).toBe('/api')
  })

  it('setzt einen Timeout, damit ein hängendes Backend die UI nicht blockiert', () => {
    expect(apiClient.defaults.timeout).toBe(30_000)
  })
})

describe('Auth-Token', () => {
  it('hält den Token nur im Speicher und nicht in localStorage', () => {
    setAuthToken('geheim-123')
    expect(getAuthToken()).toBe('geheim-123')
    // SEC-1/SEC-2 des Architektur-Plans: ein Token in der Storage wäre per XSS auslesbar.
    // Geprüft wird, dass überhaupt nichts geschrieben wurde, nicht nur der Schlüssel.
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })

  it('sendet ohne Token keinen Authorization-Header', async () => {
    const request = captureRequest()
    await apiClient.get('/portfolios')
    expect(request.seen().headers.Authorization).toBeUndefined()
  })

  it('hängt den gesetzten Token als Bearer an', async () => {
    setAuthToken('token-abc')
    const request = captureRequest()
    await apiClient.get('/portfolios')
    expect(request.seen().headers.Authorization).toBe('Bearer token-abc')
  })

  it('entfernt den Header nach dem Abmelden wieder', async () => {
    setAuthToken('token-abc')
    setAuthToken(null)
    const request = captureRequest()
    await apiClient.get('/portfolios')
    expect(request.seen().headers.Authorization).toBeUndefined()
  })
})

describe('Fehler-Übersetzung', () => {
  it('übernimmt Message und fieldErrors aus der Backend-Struktur', async () => {
    const body: BackendErrorBody = {
      timestamp: '2026-08-24T12:00:00Z',
      status: 400,
      error: 'Bad Request',
      message: 'Nicht genügend Cash auf dem Konto',
      fieldErrors: { quantity: 'muss grösser als 0 sein' },
    }
    respondWithStatus(400, body, 'Request failed with status code 400')

    const error = await captureApiError(apiClient.post('/transactions', {}))

    expect(error.message).toBe('Nicht genügend Cash auf dem Konto')
    expect(error.status).toBe(400)
    expect(error.fieldErrors).toEqual({ quantity: 'muss grösser als 0 sein' })
    expect(error.isNetworkError).toBe(false)
    expect(error.name).toBe('ApiError')
  })

  it('setzt fieldErrors auf null, wenn das Backend keine liefert', async () => {
    const body: BackendErrorBody = {
      timestamp: '2026-08-24T12:00:00Z',
      status: 404,
      error: 'Not Found',
      message: 'Portfolio nicht gefunden',
      fieldErrors: null,
    }
    respondWithStatus(404, body, 'Request failed with status code 404')

    const error = await captureApiError(apiClient.get('/portfolios/999'))

    expect(error.status).toBe(404)
    expect(error.fieldErrors).toBeNull()
  })

  it('fällt auf die axios-Message zurück, wenn die Antwort nicht der Backend-Struktur entspricht', async () => {
    // Tritt auf, wenn ein Reverse Proxy antwortet und HTML statt JSON liefert.
    respondWithStatus(502, '<html>502 Bad Gateway</html>', 'Request failed with status code 502')

    const error = await captureApiError(apiClient.get('/portfolios'))

    expect(error.message).toBe('Request failed with status code 502')
    expect(error.status).toBe(502)
    expect(error.fieldErrors).toBeNull()
  })

  it('meldet ein nicht erreichbares Backend als Netzwerkfehler', async () => {
    installAdapter((config) =>
      Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)),
    )

    const error = await captureApiError(apiClient.get('/portfolios'))

    expect(error.message).toBe('Backend nicht erreichbar')
    expect(error.status).toBe(0)
    expect(error.isNetworkError).toBe(true)
  })

  it('übersetzt auch Fehler, die nicht von axios kommen', async () => {
    installAdapter(() => Promise.reject(new Error('etwas ganz anderes')))

    const error = await captureApiError(apiClient.get('/portfolios'))

    expect(error.message).toBe('etwas ganz anderes')
    expect(error.status).toBe(0)
    expect(error.isNetworkError).toBe(true)
  })

  it('gibt eine erfolgreiche Antwort unverändert durch', async () => {
    installAdapter((config) =>
      Promise.resolve({
        data: [{ id: 1, name: 'Depot' }],
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(),
        config,
      }),
    )

    const response = await apiClient.get<{ id: number; name: string }[]>('/portfolios')

    expect(response.status).toBe(200)
    expect(response.data).toEqual([{ id: 1, name: 'Depot' }])
  })
})
