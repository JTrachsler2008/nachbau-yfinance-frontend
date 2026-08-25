/**
 * Ländername zu einem ISO-Code.
 *
 * Über `Intl.DisplayNames` statt einer eigenen Liste: das Backend speichert am Wertpapier nur den
 * zweibuchstabigen Code (`countryCode`), und eine gepflegte Übersetzungstabelle im Frontend wäre
 * immer unvollständig. Die Laufzeit kennt die Namen bereits.
 */
const regionNames = new Intl.DisplayNames(['de-CH'], { type: 'region' })

export function landName(code: string | null | undefined): string | null {
  if (code === null || code === undefined || code === '') {
    return null
  }
  try {
    return regionNames.of(code) ?? code
  } catch {
    // `of` wirft bei einem strukturell ungültigen Code. Dann ist der Code selbst die beste Anzeige,
    // denn er steht so in der Datenbank.
    return code
  }
}
