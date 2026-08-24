import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ModeToggle } from './ModeToggle'
import { theme } from './theme'

function renderToggle(defaultMode: 'light' | 'dark' | 'system' = 'light') {
  return render(
    <ThemeProvider theme={theme} defaultMode={defaultMode}>
      <ModeToggle />
    </ThemeProvider>,
  )
}

/** Der Modus kommt erst nach dem ersten Rendern, bis dahin steht ein Platzhalter. */
function findButton(label: string) {
  return screen.findByRole('button', { name: label })
}

describe('ModeToggle', () => {
  it('zeigt alle drei Modi mit deutschen Beschriftungen', async () => {
    renderToggle()

    expect(await findButton('Hell')).toBeInTheDocument()
    expect(await findButton('Systemeinstellung')).toBeInTheDocument()
    expect(await findButton('Dunkel')).toBeInTheDocument()
  })

  it('markiert den aktiven Modus', async () => {
    renderToggle('light')

    expect(await findButton('Hell')).toHaveAttribute('aria-pressed', 'true')
    expect(await findButton('Dunkel')).toHaveAttribute('aria-pressed', 'false')
  })

  it('wechselt auf Klick den Modus', async () => {
    const user = userEvent.setup()
    renderToggle('light')

    await user.click(await findButton('Dunkel'))

    expect(await findButton('Dunkel')).toHaveAttribute('aria-pressed', 'true')
    expect(await findButton('Hell')).toHaveAttribute('aria-pressed', 'false')
  })

  it('behält die Auswahl, wenn auf den schon aktiven Modus geklickt wird', async () => {
    // ToggleButtonGroup meldet in diesem Fall null. Ohne die Prüfung im onChange gäbe es
    // danach einen Zustand ohne jede Auswahl.
    const user = userEvent.setup()
    renderToggle('light')

    await user.click(await findButton('Hell'))

    expect(await findButton('Hell')).toHaveAttribute('aria-pressed', 'true')
  })

  it('setzt das data-Attribut am Dokument, auf dem die Farbvariablen hängen', async () => {
    // Das Theme nutzt colorSchemeSelector 'data'. MUI schreibt daraus die Attribute data-light
    // bzw. data-dark an das html-Element, passend zu den erzeugten CSS-Blöcken
    // ":root, [data-light]" und "[data-dark]". Ohne dieses Attribut würden die
    // Dark-Mode-Variablen nie greifen und der Umschalter wäre wirkungslos.
    const user = userEvent.setup()
    renderToggle('light')

    const html = document.documentElement
    expect(html.hasAttribute('data-light')).toBe(true)
    expect(html.hasAttribute('data-dark')).toBe(false)

    await user.click(await findButton('Dunkel'))

    expect(html.hasAttribute('data-dark')).toBe(true)
    expect(html.hasAttribute('data-light')).toBe(false)
  })

  it('merkt sich den gewählten Modus über die Sitzung hinaus', async () => {
    const user = userEvent.setup()
    renderToggle('light')

    await user.click(await findButton('Dunkel'))

    expect(window.localStorage.getItem('mui-mode')).toBe('dark')
  })
})
