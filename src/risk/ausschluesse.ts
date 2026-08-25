/**
 * Übersetzt die Ausschlussgründe der Risikoanalyse.
 *
 * Das Backend liefert in `excluded` keine Sätze, sondern stabile Kennungen (`NO_PRICE_HISTORY`,
 * `TOO_FEW_OBSERVATIONS`, `NO_FX_RATE`). Das ist Absicht: die Kennung ist die Schnittstelle, der
 * Wortlaut gehört in die Oberfläche und darf sich dort ändern, ohne den Endpunkt anzufassen.
 *
 * Am Ende steht ein allgemeiner Satz für eine künftige, hier noch unbekannte Kennung. Ein leerer
 * Eintrag wäre schlimmer als ein unspezifischer: dass ein Wertpapier fehlt, ist die wichtigere Hälfte
 * der Aussage, und die steht in jedem Fall daneben.
 */
export function ausschlussGrund(reason: string): string {
  if (reason === 'NO_PRICE_HISTORY') {
    return 'Keine Kurshistorie im Zeitraum. Der Marktdatenanbieter kennt das Symbol nicht oder hat für diese Tage nichts geliefert.'
  }
  if (reason === 'TOO_FEW_OBSERVATIONS') {
    return 'Zu wenige Handelstage im Zeitraum. Unter 20 Tagesrenditen ist eine auf ein Jahr hochgerechnete Kennzahl nicht belastbar.'
  }
  if (reason === 'NO_FX_RATE') {
    return 'Kein Wechselkurs in die Basiswährung hinterlegt. Ohne ihn ist der Marktwert und damit das Gewicht der Position unbekannt.'
  }
  return 'Nicht auswertbar. Das Backend nennt als Grund die Kennung ' + reason + '.'
}
