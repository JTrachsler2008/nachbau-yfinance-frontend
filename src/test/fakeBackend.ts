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
 * `POST /auth/login` liefert `{ token }`, `GET /users/me` liefert `{ username, role }`, `POST /users`
 * ist ohne Token erreichbar und antwortet mit 201 und fester Rolle PRIVATANLEGER.
 *
 * Buchungen sind nachgebaut, nicht nur abgenickt: ein Kauf zieht Cash ab, legt eine Tranche an und
 * fortschreibt die Position, ein Verkauf verbraucht die Tranchen nach FIFO. Sonst würde der Test des
 * Buchungsformulars an einem Server vorbeilaufen, der jede Eingabe bestätigt, und die Meldungen für
 * fehlendes Cash oder fehlenden Kurs blieben ungeprüft.
 */

export interface FakeUser {
  id: number
  username: string
  email: string
  password: string
  role: 'PRIVATANLEGER' | 'MANAGER' | 'ADMIN'
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

/** `SecurityResponseDto`. */
export interface FakeSecurity {
  id: number
  symbol: string
  isin: string
  name: string
  assetType: string
  exchangeCode: string | null
  tradingCurrency: string
  countryCode: string | null
  sector: string | null
  couponRate: number | null
  maturityDate: string | null
}

export interface FakeTransaction {
  id: number
  accountId: number
  securityId: number
  transactionType: string
  quantity: number
  price: number | null
  fee: number | null
  tax: number | null
  splitRatio: number | null
  transactionCurrency: string
  fxRateToPortfolio: number | null
  transactionDate: string
}

export interface FakePosition {
  id: number
  accountId: number
  securityId: number
  totalQuantity: number
  /**
   * Wie im Backend inklusive Gebühren und Steuern, deshalb weicht der Wert vom gewichteten Mittel
   * der Tranchen ab. Der Unterschied ist gewollt und wird im Tranchen-Dialog erklärt.
   */
  averagePurchasePrice: number
}

/** `LotResponseDto`, zusätzlich mit der Position, an der die Tranche hängt. */
export interface FakeLot {
  positionId: number
  quantity: number
  purchasePrice: number
  purchaseDate: string
}

export interface RequestLog {
  method: string
  url: string
  /** Gesetzter Authorization-Header, sonst undefined. */
  authorization: string | undefined
  /** Query-Parameter, die axios erst beim Senden an die URL hängt (etwa `?currency=CHF`). */
  params: Record<string, unknown> | undefined
}

export interface FakeBackend {
  requests: readonly RequestLog[]
  users: readonly FakeUser[]
  /** Veränderlich, damit ein Test den Ausgangsbestand setzen kann (auch auf leer). */
  portfolios: FakePortfolio[]
  accounts: FakeAccount[]
  securities: FakeSecurity[]
  transactions: FakeTransaction[]
  positions: FakePosition[]
  lots: FakeLot[]
  /**
   * Hinterlegte historische Kurse, Schlüssel `securityId|jjjj-mm-tt`. Fehlt der Eintrag, antwortet
   * eine Buchung ohne Preis mit 404, wie der `PriceService` des Backends.
   */
  prices: Map<string, number>
  /**
   * Antworten der Auswertungsendpunkte, Schlüssel `art|portfolioId|waehrung`, etwa
   * `realized-gains|10|CHF`. Fehlt der Eintrag, kommt 0 zurück.
   *
   * Hinterlegt statt gerechnet: die Summen entstehen im Backend aus FIFO über die gesamte Historie
   * und einer Umrechnung über hinterlegte FX-Kurse. Diese Fachlogik hier nachzubauen hiesse, sie zu
   * duplizieren, und der Test würde am Ende die Kopie prüfen statt die Oberfläche.
   */
  analytics: Map<string, number>
  /** Lässt geschützte Endpunkte ab jetzt mit 401 antworten, wie bei abgelaufenem Token. */
  expireSession: () => void
  /**
   * Lässt jeden Pfad, der `urlFragment` enthält, mit `status` antworten.
   *
   * Damit sind die Zweige der globalen Fehlerbehandlung prüfbar: der 403-Sprung auf die
   * Portfolioliste und die Meldung bei einem 500er, deren Backend-Text nicht in der Oberfläche
   * landen darf.
   */
  forceStatus: (urlFragment: string, status: number) => void
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

/** Nicht nach Symbol sortiert, damit ein Test die Sortierung des Endpunkts prüfen kann. */
function defaultSecurities(): FakeSecurity[] {
  return [
    {
      id: 201,
      symbol: 'NESN',
      isin: 'CH0038863350',
      name: 'Nestlé SA',
      assetType: 'STOCK',
      exchangeCode: 'SIX',
      tradingCurrency: 'CHF',
      countryCode: 'CH',
      sector: 'Basiskonsumgüter',
      couponRate: null,
      maturityDate: null,
    },
    {
      id: 200,
      symbol: 'AAPL',
      isin: 'US0378331005',
      name: 'Apple Inc.',
      assetType: 'STOCK',
      exchangeCode: 'NASDAQ',
      tradingCurrency: 'USD',
      countryCode: 'US',
      sector: 'Technologie',
      couponRate: null,
      maturityDate: null,
    },
    {
      id: 202,
      symbol: 'ZURN',
      isin: 'CH0011075394',
      name: 'Zurich Insurance Group AG',
      assetType: 'STOCK',
      exchangeCode: 'SIX',
      tradingCurrency: 'CHF',
      countryCode: 'CH',
      sector: 'Finanzen',
      couponRate: null,
      maturityDate: null,
    },
  ]
}

/**
 * Zwei Käufe auf NESN im CHF-Konto und einer auf AAPL im USD-Konto, alle in Portfolio 10.
 *
 * Absichtlich nicht nach Datum sortiert: der Endpunkt liefert neueste zuerst, und das soll ein Test
 * prüfen können, ohne dass die Reihenfolge schon im Ausgangsbestand stimmt.
 */
function defaultTransactions(): FakeTransaction[] {
  return [
    {
      id: 300,
      accountId: 100,
      securityId: 201,
      transactionType: 'BUY',
      quantity: 10,
      price: 90,
      fee: 9,
      tax: 0,
      splitRatio: null,
      transactionCurrency: 'CHF',
      fxRateToPortfolio: 1,
      transactionDate: '2026-01-15',
    },
    {
      id: 301,
      accountId: 100,
      securityId: 201,
      transactionType: 'BUY',
      quantity: 5,
      price: 96,
      fee: 6,
      tax: 0,
      splitRatio: null,
      transactionCurrency: 'CHF',
      fxRateToPortfolio: 1,
      transactionDate: '2026-03-10',
    },
    {
      id: 302,
      accountId: 101,
      securityId: 200,
      transactionType: 'BUY',
      quantity: 10,
      price: 180,
      fee: 5,
      tax: 0,
      splitRatio: null,
      transactionCurrency: 'USD',
      fxRateToPortfolio: 0.88,
      transactionDate: '2026-02-20',
    },
  ]
}

function defaultPositions(): FakePosition[] {
  // 93 = (10 * 90 + 9 + 5 * 96 + 6) / 15, also mit Gebühren. Die Tranchen ergeben 92.
  return [
    { id: 400, accountId: 100, securityId: 201, totalQuantity: 15, averagePurchasePrice: 93 },
    { id: 401, accountId: 101, securityId: 200, totalQuantity: 10, averagePurchasePrice: 180.5 },
  ]
}

function defaultLots(): FakeLot[] {
  return [
    { positionId: 400, quantity: 10, purchasePrice: 90, purchaseDate: '2026-01-15' },
    { positionId: 400, quantity: 5, purchasePrice: 96, purchaseDate: '2026-03-10' },
    { positionId: 401, quantity: 10, purchasePrice: 180, purchaseDate: '2026-02-20' },
  ]
}

/** Ein einziger hinterlegter Kurs, damit sowohl der Treffer als auch der 404 prüfbar sind. */
function defaultPrices(): Map<string, number> {
  return new Map([['202|2026-06-01', 500]])
}

/**
 * Auswertungen für Portfolio 10 in seiner Basiswährung CHF.
 *
 * Ein Verlust bei den realisierten Gewinnen, damit die rote Färbung der Kennzahlenkarte an echten
 * Daten hängt. Portfolio 11 hat keinen Eintrag und liefert deshalb 0, was zu seinem leeren Bestand
 * passt.
 */
function defaultAnalytics(): Map<string, number> {
  return new Map([
    ['realized-gains|10|CHF', -128.4],
    ['dividends|10|CHF', 214.5],
  ])
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

/**
 * Query-Parameter der Anfrage.
 *
 * axios hängt `params` erst nach dem Adapter an die URL, im Adapter steht das Objekt also noch
 * getrennt daneben und `config.url` ist ohne `?`.
 */
function readParams(config: InternalAxiosRequestConfig): Record<string, unknown> {
  const params: unknown = config.params
  if (params === null || typeof params !== 'object') {
    return {}
  }
  return params as Record<string, unknown>
}

/**
 * Fehlerkörper für einen erzwungenen Status.
 *
 * Der Text des 500ers trägt bewusst technischen Ballast: die Oberfläche darf ihn laut Sicherheits-
 * vorgabe nicht anzeigen, und ein Test kann das nur prüfen, wenn es etwas Erkennbares zu verbergen
 * gibt.
 */
function forcedBody(status: number, url: string): { error: string; message: string } {
  if (status === 403) {
    return { error: 'Forbidden', message: `Access to ${url} is denied` }
  }
  if (status >= 500) {
    return {
      error: 'Internal Server Error',
      message:
        'java.lang.NullPointerException: Cannot invoke "java.math.BigDecimal.add(java.math.BigDecimal)" because "summe" is null',
    }
  }
  return { error: 'Bad Request', message: `Forced status ${status} for ${url}` }
}

/** `AccountResponseDto` kennt kein Feld für das Portfolio, die Zuordnung bleibt intern. */
function toAccountResponse(account: FakeAccount): Omit<FakeAccount, 'portfolioId'> {
  const { portfolioId: _unused, ...response } = account
  return response
}

function nextId(rows: readonly { id: number }[], start: number): number {
  return rows.reduce((highest, row) => Math.max(highest, row.id), start - 1) + 1
}

/** `PortfolioTransactionResponseDto`: die Namen von Konto und Wertpapier sind eingemischt. */
function toTransactionResponse(
  transaction: FakeTransaction,
  accounts: readonly FakeAccount[],
  securities: readonly FakeSecurity[],
) {
  const account = accounts.find((candidate) => candidate.id === transaction.accountId)
  const security = securities.find((candidate) => candidate.id === transaction.securityId)
  return {
    ...transaction,
    accountName: account?.name ?? '',
    symbol: security?.symbol ?? '',
    securityName: security?.name ?? '',
  }
}

/** `PortfolioPositionResponseDto`: ohne aktuellen Kurs, Marktwert und Gewinn. */
function toPositionResponse(
  position: FakePosition,
  accounts: readonly FakeAccount[],
  securities: readonly FakeSecurity[],
) {
  const account = accounts.find((candidate) => candidate.id === position.accountId)
  const security = securities.find((candidate) => candidate.id === position.securityId)
  return {
    ...position,
    accountName: account?.name ?? '',
    symbol: security?.symbol ?? '',
    securityName: security?.name ?? '',
    tradingCurrency: security?.tradingCurrency ?? '',
    sector: security?.sector ?? null,
    countryCode: security?.countryCode ?? null,
  }
}

/**
 * Liest ein optionales Zahlenfeld des Buchungs-Body.
 *
 * Weggelassen und `null` sind für das Backend dasselbe "nicht angegeben", und beides darf nicht zu 0
 * werden: eine Gebühr von 0 ist eine Aussage, eine fehlende Gebühr keine.
 */
function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Neueste zuerst, bei gleichem Datum die höhere ID, wie der Comparator im `TransactionController`. */
function neuesteZuerst(left: FakeTransaction, right: FakeTransaction): number {
  if (left.transactionDate === right.transactionDate) {
    return right.id - left.id
  }
  return left.transactionDate < right.transactionDate ? 1 : -1
}

export function installFakeBackend(): FakeBackend {
  const users: FakeUser[] = [{ id: 1, ...demoUser, role: 'PRIVATANLEGER' }]
  const portfolios = defaultPortfolios()
  const accounts = defaultAccounts()
  const securities = defaultSecurities()
  const transactions = defaultTransactions()
  const positions = defaultPositions()
  const lots = defaultLots()
  const prices = defaultPrices()
  const analytics = defaultAnalytics()
  const requests: RequestLog[] = []
  const forcedStatuses = new Map<string, number>()
  let sessionValid = true

  /** FIFO: älteste Tranche zuerst, eine teilweise verbrauchte bleibt mit ihrer Restmenge stehen. */
  function verbraucheTranchen(positionId: number, quantity: number): void {
    let offen = quantity
    const eigene = lots
      .filter((lot) => lot.positionId === positionId)
      .sort((left, right) => left.purchaseDate.localeCompare(right.purchaseDate))
    for (const lot of eigene) {
      if (offen <= 0) {
        break
      }
      const genommen = Math.min(lot.quantity, offen)
      lot.quantity -= genommen
      offen -= genommen
    }
    for (let index = lots.length - 1; index >= 0; index -= 1) {
      if (lots[index].positionId === positionId && lots[index].quantity === 0) {
        lots.splice(index, 1)
      }
    }
  }

  /**
   * Bucht eine Transaktion so weit nach, wie die Oberfläche es merkt.
   *
   * Ohne Währungsumrechnung: das echte Backend rechnet Fremdwährungsbeträge mit dem Tageskurs auf die
   * Kontowährung um. Für die Tests zählt, dass Cash, Bestand und Tranchen sich bewegen und dass die
   * beiden Fehlerfälle (kein Cash, kein hinterlegter Kurs) mit demselben Status antworten wie das
   * Original, denn genau daran hängen die Meldungen im Formular.
   */
  function book(
    accountId: number,
    body: Record<string, unknown>,
    config: InternalAxiosRequestConfig,
  ): Promise<AxiosResponse<unknown>> {
    const account = accounts.find((candidate) => candidate.id === accountId)
    if (account === undefined) {
      return fail(404, 'Not Found', `Account ${accountId} not found`, config)
    }
    const securityId = Number(body.securityId)
    const security = securities.find((candidate) => candidate.id === securityId)
    if (security === undefined) {
      return fail(404, 'Not Found', `Security ${securityId} not found`, config)
    }

    const type = String(body.transactionType)
    const quantity = Number(body.quantity ?? 0)
    const date = String(body.transactionDate)
    const fee = optionalNumber(body.fee)
    const tax = optionalNumber(body.tax)
    const splitRatio = optionalNumber(body.splitRatio)

    let price = optionalNumber(body.price)
    if (price === null && type !== 'SPLIT') {
      const hinterlegt = prices.get(`${securityId}|${date}`)
      if (hinterlegt === undefined) {
        return fail(404, 'Not Found', `No price found for security ${securityId} on ${date}`, config)
      }
      price = hinterlegt
    }
    // Nur ein Split kommt ohne Preis hierher, und sein Zweig rechnet nicht mit `kurs`.
    const kurs = price ?? 0
    const nebenkosten = (fee ?? 0) + (tax ?? 0)

    const position = positions.find(
      (candidate) => candidate.accountId === accountId && candidate.securityId === securityId,
    )

    if (type === 'BUY') {
      const kosten = kurs * quantity + nebenkosten
      if (account.cashAmount < kosten) {
        return fail(
          400,
          'Bad Request',
          `Account ${accountId} has insufficient cash for a BUY of ${kosten}`,
          config,
        )
      }
      account.cashAmount -= kosten
      if (position === undefined) {
        const angelegt: FakePosition = {
          id: nextId(positions, 400),
          accountId,
          securityId,
          totalQuantity: quantity,
          averagePurchasePrice: kosten / quantity,
        }
        positions.push(angelegt)
        lots.push({ positionId: angelegt.id, quantity, purchasePrice: kurs, purchaseDate: date })
      } else {
        const einstand = position.averagePurchasePrice * position.totalQuantity + kosten
        position.totalQuantity += quantity
        position.averagePurchasePrice = einstand / position.totalQuantity
        lots.push({ positionId: position.id, quantity, purchasePrice: kurs, purchaseDate: date })
      }
    } else if (type === 'SELL') {
      if (position === undefined || position.totalQuantity < quantity) {
        return fail(
          400,
          'Bad Request',
          `Account ${accountId} has insufficient shares for a SELL of ${quantity}`,
          config,
        )
      }
      account.cashAmount += kurs * quantity - nebenkosten
      position.totalQuantity -= quantity
      verbraucheTranchen(position.id, quantity)
      if (position.totalQuantity === 0) {
        positions.splice(positions.indexOf(position), 1)
      }
    } else if (type === 'DIVIDEND') {
      account.cashAmount += kurs * quantity
    } else if (type === 'SPLIT') {
      if (position === undefined || splitRatio === null || splitRatio <= 0) {
        return fail(400, 'Bad Request', `Split for security ${securityId} cannot be applied`, config)
      }
      position.totalQuantity *= splitRatio
      position.averagePurchasePrice /= splitRatio
      for (const lot of lots) {
        if (lot.positionId === position.id) {
          lot.quantity *= splitRatio
          lot.purchasePrice /= splitRatio
        }
      }
    }

    const created: FakeTransaction = {
      id: nextId(transactions, 300),
      accountId,
      securityId,
      transactionType: type,
      quantity,
      price,
      fee,
      tax,
      splitRatio,
      transactionCurrency: String(body.transactionCurrency),
      fxRateToPortfolio: 1,
      transactionDate: date,
    }
    transactions.push(created)
    // `TransactionResponseDto` ist kürzer als die Zeile der Historie, deshalb nicht das ganze Objekt.
    return Promise.resolve(
      ok(
        {
          id: created.id,
          securityId: created.securityId,
          transactionType: created.transactionType,
          quantity: created.quantity,
          price: created.price,
          transactionDate: created.transactionDate,
        },
        201,
        config,
      ),
    )
  }

  apiClient.defaults.adapter = (config) => {
    const method = (config.method ?? 'get').toUpperCase()
    const url = config.url ?? ''
    const rawAuthorization = config.headers.Authorization
    const authorization = typeof rawAuthorization === 'string' ? rawAuthorization : undefined
    const params = config.params === undefined ? undefined : readParams(config)
    requests.push({ method, url, authorization, params })

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
        role: 'PRIVATANLEGER',
      }
      users.push(created)
      return Promise.resolve(
        ok(
          {
            id: created.id,
            username: created.username,
            email: created.email,
            role: created.role,
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

    // Nach der Anmeldeprüfung, wie in einer Filterkette: ein abgelaufenes Token bleibt ein 401, auch
    // wenn für den Pfad ein anderer Status gesetzt ist.
    for (const [fragment, status] of forcedStatuses) {
      if (url.includes(fragment)) {
        const body = forcedBody(status, url)
        return fail(status, body.error, body.message, config)
      }
    }

    if (method === 'GET' && url === '/users/me') {
      // Ein unbekannter Name kann nur aus einem selbst gebauten Token stammen, den es hier nicht gibt.
      const angemeldet = users.find((candidate) => candidate.username === username)
      return Promise.resolve(
        ok({ username, role: angemeldet?.role ?? 'PRIVATANLEGER' }, 200, config),
      )
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

    if (method === 'GET' && url === '/securities') {
      const sortiert = [...securities].sort((left, right) => left.symbol.localeCompare(right.symbol))
      return Promise.resolve(ok(sortiert, 200, config))
    }

    const historyMatch = /^\/portfolios\/(\d+)\/transactions$/.exec(url)
    if (historyMatch !== null && method === 'GET') {
      const portfolioId = Number(historyMatch[1])
      if (!portfolios.some((portfolio) => portfolio.id === portfolioId)) {
        return fail(404, 'Not Found', `Portfolio ${portfolioId} not found`, config)
      }
      const eigene = accounts.filter((account) => account.portfolioId === portfolioId)
      const rows = transactions
        .filter((transaction) => eigene.some((account) => account.id === transaction.accountId))
        .sort(neuesteZuerst)
        .map((transaction) => toTransactionResponse(transaction, accounts, securities))
      return Promise.resolve(ok(rows, 200, config))
    }

    const positionsMatch = /^\/portfolios\/(\d+)\/positions$/.exec(url)
    if (positionsMatch !== null && method === 'GET') {
      const portfolioId = Number(positionsMatch[1])
      if (!portfolios.some((portfolio) => portfolio.id === portfolioId)) {
        return fail(404, 'Not Found', `Portfolio ${portfolioId} not found`, config)
      }
      const eigene = accounts.filter((account) => account.portfolioId === portfolioId)
      const rows = positions
        .filter((position) => eigene.some((account) => account.id === position.accountId))
        .map((position) => toPositionResponse(position, accounts, securities))
        .sort((left, right) => left.symbol.localeCompare(right.symbol))
      return Promise.resolve(ok(rows, 200, config))
    }

    const analyticsMatch = /^\/portfolios\/(\d+)\/(realized-gains|dividends)$/.exec(url)
    if (analyticsMatch !== null && method === 'GET') {
      const portfolioId = Number(analyticsMatch[1])
      const art = analyticsMatch[2]
      if (!portfolios.some((portfolio) => portfolio.id === portfolioId)) {
        return fail(404, 'Not Found', `Portfolio ${portfolioId} not found`, config)
      }
      const currency = readParams(config).currency
      if (typeof currency !== 'string' || currency === '') {
        // Wortlaut der MissingServletRequestParameterException: der Parameter ist im Backend
        // Pflicht, ein Aufruf ohne ihn muss also auffallen und nicht stillschweigend gelingen.
        return fail(
          400,
          'Bad Request',
          "Required request parameter 'currency' for method parameter type String is not present",
          config,
        )
      }
      const amount = analytics.get(`${art}|${portfolioId}|${currency}`) ?? 0
      return Promise.resolve(ok({ amount, currency }, 200, config))
    }

    const lotsMatch = /^\/accounts\/(\d+)\/positions\/(\d+)\/lots$/.exec(url)
    if (lotsMatch !== null && method === 'GET') {
      const accountId = Number(lotsMatch[1])
      const securityId = Number(lotsMatch[2])
      const position = positions.find(
        (candidate) => candidate.accountId === accountId && candidate.securityId === securityId,
      )
      if (position === undefined) {
        return fail(404, 'Not Found', `Position for security ${securityId} not found`, config)
      }
      const rows = lots
        .filter((lot) => lot.positionId === position.id)
        // Kaufdatum aufsteigend, das ist die Reihenfolge, in der FIFO sie verbraucht.
        .sort((left, right) => left.purchaseDate.localeCompare(right.purchaseDate))
        .map(({ positionId: _unused, ...lot }) => lot)
      return Promise.resolve(ok(rows, 200, config))
    }

    const bookMatch = /^\/accounts\/(\d+)\/transactions$/.exec(url)
    if (bookMatch !== null && method === 'POST') {
      return book(Number(bookMatch[1]), readBody(config), config)
    }

    // Alle weiteren geschützten Pfade antworten leer. Reicht, um eine Folgeanfrage abzusetzen.
    return Promise.resolve(ok(null, 200, config))
  }

  return {
    requests,
    users,
    portfolios,
    accounts,
    securities,
    transactions,
    positions,
    lots,
    prices,
    analytics,
    expireSession: () => {
      sessionValid = false
    },
    forceStatus: (urlFragment, status) => {
      forcedStatuses.set(urlFragment, status)
    },
    restore: () => {
      apiClient.defaults.adapter = originalAdapter
    },
  }
}
