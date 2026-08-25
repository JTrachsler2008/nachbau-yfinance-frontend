/** Ein Segment eines Kreisdiagramms oder ein Balken. */
export interface Slice {
  /** Technischer Schlüssel, dient als React-Key und als Wert eines Filters. */
  key: string
  label: string
  value: number
}

/** Beschriftung für Zeilen, bei denen das Merkmal im Backend nicht gesetzt ist. */
export const ohneAngabe = 'Ohne Angabe'

/**
 * Fasst Zeilen zu Segmenten zusammen.
 *
 * Absteigend nach Wert sortiert, damit die Farbreihenfolge der Diagramm-Palette dem Gewicht folgt
 * und die Legende oben das Wichtigste zeigt. "Ohne Angabe" steht immer am Ende, egal wie gross es
 * ist: es ist keine Kategorie, sondern eine Datenlücke, und soll nicht wie die grösste Position
 * aussehen.
 *
 * Segmente mit Wert 0 fallen weg. Ein Kreisdiagramm kann sie nicht darstellen, in der Legende wären
 * sie irreführend.
 */
export function fasseZusammen<T>(
  rows: readonly T[],
  merkmal: (row: T) => string | null,
  wert: (row: T) => number,
): Slice[] {
  const summen = new Map<string, number>()
  for (const row of rows) {
    const rohwert = merkmal(row)
    const key = rohwert === null || rohwert === '' ? ohneAngabe : rohwert
    summen.set(key, (summen.get(key) ?? 0) + wert(row))
  }

  return [...summen.entries()]
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => ({ key, label: key, value }))
    .sort((left, right) => {
      if (left.key === ohneAngabe) {
        return 1
      }
      if (right.key === ohneAngabe) {
        return -1
      }
      return right.value - left.value
    })
}

/** Anteil eines Wertes an der Summe, in Prozent. Ohne Summe gibt es keinen Anteil. */
export function anteil(value: number, slices: readonly Slice[]): number | null {
  const summe = slices.reduce((total, slice) => total + slice.value, 0)
  return summe === 0 ? null : (value / summe) * 100
}
