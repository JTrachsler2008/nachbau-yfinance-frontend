import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { simulationsMeldung } from './fehler'

/**
 * Übersetzung der fachlichen 400er der Simulationsendpunkte (YOUNGOITV-454 bis YOUNGOITV-456).
 *
 * Geprüft wird beides: dass der englische Wortlaut des Backends nicht in der Oberfläche landet, und
 * dass die Funktion `null` für alles gibt, was der Benutzer nicht selbst richten kann. Ein 500er oder
 * ein Netzwerkfehler gehört in die gewöhnliche Fehlerdarstellung mit Wiederholen-Knopf, nicht in
 * einen Hinweis "Bitte Eingaben prüfen".
 */

describe('simulationsMeldung', () => {
  it('erklärt einen fehlenden Livekurs mit dem Symbol des Benutzers', () => {
    const fehler = new ApiError('No live quote available for XYZ', 400)

    expect(simulationsMeldung(fehler, 'XYZ')).toBe(
      'Für XYZ gibt es keinen aktuellen Kurs. Bitte ein anderes Symbol versuchen.',
    )
  })

  it('erklärt fehlende historische Kurse und nennt das Kaufdatum als Ausweg', () => {
    const fehler = new ApiError('No historical prices available for XYZ', 400)

    expect(simulationsMeldung(fehler, 'XYZ')).toBe(
      'Für XYZ sind keine historischen Kurse verfügbar. Bitte ein anderes Symbol oder ein späteres Kaufdatum versuchen.',
    )
  })

  it('übersetzt ein Kaufdatum in der Zukunft', () => {
    expect(simulationsMeldung(new ApiError('purchaseDate must be in the past', 400), 'AAPL')).toBe(
      'Das Kaufdatum muss in der Vergangenheit liegen.',
    )
  })

  it('übersetzt einen zu weit zurückliegenden Start', () => {
    const fehler = new ApiError('startDate must not be more than 40 years in the past', 400)

    expect(simulationsMeldung(fehler, 'diesen Sparplan')).toBe(
      'Der Start darf höchstens 40 Jahre zurückliegen.',
    )
  })

  it('fasst die Meldungen zur Positionsliste zusammen', () => {
    const fehler = new ApiError("Invalid positions entry 'SPY', expected format SYMBOL:weight", 400)

    expect(simulationsMeldung(fehler, 'diesen Sparplan')).toBe(
      'Die Positionsliste hat das Backend nicht akzeptiert. Bitte Symbole und Gewichte prüfen.',
    )
  })

  it('hat einen allgemeinen Satz für einen noch unbekannten 400er', () => {
    // Das Backend liefert keine Fehlerkennungen, erkannt wird am Text. Ein neuer Wortlaut darf
    // deshalb nicht englisch durchschlagen.
    const fehler = new ApiError('intervalMonths must be at least 1', 400)

    expect(simulationsMeldung(fehler, 'diesen Sparplan')).toBe(
      'Mit diesen Parametern lässt sich die Simulation nicht rechnen. Bitte Eingaben prüfen.',
    )
  })

  it('lässt einen Serverfehler in der gewöhnlichen Fehlerdarstellung', () => {
    // Dort steht ein Wiederholen-Knopf, und der ist hier die einzige sinnvolle Handlung.
    expect(simulationsMeldung(new ApiError('java.lang.NullPointerException', 500), 'AAPL')).toBeNull()
  })

  it('lässt einen Netzwerkfehler und alles, was kein ApiError ist, durch', () => {
    expect(simulationsMeldung(new ApiError('Backend nicht erreichbar', 0), 'AAPL')).toBeNull()
    expect(simulationsMeldung(new Error('kaputt'), 'AAPL')).toBeNull()
    expect(simulationsMeldung(null, 'AAPL')).toBeNull()
  })
})
