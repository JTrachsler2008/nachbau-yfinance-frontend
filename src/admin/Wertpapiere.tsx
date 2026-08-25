import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/DataState'
import { ResponsiveTable, type Column } from '../components/ResponsiveTable'
import { formatDate, formatPercent, missingValue } from '../format/numbers'
import type { Security } from '../securities/securityApi'
import { useSecurities } from '../securities/useSecurities'
import { SecurityFormDialog } from './SecurityFormDialog'

/**
 * Wertpapier-Stammdaten (YOUNGOITV-460).
 *
 * Das Gegenstück zur `Aktien.jsx` des Originals, die dort programmiert, aber nie geroutet war. Zwei
 * ihrer drei Funktionen fehlen hier bewusst: Kurse neu abgleichen und den Sektor überschreiben hat
 * das Backend nicht, es kennt für Wertpapiere ausschliesslich Anlegen und Lesen.
 *
 * Die Liste ist für jeden angemeldeten Benutzer lesbar (`GET /securities` ist nicht Admin-exklusiv),
 * sie steht hier trotzdem: ohne den Bestand daneben wäre nicht zu sehen, ob ein Symbol schon erfasst
 * ist, und genau daran hängt die Dublettenprüfung des Formulars.
 */
export function Wertpapiere() {
  const securities = useSecurities()
  const [formOpen, setFormOpen] = useState(false)

  const columns: readonly Column<Security>[] = [
    { key: 'symbol', label: 'Symbol', render: (security) => security.symbol, primary: true },
    { key: 'name', label: 'Name', render: (security) => security.name },
    { key: 'assetType', label: 'Art', render: (security) => security.assetType },
    {
      key: 'tradingCurrency',
      label: 'Währung',
      render: (security) => security.tradingCurrency,
    },
    {
      key: 'sector',
      label: 'Sektor',
      render: (security) => security.sector ?? missingValue,
      hideOnMobile: true,
    },
    {
      key: 'countryCode',
      label: 'Land',
      render: (security) => security.countryCode ?? missingValue,
      hideOnMobile: true,
    },
    {
      key: 'bond',
      label: 'Anleihe',
      render: (security) =>
        security.couponRate === null && security.maturityDate === null
          ? missingValue
          : `${formatPercent(security.couponRate ?? 0)} bis ${formatDate(security.maturityDate)}`,
      hideOnMobile: true,
    },
  ]

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Typography variant="subtitle2" component="h2">
          Erfasste Wertpapiere
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddOutlinedIcon />}
          onClick={() => setFormOpen(true)}
          disabled={securities.isPending || securities.isError}
        >
          Wertpapier anlegen
        </Button>
      </Stack>

      {securities.isPending ? (
        <LoadingPanel rows={5} />
      ) : securities.isError ? (
        <ErrorPanel
          error={securities.error}
          onRetry={() => void securities.refetch()}
          title="Wertpapiere konnten nicht geladen werden"
        />
      ) : securities.data.length === 0 ? (
        <EmptyPanel>
          Noch kein Wertpapier erfasst. Ohne Wertpapier lässt sich keine Transaktion buchen, das
          Auswahlfeld im Buchungsformular bleibt leer.
        </EmptyPanel>
      ) : (
        <Card>
          <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
            <ResponsiveTable
              label="Wertpapiere"
              columns={columns}
              rows={securities.data}
              rowKey={(security) => security.id}
            />
          </CardContent>
        </Card>
      )}

      <Typography variant="caption" color="text.secondary">
        Wertpapiere lassen sich anlegen, aber nicht ändern und nicht löschen: das Backend hat dafür
        keinen Endpunkt. Angaben wie Sektor oder Land sollten deshalb beim Anlegen stimmen.
      </Typography>

      {formOpen && (
        <SecurityFormDialog
          open
          bestand={securities.data ?? []}
          onClose={() => setFormOpen(false)}
        />
      )}
    </Stack>
  )
}
