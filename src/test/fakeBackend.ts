import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { apiClient, loginPath, type BackendErrorBody } from '../api/client'

/**
 * Nachbau des Backends auf Ebene des axios-Adapters.
 *
 * Getestet wird damit der echte `apiClient` samt seiner Interceptoren, statt `authApi` durch Mocks
 * zu ersetzen. Nur so fällt ein Fehler in der Verdrahtung von Token-Header und 401-Haken auf.
 *
 * Die Antworten folgen den Formen, die per curl gegen das laufende Backend geprüft wurden:
 * `POST /auth/login` liefert `{ token }`, `GET /users/me` nur `{ username }`, `POST /users` ist ohne
 * Token erreichbar und antwortet mit 201 und fester Rolle PRIVATANLEGER.
 */

export interface FakeUser {
  id: number
  username: string
  email: string
  password: string
}

export interface RequestLog {
  method: string
  url: string
  /** Gesetzter Authorization-Header, sonst undefined. */
  authorization: string | undefined
}

export interface FakeBackend {
  requests: readonly RequestLog[]
  users: readonly FakeUser[]
  /** Lässt geschützte Endpunkte ab jetzt mit 401 antworten, wie bei abgelaufenem Token. */
  expireSession: () => void
  /** Setzt den ursprünglichen Adapter zurück. Gehört in ein afterEach. */
  restore: () => void
}

export const demoUser = {
  username: 'demo',
  email: 'demo@example.test',
  password: 'demo1234',
} as const

const originalAdapter = apiClient.defaults.adapter

function ok<T>(data: T, status: number, config: InternalAxiosRequestConfig): AxiosResponse<T> {
  return { data, status, statusText: 'OK', headers: new AxiosHeaders(), config }
}

/** Wirft so, wie es der echte axios-Adapter bei einem Fehlerstatus tut. */
function fail(
  status: number,
  error: string,
  message: string,
  config: InternalAxiosRequestConfig,
): Promise<never> {
  const body: BackendErrorBody = {
    timestamp: '2026-08-25T10:00:00Z',
    status,
    error,
    message,
    fieldErrors: null,
  }
  return Promise.reject(
    new AxiosError(
      `Request failed with status code ${status}`,
      AxiosError.ERR_BAD_RESPONSE,
      config,
      null,
      {
        data: body,
        status,
        statusText: error,
        headers: new AxiosHeaders(),
        config,
      },
    ),
  )
}

/** Das Token trägt den Benutzernamen, damit `GET /users/me` ohne Sitzungsverwaltung antworten kann. */
function tokenFor(username: string): string {
  return `test-token.${username}`
}

function usernameFromHeader(authorization: string | undefined): string | null {
  if (authorization === undefined || !authorization.startsWith('Bearer test-token.')) {
    return null
  }
  return authorization.slice('Bearer test-token.'.length)
}

function readBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  // axios serialisiert den Body vor dem Adapter zu JSON, hier also der Rückweg.
  if (typeof config.data !== 'string') {
    return {}
  }
  return JSON.parse(config.data) as Record<string, unknown>
}

export function installFakeBackend(): FakeBackend {
  const users: FakeUser[] = [{ id: 1, ...demoUser }]
  const requests: RequestLog[] = []
  let sessionValid = true

  apiClient.defaults.adapter = (config) => {
    const method = (config.method ?? 'get').toUpperCase()
    const url = config.url ?? ''
    const rawAuthorization = config.headers.Authorization
    const authorization = typeof rawAuthorization === 'string' ? rawAuthorization : undefined
    requests.push({ method, url, authorization })

    if (method === 'POST' && url === loginPath) {
      const { username, password } = readBody(config)
      const found = users.find(
        (candidate) => candidate.username === username && candidate.password === password,
      )
      if (found === undefined) {
        return fail(401, 'Unauthorized', 'Bad credentials', config)
      }
      return Promise.resolve(ok({ token: tokenFor(found.username) }, 200, config))
    }

    if (method === 'POST' && url === '/users') {
      const body = readBody(config)
      const username = String(body.username)
      if (users.some((candidate) => candidate.username === username)) {
        return fail(409, 'Conflict', `Username '${username}' is already taken`, config)
      }
      const created: FakeUser = {
        id: users.length + 1,
        username,
        email: String(body.email),
        password: String(body.password),
      }
      users.push(created)
      return Promise.resolve(
        ok(
          {
            id: created.id,
            username: created.username,
            email: created.email,
            role: 'PRIVATANLEGER',
            createdAt: '2026-08-25T10:00:00Z',
          },
          201,
          config,
        ),
      )
    }

    const username = usernameFromHeader(authorization)
    if (username === null || !sessionValid) {
      return fail(401, 'Unauthorized', 'Full authentication is required', config)
    }

    if (method === 'GET' && url === '/users/me') {
      return Promise.resolve(ok({ username }, 200, config))
    }

    // Alle weiteren geschützten Pfade antworten leer. Reicht, um eine Folgeanfrage abzusetzen.
    return Promise.resolve(ok(null, 200, config))
  }

  return {
    requests,
    users,
    expireSession: () => {
      sessionValid = false
    },
    restore: () => {
      apiClient.defaults.adapter = originalAdapter
    },
  }
}
