import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormHelperText from '@mui/material/FormHelperText'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { maxPositionen, type GewichtungsZeile } from './positionen'

interface GewichtungenFeldProps {
  /** Name der Gruppe, etwa "Portfolio A". Wird Teil jeder Feldbeschriftung. */
  label: string
  zeilen: readonly GewichtungsZeile[]
  onChange: (zeilen: GewichtungsZeile[]) => void
  /** Meldung unter der Gruppe. Kommt aus `lesePositionen`. */
  fehler?: string | null
  hint?: string
}

/**
 * Eingabe einer Positionsliste aus Symbol und Gewicht.
 *
 * Als `fieldset` mit `legend`, damit die Gruppe für einen Screenreader einen Namen hat: die Seite
 * zeigt beim Portfolio-Vergleich zwei solche Listen nebeneinander, und "Symbol" allein wäre dann
 * zweimal dasselbe Feld. Aus demselben Grund tragen die Felder den Gruppennamen und die Zeilennummer
 * in ihrer Beschriftung.
 *
 * Die Gewichte sind bewusst frei wählbare Zahlen und keine Prozentwerte: das Backend normalisiert die
 * Summe selbst, und eine erzwungene Summe von 100 würde das Ändern einer einzelnen Zeile zu einer
 * Rechenaufgabe machen.
 */
export function GewichtungenFeld({
  label,
  zeilen,
  onChange,
  fehler,
  hint,
}: GewichtungenFeldProps) {
  function aendere(id: number, feld: 'symbol' | 'gewicht', wert: string): void {
    onChange(zeilen.map((zeile) => (zeile.id === id ? { ...zeile, [feld]: wert } : zeile)))
  }

  function entferne(id: number): void {
    onChange(zeilen.filter((zeile) => zeile.id !== id))
  }

  function ergaenze(): void {
    // Die höchste bisherige Nummer plus eins: eine entfernte Zeile darf ihre Nummer nicht an eine
    // neue weitergeben, sonst hätte React zwei verschiedene Zeilen unter demselben Schlüssel.
    const naechsteId = zeilen.reduce((hoechste, zeile) => Math.max(hoechste, zeile.id), 0) + 1
    onChange([...zeilen, { id: naechsteId, symbol: '', gewicht: '' }])
  }

  return (
    <Box component="fieldset" sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
      <Typography component="legend" variant="subtitle2" sx={{ mb: 1 }}>
        {label}
      </Typography>

      <Stack spacing={1.5}>
        {zeilen.map((zeile, index) => (
          <Stack key={zeile.id} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <TextField
              label={`${label} Symbol ${index + 1}`}
              size="small"
              value={zeile.symbol}
              onChange={(event) => aendere(zeile.id, 'symbol', event.target.value)}
              // Ticker sind gross geschrieben, und die Anfrage schreibt sie ohnehin gross.
              slotProps={{ htmlInput: { style: { textTransform: 'uppercase' }, autoCapitalize: 'characters' } }}
              sx={{ flex: 2 }}
            />
            <TextField
              label={`${label} Gewicht ${index + 1}`}
              size="small"
              inputMode="decimal"
              value={zeile.gewicht}
              onChange={(event) => aendere(zeile.id, 'gewicht', event.target.value)}
              sx={{ flex: 1 }}
            />
            <IconButton
              aria-label={`Position ${index + 1} von ${label} entfernen`}
              onClick={() => entferne(zeile.id)}
              // Die letzte Zeile bleibt stehen: ohne Eingabefeld gäbe es keinen Weg zurück.
              disabled={zeilen.length <= 1}
              sx={{ mt: 0.5 }}
            >
              <DeleteOutlinedIcon />
            </IconButton>
          </Stack>
        ))}
      </Stack>

      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={ergaenze}
        disabled={zeilen.length >= maxPositionen}
        aria-label={`Position hinzufügen (${label})`}
        sx={{ mt: 1 }}
      >
        Position hinzufügen
      </Button>

      {fehler !== null && fehler !== undefined ? (
        <FormHelperText error>{fehler}</FormHelperText>
      ) : (
        hint !== undefined && <FormHelperText>{hint}</FormHelperText>
      )}
    </Box>
  )
}
