/**
 * Anzeigeformate für Zahlen, Beträge und Daten.
 *
 * Zentral statt pro Seite, weil das Original seine Formatierung in jeder Datei neu aufgebaut hat
 * (`toFixed(2)`, `toLocaleString('de-CH')` und rohe Ausgaben gemischt). Gebietsschema ist `de-CH`
 * wie im Original, Sprache der Anwendung ist Deutsch (UI/UX-Plan, offener Punkt i18n).
 *
 * Beträge kommen als JSON-Zahl aus Jacksons BigDecimal-Serialisierung. `string` wird trotzdem
 * akzeptiert, damit ein Backend mit `WRITE_BIGDECIMAL_AS_PLAIN` nicht die ganze Anzeige kippt.
 */

const locale = 'de-CH'

/** Was das Backend als Betrag liefern kann, plus die Lücken, die es bei fehlenden Kursen lässt. */
export type Numeric = number | string | null | undefined

/** Platzhalter für Werte, die das Backend nicht liefern konnte (etwa fehlende Kursdaten). */
export const missingValue = '–'

function toNumber(value: Numeric): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const decimalFormats = new Map<string, Intl.NumberFormat>()

function decimalFormat(minimum: number, maximum: number, signDisplay: 'auto' | 'always'): Intl.NumberFormat {
  const key = `${minimum}-${maximum}-${signDisplay}`
  let format = decimalFormats.get(key)
  if (format === undefined) {
    format = new Intl.NumberFormat(locale, {
      minimumFractionDigits: minimum,
      maximumFractionDigits: maximum,
      signDisplay,
    })
    decimalFormats.set(key, format)
  }
  return format
}

/** Betrag mit zwei Nachkommastellen, ohne Währung. */
export function formatAmount(value: Numeric): string {
  const parsed = toNumber(value)
  return parsed === null ? missingValue : decimalFormat(2, 2, 'auto').format(parsed)
}

/**
 * Betrag mit Währungscode davor, etwa "CHF 12'450.00".
 *
 * Bewusst der Code und nicht das Symbol: das Portfolio kann mehrere Währungen enthalten, und "$"
 * wäre zwischen USD und anderen Dollar-Währungen nicht eindeutig.
 */
export function formatMoney(value: Numeric, currency: string | null | undefined): string {
  const amount = formatAmount(value)
  if (amount === missingValue) {
    return missingValue
  }
  return currency === null || currency === undefined || currency === ''
    ? amount
    : `${currency} ${amount}`
}

/**
 * Stückzahl. Bis zu vier Nachkommastellen, aber keine unnötigen Nullen: Aktien werden ganzzahlig
 * gehandelt, Fondsanteile und Sparplan-Bruchteile nicht.
 */
export function formatQuantity(value: Numeric): string {
  const parsed = toNumber(value)
  return parsed === null ? missingValue : decimalFormat(0, 4, 'auto').format(parsed)
}

/**
 * Prozentwert. Erwartet den Wert bereits in Prozent (5.2 für 5.2 %), nicht als Anteil, weil das
 * Backend Renditen so liefert.
 */
export function formatPercent(value: Numeric, options: { withSign?: boolean } = {}): string {
  const parsed = toNumber(value)
  if (parsed === null) {
    return missingValue
  }
  const signDisplay = options.withSign === true ? 'always' : 'auto'
  return `${decimalFormat(1, 2, signDisplay).format(parsed)} %`
}

/** ISO-Datum (`2026-08-25`) als `25.08.2026`. */
export function formatDate(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return missingValue
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (match === null) {
    return value
  }
  return `${match[3]}.${match[2]}.${match[1]}`
}

/**
 * ISO-Datum (`2026-08-01`) als `08.2026`.
 *
 * Für Verlaufsreihen auf Monatsraster: dort ist der Tag im Datum eine technische Beigabe des
 * Backends (immer der Erste des Monats) und würde in der Achsenbeschriftung nur Platz kosten.
 */
export function formatMonth(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return missingValue
  }
  const match = /^(\d{4})-(\d{2})/.exec(value)
  if (match === null) {
    return value
  }
  return `${match[2]}.${match[1]}`
}

/**
 * Liest eine Benutzereingabe als Zahl.
 *
 * Nötig, weil `number`-Eingabefelder in Formularen mehr Probleme bringen als sie lösen (Mausrad
 * verändert Werte, Gebietsschema entscheidet über den Dezimaltrenner). Akzeptiert wird sowohl Punkt
 * als auch Komma als Dezimaltrenner sowie Apostroph oder Leerzeichen als Tausendertrennung, weil
 * genau das die Schweizer Anzeige ist, die der Benutzer vor sich sieht.
 *
 * Gibt `null` bei allem, was keine Zahl ist. Ein stilles 0 wäre gefährlich: aus einer verunglückten
 * Eingabe würde eine Buchung über 0 statt einer Fehlermeldung.
 */
export function parseAmount(text: string): number | null {
  const normalized = text.replace(/['\s’ ]/g, '').replace(',', '.')
  if (normalized === '' || !/^[+-]?\d*\.?\d*$/.test(normalized)) {
    return null
  }
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Vorzeichen eines Wertes für die Farbwahl. Getrennt von der Formatierung, weil die Farbe aus dem
 * Theme kommt und nicht aus dem Formatierungscode.
 */
export function signOf(value: Numeric): 'positive' | 'negative' | 'neutral' {
  const parsed = toNumber(value)
  if (parsed === null || parsed === 0) {
    return 'neutral'
  }
  return parsed > 0 ? 'positive' : 'negative'
}
