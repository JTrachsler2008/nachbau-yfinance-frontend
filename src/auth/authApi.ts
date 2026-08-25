import { apiClient, loginPath } from '../api/client'

/** Rollen aus `UserRole` des Backends. */
export type UserRole = 'PRIVATANLEGER' | 'MANAGER' | 'ADMIN'

/** Antwort von `GET /users/me` (`MeResponseDto`). Enthält bewusst nur den Benutzernamen. */
export interface Me {
  username: string
}

/** Antwort von `POST /users` (`UserResponseDto`). */
export interface RegisteredUser {
  id: number
  username: string
  email: string
  role: UserRole
  createdAt: string
}

/**
 * Mindestlänge des Passworts. Spiegelt `@Size(min = 8)` aus `RegisterRequestDto`, damit die
 * Registrierung nicht erst am Server scheitert. Der Server bleibt die verbindliche Prüfung.
 */
export const passwordMinLength = 8

/** Meldet an und liefert das JWT. Das Ablegen des Tokens übernimmt der `AuthProvider`. */
export async function requestLogin(username: string, password: string): Promise<string> {
  const { data } = await apiClient.post<{ token: string }>(loginPath, { username, password })
  return data.token
}

export async function fetchMe(): Promise<Me> {
  const { data } = await apiClient.get<Me>('/users/me')
  return data
}

/**
 * Selbstregistrierung. Der Endpunkt ist im Backend ohne Token erreichbar
 * (`WebSecurityConfig`: `POST /users` ist `permitAll`) und vergibt immer die Rolle
 * `PRIVATANLEGER`, ein mitgeschicktes Rollenfeld gibt es nicht.
 */
export async function requestRegistration(
  username: string,
  email: string,
  password: string,
): Promise<RegisteredUser> {
  const { data } = await apiClient.post<RegisteredUser>('/users', { username, email, password })
  return data
}
