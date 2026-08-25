/**
 * Bildschirmbreite für Tests.
 *
 * jsdom kennt keinen Layout-Algorithmus und liefert für jede Medienabfrage `matches: false`. Damit
 * laufen alle Tests im Ausgangszustand durch denselben Zweig, und der ist je Komponente ein anderer:
 * `useMediaQuery(down('sm'))` ist falsch, die Tabelle rendert also ihre Tabellenform, während
 * `useMediaQuery(up('md'))` ebenfalls falsch ist und die Shell ihre Mobile-Variante zeigt. Ohne
 * diesen Helfer wäre das Responsive-Verhalten (YOUNGOITV-458) nur zur Hälfte prüfbar.
 *
 * `matchMedia` wird direkt ersetzt und nicht über `vi.stubGlobal` gesetzt: `vi.unstubAllGlobals()`
 * würde auch die Storage-Attrappen aus `setup.ts` zurücknehmen, die dort einmalig pro Testdatei
 * gesetzt werden.
 */

const original = window.matchMedia

/** Typische Breiten. `sm` liegt bei 600px, `md` bei 900px. */
export const viewports = {
  telefon: 390,
  desktop: 1440,
} as const

/**
 * Lässt jede Breitenabfrage so antworten, als wäre das Fenster `breite` Pixel breit.
 *
 * Abfragen ohne Breite, etwa `prefers-color-scheme`, bleiben unbeantwortet (`matches: false`) und
 * verhalten sich damit wie im Ausgangszustand von jsdom.
 */
export function setzeBreite(breite: number): void {
  window.matchMedia = (query: string): MediaQueryList => {
    const min = /\(min-width:\s*([\d.]+)px\)/.exec(query)
    const max = /\(max-width:\s*([\d.]+)px\)/.exec(query)
    const matches =
      (min !== null || max !== null) &&
      (min === null || breite >= Number(min[1])) &&
      (max === null || breite <= Number(max[1]))

    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      addListener: () => {},
      removeListener: () => {},
    }
  }
}

/** Stellt jsdoms eigenes `matchMedia` wieder her. Gehört in ein `afterEach`. */
export function setzeBreiteZurueck(): void {
  window.matchMedia = original
}
