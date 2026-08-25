import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import MenuList from '@mui/material/MenuList'
import Switch from '@mui/material/Switch'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { theme, touchTarget } from './theme'

/**
 * Touch-Ziele von mindestens 44x44px (YOUNGOITV-458).
 *
 * jsdom rechnet kein Layout, `getBoundingClientRect()` liefert überall Null. Geprüft wird deshalb die
 * Regel selbst: Emotion legt je Klasse ein eigenes `<style>` im Kopf des Dokuments ab, und dort muss
 * die Mindesthöhe stehen, mit dem Element verbunden über seinen Emotion-Klassennamen. Das ist eine
 * Stufe unter dem, was der Benutzer sieht, prüft aber genau die Verbindung, die brechen kann: dass
 * eine Überschreibung im Theme steht, aber an der Komponente nicht ankommt.
 */

/** Der Klassenname, unter dem Emotion die Stile dieses Elements ablegt. */
function emotionKlasse(element: HTMLElement): string {
  const klasse = Array.from(element.classList).find((kandidat) => kandidat.startsWith('css-'))
  if (klasse === undefined) {
    throw new Error(`Element ohne Emotion-Klasse: ${element.className}`)
  }
  return klasse
}

/** Alle Stilregeln, die für dieses Element gelten. */
function regeln(element: HTMLElement): readonly string[] {
  const klasse = emotionKlasse(element)
  return Array.from(document.querySelectorAll('style'))
    .map((tag) => tag.textContent ?? '')
    .filter((text) => text.includes(`.${klasse}`))
}

/** Nur die Regeln, die an ein grobes Zeigegerät gebunden sind, also an den Finger. */
function touchRegeln(element: HTMLElement): string {
  return regeln(element)
    .filter((text) => text.includes('pointer: coarse'))
    .join('\n')
}

function zeige() {
  render(
    <ThemeProvider theme={theme} defaultMode="light">
      <Button>Speichern</Button>
      <IconButton aria-label="Bearbeiten">x</IconButton>
      <ToggleButtonGroup value="jahr" exclusive>
        <ToggleButton value="jahr">Jahr</ToggleButton>
      </ToggleButtonGroup>
      <MenuList>
        <MenuItem>Portfolio Wachstum</MenuItem>
      </MenuList>
      <FormControlLabel control={<Switch />} label="Rebalancing" />
      <Chip label="Aktien" onClick={() => {}} />
      <Chip label="Offen" />
    </ThemeProvider>,
  )
}

function labelVon(text: string): HTMLElement {
  return screen.getByText(text).closest('.MuiFormControlLabel-root') as HTMLElement
}

function chip(text: string): HTMLElement {
  return screen.getByText(text).closest('.MuiChip-root') as HTMLElement
}

describe('Touch-Ziele', () => {
  it('verlangt laut Plan mindestens 44px', () => {
    expect(touchTarget).toBeGreaterThanOrEqual(44)
  })

  it('gibt Knopf, Icon-Knopf und Umschalter am Finger die Mindestgrösse', () => {
    zeige()

    expect(touchRegeln(screen.getByRole('button', { name: 'Speichern' }))).toContain(
      `min-height:${touchTarget}px`,
    )

    // Der Icon-Knopf ist quadratisch, hier zählt auch die Breite.
    const iconKnopf = touchRegeln(screen.getByRole('button', { name: 'Bearbeiten' }))
    expect(iconKnopf).toContain(`min-width:${touchTarget}px`)
    expect(iconKnopf).toContain(`min-height:${touchTarget}px`)

    const umschalter = touchRegeln(screen.getByRole('button', { name: 'Jahr' }))
    expect(umschalter).toContain(`min-width:${touchTarget}px`)
    expect(umschalter).toContain(`min-height:${touchTarget}px`)
  })

  it('gibt Menüeintrag und Schalterlabel die Mindesthöhe', () => {
    // Die Portfolio-Auswahl und jedes Select öffnen eine Liste solcher Einträge, und angetippt wird
    // beim Schalter das Label, nicht der Schalter selbst.
    zeige()

    expect(touchRegeln(screen.getByRole('menuitem', { name: 'Portfolio Wachstum' }))).toContain(
      `min-height:${touchTarget}px`,
    )
    expect(touchRegeln(labelVon('Rebalancing'))).toContain(`min-height:${touchTarget}px`)
  })

  it('vergrössert klickbare Chips und lässt reine Status-Chips klein', () => {
    zeige()

    const klickbar = chip('Aktien')
    expect(klickbar.classList.contains('MuiChip-clickable')).toBe(true)
    expect(touchRegeln(klickbar)).toMatch(
      new RegExp(`\\.${emotionKlasse(klickbar)}\\.MuiChip-clickable\\{min-height:${touchTarget}px`),
    )

    // Derselbe Chip ohne `onClick` ist eine Beschriftung. Die Regel steht auch an seiner Klasse, aber
    // nur zusammen mit `MuiChip-clickable`, und die trägt er nicht.
    const statisch = chip('Offen')
    expect(statisch.classList.contains('MuiChip-clickable')).toBe(false)
    for (const regel of touchRegeln(statisch).split('\n')) {
      expect(regel).toContain('.MuiChip-clickable')
    }
  })

  it('bindet die Vergrösserung an das Zeigegerät und nicht an alle Geräte', () => {
    // Mit der Maus bleiben die kompakten Masse. Wäre die Mindesthöhe unbedingt gesetzt, würde eine
    // Werkzeugleiste am Desktop auseinanderfallen.
    zeige()

    for (const element of [
      screen.getByRole('button', { name: 'Speichern' }),
      screen.getByRole('button', { name: 'Bearbeiten' }),
      screen.getByRole('menuitem', { name: 'Portfolio Wachstum' }),
      chip('Aktien'),
    ]) {
      for (const regel of regeln(element)) {
        if (regel.includes(`min-height:${touchTarget}px`)) {
          expect(regel).toContain('pointer: coarse')
        }
      }
    }
  })
})
