import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAuthToken } from '../api/client'
import { installFakeBackend, type FakeBackend } from '../test/fakeBackend'
import { renderLoggedIn } from '../test/renderApp'
import { setzeBreite, setzeBreiteZurueck, viewports } from '../test/viewport'

/**
 * Responsive Umsetzung an der ganzen Anwendung (YOUNGOITV-458).
 *
 * Die übrigen Tests laufen im Ausgangszustand von jsdom, in dem jede Medienabfrage `false` liefert.
 * Das ergibt eine Mischform, die es auf keinem Gerät gibt: die Shell zeigt ihre Mobile-Variante,
 * die Tabellen ihre Desktop-Form. Hier wird die Breite gesetzt, damit beide Zustände einmal als
 * Ganzes geprüft sind: Navigation, Tabellenform und Dialoge müssen zusammen umschalten.
 */

let backend: FakeBackend

beforeEach(() => {
  setAuthToken(null)
  backend = installFakeBackend()
})

afterEach(() => {
  backend.restore()
  setzeBreiteZurueck()
})

/** Die dauerhafte Seitenleiste. MUI kennzeichnet sie als `docked`, den Drawer über dem Inhalt nicht. */
function seitenleiste(): Element | null {
  return document.querySelector('.MuiDrawer-docked')
}

function hamburger() {
  return screen.queryByRole('button', { name: 'Navigation öffnen' })
}

describe('Telefon', () => {
  it('führt die Navigation hinter einem Hamburger-Knopf', async () => {
    setzeBreite(viewports.telefon)
    const { user } = await renderLoggedIn('/')

    // Keine dauerhafte Seitenleiste: 240px davon liessen für den Inhalt keine 150px übrig.
    expect(seitenleiste()).toBeNull()
    const knopf = hamburger()
    expect(knopf).not.toBeNull()

    await user.click(knopf as HTMLElement)
    await user.click(await screen.findByRole('link', { name: 'Konten' }))

    expect(await screen.findByRole('heading', { name: 'Konten' })).toBeInTheDocument()
  })

  it('zeigt die Konten als Karten statt als Tabelle', async () => {
    setzeBreite(viewports.telefon)
    await renderLoggedIn('/konten')

    const liste = await screen.findByRole('list', { name: 'Konten' })
    expect(screen.queryByRole('table', { name: 'Konten' })).not.toBeInTheDocument()

    const karte = within(liste).getByText('Cash CHF').closest('li') as HTMLElement
    expect(within(karte).getByText("CHF 12'450.50")).toBeInTheDocument()
    // Die Aktionen der Zeile bleiben erreichbar, sonst wäre die Seite hier nur noch lesbar.
    expect(within(karte).getByRole('button', { name: 'Einzahlen' })).toBeInTheDocument()
    expect(within(karte).getByRole('button', { name: 'Auszahlen' })).toBeInTheDocument()
  })

  it('öffnet den Formulardialog im Vollbild', async () => {
    setzeBreite(viewports.telefon)
    const { user } = await renderLoggedIn('/konten')
    await screen.findByRole('list', { name: 'Konten' })

    await user.click(screen.getByRole('button', { name: 'Neues Konto' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog.classList.contains('MuiDialog-paperFullScreen')).toBe(true)
  })
})

describe('Desktop', () => {
  it('zeigt die Navigation dauerhaft und keinen Hamburger-Knopf', async () => {
    setzeBreite(viewports.desktop)
    await renderLoggedIn('/')

    expect(seitenleiste()).not.toBeNull()
    expect(hamburger()).toBeNull()
    expect(
      within(screen.getByRole('navigation', { name: 'Hauptnavigation' })).getByRole('link', {
        name: 'Konten',
      }),
    ).toBeInTheDocument()
  })

  it('zeigt die Konten als Tabelle', async () => {
    setzeBreite(viewports.desktop)
    await renderLoggedIn('/konten')

    const tabelle = await screen.findByRole('table', { name: 'Konten' })
    expect(screen.queryByRole('list', { name: 'Konten' })).not.toBeInTheDocument()
    expect(within(tabelle).getByText("CHF 12'450.50")).toBeInTheDocument()
  })

  it('öffnet den Formulardialog als Fenster mit Rand', async () => {
    setzeBreite(viewports.desktop)
    const { user } = await renderLoggedIn('/konten')
    await screen.findByRole('table', { name: 'Konten' })

    await user.click(screen.getByRole('button', { name: 'Neues Konto' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog.classList.contains('MuiDialog-paperFullScreen')).toBe(false)
  })
})
