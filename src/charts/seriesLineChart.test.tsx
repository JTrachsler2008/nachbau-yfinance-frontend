import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { setzeBreite, setzeBreiteZurueck, viewports } from '../test/viewport'
import { theme } from '../theme/theme'
import { SeriesLineChart } from './SeriesLineChart'
import type { LinePoint, Serie } from './verlauf'

/**
 * Diagrammhöhe je Bildschirmbreite (YOUNGOITV-458).
 *
 * Geprüft wird die Regel im Stylesheet, weil jsdom kein Layout rechnet. Die Aussage des Diagramms
 * selbst, also Reihen und Anfangs- bis Endwert, prüfen die Tests der Seiten, die es einsetzen.
 */

const points: readonly LinePoint[] = [
  { label: '01.2024', values: { wert: 100 } },
  { label: '02.2024', values: { wert: 110 } },
]

const series: readonly Serie[] = [{ key: 'wert', label: 'Wert' }]

function zeige(breite: number, height?: number) {
  setzeBreite(breite)
  render(
    <ThemeProvider theme={theme} defaultMode="light">
      <SeriesLineChart
        title="Verlauf"
        points={points}
        series={series}
        formatValue={(value) => value.toFixed(0)}
        empty="Keine Daten"
        height={height}
      />
    </ThemeProvider>,
  )
}

/** Die Höhenregel des Diagrammrahmens, gesucht über seinen Emotion-Klassennamen. */
function hoehe(): string {
  const rahmen = screen.getByRole('img', { name: /^Verlauf:/ })
  const klasse = Array.from(rahmen.classList).find((kandidat) => kandidat.startsWith('css-'))
  const regeln = Array.from(document.querySelectorAll('style'))
    .map((tag) => tag.textContent ?? '')
    .filter((text) => text.includes(`.${klasse}`))
    .join('\n')
  const treffer = /height:(\d+)px/.exec(regeln)
  if (treffer === null) {
    throw new Error(`Keine Höhenregel für .${klasse}: ${regeln}`)
  }
  return treffer[1]
}

afterEach(() => {
  setzeBreiteZurueck()
})

describe('SeriesLineChart', () => {
  it('nutzt auf Desktop die volle Höhe', () => {
    zeige(viewports.desktop)

    expect(hoehe()).toBe('300')
  })

  it('wird auf dem Telefon flacher, damit die Tabelle darunter im Blick bleibt', () => {
    zeige(viewports.telefon)

    expect(hoehe()).toBe('220')
  })

  it('lässt eine von aussen gesetzte kleinere Höhe stehen', () => {
    // Die Regel soll flacher machen, nicht höher: ein Diagramm, das im Desktop-Layout schon 180px
    // hoch ist, darf auf dem Telefon nicht auf 220px wachsen.
    zeige(viewports.telefon, 180)

    expect(hoehe()).toBe('180')
  })
})
