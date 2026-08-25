import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { describeApiError } from '../api/formErrors'
import type { UserRole } from '../auth/authApi'
import { useAuth } from '../auth/useAuth'
import type { AdminUser } from './adminApi'
import { useUpdateUserRole } from './useAdmin'

const rollen: readonly UserRole[] = ['PRIVATANLEGER', 'MANAGER', 'ADMIN']

/** Was die Rolle im Betrieb bedeutet. Die Codewörter des Backends sagen es niemandem von selbst. */
const rollenBeschreibung: Record<UserRole, string> = {
  PRIVATANLEGER: 'Führt eigene Portfolios. Keine fremden Portfolios, keine Stammdaten.',
  MANAGER: 'Darf zusätzlich Portfolios verwalten, für die ihn der Eigentümer als Manager einträgt.',
  ADMIN: 'Pflegt Wertpapiere, Wechselkurse und Rollen. Bekommt dadurch keinen Zugriff auf Portfolios.',
}

/**
 * Der 404er dieses Endpunkts kann nur eines heissen: es gibt keinen Benutzer mit dieser Nummer. Die
 * Übersetzung steht deshalb hier und nicht bei allen Verwaltungsformularen, wo sie für den
 * Kurs-Endpunkt schon falsch wäre.
 */
const rollenFehler: Partial<Record<number, string>> = {
  404: 'Es gibt keinen Benutzer mit dieser Nummer.',
}

/**
 * Rolle eines Benutzers ändern (YOUNGOITV-460).
 *
 * Angesprochen wird der Benutzer über seine Nummer, weil das Backend keinen Endpunkt zum Auflisten
 * oder Suchen von Benutzern hat. Ein Namensfeld würde eine Suche vortäuschen, die es nicht gibt; die
 * Antwort nennt dafür den Benutzernamen, sodass nach der Änderung überprüfbar ist, wen sie getroffen
 * hat. Eine falsche Nummer bleibt damit nicht unbemerkt, sie ist aber auch nicht verhindert.
 *
 * Vor der eigenen Nummer kann die Oberfläche nicht warnen, denn `GET /users/me` liefert nur Name und
 * Rolle, nicht die Nummer. Trifft die Änderung das eigene Konto, sagt die Meldung danach deutlich, was
 * geschehen ist: ein Admin, der sich selbst herabsetzt, verliert diesen Bereich beim nächsten
 * Anmelden, und ohne zweiten Admin hilft dann nur noch ein Eingriff in der Datenbank.
 */
export function Rollen() {
  const { username } = useAuth()
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<UserRole>('MANAGER')
  const [eingabefehler, setEingabefehler] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [geaendert, setGeaendert] = useState<AdminUser | null>(null)
  const update = useUpdateUserRole()

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setEingabefehler(null)
    setFehler(null)
    setGeaendert(null)

    const nummer = Number(userId.trim())
    if (!Number.isInteger(nummer) || nummer <= 0) {
      setEingabefehler('Bitte eine Benutzernummer eingeben, eine ganze Zahl grösser als 0.')
      return
    }

    try {
      const benutzer = await update.mutateAsync({ id: nummer, role })
      if (benutzer.username === username) {
        // Nachträglich erkannt, weil die Nummer des angemeldeten Admins im Frontend nicht bekannt ist:
        // `GET /users/me` liefert nur Name und Rolle. Die Änderung ist dann bereits passiert.
        setFehler(
          `Das war das eigene Konto. Die Rolle steht jetzt auf ${benutzer.role}; nach dem nächsten Anmelden gilt sie auch hier.`,
        )
        return
      }
      setGeaendert(benutzer)
      setUserId('')
    } catch (caught) {
      setFehler(describeApiError(caught, rollenFehler).message)
    }
  }

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <Typography variant="subtitle2" component="h2">
                Rolle zuweisen
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: 'flex-start' }}
              >
                <TextField
                  label="Benutzernummer"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  size="small"
                  inputMode="numeric"
                  error={eingabefehler !== null}
                  helperText={
                    eingabefehler ??
                    'Eine Benutzersuche gibt es im Backend nicht. Die Nummer nennt der Benutzer selbst.'
                  }
                  sx={{ minWidth: 220 }}
                />
                <TextField
                  select
                  label="Neue Rolle"
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                  size="small"
                  helperText={rollenBeschreibung[role]}
                  sx={{ minWidth: 220 }}
                >
                  {rollen.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  type="submit"
                  variant="contained"
                  loading={update.isPending}
                  disabled={userId.trim() === ''}
                  sx={{ mt: { sm: 0.5 } }}
                >
                  Rolle setzen
                </Button>
              </Stack>

              {fehler !== null && <Alert severity="error">{fehler}</Alert>}

              {geaendert !== null && (
                <Alert severity="success">
                  {geaendert.username} (Nummer {geaendert.id}) hat jetzt die Rolle {geaendert.role}.
                </Alert>
              )}
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.secondary">
        Die Rolle wird gesetzt, nicht ergänzt: jeder Benutzer hat genau eine. Wer die Rolle Manager
        verliert, verliert damit auch den Zugriff auf alle Portfolios, für die er als Manager
        eingetragen war; die Zuordnung selbst bleibt bestehen und wirkt wieder, sobald er die Rolle
        zurückbekommt.
      </Typography>
    </Stack>
  )
}
