import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

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
})
