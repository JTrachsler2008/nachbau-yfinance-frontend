import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import {
  fetchSecurities,
  lookupOrCreateSecurity,
  searchSecurities,
  type Security,
  type SecuritySearchResult,
} from './securityApi'

export const securityKeys = {
  all: ['securities'] as const,
  search: (query: string) => ['securities', 'search', query] as const,
}

/**
 * Wertpapier-Stammdaten.
 *
 * Lange `staleTime`, weil Symbol, Name und Währung eines Wertpapiers sich praktisch nie ändern.
 * Ohne das würde die Liste bei jedem Öffnen des Transaktionsdialogs neu geholt.
 */
export function useSecurities(): UseQueryResult<Security[]> {
  return useQuery({
    queryKey: securityKeys.all,
    queryFn: fetchSecurities,
    staleTime: 10 * 60 * 1000,
  })
}

const SEARCH_MIN_LENGTH = 2
const SEARCH_DEBOUNCE_MS = 300

/**
 * Live-Suche für das Kauffeld, mit eigenem Debounce.
 *
 * Ohne Debounce löst jeder Tastendruck einen Request beim Marktdatenanbieter aus, der spürbar
 * langsamer ist als eine Datenbankabfrage. `enabled` erst ab zwei Zeichen, damit ein einzelner
 * Buchstabe nicht schon eine grosse, wenig hilfreiche Trefferliste holt.
 */
export function useSecuritySearch(text: string): UseQueryResult<SecuritySearchResult[]> {
  const [debounced, setDebounced] = useState(text)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text])

  const trimmed = debounced.trim()

  return useQuery({
    queryKey: securityKeys.search(trimmed),
    queryFn: () => searchSecurities(trimmed),
    enabled: trimmed.length >= SEARCH_MIN_LENGTH,
    staleTime: 60 * 1000,
    retry: false,
  })
}

/**
 * Legt ein Wertpapier aus der Live-Suche an, oder liefert das bereits vorhandene.
 *
 * Invalidiert die Stammdatenliste: ein neu angelegtes Wertpapier muss auch im Verkauf-Feld eines
 * anderen Portfolios auftauchen können, ohne dass die Seite neu geladen werden muss.
 */
export function useLookupOrCreateSecurity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: lookupOrCreateSecurity,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: securityKeys.all })
    },
  })
}
