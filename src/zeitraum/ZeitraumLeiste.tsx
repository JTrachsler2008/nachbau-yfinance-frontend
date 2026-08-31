import Autocomplete from '@mui/material/Autocomplete'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { gestern } from '../format/dates'
import type { ZeitraumWahl } from './useZeitraumWahl'
import { BENUTZERDEFINIERT, benchmarkVorschlaege, zeitraeume } from './zeitraum'

/**
 * Bedienelemente für Zeitraum und Benchmark.
 *
 * Die Datumsfelder erscheinen nur bei "Benutzerdefiniert" - sie wären sonst zwei Eingaben, die keine
 * Wirkung haben. Ihre Fehlermarkierung hängt an derselben Prüfung, die auch die Abfrage anhält, damit
 * das Feld nicht rot ist, während die Zahlen daneben schon neu geladen werden.
 */
export function ZeitraumLeiste({ wahl }: { wahl: ZeitraumWahl }) {
  const istBenutzerdefiniert = wahl.auswahl === BENUTZERDEFINIERT

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={wahl.auswahl}
          onChange={(_event, wert: number | typeof BENUTZERDEFINIERT | null) => {
            if (wert !== null) {
              wahl.setAuswahl(wert)
            }
          }}
          aria-label="Zeitraum"
        >
          {zeitraeume.map((eintrag) => (
            <ToggleButton key={eintrag.tage} value={eintrag.tage}>
              {eintrag.label}
            </ToggleButton>
          ))}
          <ToggleButton value={BENUTZERDEFINIERT}>Benutzerdefiniert</ToggleButton>
        </ToggleButtonGroup>
        <Autocomplete
          freeSolo
          size="small"
          options={benchmarkVorschlaege}
          value={wahl.benchmark}
          onInputChange={(_event, next) => wahl.setBenchmark(next.trim().toUpperCase())}
          sx={{ minWidth: 220 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Benchmark"
              helperText="SPY, URTH, EWL oder ein beliebiges anderes Symbol"
            />
          )}
        />
      </Stack>

      {istBenutzerdefiniert && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Von"
            type="date"
            size="small"
            value={wahl.customFrom}
            onChange={(event) => wahl.setCustomFrom(event.target.value)}
            error={!wahl.gueltig}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: gestern() } }}
          />
          <TextField
            label="Bis"
            type="date"
            size="small"
            value={wahl.customTo}
            onChange={(event) => wahl.setCustomTo(event.target.value)}
            error={!wahl.gueltig}
            helperText={
              wahl.gueltig ? undefined : '"Von" muss vor "Bis" liegen, "Bis" höchstens gestern.'
            }
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: gestern() } }}
          />
        </Stack>
      )}
    </Stack>
  )
}
