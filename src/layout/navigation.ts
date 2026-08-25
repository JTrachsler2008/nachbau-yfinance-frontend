import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import type { SvgIconComponent } from '@mui/icons-material'
import type { UserRole } from '../auth/authApi'

export interface NavItem {
  label: string
  path: string
  icon: SvgIconComponent
  /** Rolle, die den Eintrag sichtbar macht. Ohne Angabe sieht ihn jeder angemeldete Benutzer. */
  role?: UserRole
}

/**
 * Hauptnavigation. Übernimmt die sechs Bereiche des Originals unverändert, weil der UI/UX-Plan die
 * Seitenaufteilung bewusst beibehält. Die Reihenfolge folgt dem Plan, nicht dem Original-Markup.
 *
 * Die Verwaltung kommt hinzu (YOUNGOITV-460) und steht am Ende, weil sie nichts mit dem aktiven
 * Portfolio zu tun hat.
 */
export const navItems: readonly NavItem[] = [
  { label: 'Dashboard', path: '/', icon: InsightsOutlinedIcon },
  { label: 'Performance', path: '/performance', icon: ShowChartOutlinedIcon },
  { label: 'Risiko', path: '/risiko', icon: SpeedOutlinedIcon },
  { label: 'Transaktionen', path: '/transaktionen', icon: SwapHorizOutlinedIcon },
  { label: 'Konten', path: '/konten', icon: AccountBalanceWalletOutlinedIcon },
  { label: 'Vergleiche', path: '/szenario', icon: ScienceOutlinedIcon },
  { label: 'Verwaltung', path: '/verwaltung', icon: SettingsOutlinedIcon, role: 'ADMIN' },
]

/**
 * Die für eine Rolle sichtbaren Einträge.
 *
 * Ausblenden statt Ausgrauen: ein Eintrag, den ein Privatanleger nie öffnen kann, ist für ihn keine
 * Information, sondern eine Sackgasse. Die Rollen sind nicht hierarchisch, ein Admin ist also kein
 * "Privatanleger mit mehr Rechten" - deshalb wird auf Gleichheit geprüft und nicht auf eine Rangfolge.
 *
 * Der Schutz der Route liegt nicht hier, sondern im `RequireAdmin`-Guard und verbindlich im Backend.
 */
export function navItemsFor(role: UserRole | null): readonly NavItem[] {
  return navItems.filter((item) => item.role === undefined || item.role === role)
}

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
