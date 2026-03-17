# 2048

A feature-rich 2048 puzzle game built with React and TypeScript.

**Live:** [apps.barczynski.dev/2048](https://apps.barczynski.dev/2048)

## Features

- **Grid sizes** — 3×3, 4×4, 5×5 selectable by user
- **Controls** — Arrow keys, WASD, touch swipe (30px threshold)
- **Undo** — Ctrl+Z or button; saves state before each move
- **Challenge mode** — 8 escalating levels (16 → 2048) with time limits
- **Statistics** — Games played, total merges, highest tile, per-size leaderboards
- **Persistence** — Full game state saved to LocalStorage
- **Colour tiles** — Toggle between monochromatic and classic 2048 palette
- **Dark / light theme** — Shared with barczynski.dev via `barczynski-theme` localStorage key
- **PWA** — Installable, portrait manifest, app shortcuts, golden tile favicon
- **Animations** — Tile pop-in, merge burst, 8-particle explosion, score float-up

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | React 18 + TypeScript 5 |
| Build | Vite (base: `/2048/`) |
| Styling | Custom CSS (~1300 lines) |
| Testing | Vitest (43 edge-case tests) |
| Container | Multi-stage Docker → nginx:alpine |

## Development

```bash
npm install
npm run dev       # http://localhost:5173/2048/
npm test          # Vitest — 43 tests
npm run build     # Production build
```

## Deployment

Deployed as an isolated Docker container via **Coolify** on Hetzner VPS. Served at `/2048/` via an nginx reverse proxy in the [apps-website](https://github.com/adambar88/apps-website) container.

```bash
docker build -t 2048 .
docker run -p 80:80 2048
```
