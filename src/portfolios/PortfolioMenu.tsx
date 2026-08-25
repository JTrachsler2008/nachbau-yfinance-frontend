import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import CheckIcon from '@mui/icons-material/Check'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { describeApiError } from '../api/formErrors'
import { ConfirmDialog } from '../components/ConfirmDialog'
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
 */
export function PortfolioMenu() {
  const { portfolios, selected, select, isLoading, error, refetch } = useSelectedPortfolio()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [formFor, setFormFor] = useState<'new' | Portfolio | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const remove = useDeletePortfolio()

  function closeMenu(): void {
    setAnchor(null)
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

      <Menu anchorEl={anchor} open={anchor !== null} onClose={closeMenu}>
        {portfolios.map((portfolio) => (
          <MenuItem
            key={portfolio.id}
            selected={portfolio.id === selected?.id}
            onClick={() => {
              select(portfolio.id)
              closeMenu()
            }}
          >
            <ListItemIcon>{portfolio.id === selected?.id && <CheckIcon fontSize="small" />}</ListItemIcon>
            <ListItemText primary={portfolio.name} secondary={portfolio.baseCurrency} />
          </MenuItem>
        ))}

        {portfolios.length > 0 && <Divider />}

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
