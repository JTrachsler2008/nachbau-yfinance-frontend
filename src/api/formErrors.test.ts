import { describe, expect, it } from 'vitest'
import { ApiError } from './client'
import { describeApiError, serverErrorMessage } from './formErrors'

describe('describeApiError', () => {
  it('nutzt die Übersetzung für den passenden Status', () => {
    const result = describeApiError(new ApiError('Bad credentials', 401), {
      401: 'Benutzername oder Passwort ist falsch',
    })

    expect(result.message).toBe('Benutzername oder Passwort ist falsch')
    expect(result.fieldErrors).toEqual({})
  })

  it('reicht die Message des Backends durch, wenn es keine Übersetzung gibt', () => {
    // Fachliche Fehler dürfen nicht hinter einem Sammeltext verschwinden.
    const result = describeApiError(new ApiError('Nicht genügend Cash auf dem Konto', 400), {
      401: 'Benutzername oder Passwort ist falsch',
    })

    expect(result.message).toBe('Nicht genügend Cash auf dem Konto')
  })

  it('ersetzt die Meldung eines Serverfehlers, statt Interna weiterzugeben', () => {
    // SEC-5: bei einem 500er steckt im Text des Backends gern ein Klassenname.
    const result = describeApiError(
      new ApiError('java.lang.NullPointerException: "summe" is null', 500),
    )

    expect(result.message).toBe(serverErrorMessage)
  })

  it('lässt eine eigene Übersetzung auch bei einem Serverfehler gewinnen', () => {
    const result = describeApiError(new ApiError('java.lang.IllegalStateException', 503), {
      503: 'Der Kursanbieter antwortet gerade nicht',
    })

    expect(result.message).toBe('Der Kursanbieter antwortet gerade nicht')
  })

  it('übernimmt fieldErrors der Bean-Validation', () => {
    const result = describeApiError(
      new ApiError('Validation failed', 400, { email: 'muss eine E-Mail-Adresse sein' }),
    )

    expect(result.fieldErrors).toEqual({ email: 'muss eine E-Mail-Adresse sein' })
  })

  it('meldet einen unerreichbaren Server mit dessen eigenem Text', () => {
    const result = describeApiError(new ApiError('Backend nicht erreichbar', 0), {
      401: 'Benutzername oder Passwort ist falsch',
    })

    expect(result.message).toBe('Backend nicht erreichbar')
  })

  it('fängt Fehler ab, die kein ApiError sind', () => {
    // Etwa ein Programmierfehler in einer Komponente. Ohne diesen Zweig stünde im Banner
    // "undefined".
    expect(describeApiError(new TypeError('x is not a function')).message).toBe(
      'Unerwarteter Fehler',
    )
    expect(describeApiError('kaputt').message).toBe('Unerwarteter Fehler')
  })
})
