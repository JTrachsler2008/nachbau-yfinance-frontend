import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// jsdom liefert kein vollstaendiges matchMedia. MUIs useColorScheme fragt prefers-color-scheme ab
// und bricht ohne Stub ab. Nur setzen, wenn jsdom es nicht selbst mitbringt.
if (typeof window.matchMedia !== 'function') {
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => {
    const list: MediaQueryList = {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      // Veraltet, aber MUI ruft es in aelteren Pfaden noch auf.
      addListener: () => {},
      removeListener: () => {},
    }
    return list
  })
}

/**
 * Node 26 bringt ein eigenes, experimentelles `localStorage` mit, das ohne `--localstorage-file`
 * `undefined` liefert. Weil vitests jsdom-Fenster dasselbe globalThis ist, verdeckt dieses Global
 * jsdoms funktionierende Storage: `window.localStorage` ist undefined.
 *
 * Daher eine eigene, vollwertige In-Memory-Storage. Der Nachbau ist der Alternative vorzuziehen,
 * ohne Storage zu testen, denn dann liefe der Code im Test durch andere Zweige als im Browser.
 */
function createStorage(): Storage {
  const entries = new Map<string, string>()
  return {
    get length(): number {
      return entries.size
    },
    clear: (): void => {
      entries.clear()
    },
    getItem: (key: string): string | null => entries.get(key) ?? null,
    key: (index: number): string | null => [...entries.keys()][index] ?? null,
    removeItem: (key: string): void => {
      entries.delete(key)
    },
    setItem: (key: string, value: string): void => {
      entries.set(key, String(value))
    },
  }
}

vi.stubGlobal('localStorage', createStorage())
vi.stubGlobal('sessionStorage', createStorage())

beforeEach(() => {
  // MUI legt den gewaehlten Farbmodus in der Storage ab. Ohne Leeren wuerde ein Test den
  // Ausgangszustand des naechsten verfaelschen.
  window.localStorage.clear()
  window.sessionStorage.clear()
  // Das Farbschema haengt als data-light bzw. data-dark am html-Element und ueberlebt cleanup(),
  // weil es ausserhalb des gerenderten Baums liegt.
  document.documentElement.removeAttribute('data-light')
  document.documentElement.removeAttribute('data-dark')
})

// Bei globals: false raeumt Testing Library nicht selbst auf, weil es dafuer ein globales
// afterEach braeuchte. Ohne das wuerden sich die gerenderten Baeume im document stapeln.
afterEach(() => {
  cleanup()
})
