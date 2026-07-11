# test4 — Notes App

A notes application with user authentication and session management.

## Prerequisites

- Node.js 20+
- PostgreSQL (for future database work)

## Setup

```bash
cp .env.example .env
npm install
```

## Development

```bash
npm run dev
```

The server starts on `http://localhost:3000`. Health check: `GET /health`.

## Scripts

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Start dev server with hot reload |
| `npm run build`        | Compile TypeScript to `dist/`    |
| `npm start`            | Run compiled production build    |
| `npm run lint`         | Run ESLint                       |
| `npm run format`       | Format code with Prettier        |
| `npm run format:check` | Check formatting without writing |
| `npm run typecheck`    | Type-check without emitting      |
| `npm test`             | Run Vitest test suite            |

## Environment variables

See `.env.example` for required configuration.

## CI

GitHub Actions runs lint, format check, typecheck, build, and tests on every push and pull request to `main`.
