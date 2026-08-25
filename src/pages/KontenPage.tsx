import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import type { Account } from '../accounts/accountApi'
import { AccountFormDialog } from '../accounts/AccountFormDialog'
import { CashMovementDialog, type CashDirection } from '../accounts/CashMovementDialog'
import { useAccounts } from '../accounts/useAccounts'
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/DataState'
import { PageHeader } from '../components/PageHeader'
import { ResponsiveTable, type Column } from '../components/ResponsiveTable'
import { formatAmount, formatMoney } from '../format/numbers'
import { PortfolioGate } from '../portfolios/PortfolioGate'
import type { Portfolio } from '../portfolios/portfolioApi'

/**
 * Konten des aktiven Portfolios (YOUNGOITV-447).
 *
 * Zeigt Name, Währung und Cash-Stand je Konto sowie die Summe der Cash-Stände. Die Summe wird nur je
 * Währung gebildet und nicht in die Basiswährung umgerechnet: dafür bräuchte es Tageskurse aus
 * `GET /fx-rates`, und eine stillschweigend falsch umgerechnete Summe wäre schlimmer als gar keine.
 */
export function KontenPage() {
  return <PortfolioGate>{(portfolio) => <KontenInhalt portfolio={portfolio} />}</PortfolioGate>
}

interface CashTarget {
  account: Account
  direction: CashDirection
}

function KontenInhalt({ portfolio }: { portfolio: Portfolio }) {
  const accounts = useAccounts(portfolio.id)
  const [formOpen, setFormOpen] = useState(false)
  const [cashTarget, setCashTarget] = useState<CashTarget | null>(null)

  const columns: readonly Column<Account>[] = [
    { key: 'name', label: 'Konto', render: (account) => account.name, primary: true },
    { key: 'currency', label: 'Währung', render: (account) => account.currency },
    {
      key: 'cash',
      label: 'Cash-Stand',
      align: 'right',
      render: (account) => formatMoney(account.cashAmount, account.currency),
    },
  ]

  return (
    <>
      <PageHeader
        title="Konten"
        subtitle={`Portfolio ${portfolio.name}`}
        actions={
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={() => setFormOpen(true)}
          >
            Neues Konto
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
      ) : accounts.data.length === 0 ? (
        <EmptyPanel>
          Noch kein Konto in diesem Portfolio. Ein Konto hält den Cash-Stand einer Währung und ist
          Voraussetzung für Transaktionen.
        </EmptyPanel>
      ) : (
        <Stack spacing={3}>
          <Card>
            <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
              <ResponsiveTable
                label="Konten"
                columns={columns}
                rows={accounts.data}
                rowKey={(account) => account.id}
                actions={(account) => (
                  <>
                    <Button
                      size="small"
                      onClick={() => setCashTarget({ account, direction: 'deposit' })}
                    >
                      Einzahlen
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setCashTarget({ account, direction: 'withdraw' })}
                      disabled={account.cashAmount <= 0}
                    >
                      Auszahlen
                    </Button>
                  </>
                )}
              />
            </CardContent>
          </Card>

          <CashSummary accounts={accounts.data} />
        </Stack>
      )}

      {formOpen && (
        <AccountFormDialog
          open
          portfolioId={portfolio.id}
          defaultCurrency={portfolio.baseCurrency}
          onClose={() => setFormOpen(false)}
        />
      )}

      {cashTarget !== null && (
        <CashMovementDialog
          open
          portfolioId={portfolio.id}
          account={cashTarget.account}
          direction={cashTarget.direction}
          onClose={() => setCashTarget(null)}
        />
      )}
    </>
  )
}

/** Summe der Cash-Stände je Währung. Ohne Umrechnung, siehe Hinweis am Seitenkopf. */
function CashSummary({ accounts }: { accounts: readonly Account[] }) {
  const totals = new Map<string, number>()
  for (const account of accounts) {
    totals.set(account.currency, (totals.get(account.currency) ?? 0) + account.cashAmount)
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          Cash je Währung
        </Typography>
        <Stack spacing={0.5}>
          {[...totals].map(([currency, total]) => (
            <Stack key={currency} direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {currency}
              </Typography>
              <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatAmount(total)}
              </Typography>
            </Stack>
          ))}
        </Stack>
        {totals.size > 1 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Keine Gesamtsumme über alle Währungen, weil dafür Tageskurse nötig wären.
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
