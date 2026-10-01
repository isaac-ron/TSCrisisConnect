# CrisisConnect frontend

React + TypeScript progressive web app (Vite, Tailwind, Leaflet). See the [project README](../README.md) for what the app does and how the pieces fit together.

```bash
npm ci
npm run dev       # http://localhost:5173, expects the API at http://localhost:3000
npm run lint
npm run build     # also generates the service worker and web manifest
```

Set `VITE_API_BASE_URL` to point at a different API.

| Path | Contents |
|---|---|
| `src/pages/` | Screens: report form, alert feed, map, offline message list, responder review queue, login |
| `src/lib/` | API client and types for incidents, categories, severity colors, config |
| `src/utils/` | Offline storage (IndexedDB) and sync |
| `src/ui/` | shadcn/ui components in use |
