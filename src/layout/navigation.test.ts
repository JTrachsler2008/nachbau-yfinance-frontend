import { describe, expect, it } from 'vitest'
import { isNavItemActive, navItems, navItemsFor } from './navigation'

function itemFor(path: string) {
  const item = navItems.find((candidate) => candidate.path === path)
  if (item === undefined) {
    throw new Error(`Kein Navigationseintrag mit Pfad ${path}`)
  }
  return item
}

describe('navItems', () => {
  it('enthält die sechs Bereiche des Originals ohne Rollenbindung', () => {
    // Die Verwaltung kommt aus dem Nachbau (YOUNGOITV-460) und hängt an einer Rolle, die sechs
    // Bereiche des Originals stehen für jeden angemeldeten Benutzer.
    expect(navItems.filter((item) => item.role === undefined).map((item) => item.label)).toEqual([
      'Dashboard',
      'Performance',
      'Risiko',
      'Transaktionen',
      'Konten',
      'Vergleiche',
    ])
  })

  it('vergibt jeden Pfad nur einmal', () => {
    // Doppelte Pfade würden zwei Einträge gleichzeitig markieren und React-Keys kollidieren lassen.
    const paths = navItems.map((item) => item.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('nutzt absolute Pfade, damit die Links unabhängig vom aktuellen Ort greifen', () => {
    for (const item of navItems) {
      expect(item.path.startsWith('/')).toBe(true)
    }
  })
})

describe('navItemsFor', () => {
  it('gibt einem Admin alle Einträge', () => {
    expect(navItemsFor('ADMIN')).toEqual(navItems)
  })

  it('lässt die Verwaltung bei allen anderen Rollen weg', () => {
    // Die Rollen sind nicht hierarchisch: ein Manager hat mehr Rechte als ein Privatanleger, aber
    // keine Stammdatenrechte. Ein Vergleich per Rangfolge würde hier durchlassen.
    for (const rolle of ['PRIVATANLEGER', 'MANAGER'] as const) {
      expect(navItemsFor(rolle).map((item) => item.path)).not.toContain('/verwaltung')
      expect(navItemsFor(rolle)).toHaveLength(navItems.length - 1)
    }
  })

  it('zeigt ohne bekannte Rolle nur die freien Einträge', () => {
    // `null` heisst "Rolle noch nicht geladen". Dann lieber einen Eintrag zu wenig als einen, der
    // beim Öffnen sofort zurückwirft.
    expect(navItemsFor(null).map((item) => item.path)).not.toContain('/verwaltung')
  })
})

describe('isNavItemActive', () => {
  it('markiert den exakt passenden Eintrag', () => {
    expect(isNavItemActive(itemFor('/performance'), '/performance')).toBe(true)
  })

  it('markiert einen Eintrag auch bei einem Unterpfad', () => {
    // Vorbereitung für Detailseiten wie /konten/3, die weiterhin Konten hervorheben sollen.
    expect(isNavItemActive(itemFor('/konten'), '/konten/3')).toBe(true)
  })

  it('markiert das Dashboard nur auf der Wurzel und nicht per Präfix', () => {
    const dashboard = itemFor('/')
    expect(isNavItemActive(dashboard, '/')).toBe(true)
    expect(isNavItemActive(dashboard, '/risiko')).toBe(false)
  })

  it('markiert nicht bei einem gleich beginnenden, aber anderen Pfad', () => {
    // /risikoprofil ist kein Unterpfad von /risiko, ein reiner startsWith-Vergleich würde irren.
    expect(isNavItemActive(itemFor('/risiko'), '/risikoprofil')).toBe(false)
  })

  it('markiert zu jedem Navigationspfad genau einen Eintrag', () => {
    for (const item of navItems) {
      const active = navItems.filter((candidate) => isNavItemActive(candidate, item.path))
      expect(active).toEqual([item])
    }
  })
})
