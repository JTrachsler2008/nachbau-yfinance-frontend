import { describe, expect, it } from 'vitest'
import {
  gewichtAnteil,
  lesePositionen,
  leseSymbol,
  positionenParameter,
  type GewichtungsZeile,
} from './positionen'

/**
 * Eingabeprüfung der Positionslisten (YOUNGOITV-454, YOUNGOITV-455).
 *
 * Wichtigster Fall ist das Komma im Symbol: der Sparplan überträgt die Liste als
 * `SYMBOL:gewicht,SYMBOL:gewicht` in einem Query-Parameter, ein Komma oder Doppelpunkt im Ticker
 * würde dort still eine zweite Position erzeugen. Deshalb ist die Zeichenregel eng und geprüft.
 */

function zeile(werte: Partial<GewichtungsZeile>): GewichtungsZeile {
  return { id: 1, symbol: 'SPY', gewicht: '60', ...werte }
}

describe('leseSymbol', () => {
  it('schreibt gross und schneidet Leerzeichen ab', () => {
    expect(leseSymbol('  aapl ')).toEqual({ ok: true, symbol: 'AAPL' })
  })

  it('lässt die gängigen Sonderzeichen echter Ticker durch', () => {
    for (const symbol of ['BRK.B', 'BTC-USD', '^GSPC', 'EURUSD=X']) {
      expect(leseSymbol(symbol)).toEqual({ ok: true, symbol })
    }
  })

  it('verlangt eine Eingabe', () => {
    expect(leseSymbol('   ')).toEqual({
      ok: false,
      fehler: 'Bitte ein Symbol eingeben, zum Beispiel AAPL.',
    })
  })

  it('weist Komma und Doppelpunkt ab, weil sie den Query-Parameter aufteilen würden', () => {
    expect(leseSymbol('SPY,AGG')).toEqual({
      ok: false,
      fehler: 'SPY,AGG ist kein gültiges Symbol. Erlaubt sind Buchstaben, Zahlen und . - ^ =',
    })
    expect(leseSymbol('SPY:60').ok).toBe(false)
  })

  it('weist Leerzeichen innerhalb des Symbols ab', () => {
    expect(leseSymbol('SP Y').ok).toBe(false)
  })
})

describe('lesePositionen', () => {
  it('liest Symbol und Gewicht und schreibt das Symbol gross', () => {
    const ergebnis = lesePositionen([
      zeile({ id: 1, symbol: 'spy', gewicht: '60' }),
      zeile({ id: 2, symbol: 'agg', gewicht: '40' }),
    ])

    expect(ergebnis).toEqual({
      ok: true,
      positionen: [
        { symbol: 'SPY', weight: 60 },
        { symbol: 'AGG', weight: 40 },
      ],
    })
  })

  it('nimmt das Komma als Dezimaltrenner im Gewicht', () => {
    // de-CH-Tastaturen haben es auf dem Zahlenblock, und das Feld ist ein Textfeld.
    const ergebnis = lesePositionen([zeile({ gewicht: '12,5' })])

    expect(ergebnis).toEqual({ ok: true, positionen: [{ symbol: 'SPY', weight: 12.5 }] })
  })

  it('überspringt eine vollständig leere Zeile, weil das Formular immer eine bereithält', () => {
    const ergebnis = lesePositionen([
      zeile({ id: 1 }),
      zeile({ id: 2, symbol: '   ', gewicht: '  ' }),
    ])

    expect(ergebnis).toEqual({ ok: true, positionen: [{ symbol: 'SPY', weight: 60 }] })
  })

  it('meldet eine halb gefüllte Zeile, weil dort jemand etwas eingeben wollte', () => {
    expect(lesePositionen([zeile({ symbol: '' })])).toEqual({
      ok: false,
      fehler: 'Bitte ein Symbol eingeben, zum Beispiel SPY.',
    })
    expect(lesePositionen([zeile({ gewicht: '' })])).toEqual({
      ok: false,
      fehler: 'Das Gewicht von SPY muss eine Zahl grösser als 0 sein.',
    })
  })

  it('lässt kein Gewicht von 0 oder darunter zu, weil das Backend es ablehnt', () => {
    for (const gewicht of ['0', '-5', 'viel']) {
      expect(lesePositionen([zeile({ gewicht })])).toEqual({
        ok: false,
        fehler: 'Das Gewicht von SPY muss eine Zahl grösser als 0 sein.',
      })
    }
  })

  it('gibt die Zeichenregel des einzelnen Symbols weiter', () => {
    expect(lesePositionen([zeile({ symbol: 'SPY,AGG' })])).toEqual({
      ok: false,
      fehler: 'SPY,AGG ist kein gültiges Symbol. Erlaubt sind Buchstaben, Zahlen und . - ^ =',
    })
  })

  it('meldet ein doppeltes Symbol, statt es das Backend still überschreiben zu lassen', () => {
    const ergebnis = lesePositionen([
      zeile({ id: 1, symbol: 'SPY', gewicht: '60' }),
      zeile({ id: 2, symbol: 'spy', gewicht: '40' }),
    ])

    expect(ergebnis).toEqual({ ok: false, fehler: 'SPY steht zweimal in der Liste.' })
  })

  it('verlangt mindestens eine Position', () => {
    expect(lesePositionen([zeile({ symbol: '', gewicht: '' })])).toEqual({
      ok: false,
      fehler: 'Bitte mindestens eine Position eingeben.',
    })
  })

  it('hält die Grenze von zwanzig Positionen des Controllers ein', () => {
    const zeilen = Array.from({ length: 21 }, (_unused, index) =>
      zeile({ id: index + 1, symbol: `S${index}`, gewicht: '5' }),
    )

    expect(lesePositionen(zeilen)).toEqual({
      ok: false,
      fehler: 'Höchstens 20 Positionen sind möglich.',
    })
    expect(lesePositionen(zeilen.slice(0, 20)).ok).toBe(true)
  })
})

describe('positionenParameter', () => {
  it('baut den Query-Parameter des Sparplans', () => {
    expect(
      positionenParameter([
        { symbol: 'SPY', weight: 60 },
        { symbol: 'AGG', weight: 40 },
      ]),
    ).toBe('SPY:60,AGG:40')
  })

  it('schreibt Bruchteile mit Punkt, wie der Controller sie liest', () => {
    expect(positionenParameter([{ symbol: 'SPY', weight: 12.5 }])).toBe('SPY:12.5')
  })
})

describe('gewichtAnteil', () => {
  it('rechnet den Anteil an der Summe aller Gewichte', () => {
    const positionen = [
      { symbol: 'SPY', weight: 60 },
      { symbol: 'AGG', weight: 20 },
    ]

    expect(gewichtAnteil(positionen[0], positionen)).toBe(75)
    expect(gewichtAnteil(positionen[1], positionen)).toBe(25)
  })

  it('gibt ohne Summe keinen Anteil statt durch 0 zu teilen', () => {
    const positionen = [{ symbol: 'SPY', weight: 0 }]

    expect(gewichtAnteil(positionen[0], positionen)).toBeNull()
  })
})
