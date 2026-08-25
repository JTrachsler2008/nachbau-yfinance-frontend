import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import { useState } from 'react'
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { PortfolioMenu } from '../portfolios/PortfolioMenu'
import { ModeToggle } from '../theme/ModeToggle'
import { isNavItemActive, navItems } from './navigation'

const drawerWidth = 240

/**
 * App-Shell mit Kopfzeile und Navigation.
 *
 * Auf Desktop steht die Navigation als dauerhafte Seitenleiste, unterhalb des Breakpoints als
 * Drawer hinter einem Hamburger-Knopf. Das Original brach seine Inline-Links stattdessen in eine
 * zweite Navigationszeile um, die auf kleinen Bildschirmen viel Höhe kostet (UI/UX-Plan,
 * Responsive-Konzept).
 */
export function AppShell() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { username, logout } = useAuth()

  function handleLogout(): void {
    logout()
    navigate('/login', { replace: true })
  }

  const navigation = (
    <Box role="navigation" aria-label="Hauptnavigation">
      <List sx={{ py: 1 }}>
        {navItems.map((item) => {
          const active = isNavItemActive(item, location.pathname)
          const Icon = item.icon
          return (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={item.path}
                selected={active}
                aria-current={active ? 'page' : undefined}
                onClick={() => setDrawerOpen(false)}
                // 48px Höhe als Touch-Ziel, der UI/UX-Plan verlangt mindestens 44px.
                sx={{ minHeight: 48 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
    </Box>
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        color="default"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          // Über dem Drawer, damit die Kopfzeile auch auf Desktop durchläuft.
          zIndex: (currentTheme) => currentTheme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          {!isDesktop && (
            <IconButton
              edge="start"
              aria-label="Navigation öffnen"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            component="div"
            noWrap
            // Auf sehr kleinen Bildschirmen weicht der Anwendungsname der Portfolio-Auswahl: welches
            // Portfolio gerade aktiv ist, muss der Nutzer sehen, den Namen der App nicht.
            sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}
          >
            Aktienportfolio
          </Typography>

          <PortfolioMenu />

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <ModeToggle />
            {username !== null && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: { xs: 'none', sm: 'block' } }}
              >
                {username}
              </Typography>
            )}
            {isDesktop ? (
              <Button
                onClick={handleLogout}
                startIcon={<LogoutOutlinedIcon />}
                color="inherit"
                size="small"
              >
                Abmelden
              </Button>
            ) : (
              <Tooltip title="Abmelden">
                <IconButton onClick={handleLogout} aria-label="Abmelden">
                  <LogoutOutlinedIcon />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          <Toolbar />
          <Divider />
          {navigation}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}
        >
          <Toolbar />
          <Divider />
          {navigation}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          ml: { md: `${drawerWidth}px` },
          px: { xs: 2, md: 3 },
          pb: 4,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
}
