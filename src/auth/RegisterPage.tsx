import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { ModeToggle } from '../theme/ModeToggle'
import { passwordMinLength, requestRegistration } from './authApi'
import { describeApiError, type FormError } from './authErrors'
import { useAuth } from './useAuth'

/**
 * Selbstregistrierung.
 *
 * Der UI/UX-Plan führt "Selbstregistrierung gegen Admin-Anlage" als offenen Punkt. Das Backend hat
 * die Frage aber bereits entschieden: `POST /users` ist in `WebSecurityConfig` `permitAll` und
 * vergibt fest die Rolle PRIVATANLEGER. Diese Seite macht die vorhandene Entscheidung nur
 * bedienbar - ohne sie gäbe es auf einer frischen Datenbank keinen Benutzer, mit dem man sich
 * anmelden könnte.
 */
export function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<FormError | null>(null)
  const [pending, setPending] = useState(false)

  const passwordTooShort = password.length > 0 && password.length < passwordMinLength

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await requestRegistration(username, email, password)
      // Direkt anmelden statt auf die Login-Seite umzuleiten: die Zugangsdaten sind gerade
      // eingegeben worden, ein zweites Eintippen wäre reine Schikane.
      await login(username, password)
      navigate('/', { replace: true })
    } catch (caught) {
      setError(
        describeApiError(caught, {
          409: 'Benutzername oder E-Mail ist bereits vergeben',
        }),
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Stack
            direction="row"
            sx={{ mb: 3, justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <Box>
              <Typography variant="h5" component="h1">
                Konto anlegen
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Rolle Privatanleger
              </Typography>
            </Box>
            <ModeToggle />
          </Stack>

          {error !== null && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                label="Benutzername"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                autoFocus
                required
                fullWidth
                error={error?.fieldErrors.username !== undefined}
                helperText={error?.fieldErrors.username}
              />
              <TextField
                label="E-Mail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                fullWidth
                error={error?.fieldErrors.email !== undefined}
                helperText={error?.fieldErrors.email}
              />
              <TextField
                label="Passwort"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                fullWidth
                error={passwordTooShort || error?.fieldErrors.password !== undefined}
                helperText={
                  error?.fieldErrors.password ?? `Mindestens ${passwordMinLength} Zeichen`
                }
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                loading={pending}
                disabled={passwordTooShort}
                fullWidth
              >
                Konto anlegen
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" sx={{ mt: 3 }}>
            Schon ein Konto?{' '}
            <Link component={RouterLink} to="/login">
              Anmelden
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
