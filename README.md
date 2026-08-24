# nachbau-yfinance-frontend

Frontend des **Nachbaus** der Aktienportfolio-Anwendung. Teil des Projekts "Nachbau Aktienportfolio"
(Jira-Projekt `YOUNGOITV`), das eine bestehende Portfolio-Verwaltung von Grund auf neu aufbaut,
geplant und umgesetzt mit Claude Code.

## Zusammenhang

| Teil | Repository | Status |
|---|---|---|
| Backend (Java / Spring Boot) | [nachbau-yfinance-backend](https://github.com/JTrachsler2008/nachbau-yfinance-backend) | fertig, 34 Tickets, 121 Tests gruen |
| Frontend (dieses Repo) | nachbau-yfinance-frontend | im Aufbau, 18 Tickets |

Das Backend stellt die REST-API bereit (Auth per Token, Portfolios, Konten, Transaktionen,
FIFO-Tranchen, Performance, Risiko, Vergleiche, Simulationen). Dieses Frontend konsumiert sie.

## Stack

- **Vite 8** als Build-Tool und Dev-Server
- **React 19** mit **TypeScript** durchgehend, `strict` aktiv
- **MUI 9** als Komponentenbibliothek, Light und Dark ueber CSS-Variablen
- **React Query** fuer Server-State, **axios** fuer den HTTP-Zugriff
- **Vitest** und **Testing Library** fuer Tests
- Responsive Umsetzung: Tabellen werden auf kleinen Viewports zu Karten

Der UI/UX-Plan nennt MUI v6. Umgesetzt ist v9, Begruendung in
`nachbau/planung/design-theme.md`, Abschnitt 1. Weitere Details in
`nachbau/planung/ui-ux-plan.md`, `architektur-plan.md` und `design-theme.md`.

## Tickets

Die 18 Frontend-Tickets sind `YOUNGOITV-443` bis `YOUNGOITV-460`, von
Grundgeruest und Auth-Flow ueber die Fach-Seiten (Portfolios, Konten, Transaktionen,
Dashboard, Performance, Risiko, Vergleiche, Simulationen) bis zu Fehlerbehandlung,
Responsive-Umsetzung und den rollenabhaengigen Bereichen fuer Manager und Admin.
Vollstaendige Liste in `nachbau/planung/jira-tickets-backlog.md`.

## Entwicklung

```bash
npm install
npm run dev
```

Das Backend muss dafuer lokal laufen (`localhost:8080`, siehe Backend-Repo). Der Dev-Server leitet
`/api` dorthin weiter, weil das Backend keine CORS-Konfiguration hat und ein direkter Aufruf sonst
vom Browser blockiert wuerde.

| Befehl | Zweck |
|---|---|
| `npm run dev` | Dev-Server auf Port 5173 |
| `npm test` | Tests einmal ausfuehren |
| `npm run test:watch` | Tests im Watch-Modus |
| `npm run coverage` | Tests mit Abdeckungsbericht |
| `npm run typecheck` | `tsc -b` ohne Build |
| `npm run lint` | oxlint |
| `npm run build` | Typecheck plus Produktions-Build |

Zu den Tests: die Farbtokens des Themes werden gegen die WCAG-Kontrastschwellen geprueft
(`src/theme/palette.test.ts`). Wer eine Farbe im Theme aendert, muss damit rechnen, dass diese Tests
anschlagen. Das ist Absicht, siehe `nachbau/planung/design-theme.md`, Abschnitt 9.

## Branch-Konvention

Kein direkter Commit auf `main`. Jede Arbeit kommt auf einen eigenen Branch
`feature/<kurzname>`, wird gepusht und per Pull Request gemergt.
