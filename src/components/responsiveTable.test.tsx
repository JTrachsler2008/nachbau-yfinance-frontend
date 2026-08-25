import Button from '@mui/material/Button'
import { ThemeProvider } from '@mui/material/styles'
import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { setzeBreite, setzeBreiteZurueck, viewports } from '../test/viewport'
import { theme } from '../theme/theme'
import { ResponsiveTable, type Column } from './ResponsiveTable'

/**
 * Tabelle wird auf Telefonen zu Karten (YOUNGOITV-458).
 *
 * Beide Zweige werden geprüft, denn sie zeigen absichtlich nicht dasselbe: die Kartenform lässt
 * Spalten mit `hideOnMobile` weg und macht aus der Kennspalte den Kopf der Karte. Ein Test nur auf
 * Desktop würde genau die Form nicht sehen, die auf dem Telefon erscheint.
 */

interface Zeile {
  symbol: string
  wert: string
  isin: string
}

const zeilen: readonly Zeile[] = [
  { symbol: 'AAPL', wert: "2'000.00", isin: 'US0378331005' },
  { symbol: 'NESN', wert: "7'000.00", isin: 'CH0038863350' },
]

const spalten: readonly Column<Zeile>[] = [
  { key: 'symbol', label: 'Symbol', render: (zeile) => zeile.symbol, primary: true },
  { key: 'wert', label: 'Wert', align: 'right', render: (zeile) => zeile.wert },
  { key: 'isin', label: 'ISIN', render: (zeile) => zeile.isin, hideOnMobile: true },
]

function zeige(breite: number) {
  setzeBreite(breite)
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <ResponsiveTable
        label="Positionen"
        columns={spalten}
        rows={zeilen}
        rowKey={(zeile) => zeile.symbol}
        actions={(zeile) => <Button>{`${zeile.symbol} bearbeiten`}</Button>}
      />
    </ThemeProvider>,
  )
}

afterEach(() => {
  setzeBreiteZurueck()
})

describe('ResponsiveTable auf Desktop', () => {
  it('zeigt eine Tabelle mit allen Spalten', () => {
    zeige(viewports.desktop)
    const tabelle = screen.getByRole('table', { name: 'Positionen' })

    expect(within(tabelle).getByRole('columnheader', { name: 'ISIN' })).toBeInTheDocument()
    expect(within(tabelle).getByRole('columnheader', { name: 'Aktionen' })).toBeInTheDocument()

    const zeile = within(tabelle).getByText('AAPL').closest('tr') as HTMLElement
    expect(within(zeile).getByText("2'000.00")).toBeInTheDocument()
    expect(within(zeile).getByText('US0378331005')).toBeInTheDocument()
    expect(within(zeile).getByRole('button', { name: 'AAPL bearbeiten' })).toBeInTheDocument()
  })
})

describe('ResponsiveTable auf dem Telefon', () => {
  it('macht aus jeder Zeile eine Karte statt horizontal zu scrollen', () => {
    zeige(viewports.telefon)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const karten = within(screen.getByRole('list', { name: 'Positionen' })).getAllByRole('listitem')
    expect(karten).toHaveLength(2)

    // Die Kennspalte steht als Kopf der Karte, die übrigen als Label/Wert-Paar darunter.
    expect(within(karten[0]).getByText('AAPL')).toBeInTheDocument()
    expect(within(karten[0]).getByText('Wert')).toBeInTheDocument()
    expect(within(karten[0]).getByText("2'000.00")).toBeInTheDocument()
    expect(within(karten[1]).getByText('NESN')).toBeInTheDocument()
  })

  it('lässt Spalten mit hideOnMobile weg, statt die Karte damit zu füllen', () => {
    zeige(viewports.telefon)

    expect(screen.queryByText('ISIN')).not.toBeInTheDocument()
    expect(screen.queryByText('US0378331005')).not.toBeInTheDocument()
  })

  it('behält die Aktionen je Zeile', () => {
    // Ohne sie wäre auf dem Telefon nur noch Lesen möglich.
    zeige(viewports.telefon)

    expect(screen.getByRole('button', { name: 'AAPL bearbeiten' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'NESN bearbeiten' })).toBeInTheDocument()
  })
})
