/**
 * Auswahl der Währungen für Formulare.
 *
 * Das Backend nimmt jeden nicht leeren Code an, aber eine Freitexteingabe würde Tippfehler zu
 * Datenfehlern machen: die FX-Umrechnung sucht Kurse anhand genau dieses Codes, und "chf" oder "Chf"
 * findet keinen. Die Liste deckt die im Original verwendeten Währungen ab.
 *
 * Liegt bewusst nicht in einem Fachmodul, weil sowohl Portfolios (Basiswährung) als auch Konten
 * (Kontowährung) dieselbe Auswahl brauchen.
 */
export const currencies = ['CHF', 'EUR', 'USD', 'GBP'] as const

export type Currency = (typeof currencies)[number]
