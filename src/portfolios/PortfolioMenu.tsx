import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import CheckIcon from '@mui/icons-material/Check'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { describeApiError } from '../api/formErrors'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useIsMobile } from '../components/useIsMobile'
import { ManagerDialog } from './ManagerDialog'
import { PortfolioFormDialog } from './PortfolioFormDialog'
import type { Portfolio } from './portfolioApi'
import { useDeletePortfolio } from './usePortfolios'
import { useSelectedPortfolio } from './useSelectedPortfolio'

/**
 * Portfolio-Auswahl in der Kopfzeile (YOUNGOITV-446).
 *
 * Entspricht dem Dropdown des Originals, aber ohne dessen hartcodierte User-ID: `POST /portfolios`
 * ordnet das Portfolio dem Token-User zu. Löschen läuft über einen Dialog mit Namensnennung statt
 * über `window.confirm()`.
 *
 * Ein Portfolio-Manager sieht seine Mandate als zweite Sektion (YOUNGOITV-459). Sie sind auswählbar
 * wie eigene Portfolios, tragen aber den Namen des Eigentümers, und das aktive Mandat wird in der
 * Kopfzeile zusätzlich als solches ausgewiesen.
 */
export function PortfolioMenu() {
  const {
    portfolios,
    mandates,
    selected,
    isMandate,
    select,
    isLoading,
    error,
    mandatesError,
    refetch,
  } = useSelectedPortfolio()
  const isMobile = useIsMobile()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [formFor, setFormFor] = useState<'new' | Portfolio | null>(null)
  const [managerFor, setManagerFor] = useState<Portfolio | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const remove = useDeletePortfolio()

  function closeMenu(): void {
    setAnchor(null)
  }

  /**
   * Ein Eintrag der Auswahl. Bei einem Mandat steht der Eigentümer in der zweiten Zeile, denn der
   * Name allein ("Altersvorsorge") sagt nicht, wessen Geld gemeint ist.
   */
  function eintrag(portfolio: Portfolio, mandat: boolean) {
    return (
      <MenuItem
        key={portfolio.id}
        selected={portfolio.id === selected?.id}
        onClick={() => {
          select(portfolio.id)
          closeMenu()
        }}
      >
        <ListItemIcon>
          {portfolio.id === selected?.id && <CheckIcon fontSize="small" />}
        </ListItemIcon>
        <ListItemText
          primary={portfolio.name}
          secondary={
            mandat
              ? `${portfolio.baseCurrency}, Eigentümer ${portfolio.ownerUsername}`
              : portfolio.baseCurrency
          }
        />
      </MenuItem>
    )
  }

  async function handleDelete(): Promise<void> {
    if (deleteTarget === null) {
      return
    }
    setDeleteError(null)
    try {
      await remove.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch (caught) {
      setDeleteError(describeApiError(caught).message)
    }
  }

  if (isLoading) {
    return (
      <Button size="small" color="inherit" disabled>
        Portfolios laden
      </Button>
    )
  }

  if (error !== null && error !== undefined) {
    return (
      <Button size="small" color="error" onClick={refetch}>
        Portfolios nicht geladen
      </Button>
    )
  }

  return (
    <>
      <Button
        size="small"
        color="inherit"
        onClick={(event) => setAnchor(event.currentTarget)}
        endIcon={<ExpandMoreIcon />}
        aria-haspopup="menu"
        aria-label="Portfolio wählen"
        sx={{ maxWidth: { xs: 140, sm: 260 } }}
      >
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {selected === null ? 'Kein Portfolio' : `${selected.name} (${selected.baseCurrency})`}
        </Typography>
      </Button>

      {isMandate && selected !== null && (
        // Steht neben der Auswahl und nicht im Menü: die Warnung nützt nur, wenn sie dauerhaft
        // sichtbar ist. Auf dem Telefon bleibt der Name des Eigentümers, der Rest ist Beiwerk.
        <Chip
          size="small"
          variant="outlined"
          icon={<SupervisorAccountOutlinedIcon />}
          label={isMobile ? selected.ownerUsername : `Mandat von ${selected.ownerUsername}`}
          sx={{ ml: 1, flexShrink: 0 }}
        />
      )}

      <Menu anchorEl={anchor} open={anchor !== null} onClose={closeMenu}>
        {mandates.length > 0 && <ListSubheader key="eigene-titel">Eigene Portfolios</ListSubheader>}
        {portfolios.map((portfolio) => eintrag(portfolio, false))}

        {mandates.length > 0 && <ListSubheader key="mandate-titel">Meine Mandanten</ListSubheader>}
        {mandates.map((mandat) => eintrag(mandat, true))}

        {mandatesError !== null && mandatesError !== undefined && (
          <MenuItem key="mandate-fehler" onClick={refetch}>
            <ListItemIcon>
              <SupervisorAccountOutlinedIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText
              primary="Mandate nicht geladen"
              secondary="Zum erneuten Versuch antippen"
            />
          </MenuItem>
        )}

        {(portfolios.length > 0 || mandates.length > 0) && <Divider />}

        <MenuItem
          onClick={() => {
            setFormFor('new')
            closeMenu()
          }}
        >
          <ListItemIcon>
            <AddOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Neues Portfolio" />
        </MenuItem>

        {selected !== null && (
          <MenuItem
            onClick={() => {
              setFormFor(selected)
              closeMenu()
            }}
          >
            <ListItemIcon>
              <EditOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Portfolio bearbeiten" />
          </MenuItem>
        )}

        {selected !== null && !isMandate && (
          // Nur beim eigenen Portfolio: der Server lässt hier ausschliesslich den Eigentümer zu, ein
          // Manager bekäme 403. Ein Eintrag, der immer scheitert, wäre eine leere Zusage.
          <MenuItem
            onClick={() => {
              setManagerFor(selected)
              closeMenu()
            }}
          >
            <ListItemIcon>
              <SupervisorAccountOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Portfolio-Manager"
              secondary={selected.managerUsername ?? 'Nicht zugeordnet'}
            />
          </MenuItem>
        )}

        {selected !== null && (
          <MenuItem
            onClick={() => {
              setDeleteTarget(selected)
              closeMenu()
            }}
          >
            <ListItemIcon>
              <DeleteOutlinedIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary="Portfolio löschen" />
          </MenuItem>
        )}
      </Menu>

      {formFor !== null && (
        <PortfolioFormDialog
          open
          portfolio={formFor === 'new' ? null : formFor}
          onClose={() => setFormFor(null)}
          onCreated={(created) => select(created.id)}
        />
      )}

      {managerFor !== null && (
        <ManagerDialog open portfolio={managerFor} onClose={() => setManagerFor(null)} />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Portfolio löschen"
        confirmLabel="Löschen"
        destructive
        pending={remove.isPending}
        error={deleteError}
        onConfirm={() => void handleDelete()}
        onClose={() => {
          setDeleteTarget(null)
          setDeleteError(null)
        }}
      >
        <>
          Portfolio <strong>{deleteTarget?.name}</strong> und alle darin enthaltenen Konten,
          Positionen und Transaktionen werden gelöscht. Das lässt sich nicht rückgängig machen.
        </>
      </ConfirmDialog>
    </>
  )
}
