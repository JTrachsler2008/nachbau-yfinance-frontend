/**
 * Datumshilfen für Formulare.
 *
 * Bewusst ohne `toISOString`: das rechnet auf UTC um und liefert in der Schweiz abends das Datum von
 * morgen. Ein `max`-Attribut oder ein Vorgabewert wäre damit an einem Sommerabend um einen Tag daneben.
 *
 * Bewusst auch ohne Datumsbibliothek: gebraucht werden zwei Zeichenketten im Format, das ein
 * `input type="date"` erwartet, und dafür ist eine Abhängigkeit mehr Aufwand als Nutzen.
 */

function iso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Heute als ISO-Datum in der Zeitzone des Benutzers. */
export function heute(): string {
  return iso(new Date())
}

/** Gestern als ISO-Datum. Die Simulationen rechnen bis zum Vortag, heute liegt für sie in der Zukunft. */
export function gestern(): string {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return iso(date)
}

/**
 * Dasselbe Kalenderdatum vor `jahre` Jahren.
 *
 * Am 29. Februar gibt es das Datum im Zieljahr nicht; JavaScript verschiebt dann auf den 1. März. Das
 * ist für einen Vorgabewert im Formular unerheblich und bleibt deshalb unbehandelt.
 */
export function vorJahren(jahre: number): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() - jahre)
  return iso(date)
}
