/** Ein Zeitpunkt einer Verlaufsreihe. `null` steht für einen Zeitpunkt ohne Wert. */
export interface LinePoint {
  /** Beschriftung auf der x-Achse, etwa ein Datum. */
  label: string
  values: Readonly<Record<string, number | null>>
}

/** Eine Reihe im Verlauf. Der Schlüssel steht in den Punkten, das Label in der Legende. */
export interface Serie {
  key: string
  label: string
}

/** Anfang, Ende und Veränderung einer Reihe. */
export interface Verlauf {
  key: string
  label: string
  start: number | null
  ende: number | null
  veraenderungProzent: number | null
}

/**
 * Fasst jede Reihe eines Verlaufs auf Anfangs- und Endwert zusammen.
 *
 * Dient zwei Zwecken: als Textalternative zum Liniendiagramm (ein Screenreader kann eine SVG-Linie
 * nicht lesen) und als Tabelle darunter. Beides braucht dieselbe Aussage, deshalb entsteht sie
 * einmal hier statt zweimal in den Komponenten.
 *
 * Lücken werden übersprungen und nicht als 0 gelesen: das Backend liefert für ein Symbol ohne Kurs
 * an einem Datum keinen Eintrag, und eine 0 im Nenner oder als Startwert würde eine Rendite von
 * minus 100 Prozent erfinden. Eine Reihe ganz ohne Werte behält deshalb `null` in allen drei
 * Feldern.
 */
export function verlaufJeSerie(
  points: readonly LinePoint[],
  series: readonly Serie[],
): Verlauf[] {
  return series.map((serie) => {
    let start: number | null = null
    let ende: number | null = null
    for (const point of points) {
      const wert = point.values[serie.key]
      if (wert === null || wert === undefined) {
        continue
      }
      if (start === null) {
        start = wert
      }
      ende = wert
    }

    // Ohne Startwert grösser als 0 gibt es keine Bezugsgrösse für eine prozentuale Veränderung.
    const veraenderungProzent =
      start === null || ende === null || start === 0 ? null : ((ende - start) / start) * 100

    return { key: serie.key, label: serie.label, start, ende, veraenderungProzent }
  })
}
