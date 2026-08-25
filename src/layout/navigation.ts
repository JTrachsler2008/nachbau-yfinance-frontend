import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import type { SvgIconComponent } from '@mui/icons-material'

export interface NavItem {
  label: string
  path: string
  icon: SvgIconComponent
}

/**
 * Hauptnavigation. Übernimmt die sechs Bereiche des Originals unverändert, weil der UI/UX-Plan die
 * Seitenaufteilung bewusst beibehält. Die Reihenfolge folgt dem Plan, nicht dem Original-Markup.
 */
export const navItems: readonly NavItem[] = [
  { label: 'Dashboard', path: '/', icon: InsightsOutlinedIcon },
  { label: 'Performance', path: '/performance', icon: ShowChartOutlinedIcon },
  { label: 'Risiko', path: '/risiko', icon: SpeedOutlinedIcon },
  { label: 'Transaktionen', path: '/transaktionen', icon: SwapHorizOutlinedIcon },
  { label: 'Konten', path: '/konten', icon: AccountBalanceWalletOutlinedIcon },
  { label: 'Vergleiche', path: '/szenario', icon: ScienceOutlinedIcon },
]

/**
 * Ob ein Navigationseintrag zum aktuellen Pfad gehört.
 *
 * Das Dashboard liegt auf `/` und darf deshalb nicht per Präfix verglichen werden, sonst wäre es
 * bei jedem Pfad aktiv.
 */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.path === '/') {
    return pathname === '/'
  }
  return pathname === item.path || pathname.startsWith(`${item.path}/`)
}
