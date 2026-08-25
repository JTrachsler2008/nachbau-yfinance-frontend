import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAccounts } from '../accounts/useAccounts'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/DataState'
import { PageHeader } from '../components/PageHeader'
import { ResponsiveTable, type Column } from '../components/ResponsiveTable'
import { formatDate, formatMoney, formatQuantity } from '../format/numbers'
import type { Position } from '../positions/positionApi'
import { usePositions } from '../positions/usePositions'
import { PortfolioGate } from '../portfolios/PortfolioGate'
import type { Portfolio } from '../portfolios/portfolioApi'
import { LotsDialog } from '../transactions/LotsDialog'
import { TransactionFormDialog } from '../transactions/TransactionFormDialog'
import {
  transactionTypeLabels,
  type PortfolioTransaction,
} from '../transactions/transactionApi'
import { useTransactions } from '../transactions/useTransactions'

/**
 * Transaktionen des aktiven Portfolios (YOUNGOITV-448, -449, -450).
 *
 * Drei Teile auf einer Seite, wie im Original: Buchen, Historie, Tranchen-Detail. Die Seite bündelt
 * sie, weil sie dieselbe Datenlage betreffen und ein Wechsel zwischen drei Routen für einen
 * Buchungsvorgang mehr kostet als er bringt.
 */
export function TransaktionenPage() {
  return (
    <PortfolioGate>
      {(portfolio) => <TransaktionenInhalt portfolio={portfolio} />}
    </PortfolioGate>
  )
}

/**
 * Wert des Konto-Filters für "kein Filter".
 *
 * Ein eigener Wert und nicht der leere String, weil MUI ein `Select` mit leerem Wert als "nichts
 * gewählt" behandelt und dann kein Label anzeigt.
 */
const alleKonten = 'alle'

