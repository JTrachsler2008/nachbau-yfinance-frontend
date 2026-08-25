import { createContext } from 'react'

export interface AuthContextValue {
  /** Benutzername des angemeldeten Users, `null` wenn nicht angemeldet. */
  username: string | null
  isAuthenticated: boolean
  /** Meldet an und wirft im Fehlerfall den `ApiError` weiter, damit die Seite ihn anzeigen kann. */
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

/**
 * Getrennt von `AuthProvider`, damit die Provider-Datei ausschliesslich Komponenten exportiert.
 * Gemischte Exporte aus einer .tsx-Datei brechen sonst das Fast Refresh von Vite.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
