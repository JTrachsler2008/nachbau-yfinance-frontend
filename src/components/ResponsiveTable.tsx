import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import type { ReactNode } from 'react'

export interface Column<T> {
  /** Eindeutig innerhalb der Tabelle, dient als React-Key. */
  key: string
  label: string
  align?: 'left' | 'right'
  render: (row: T) => ReactNode
  /**
   * Kennzeichnet die Spalte, die eine Zeile identifiziert (Symbol, Kontoname). Sie wird auf Mobile
   * zur Kartenüberschrift. Ohne eine solche Spalte bekommt die Karte keinen Kopf.
   */
  primary?: boolean
  /** Auf Mobile weglassen, wenn die Angabe dort mehr Platz kostet als sie nützt. */
  hideOnMobile?: boolean
}

interface ResponsiveTableProps<T> {
  columns: readonly Column<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string | number
  /** Beschriftung für Screenreader, etwa "Positionen". */
  label: string
  /** Zusatzinhalt je Zeile, etwa Aktionsknöpfe. Steht in der Tabelle in einer eigenen Spalte. */
  actions?: (row: T) => ReactNode
}

/**
 * Datentabelle, die unterhalb des `sm`-Breakpoints zu Karten wird.
 *
 * Umsetzung des Responsive-Konzepts (YOUNGOITV-458): das Original liess Tabellen mit fixer
 * `min-width` horizontal scrollen, was auf einem Telefon die primäre Interaktion war. Eine Karte je
 * Zeile mit Label/Wert-Paaren liest sich dort besser. Tabellen mit sehr vielen Spalten (etwa eine
 * Spalte pro Jahr) sind laut Plan bewusst ausgenommen und nutzen weiterhin die Tabelle.
 */
export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  label,
  actions,
}: ResponsiveTableProps<T>) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  if (isMobile) {
    const primary = columns.find((column) => column.primary === true)
    const details = columns.filter(
      (column) => column.primary !== true && column.hideOnMobile !== true,
    )

    return (
      <Stack spacing={1.5} component="ul" aria-label={label} sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {rows.map((row) => (
          <Card key={rowKey(row)} component="li">
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              {primary !== undefined && (
                <>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {primary.render(row)}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                </>
              )}
              <Stack spacing={0.75}>
                {details.map((column) => (
                  <Stack
                    key={column.key}
                    direction="row"
                    sx={{ justifyContent: 'space-between', gap: 2 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {column.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {column.render(row)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              {actions !== undefined && (
                <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions(row)}</Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
    )
  }

  return (
    <TableContainer>
      <Table size="small" aria-label={label}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.key} align={column.align ?? 'left'}>
                {column.label}
              </TableCell>
            ))}
            {actions !== undefined && <TableCell align="right">Aktionen</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((column) => (
                <TableCell key={column.key} align={column.align ?? 'left'}>
                  {column.render(row)}
                </TableCell>
              ))}
              {actions !== undefined && (
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    {actions(row)}
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
