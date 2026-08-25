import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserRole } from '../auth/authApi'
import { securityKeys } from '../securities/useSecurities'
import {
  createFxRate,
  createSecurity,
  findFxRate,
  updateUserRole,
  type FxRateInput,
  type SecurityInput,
} from './adminApi'

/**
 * Abfragen und Änderungen der Stammdatenpflege (YOUNGOITV-460).
 *
 * Auffällig ist, dass die Kurssuche eine Mutation ist und keine Abfrage: sie hat kein Ergebnis, das
 * im Hintergrund frisch gehalten werden müsste, sondern ist ein Nachschlagen auf Knopfdruck. Als
 * `useQuery` mit `enabled` bräuchte sie einen Zwischenzustand für "noch nichts gesucht" und würde bei
 * jedem Fokuswechsel des Fensters erneut anfragen.
 */

export function useCreateSecurity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SecurityInput) => createSecurity(input),
    onSuccess: async () => {
      // Dieselbe Liste füttert das Auswahlfeld des Transaktionsformulars. Ohne das Verwerfen wäre ein
      // neu angelegtes Wertpapier dort bis zu zehn Minuten unsichtbar (`staleTime` in useSecurities).
      await queryClient.invalidateQueries({ queryKey: securityKeys.all })
    },
  })
}

export function useCreateFxRate() {
  return useMutation({
    mutationFn: (input: FxRateInput) => createFxRate(input),
  })
}

export function useFindFxRate() {
  return useMutation({
    mutationFn: (variables: { base: string; quote: string; date: string }) =>
      findFxRate(variables.base, variables.quote, variables.date),
  })
}

export function useUpdateUserRole() {
  return useMutation({
    mutationFn: (variables: { id: number; role: UserRole }) =>
      updateUserRole(variables.id, variables.role),
  })
}
