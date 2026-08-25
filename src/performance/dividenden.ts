import type { PortfolioTransaction } from '../transactions/transactionApi'

/** Eine Zeile der Jahresauswertung. */
export interface DividendenJahr {
  jahr: string
  /** Anzahl Zahlungen in diesem Jahr. */
  anzahl: number
  betrag: number
  /** Betrag je Symbol, Grundlage der gestapelten Balken. */
  jeSymbol: Readonly<Record<string, number>>
}

export interface DividendenAuswertung {
  jahre: DividendenJahr[]
  /** Alle vorkommenden Symbole, alphabetisch, damit die Farbzuordnung stabil bleibt. */
  symbole: string[]
}

/**
 * Auswertung der Dividendenzahlungen aus der Transaktionshistorie.
 *
 * Der Betrag ist `price * quantity`, genau wie im `DividendsService` des Backends, und ohne Gebühr
 * oder Steuer: der Endpunkt für die Gesamtsumme rechnet ebenso, und zwei verschiedene Definitionen
 * derselben Zahl auf einer Seite wären der schlimmere Fehler als eine unvollständige.
 *
 * Getrennt je Währung, weil eine Zahlung in USD nicht zu einer in CHF addiert werden darf. Das
 * Backend rechnet für die Gesamtsumme mit hinterlegten FX-Kursen um; die Transaktionszeile trägt
 * dieses Ergebnis nicht bei sich (`fxRateToPortfolio` wird beim Buchen nicht gefüllt), deshalb wird
 * hier nicht umgerechnet, sondern nach Währung aufgeteilt.
 */
export function dividendenJeJahr(
  transactions: readonly PortfolioTransaction[],
  currency: string,
): DividendenAuswertung {
  const zahlungen = transactions.filter(
    (transaction) =>
      transaction.transactionType === 'DIVIDEND' &&
      transaction.price !== null &&
      transaction.transactionCurrency === currency,
  )

  const nachJahr = new Map<string, { anzahl: number; betrag: number; jeSymbol: Map<string, number> }>()
  const symbole = new Set<string>()

  for (const zahlung of zahlungen) {
    const jahr = zahlung.transactionDate.slice(0, 4)
    const betrag = (zahlung.price ?? 0) * zahlung.quantity
    symbole.add(zahlung.symbol)

    let eintrag = nachJahr.get(jahr)
    if (eintrag === undefined) {
      eintrag = { anzahl: 0, betrag: 0, jeSymbol: new Map() }
      nachJahr.set(jahr, eintrag)
    }
    eintrag.anzahl += 1
    eintrag.betrag += betrag
    eintrag.jeSymbol.set(zahlung.symbol, (eintrag.jeSymbol.get(zahlung.symbol) ?? 0) + betrag)
  }

  const jahre = [...nachJahr.entries()]
    // Aufsteigend: die x-Achse eines Zeitverlaufs liest sich von links nach rechts.
    .sort(([links], [rechts]) => links.localeCompare(rechts))
    .map(([jahr, eintrag]) => ({
      jahr,
      anzahl: eintrag.anzahl,
      betrag: eintrag.betrag,
      jeSymbol: Object.fromEntries(eintrag.jeSymbol),
    }))

  return { jahre, symbole: [...symbole].sort((links, rechts) => links.localeCompare(rechts)) }
}

/** Währungen, in denen überhaupt Dividenden gebucht sind. Grundlage der Währungsauswahl. */
export function dividendenWaehrungen(transactions: readonly PortfolioTransaction[]): string[] {
  const codes = new Set(
    transactions
      .filter((transaction) => transaction.transactionType === 'DIVIDEND')
      .map((transaction) => transaction.transactionCurrency),
  )
  return [...codes].sort((links, rechts) => links.localeCompare(rechts))
}
