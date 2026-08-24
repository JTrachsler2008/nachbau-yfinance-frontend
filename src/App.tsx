import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { apiBaseUrl } from './api/client'
import { ModeToggle } from './theme/ModeToggle'

const CHF = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const PERCENT = new Intl.NumberFormat('de-CH', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'always',
})

/** Beispieldaten. Nur zur Sichtpruefung des Themes, bis die echten Endpunkte angebunden sind. */
const DEMO_POSITIONS = [
  { symbol: 'AAPL', quantity: 120, value: 42_100, changePercent: 8.1 },
  { symbol: 'NESN', quantity: 80, value: 18_250, changePercent: -2.3 },
  { symbol: 'MSFT', quantity: 45, value: 31_900, changePercent: 3.7 },
  { symbol: 'VWRL', quantity: 210, value: 32_100, changePercent: 1.2 },
] as const

const DEMO_BADGES = [
  { label: 'Kauf', token: 'badgeBuy' },
  { label: 'Verkauf', token: 'badgeSell' },
  { label: 'Dividende', token: 'badgeDividend' },
] as const

function App() {
  const total = DEMO_POSITIONS.reduce((sum, position) => sum + position.value, 0)

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ mb: 3, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box>
            <Typography variant="h5" component="h1">
              Aktienportfolio
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Nachbau, Frontend-Grundgeruest
            </Typography>
          </Box>
          <ModeToggle />
        </Stack>

        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Gesamtwert Portfolio
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ mb: 3, alignItems: 'baseline' }}>
              <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                CHF {CHF.format(total)}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontVariantNumeric: 'tabular-nums',
                  color: (theme) => theme.vars.palette.finance.gainText,
                }}
              >
                {PERCENT.format(4.2)} %
              </Typography>
            </Stack>

            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell align="right">Anzahl</TableCell>
                    <TableCell align="right">Wert CHF</TableCell>
                    <TableCell align="right">Veraenderung</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {DEMO_POSITIONS.map((position) => (
                    <TableRow key={position.symbol}>
                      <TableCell sx={{ fontWeight: 600 }}>{position.symbol}</TableCell>
                      <TableCell align="right">{position.quantity}</TableCell>
                      <TableCell align="right">{CHF.format(position.value)}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 700,
                          color: (theme) =>
                            position.changePercent >= 0
                              ? theme.vars.palette.finance.gainText
                              : theme.vars.palette.finance.lossText,
                        }}
                      >
                        {PERCENT.format(position.changePercent)} %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="subtitle2" gutterBottom>
              Theme-Tokens
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Sichtpruefung fuer beide Farbmodi. Alle Werte stammen aus dem Theme, keine Literale im
              Komponentencode.
            </Typography>

            <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 3, flexWrap: 'wrap' }}>
              {DEMO_BADGES.map((badge) => (
                <Box
                  key={badge.token}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    bgcolor: (theme) => theme.vars.palette.finance[badge.token].background,
                    color: (theme) => theme.vars.palette.finance[badge.token].color,
                  }}
                >
                  {badge.label}
                </Box>
              ))}
            </Stack>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="body2" color="text.secondary" gutterBottom>
              Diagramm-Palette fuer Recharts
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {Array.from({ length: 8 }, (_unused, index) => index).map((index) => (
                <Box
                  key={index}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 10 / 8,
                    bgcolor: (theme) => theme.vars.palette.finance.chart[index],
                  }}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
          Backend-Basis-URL: <code>{apiBaseUrl}</code>
        </Typography>
      </Container>
    </Box>
  )
}

export default App
