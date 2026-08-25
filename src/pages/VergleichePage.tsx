import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { PortfolioGate } from '../portfolios/PortfolioGate'
import { AnlageklassenVergleich } from '../simulation/AnlageklassenVergleich'
import { HistorischerBacktest } from '../simulation/HistorischerBacktest'
import { Kaufsimulation } from '../simulation/Kaufsimulation'
import { PortfolioVergleich } from '../simulation/PortfolioVergleich'
import { SparplanSimulation } from '../simulation/SparplanSimulation'

const bereiche = ['anlageklassen', 'sparplan', 'kauf', 'backtest'] as const

type Bereich = (typeof bereiche)[number]

const bereichLabels: Record<Bereich, string> = {
  anlageklassen: 'Anlageklassen',
  sparplan: 'Sparplan',
  kauf: 'Kaufsimulation',
  backtest: 'Backtest',
}

/**
 * Vergleiche und Simulationen (YOUNGOITV-454 bis YOUNGOITV-456).
 *
 * Vier Bereiche in Registerkarten statt untereinander: jeder hat ein eigenes Formular und holt
 * Kursreihen über mehrere Jahre. Auf einer einzigen Seite müsste der Benutzer an drei Formularen
 * vorbeiscrollen, die er gerade nicht braucht.
 *
 * Nur die aktive Registerkarte wird gerendert. Ein bereits gerechnetes Ergebnis bleibt trotzdem fünf
 * Minuten im Cache und ist nach einem Wechsel ohne neue Anfrage wieder da; die Formulareingaben eines
 * verlassenen Bereichs gehen dagegen verloren, was hier vertretbar ist, weil jeder Bereich mit
 * gefüllten Vorgaben startet.
 *
 * Nur die Kaufsimulation braucht ein Portfolio, weil sie den Bestand als Vergleichsgrösse bewertet.
 * Deshalb steht das `PortfolioGate` genau um diesen Bereich und nicht um die ganze Seite: ohne
 * angelegtes Portfolio bleiben die drei anderen Bereiche vollständig benutzbar.
 */
export function VergleichePage() {
  const [bereich, setBereich] = useState<Bereich>('anlageklassen')

  return (
    <>
      <PageHeader
        title="Vergleiche und Simulation"
        subtitle="Hypothetische Rechnungen auf historischen Kursen. Es wird nichts gebucht und nichts gespeichert."
      />

      <Stack spacing={3}>
        <Alert severity="info">
          Alle Ergebnisse auf dieser Seite sind Simulationen. Sie beruhen auf Kursen des
          Marktdatenanbieters und rechnen ohne Gebühren, Steuern und Dividenden. Ein bestehendes
          Portfolio wird von keiner dieser Rechnungen verändert.
        </Alert>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={bereich}
            onChange={(_event, wert: Bereich) => setBereich(wert)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Bereiche der Simulation"
          >
            {bereiche.map((kandidat) => (
              <Tab
                key={kandidat}
                value={kandidat}
                label={bereichLabels[kandidat]}
                id={`bereich-tab-${kandidat}`}
                aria-controls={`bereich-panel-${kandidat}`}
              />
            ))}
          </Tabs>
        </Box>

        <Box
          role="tabpanel"
          id={`bereich-panel-${bereich}`}
          aria-labelledby={`bereich-tab-${bereich}`}
        >
          {bereich === 'anlageklassen' ? (
            <Stack spacing={3}>
              <AnlageklassenVergleich />
              <PortfolioVergleich />
            </Stack>
          ) : bereich === 'sparplan' ? (
            <SparplanSimulation />
          ) : bereich === 'kauf' ? (
            <PortfolioGate>{(portfolio) => <Kaufsimulation portfolio={portfolio} />}</PortfolioGate>
          ) : (
            <HistorischerBacktest />
          )}
        </Box>
      </Stack>
    </>
  )
}
