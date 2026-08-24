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

## Geplanter Stack

- **Vite** als Build-Tool und Dev-Server
- **TypeScript** durchgehend
- **React** mit **MUI v6** als Komponentenbibliothek
- Responsive Umsetzung: Tabellen werden auf kleinen Viewports zu Karten

Details siehe `nachbau/planung/ui-ux-plan.md` und `architektur-plan.md`.

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

Das Backend muss dafuer lokal laufen (`localhost:8080`, siehe Backend-Repo).

## Branch-Konvention

Kein direkter Commit auf `main`. Jede Arbeit kommt auf einen eigenen Branch
`feature/<kurzname>`, wird gepusht und per Pull Request gemergt.
