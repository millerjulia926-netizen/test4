# test4 — Notes App

A notes application with user authentication and session management.

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ (for database migrations and schema tests)

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

### Auth endpoints

| Method | Path            | Description                                      |
| ------ | --------------- | ------------------------------------------------ |
| `POST` | `/auth/signup`  | Create account (returns access + refresh tokens) |
| `POST` | `/auth/login`   | Authenticate and start session                   |
| `POST` | `/auth/refresh` | Refresh an expired access token                  |
| `POST` | `/auth/logout`  | End a session                                    |

Protected note routes require `Authorization: Bearer <accessToken>`:

| Method   | Path         | Description             |
| -------- | ------------ | ----------------------- |
| `GET`    | `/notes`     | List the caller's notes |
| `POST`   | `/notes`     | Create a note           |
| `GET`    | `/notes/:id` | Get a single note       |
| `PATCH`  | `/notes/:id` | Update a note           |
| `DELETE` | `/notes/:id` | Delete a note           |

## Scripts

| Command                | Description                         |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start dev server with hot reload    |
| `npm run build`        | Compile TypeScript to `dist/`       |
| `npm start`            | Run compiled production build       |
| `npm run lint`         | Run ESLint                          |
| `npm run format`       | Format code with Prettier           |
| `npm run format:check` | Check formatting without writing    |
| `npm run typecheck`    | Type-check without emitting         |
| `npm test`             | Run Vitest test suite               |
| `npm run db:generate`  | Generate SQL migrations from schema |
| `npm run db:migrate`   | Apply pending migrations            |

## Database

Schema is defined with Drizzle ORM in `src/db/schema.ts`. Models are re-exported from `src/models/`.

```bash
npm run db:generate   # after schema changes
npm run db:migrate    # apply migrations
```

Schema tests require a running PostgreSQL instance. Set `TEST_DATABASE_URL` or use `DATABASE_URL`.

## Environment variables

See `.env.example` for required configuration.

## CI

GitHub Actions runs lint, format check, typecheck, build, and tests on every push and pull request to `main`.
