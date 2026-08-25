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
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { ModeToggle } from '../theme/ModeToggle'
import { describeApiError, type FormError } from './authErrors'
import { useAuth } from './useAuth'

/** Ziel, auf das nach dem Anmelden gesprungen wird, wenn kein anderes angefordert wurde. */
const defaultTarget = '/'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<FormError | null>(null)
  const [pending, setPending] = useState(false)

  // Der Route-Guard legt das ursprünglich angeforderte Ziel im History-State ab.
  const state = location.state as { from?: string } | null
  const target = state?.from ?? defaultTarget

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await login(username, password)
      navigate(target, { replace: true })
    } catch (caught) {
      setError(
        describeApiError(caught, {
          401: 'Benutzername oder Passwort ist falsch',
          403: 'Benutzername oder Passwort ist falsch',
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
                Aktienportfolio
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bitte anmelden
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
                label="Passwort"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                fullWidth
                error={error?.fieldErrors.password !== undefined}
                helperText={error?.fieldErrors.password}
              />
              <Button type="submit" variant="contained" size="large" loading={pending} fullWidth>
                Anmelden
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" sx={{ mt: 3 }}>
            Noch kein Konto?{' '}
            <Link component={RouterLink} to="/registrieren">
              Registrieren
            </Link>
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Die Anmeldung gilt nur für diesen Tab und wird nicht gespeichert. Das ist Absicht: ein
            Token im Browserspeicher wäre per XSS auslesbar. Nach einem Reload ist daher eine neue
            Anmeldung nötig.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
