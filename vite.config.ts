import react from '@vitejs/plugin-react'
// defineConfig aus vitest/config statt aus vite: identisch, aber zusaetzlich mit dem test-Block
// typisiert. Eine separate vitest.config.ts wuerde vite.config.ts vollstaendig ersetzen, wodurch
// das React-Plugin doppelt gepflegt werden muesste.
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Das Backend hat keine CORS-Konfiguration, ein direkter Aufruf von localhost:5173 nach
      // localhost:8080 wuerde daher vom Browser blockiert. Der Dev-Proxy laesst die Requests
      // ueber den Vite-Origin laufen, wodurch sie fuer den Browser gleicher Herkunft sind.
      // Das Praefix /api wird abgeschnitten, weil das Backend seine Endpunkte direkt an der
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
    // Bewusst keine globals: describe/it/expect werden importiert. Das haelt sichtbar, woher sie
    // kommen, und erspart den zusaetzlichen types-Eintrag in tsconfig.app.json.
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
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
