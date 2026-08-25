import { ApiError } from './client'

export interface FormError {
  /** Text für das Banner über dem Formular. */
  message: string
  /** Feldbezogene Meldungen, Schlüssel ist der Feldname des Backends. */
  fieldErrors: Readonly<Record<string, string>>
}

/**
 * Text für einen Serverfehler.
 *
 * Bei 5xx wird die Meldung des Backends verworfen: darin kann ein Klassenname oder ein Auszug eines
 * Stacktrace stehen, und der gehört nicht in die Oberfläche (Architektur-Plan, SEC-5). Fachliche
 * Fehler (4xx) bleiben im Wortlaut sichtbar, dort ist der Text die eigentliche Auskunft.
 */
export const serverErrorMessage = 'Serverfehler. Bitte später erneut versuchen.'

/**
 * Übersetzt einen `ApiError` in etwas Anzeigbares.
 *
 * Nötig, weil das Backend seine Fehlertexte auf Englisch formuliert ("Username 'x' is already
 * taken") und weil 401 beim Login fachlich "falsche Zugangsdaten" heisst, nicht "Sitzung
 * abgelaufen". Für Status ohne eigene Übersetzung wird die Message des Backends durchgereicht,
 * damit fachliche Fehler nicht hinter einem Sammeltext verschwinden. Einzige Ausnahme ist 5xx,
 * siehe `serverErrorMessage`.
 */
export function describeApiError(
  error: unknown,
  translations: Partial<Record<number, string>> = {},
): FormError {
  if (!(error instanceof ApiError)) {
    return { message: 'Unerwarteter Fehler', fieldErrors: {} }
  }

  const fieldErrors = error.fieldErrors ?? {}
  const translated = translations[error.status]
  if (translated !== undefined) {
    return { message: translated, fieldErrors }
  }
  return {
    message: error.status >= 500 ? serverErrorMessage : error.message,
    fieldErrors,
  }
}
