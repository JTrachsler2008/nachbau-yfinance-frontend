import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import Chip from '@mui/material/Chip'

/**
 * Kennzeichnet ein Ergebnis als hypothetisch.
 *
 * Steht an jeder Ergebniskarte dieser Seite, weil die Zahlen wie echte Portfoliozahlen aussehen, aber
 * keine sind: sie entstehen aus Kursreihen, nicht aus Buchungen, und werden nirgends gespeichert
 * (fachlicher Plan, Hinweise 13 und 14). Ohne diese Marke wäre ein Screenshot des Endwerts nicht von
 * einem echten Depotwert zu unterscheiden.
 */
export function SimulationBadge() {
  return (
    <Chip
      size="small"
      color="secondary"
      variant="outlined"
      icon={<ScienceOutlinedIcon />}
      label="Simulation"
    />
  )
}
