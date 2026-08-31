import { createContext } from 'react'
import type { UserRole } from './authApi'

export interface AuthContextValue {
  /** Benutzername des angemeldeten Users, `null` wenn nicht angemeldet. */
  username: string | null
  /**
   * Rolle des angemeldeten Users, `null` wenn nicht angemeldet.
   *
   * Steuert ausschliesslich die Sichtbarkeit in der Oberfläche (YOUNGOITV-459/460): welche
   * Navigationseinträge und Sektionen erscheinen. Die Berechtigung selbst prüft immer das Backend,
   * ein manipulierter Wert im Browser öffnet also keinen Zugriff, sondern nur eine Ansicht, deren
   * Abfragen mit 403 antworten.
   */
  role: UserRole | null
  isAuthenticated: boolean
  /**
   * `true`, bis der Start-Refresh entschieden hat, ob das httpOnly-Cookie eine Sitzung fortsetzt.
   *
   * In dieser Zeit ist `isAuthenticated` noch `false`, ohne dass das schon "nicht angemeldet"
   * bedeutet. Die Route-Guards müssen den Unterschied kennen, sonst leiten sie bei jedem Reload
   * kurz auf die Login-Seite um.
   */
  isBootstrapping: boolean
  /** Meldet an und wirft im Fehlerfall den `ApiError` weiter, damit die Seite ihn anzeigen kann. */
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

/**
 * Getrennt von `AuthProvider`, damit die Provider-Datei ausschliesslich Komponenten exportiert.
 * Gemischte Exporte aus einer .tsx-Datei brechen sonst das Fast Refresh von Vite.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
