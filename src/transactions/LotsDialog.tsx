import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/DataState'
import { ResponsiveTable, type Column } from '../components/ResponsiveTable'
import { useIsMobile } from '../components/useIsMobile'
import { formatDate, formatMoney, formatQuantity, missingValue } from '../format/numbers'
import type { Position } from '../positions/positionApi'
import type { Lot } from './transactionApi'
import { useLots } from './useTransactions'

interface LotsDialogProps {
  open: boolean
  position: Position
  onClose: () => void
}

/**
 * Offene FIFO-Tranchen einer Position (YOUNGOITV-450).
 *
 * Zeigt jede noch offene Tranche mit Kaufdatum, Menge, Kaufpreis und Einstand, dazu die Summe. Damit
 * ist nachvollziehbar, welche Stücke ein Verkauf als nächstes trifft, was bei einem Mischbestand aus
 * mehreren Käufen die eigentliche Frage ist.
 *
 * Die im UI/UX-Plan zusätzlich genannten zwei Diagramme (indexierte Wertentwicklung je Tranche,
 * Einstand gegen Marktwert) fehlen bewusst: sie brauchen historische und aktuelle Kurse je Wertpapier,
 * und das Backend hat für Positionen keinen Endpunkt, der die liefert. Erfundene oder clientseitig
 * geschätzte Kurse wären in einer Vermögensübersicht schlimmer als eine fehlende Grafik.
 */
export function LotsDialog({ open, position, onClose }: LotsDialogProps) {
  const isMobile = useIsMobile()
  const lots = useLots(position.accountId, position.securityId)

  const columns: readonly Column<Lot>[] = [
    {
      key: 'purchaseDate',
      label: 'Kaufdatum',
      render: (lot) => formatDate(lot.purchaseDate),
      primary: true,
    },
    {
      key: 'quantity',
      label: 'Menge',
      align: 'right',
      render: (lot) => formatQuantity(lot.quantity),
    },
    {
      key: 'purchasePrice',
      label: 'Kaufpreis',
      align: 'right',
      render: (lot) => formatMoney(lot.purchasePrice, position.tradingCurrency),
    },
    {
      key: 'cost',
      label: 'Einstand',
      align: 'right',
      render: (lot) => formatMoney(lot.quantity * lot.purchasePrice, position.tradingCurrency),
    },
  ]

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>
        Tranchen {position.symbol} in {position.accountName}
      </DialogTitle>
      <DialogContent>
        {lots.isPending ? (
          <LoadingPanel rows={3} />
        ) : lots.isError ? (
          <ErrorPanel
            error={lots.error}
            onRetry={() => void lots.refetch()}
            title="Tranchen konnten nicht geladen werden"
          />
        ) : lots.data.length === 0 ? (
          <EmptyPanel>
            Keine offenen Tranchen. Der Bestand wurde vollständig verkauft, oder die Buchungen
            stammen aus einer Übernahme statt aus Käufen.
          </EmptyPanel>
        ) : (
          <Stack spacing={2}>
            {/* Reihenfolge ist die Verkaufsreihenfolge: das Backend liefert die Tranchen nach
                Kaufdatum aufsteigend, und genau in dieser Folge verbraucht FIFO sie. */}
            <ResponsiveTable
              label="Offene Tranchen"
              columns={columns}
              rows={lots.data}
              rowKey={(lot) => `${lot.purchaseDate}-${lot.purchasePrice}-${lot.quantity}`}
            />
            <LotsSummary lots={lots.data} currency={position.tradingCurrency} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Schliessen</Button>
      </DialogActions>
    </Dialog>
  )
}

function LotsSummary({ lots, currency }: { lots: readonly Lot[]; currency: string }) {
  const quantity = lots.reduce((sum, lot) => sum + lot.quantity, 0)
  const cost = lots.reduce((sum, lot) => sum + lot.quantity * lot.purchasePrice, 0)

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Offene Menge
        </Typography>
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatQuantity(quantity)}
        </Typography>
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Einstand gesamt
        </Typography>
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(cost, currency)}
        </Typography>
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Durchschnittlicher Kaufpreis
        </Typography>
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {/* Aus den offenen Tranchen gewichtet, nicht das averagePurchasePrice der Position: das
              enthält Gebühren und Steuern des ganzen Bestands und weicht daher ab. */}
          {quantity === 0 ? missingValue : formatMoney(cost / quantity, currency)}
        </Typography>
      </Stack>
    </Stack>
  )
}
