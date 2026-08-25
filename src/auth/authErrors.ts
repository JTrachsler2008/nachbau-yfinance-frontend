import { ApiError } from '../api/client'

export interface FormError {
  /** Text für das Banner über dem Formular. */
  message: string
  /** Feldbezogene Meldungen, Schlüssel ist der Feldname des Backends. */
  fieldErrors: Readonly<Record<string, string>>
}

/**
 * Übersetzt einen `ApiError` in etwas Anzeigbares.
 *
 * Nötig, weil das Backend seine Fehlertexte auf Englisch formuliert ("Username 'x' is already
 * taken") und weil 401 beim Login fachlich "falsche Zugangsdaten" heisst, nicht "Sitzung
 * abgelaufen". Für Status ohne eigene Übersetzung wird die Message des Backends durchgereicht,
 * damit fachliche Fehler nicht hinter einem Sammeltext verschwinden.
 */
export function describeApiError(
  error: unknown,
  translations: Partial<Record<number, string>> = {},
): FormError {
  if (!(error instanceof ApiError)) {
    return { message: 'Unerwarteter Fehler', fieldErrors: {} }
  }

  const translated = translations[error.status]
  return {
    message: translated ?? error.message,
    fieldErrors: error.fieldErrors ?? {},
  }
}
