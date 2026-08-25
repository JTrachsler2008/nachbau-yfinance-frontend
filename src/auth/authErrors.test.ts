import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { describeApiError } from './authErrors'

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
