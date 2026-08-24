/**
 * Kontrastberechnung nach WCAG 2.1 (relative Luminanz).
 *
 * Nur fuer Tests. Der Zweck ist, die in `planung/design-theme.md` dokumentierten Kontrastwerte
 * pruefbar zu machen: das Original verfehlte an zwei Stellen WCAG AA, und ohne Test faellt eine
 * spaetere Farbaenderung genau dort wieder heraus, ohne dass es jemand merkt.
 */

type Rgba = readonly [number, number, number, number]

/** Akzeptiert `#rrggbb` und `rgb()`/`rgba()`, weil MUIs `alpha()` rgba-Strings erzeugt. */
function parseColor(color: string): Rgba {
  const functional =
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(color)
  if (functional !== null) {
    return [
      Number(functional[1]),
      Number(functional[2]),
      Number(functional[3]),
      functional[4] === undefined ? 1 : Number(functional[4]),
    ]
  }

  const hex = /^#([\da-f]{6})$/i.exec(color)
  if (hex === null) {
    throw new Error(`Nicht unterstuetztes Farbformat: ${color}`)
  }
  const value = Number.parseInt(hex[1], 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff, 1]
}

/**
 * Legt eine teiltransparente Farbe auf einen deckenden Grund. Notwendig fuer die Dark-Mode-Badges,
 * deren Flaeche `alpha(farbe, 0.15)` ist. Ohne Komposition waere ihr Kontrast nicht berechenbar.
 */
function composite(foreground: string, background: string): Rgba {
  const [fr, fg, fb, fa] = parseColor(foreground)
  const [br, bg, bb] = parseColor(background)
  return [fr * fa + br * (1 - fa), fg * fa + bg * (1 - fa), fb * fa + bb * (1 - fa), 1]
}

function relativeLuminance([r, g, b]: Rgba): number {
  const linearize = (raw: number): number => {
    const channel = raw / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/**
 * Kontrastverhaeltnis zwischen Vordergrund und Grund, Wertebereich 1 bis 21.
 * Der Grund muss deckend sein, der Vordergrund darf transparent sein.
 */
export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(composite(foreground, background))
  const backgroundLuminance = relativeLuminance(parseColor(background))
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Rechnet eine teiltransparente Farbe in die deckende Farbe um, die auf dem Grund entsteht.
 * Gebraucht, wenn auf einer teiltransparenten Flaeche wiederum Text liegt (Dark-Mode-Badges).
 */
export function flatten(foreground: string, background: string): string {
  const [r, g, b] = composite(foreground, background)
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}

/** WCAG-AA-Schwellen. */
export const AA_NORMAL_TEXT = 4.5
export const AA_LARGE_TEXT = 3
export const AA_NON_TEXT = 3
