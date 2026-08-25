import { createContext } from 'react'

export type NotificationSeverity = 'error' | 'warning' | 'info' | 'success'

export interface NotificationContextValue {
  /** Zeigt eine nicht blockierende Meldung. Eine neue ersetzt die vorherige. */
  notify: (message: string, severity?: NotificationSeverity) => void
}

/**
 * Getrennt von `NotificationProvider`, damit die Provider-Datei ausschliesslich Komponenten
 * exportiert. Gemischte Exporte aus einer .tsx-Datei brechen sonst das Fast Refresh von Vite.
 */
export const NotificationContext = createContext<NotificationContextValue | null>(null)
