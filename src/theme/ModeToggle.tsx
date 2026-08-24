import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import Skeleton from '@mui/material/Skeleton'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import { useColorScheme } from '@mui/material/styles'

const MODES = ['light', 'system', 'dark'] as const

type Mode = (typeof MODES)[number]

function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value)
}

const LABELS: Record<Mode, string> = {
  light: 'Hell',
  system: 'Systemeinstellung',
  dark: 'Dunkel',
}

/**
 * Umschalter Hell / Systemeinstellung / Dunkel.
 *
 * `useColorScheme` liefert beim ersten Rendern noch keinen Modus, weil der gespeicherte Wert erst
 * clientseitig gelesen wird. Bis dahin wird ein Platzhalter gleicher Groesse gezeigt, damit das
 * Layout nicht springt.
 */
export function ModeToggle() {
  const { mode, setMode } = useColorScheme()

  if (mode === undefined) {
    return <Skeleton variant="rounded" width={144} height={40} />
  }

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={mode}
      onChange={(_event, value: string | null) => {
        // null kommt, wenn auf den bereits aktiven Button geklickt wird. Dann nichts tun,
        // sonst gaebe es einen Zustand ohne Auswahl.
        if (value !== null && isMode(value)) {
          setMode(value)
        }
      }}
      aria-label="Farbmodus"
    >
      <ToggleButton value="light" aria-label={LABELS.light}>
        <Tooltip title={LABELS.light}>
          <LightModeIcon fontSize="small" />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value="system" aria-label={LABELS.system}>
        <Tooltip title={LABELS.system}>
          <SettingsBrightnessIcon fontSize="small" />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value="dark" aria-label={LABELS.dark}>
        <Tooltip title={LABELS.dark}>
          <DarkModeIcon fontSize="small" />
        </Tooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  )
}
