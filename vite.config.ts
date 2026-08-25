import react from '@vitejs/plugin-react'
// defineConfig aus vitest/config statt aus vite: identisch, aber zusätzlich mit dem test-Block
// typisiert. Eine separate vitest.config.ts würde vite.config.ts vollständig ersetzen, wodurch
// das React-Plugin doppelt gepflegt werden müsste.
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Das Backend hat keine CORS-Konfiguration, ein direkter Aufruf von localhost:5173 nach
      // localhost:8080 würde daher vom Browser blockiert. Der Dev-Proxy lässt die Requests
      // über den Vite-Origin laufen, wodurch sie für den Browser gleicher Herkunft sind.
      // Das Präfix /api wird abgeschnitten, weil das Backend seine Endpunkte direkt an der
      // Wurzel anbietet (/auth/login, /portfolios, ...).
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  test: {
    // Komponententests brauchen ein DOM. Reine Logiktests laufen darin ebenfalls.
    environment: 'jsdom',
    // Bewusst keine globals: describe/it/expect werden importiert. Das hält sichtbar, woher sie
    // kommen, und erspart den zusätzlichen types-Eintrag in tsconfig.app.json.
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    // Die Integrationstests rendern die ganze Anwendung und klicken sich durch Menüs und Dialoge.
    // Auf einem belasteten Rechner reichen die voreingestellten 5 Sekunden dafür nicht, ohne dass
    // etwas defekt wäre.
    testTimeout: 30000,
    // Jeder Testprozess hält ein eigenes jsdom mit React, MUI und Recharts. Voreingestellt startet
    // Vitest so viele Prozesse wie Kerne vorhanden sind; die belegen zusammen mehr Speicher als da
    // ist und bremsen sich gegenseitig aus, bis einzelne Tests in den Timeout laufen, obwohl dieselbe
    // Datei allein in Sekunden durchläuft. Vier Prozesse sind der Punkt, an dem die Suite zuverlässig
    // grün bleibt, ohne die Laufzeit merklich zu verlängern.
    maxWorkers: 4,
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        // Testinfrastruktur und Einstiegspunkt: nichts, was eine eigene Abdeckung braucht.
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
})
