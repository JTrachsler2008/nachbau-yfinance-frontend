/**
 * Zeitraum einer Auswertung: entweder ein Preset in Kalendertagen zurück, oder ein frei gewähltes
 * Intervall. Eine Vereinigung statt zweier paralleler Felder, damit nie versehentlich beides zugleich
 * an den Endpunkt geht - die nehmen zwar `from`/`to` vorrangig, aber eine Oberfläche, die "3 Monate"
 * UND ein eigenes Datum gleichzeitig anzeigen könnte, wäre für sich schon irreführend.
 */
export type Zeitraum =
  | { kind: 'preset'; lookbackDays: number }
  | { kind: 'custom'; from: string; to: string }

/**
 * Presets in Kalendertagen, weil die Endpunkte `lookbackDays` so verstehen (30 bis 3650).
 *
 * Liegt hier und nicht in einer der beiden Seiten: Risiko und Performance fragen dieselben Zeiträume
 * ab, und zwei Listen, die "3 Monate" verschieden auslegen, würden zwei Zahlen zeigen, die niemand
 * zusammenbringt.
 */
export const zeitraeume = [
  { tage: 90, label: '3 Monate' },
  { tage: 365, label: '1 Jahr' },
  { tage: 1095, label: '3 Jahre' },
  { tage: 1825, label: '5 Jahre' },
] as const

/** Sentinel-Wert der Auswahl für "eigenes Intervall", damit ein einziges Bedienelement reicht. */
export const BENUTZERDEFINIERT = 'custom'

/**
 * Vorgeschlagene Benchmarks. Das Feld selbst ist eine freie Texteingabe (`Autocomplete freeSolo`):
 * jedes Symbol, das der Marktdatenanbieter kennt, ist als Referenz gültig, nicht nur diese drei.
 */
export const benchmarkVorschlaege = ['SPY', 'URTH', 'EWL'] as const

/**
 * Query-Parameter für einen Zeitraum samt Benchmark.
 *
 * Sendet immer nur eine der beiden Formen. Würden `lookbackDays` und `from`/`to` zusammen gehen,
 * entschiede die Vorrangregel des Endpunkts, welche gilt - eine Regel, die die Oberfläche dann
 * mitwissen müsste, um die richtige Beschriftung zu setzen.
 */
export function zeitraumParams(
  zeitraum: Zeitraum,
  benchmark: string,
): Record<string, string | number> {
  return zeitraum.kind === 'preset'
    ? { lookbackDays: zeitraum.lookbackDays, benchmark }
    : { from: zeitraum.from, to: zeitraum.to, benchmark }
}

/** Der Teil des React-Query-Schlüssels, der den Zeitraum unterscheidet. */
export function zeitraumKey(zeitraum: Zeitraum): string | number {
  return zeitraum.kind === 'preset' ? zeitraum.lookbackDays : `${zeitraum.from}..${zeitraum.to}`
}
