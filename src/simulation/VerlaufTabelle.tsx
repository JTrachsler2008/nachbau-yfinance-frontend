import type { Verlauf } from '../charts/verlauf'
import { ResponsiveTable, type Column } from '../components/ResponsiveTable'
import { formatAmount, formatPercent } from '../format/numbers'

/**
 * Anfangs- und Endwert je Reihe eines Verlaufs.
 *
 * Dient gleichzeitig als Textalternative zum Liniendiagramm: dessen Zwischenwerte kann ein
 * Screenreader nicht vorlesen, die Aussage einer Linie steckt aber in Start, Ende und Veränderung.
 * Wird vom Anlageklassen- und vom Portfolio-Vergleich genutzt, deshalb in einer eigenen Datei.
 */
export function VerlaufTabelle({ label, rows }: { label: string; rows: readonly Verlauf[] }) {
  const columns: readonly Column<Verlauf>[] = [
    { key: 'label', label: 'Reihe', render: (row) => row.label, primary: true },
    { key: 'start', label: 'Start', align: 'right', render: (row) => formatAmount(row.start) },
    { key: 'ende', label: 'Ende', align: 'right', render: (row) => formatAmount(row.ende) },
    {
      key: 'veraenderung',
      label: 'Veränderung',
      align: 'right',
      render: (row) => formatPercent(row.veraenderungProzent, { withSign: true }),
    },
  ]

  return <ResponsiveTable label={label} columns={columns} rows={rows} rowKey={(row) => row.key} />
}
