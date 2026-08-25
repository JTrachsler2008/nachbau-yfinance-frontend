import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { useState } from 'react'
import { Rollen } from '../admin/Rollen'
import { Wechselkurse } from '../admin/Wechselkurse'
import { Wertpapiere } from '../admin/Wertpapiere'
import { PageHeader } from '../components/PageHeader'

const bereiche = ['wertpapiere', 'kurse', 'rollen'] as const

type Bereich = (typeof bereiche)[number]

const bereichLabels: Record<Bereich, string> = {
  wertpapiere: 'Wertpapiere',
  kurse: 'Wechselkurse',
  rollen: 'Rollen',
}

/**
 * Verwaltungsbereich für Administratoren (YOUNGOITV-460).
 *
 * Eigener Bereich und nicht in die Portfolio-Seiten eingestreut, weil die Administratorrolle laut
 * User-Rollen-Plan bewusst keinen Portfolio-Zugriff mitbringt: die drei Bereiche hier betreffen
 * Stammdaten, die für alle Benutzer gelten.
 *
 * Drei Registerkarten statt einer langen Seite, wie bei den Simulationen: die Aufgaben haben nichts
 * miteinander zu tun, und wer einen Kurs erfassen will, soll nicht an der Wertpapierliste
 * vorbeiscrollen. Ohne Portfolio-Bezug steht hier auch kein `PortfolioGate`; der Bereich ist auch für
 * einen Admin ohne eigenes Portfolio vollständig benutzbar.
 */
export function VerwaltungPage() {
  const [bereich, setBereich] = useState<Bereich>('wertpapiere')

  return (
    <>
      <PageHeader
        title="Verwaltung"
        subtitle="Stammdaten für alle Benutzer. Nichts hier gehört zu einem einzelnen Portfolio."
      />

      <Stack spacing={3}>
        <Alert severity="warning">
          Diese Angaben wirken für alle Benutzer. Ein Wertpapier und ein Wechselkurs lassen sich nach
          dem Anlegen nicht mehr ändern und nicht löschen, und eine entzogene Rolle nimmt dem Benutzer
          sofort seinen Zugriff.
        </Alert>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={bereich}
            onChange={(_event, wert: Bereich) => setBereich(wert)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Bereiche der Verwaltung"
          >
            {bereiche.map((kandidat) => (
              <Tab
                key={kandidat}
                value={kandidat}
                label={bereichLabels[kandidat]}
                id={`verwaltung-tab-${kandidat}`}
                aria-controls={`verwaltung-panel-${kandidat}`}
              />
            ))}
          </Tabs>
        </Box>

        <Box
          role="tabpanel"
          id={`verwaltung-panel-${bereich}`}
          aria-labelledby={`verwaltung-tab-${bereich}`}
        >
          {bereich === 'wertpapiere' ? (
            <Wertpapiere />
          ) : bereich === 'kurse' ? (
            <Wechselkurse />
          ) : (
            <Rollen />
          )}
        </Box>
      </Stack>
    </>
  )
}
