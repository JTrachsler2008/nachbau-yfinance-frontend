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

export interface FakePortfolio {
  id: number
  name: string
  baseCurrency: string
  description: string | null
  managerUserId: number | null
  managerUsername: string | null
  createdAt: string
  updatedAt: string
}

export interface FakeAccount {
  id: number
  portfolioId: number
  name: string
  currency: string
  cashAmount: number
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
  /** Veränderlich, damit ein Test den Ausgangsbestand setzen kann (auch auf leer). */
  portfolios: FakePortfolio[]
  accounts: FakeAccount[]
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

const timestamp = '2026-08-25T10:00:00Z'

/**
 * Ausgangsbestand. Als Funktion, damit jeder Test seine eigenen Objekte bekommt und Mutationen aus
 * einem Test nicht in den nächsten lecken.
 */
function defaultPortfolios(): FakePortfolio[] {
  return [
    {
      id: 10,
      name: 'Hauptdepot',
      baseCurrency: 'CHF',
      description: 'Langfristige Anlagen',
      managerUserId: null,
      managerUsername: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 11,
      name: 'Zweitdepot',
      baseCurrency: 'EUR',
      description: null,
      managerUserId: null,
      managerUsername: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ]
}

function defaultAccounts(): FakeAccount[] {
  return [
    { id: 100, portfolioId: 10, name: 'Cash CHF', currency: 'CHF', cashAmount: 12450.5 },
    { id: 101, portfolioId: 10, name: 'Cash USD', currency: 'USD', cashAmount: 800 },
    { id: 102, portfolioId: 11, name: 'Cash EUR', currency: 'EUR', cashAmount: 0 },
  ]
}

const originalAdapter = apiClient.defaults.adapter

function ok<T>(data: T, status: number, config: InternalAxiosRequestConfig): AxiosResponse<T> {
  // Die JSON-Runde ist keine Zierde: der interne Bestand wird an Ort und Stelle verändert, und ohne
  // Kopie käme bei jeder Abfrage dieselbe Objektreferenz zurück. React Query hält Daten dann für
  // unverändert und rendert nicht neu, ein echter Server liefert dagegen jedes Mal frische Objekte.
  const body = data === undefined ? data : (JSON.parse(JSON.stringify(data)) as T)
  return { data: body, status, statusText: 'OK', headers: new AxiosHeaders(), config }
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

/** `AccountResponseDto` kennt kein Feld für das Portfolio, die Zuordnung bleibt intern. */
function toAccountResponse(account: FakeAccount): Omit<FakeAccount, 'portfolioId'> {
  const { portfolioId: _unused, ...response } = account
  return response
}

function nextId(rows: readonly { id: number }[], start: number): number {
  return rows.reduce((highest, row) => Math.max(highest, row.id), start - 1) + 1
}

export function installFakeBackend(): FakeBackend {
  const users: FakeUser[] = [{ id: 1, ...demoUser }]
  const portfolios = defaultPortfolios()
  const accounts = defaultAccounts()
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

    if (url === '/portfolios') {
      if (method === 'GET') {
        return Promise.resolve(ok(portfolios, 200, config))
      }
      if (method === 'POST') {
        const body = readBody(config)
        const created: FakePortfolio = {
          id: nextId(portfolios, 10),
          name: String(body.name),
          baseCurrency: String(body.baseCurrency),
          description: body.description === null ? null : String(body.description),
          managerUserId: null,
          managerUsername: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
        portfolios.push(created)
        return Promise.resolve(ok(created, 201, config))
      }
    }

    const portfolioMatch = /^\/portfolios\/(\d+)$/.exec(url)
    if (portfolioMatch !== null) {
      const id = Number(portfolioMatch[1])
      const index = portfolios.findIndex((portfolio) => portfolio.id === id)
      if (index === -1) {
        return fail(404, 'Not Found', `Portfolio ${id} not found`, config)
      }
      if (method === 'PATCH') {
        const body = readBody(config)
        const updated = { ...portfolios[index], ...body, updatedAt: timestamp } as FakePortfolio
        portfolios[index] = updated
        return Promise.resolve(ok(updated, 200, config))
      }
      if (method === 'DELETE') {
        portfolios.splice(index, 1)
        for (let position = accounts.length - 1; position >= 0; position -= 1) {
          if (accounts[position].portfolioId === id) {
            accounts.splice(position, 1)
          }
        }
        return Promise.resolve(ok(null, 204, config))
      }
    }

    const accountsMatch = /^\/portfolios\/(\d+)\/accounts$/.exec(url)
    if (accountsMatch !== null) {
      const portfolioId = Number(accountsMatch[1])
      if (!portfolios.some((portfolio) => portfolio.id === portfolioId)) {
        return fail(404, 'Not Found', `Portfolio ${portfolioId} not found`, config)
      }
      const owned = accounts.filter((account) => account.portfolioId === portfolioId)
      if (method === 'GET') {
        return Promise.resolve(ok(owned.map(toAccountResponse), 200, config))
      }
      if (method === 'POST') {
        const body = readBody(config)
        const created: FakeAccount = {
          id: nextId(accounts, 100),
          portfolioId,
          name: String(body.name),
          currency: String(body.currency),
          cashAmount: 0,
        }
        accounts.push(created)
        return Promise.resolve(ok(toAccountResponse(created), 201, config))
      }
    }

    const cashMatch = /^\/accounts\/(\d+)\/(deposit|withdraw)$/.exec(url)
    if (cashMatch !== null && method === 'POST') {
      const id = Number(cashMatch[1])
      const direction = cashMatch[2]
      const account = accounts.find((candidate) => candidate.id === id)
      if (account === undefined) {
        return fail(404, 'Not Found', `Account ${id} not found`, config)
      }
      const amount = Number(readBody(config).amount)
      if (!Number.isFinite(amount) || amount <= 0) {
        return fail(400, 'Bad Request', 'amount must be greater than 0', config)
      }
      if (direction === 'withdraw') {
        if (account.cashAmount < amount) {
          // Wortlaut der InsufficientFundsException des Backends, damit der Test die echte Meldung
          // sieht und nicht eine erfundene.
          return fail(
            400,
            'Bad Request',
            `Account ${id} has insufficient funds for a withdrawal of ${amount}`,
            config,
          )
        }
        account.cashAmount -= amount
      } else {
        account.cashAmount += amount
      }
      return Promise.resolve(ok(toAccountResponse(account), 200, config))
    }

    // Alle weiteren geschützten Pfade antworten leer. Reicht, um eine Folgeanfrage abzusetzen.
    return Promise.resolve(ok(null, 200, config))
  }

  return {
    requests,
    users,
    portfolios,
    accounts,
    expireSession: () => {
      sessionValid = false
    },
    restore: () => {
      apiClient.defaults.adapter = originalAdapter
    },
  }
}
