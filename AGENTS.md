# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Goblin DBT is a mental health web app built around Dialectical Behavior Therapy (DBT). It uses React 19 + Vite 7 + Tailwind CSS 4 for the frontend, with Firebase Cloud Functions (Node 20) as the backend and Neo4j as the graph database.

### Repository structure

- **Root (`/`)**: React frontend (Vite + TypeScript). `npm run dev` starts the dev server on port 5173.
- **`/functions`**: Firebase Cloud Functions backend (TypeScript → CommonJS). Has its own `package.json` and `node_modules`.
- **`/schema`**: Neo4j Cypher schema files for the knowledge graph.

### Running services

| Service | Command | Notes |
|---------|---------|-------|
| Frontend dev server | `npm run dev` (root) | Runs on port 5173. Works standalone for UI development. |
| Frontend build | `npm run build` (root) | Runs `tsc -b && vite build`. Output in `dist/`. |
| Functions build | `npm run build` (`/functions`) | Runs `tsc`. Output in `functions/lib/`. |
| Lint | `npm run lint` (root) | ESLint on frontend code. Has pre-existing errors (react-hooks/set-state-in-effect, unused vars). |

### Key caveats

- **Two `node_modules`**: Root and `functions/` each have separate dependency trees. Both need `npm install`.
- **`.env` required**: Copy `.env.example` to `.env` for frontend Firebase config. Without real Firebase credentials, the app runs but auth/data features won't connect.
- **Firebase + Neo4j**: Full end-to-end testing (auth, check-ins, state analysis) requires a Firebase project and Neo4j instance. The frontend UI is fully navigable without these, and interactive tools (Pause, Cool Down, Urge Surfing, Five Senses) work without auth.
- **No automated test suite**: The project has no test runner configured (no Jest/Vitest). Validation relies on lint + build + manual testing.
- **Node version**: Functions specify `engines.node: "20"` for deployment, but local development works on Node 22 with a harmless npm warning.
