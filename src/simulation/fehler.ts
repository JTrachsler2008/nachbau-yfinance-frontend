import { ApiError } from '../api/client'

/**
 * Übersetzt die fachlichen Fehler der Simulationsendpunkte.
 *
 * Die drei Endpunkte antworten auf fehlende Kursdaten und unmögliche Parameter mit 400 und einem
 * englischen Satz aus `InvalidSimulationParameterException`. Der Wortlaut gehört nicht in die
 * Oberfläche, die Aussage schon: sie sagt dem Benutzer, dass er ein anderes Symbol oder Datum
 * probieren muss, statt ihn einen technischen Fehler vermuten zu lassen.
 *
 * Erkannt wird am Text, weil das Backend keine Fehlerkennungen mitliefert. Deshalb steht am Ende ein
 * allgemeiner Satz, der auch für einen künftigen, hier noch unbekannten 400er stimmt.
 *
 * Gibt `null` für alles, was kein fachlicher 400er ist. Netzwerkfehler und 5xx gehören in die
 * gewöhnliche Fehlerdarstellung, denn dort kann der Benutzer an seinen Eingaben nichts ändern.
 */
export function simulationsMeldung(error: unknown, symbol: string): string | null {
  if (!(error instanceof ApiError) || error.status !== 400) {
    return null
  }

  const original = error.message
  if (original.includes('No live quote available')) {
    return `Für ${symbol} gibt es keinen aktuellen Kurs. Bitte ein anderes Symbol versuchen.`
  }
  if (original.includes('No historical prices available')) {
    return `Für ${symbol} sind keine historischen Kurse verfügbar. Bitte ein anderes Symbol oder ein späteres Kaufdatum versuchen.`
  }
  if (original.includes('purchaseDate must be in the past')) {
    return 'Das Kaufdatum muss in der Vergangenheit liegen.'
  }
  if (original.includes('startDate must not be more than')) {
    return 'Der Start darf höchstens 40 Jahre zurückliegen.'
  }
  if (original.includes('positions')) {
    return 'Die Positionsliste hat das Backend nicht akzeptiert. Bitte Symbole und Gewichte prüfen.'
  }
  return 'Mit diesen Parametern lässt sich die Simulation nicht rechnen. Bitte Eingaben prüfen.'
}
