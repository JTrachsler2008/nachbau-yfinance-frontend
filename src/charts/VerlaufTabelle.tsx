import { ResponsiveTable, type Column } from '../components/ResponsiveTable'
import { formatAmount, formatPercent } from '../format/numbers'
import type { Verlauf } from './verlauf'

/**
 * Anfangs- und Endwert je Reihe eines Verlaufs.
 *
 * Dient gleichzeitig als Textalternative zum Liniendiagramm: dessen Zwischenwerte kann ein
 * Screenreader nicht vorlesen, die Aussage einer Linie steckt aber in Start, Ende und Veränderung.
 * Liegt neben `verlauf.ts` und nicht bei den Simulationen, weil auch der Wertverlauf der
 * Performance-Seite dieselbe Tabelle unter dieselbe Art Diagramm setzt.
 *
 * `formatWert` wird von aussen gesetzt, weil die Reihen je Bereich eine andere Einheit haben: ein auf
 * 100 normierter Index ist keine Zahl mit Währung, ein Depotwert schon.
 */
export function VerlaufTabelle({
  label,
  rows,
  formatWert = formatAmount,
}: {
  label: string
  rows: readonly Verlauf[]
  formatWert?: (value: number | null | undefined) => string
}) {
  const columns: readonly Column<Verlauf>[] = [
    { key: 'label', label: 'Reihe', render: (row) => row.label, primary: true },
    { key: 'start', label: 'Start', align: 'right', render: (row) => formatWert(row.start) },
    { key: 'ende', label: 'Ende', align: 'right', render: (row) => formatWert(row.ende) },
    {
      key: 'veraenderung',
      label: 'Veränderung',
      align: 'right',
      render: (row) => formatPercent(row.veraenderungProzent, { withSign: true }),
    },
  ]

  return <ResponsiveTable label={label} columns={columns} rows={rows} rowKey={(row) => row.key} />
}