function TransaktionenInhalt({ portfolio }: { portfolio: Portfolio }) {
  const accounts = useAccounts(portfolio.id)
  const transactions = useTransactions(portfolio.id)
  const positions = usePositions(portfolio.id)

  const [formOpen, setFormOpen] = useState(false)
  const [kontoFilter, setKontoFilter] = useState<string>(alleKonten)
  // Konto und Wertpapier der Tranchen-Ansicht stehen in der Adresse, damit das Dashboard und die
  // Performance-Seite später direkt darauf verlinken können (UI/UX-Plan: Link mit Query-Param).
  const [searchParams, setSearchParams] = useSearchParams()

  const gefiltert = useMemo(() => {
    const rows = transactions.data ?? []
    if (kontoFilter === alleKonten) {
      return rows
    }
    return rows.filter((row) => String(row.accountId) === kontoFilter)
  }, [transactions.data, kontoFilter])

  const gewaehltePosition = findePosition(positions.data ?? [], searchParams)

  function zeigeTranchen(position: Position): void {
    const next = new URLSearchParams(searchParams)
    next.set('konto', String(position.accountId))
    next.set('wertpapier', String(position.securityId))
    setSearchParams(next, { replace: true })
  }

  function schliesseTranchen(): void {
    const next = new URLSearchParams(searchParams)
    next.delete('konto')
    next.delete('wertpapier')
    setSearchParams(next, { replace: true })
  }

  const hatKonten = accounts.data !== undefined && accounts.data.length > 0

  return (
    <>
      <PageHeader
        title="Transaktionen"
        subtitle={`Portfolio ${portfolio.name}`}
        actions={
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={() => setFormOpen(true)}
            disabled={!hatKonten}
          >
            Neue Transaktion
          </Button>
        }
      />

      {accounts.isPending ? (
        <LoadingPanel rows={4} />
      ) : accounts.isError ? (
        <ErrorPanel
          error={accounts.error}
          onRetry={() => void accounts.refetch()}
          title="Konten konnten nicht geladen werden"
        />
      ) : !hatKonten ? (
        <EmptyPanel>
          Buchen braucht ein Konto. Auf der Konten-Seite eines anlegen und Cash einzahlen, danach
          lassen sich hier Käufe, Verkäufe und Dividenden erfassen.
        </EmptyPanel>
      ) : (
        <Stack spacing={3}>
          <Bestaende positions={positions} onTranchen={zeigeTranchen} />

          <Card>
            <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2, px: 1 }}
              >
                <Typography variant="subtitle2" component="h2">
                  Historie
                </Typography>
                <TextField
                  select
                  size="small"
                  label="Konto"
                  value={kontoFilter}
                  onChange={(event) => setKontoFilter(event.target.value)}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value={alleKonten}>Alle Konten</MenuItem>
                  {(accounts.data ?? []).map((account) => (
                    <MenuItem key={account.id} value={String(account.id)}>
                      {account.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              {transactions.isPending ? (
                <LoadingPanel rows={5} />
              ) : transactions.isError ? (
                <ErrorPanel
                  error={transactions.error}
                  onRetry={() => void transactions.refetch()}
                  title="Transaktionen konnten nicht geladen werden"
                />
              ) : gefiltert.length === 0 ? (
                <EmptyPanel>
                  {transactions.data.length === 0
                    ? 'Noch keine Transaktion in diesem Portfolio.'
                    : 'Für dieses Konto ist keine Transaktion gebucht.'}
                </EmptyPanel>
              ) : (
                <Historie rows={gefiltert} />
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {formOpen && accounts.data !== undefined && (
        <TransactionFormDialog
          open
          portfolioId={portfolio.id}
          accounts={accounts.data}
          onClose={() => setFormOpen(false)}
        />
      )}

      {gewaehltePosition !== null && (
        <LotsDialog open position={gewaehltePosition} onClose={schliesseTranchen} />
      )}
    </>
  )
}

/**
 * Liest die Tranchen-Auswahl aus der Adresse.
 *
 * Kein Treffer heisst kein Dialog: eine veraltete oder fremde Kombination aus Konto und Wertpapier
 * darf keinen leeren Dialog und keinen Request auf eine fremde Position auslösen.
 */
function findePosition(
  positions: readonly Position[],
  searchParams: URLSearchParams,
): Position | null {
  const konto = searchParams.get('konto')
  const wertpapier = searchParams.get('wertpapier')
  if (konto === null || wertpapier === null) {
    return null
  }
  return (
    positions.find(
      (position) =>
        String(position.accountId) === konto && String(position.securityId) === wertpapier,
    ) ?? null
  )
}

function Bestaende({
  positions,
  onTranchen,
}: {
  positions: ReturnType<typeof usePositions>
  onTranchen: (position: Position) => void
}) {
  const columns: readonly Column<Position>[] = [
    { key: 'symbol', label: 'Symbol', render: (row) => row.symbol, primary: true },
    { key: 'name', label: 'Wertpapier', render: (row) => row.securityName },
    { key: 'account', label: 'Konto', render: (row) => row.accountName },
    {
      key: 'quantity',
      label: 'Menge',
      align: 'right',
      render: (row) => formatQuantity(row.totalQuantity),
    },
    {
      key: 'average',
      label: 'Ø Kaufpreis',
      align: 'right',
      render: (row) => formatMoney(row.averagePurchasePrice, row.tradingCurrency),
    },
  ]

  return (
    <Card>
      <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
        <Typography variant="subtitle2" component="h2" sx={{ mb: 2, px: 1 }}>
          Bestände
        </Typography>
        {positions.isPending ? (
          <LoadingPanel rows={3} />
        ) : positions.isError ? (
          <ErrorPanel
            error={positions.error}
            onRetry={() => void positions.refetch()}
            title="Bestände konnten nicht geladen werden"
          />
        ) : positions.data.length === 0 ? (
          <EmptyPanel>
            Noch kein Bestand. Nach dem ersten Kauf stehen hier Menge und durchschnittlicher
            Kaufpreis je Wertpapier.
          </EmptyPanel>
        ) : (
          <>
            <ResponsiveTable
              label="Bestände"
              columns={columns}
              rows={positions.data}
              rowKey={(row) => row.id}
              actions={(row) => (
                <Button size="small" onClick={() => onTranchen(row)}>
                  Tranchen
                </Button>
              )}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1, px: 1 }}
            >
              Ohne aktuellen Kurs und Marktwert: die stammen aus Live-Kursabrufen, die das Backend
              für Bestände nicht anbietet.
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Historie({ rows }: { rows: readonly PortfolioTransaction[] }) {
  const columns: readonly Column<PortfolioTransaction>[] = [
    {
      key: 'date',
      label: 'Datum',
      render: (row) => formatDate(row.transactionDate),
      primary: true,
    },
    {
      key: 'type',
      label: 'Typ',
      render: (row) => (
        <Chip size="small" variant="outlined" label={transactionTypeLabels[row.transactionType]} />
      ),
    },
    { key: 'symbol', label: 'Symbol', render: (row) => row.symbol },
    { key: 'account', label: 'Konto', render: (row) => row.accountName, hideOnMobile: true },
    {
      key: 'quantity',
      label: 'Menge',
      align: 'right',
      // Beim Split steht die Stückzahl auf 0 und das Verhältnis trägt die Information.
      render: (row) =>
        row.transactionType === 'SPLIT'
          ? `1:${formatQuantity(row.splitRatio)}`
          : formatQuantity(row.quantity),
    },
    {
      key: 'price',
      label: 'Preis',
      align: 'right',
      render: (row) => formatMoney(row.price, row.transactionCurrency),
    },
    {
      key: 'total',
      label: 'Betrag',
      align: 'right',
      render: (row) => formatMoney(betrag(row), row.transactionCurrency),
    },
  ]

  return (
    <ResponsiveTable
      label="Transaktionen"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
    />
  )
}

/**
 * Betrag der Buchung in ihrer eigenen Währung.
 *
 * Kauf verteuert sich um Gebühr und Steuer, Verkauf verringert sich um beide, ein Split hat keinen
 * Betrag. Bewusst clientseitig gerechnet und nicht vom Backend geholt: es sind die Werte derselben
 * Zeile, und ein zusätzliches Feld im DTO hätte dieselbe Rechnung nur verschoben.
 */
function betrag(row: PortfolioTransaction): number | null {
  if (row.price === null) {
    return null
  }
  const brutto = row.price * row.quantity
  const fee = row.fee ?? 0
  const tax = row.tax ?? 0
  if (row.transactionType === 'SELL') {
    return brutto - fee - tax
  }
  if (row.transactionType === 'BUY') {
    return brutto + fee + tax
  }
  return brutto
}
