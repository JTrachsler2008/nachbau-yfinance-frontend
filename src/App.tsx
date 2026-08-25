import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { LoginPage } from './auth/LoginPage'
import { RegisterPage } from './auth/RegisterPage'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { KontenPage } from './pages/KontenPage'
import { PerformancePage } from './pages/PerformancePage'
import { RisikoPage } from './pages/RisikoPage'
import { TransaktionenPage } from './pages/TransaktionenPage'
import { VergleichePage } from './pages/VergleichePage'

/**
 * Routen der Anwendung.
 *
 * `RequireAuth` ist als Layout-Route gesetzt, damit der Schutz einmal für den ganzen Teilbaum gilt.
 * Der `AuthProvider` steht innerhalb des Routers, weil er bei einem 401 umleiten muss, und
 * aussen um die Routen, weil auch die Login-Seite ihn braucht.
 */
function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registrieren" element={<RegisterPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="risiko" element={<RisikoPage />} />
            <Route path="transaktionen" element={<TransaktionenPage />} />
            <Route path="konten" element={<KontenPage />} />
            <Route path="szenario" element={<VergleichePage />} />
          </Route>
        </Route>

        {/* Unbekannte Pfade auf das Dashboard, das der Guard bei fehlender Anmeldung abfängt. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
