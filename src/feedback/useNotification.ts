import { useContext } from 'react'
import { NotificationContext, type NotificationContextValue } from './NotificationContext'

export function useNotification(): NotificationContextValue {
  const value = useContext(NotificationContext)
  if (value === null) {
    throw new Error('useNotification wurde ausserhalb von NotificationProvider verwendet')
  }
  return value
}
