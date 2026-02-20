# CLAUDE.md — Developer Conventions

## Git
- Branch: `feat/issue-N-description` from `main`
- Commits: conventional (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`)
- PR required for merge. NO force push ever.
- Squash merge preferred.

## Code Style
- TypeScript strict mode
- ESLint + Prettier
- Explicit return types on exported functions
- No `any` — use proper types
- Errors: custom error classes extending BaseError

## Architecture
- Service layer pattern: bot/api → services → db
- All DB queries in `src/db/queries/`
- All business logic in `src/services/`
- Bot handlers are thin — delegate to services
- API routes are thin — delegate to services

## Database
- Migrations in `src/db/migrations/` (sequential numbering: 001_, 002_)
- Use parameterized queries ($1, $2), never string interpolation
- All timestamps as TIMESTAMPTZ
- Soft delete where appropriate (deleted_at)

## Telegram Bot
- Grammy framework
- Conversations for multi-step flows
- Callback data format: `action:entity:id` (e.g., `confirm:payment:42`)
- Inline keyboards for all interactive elements
- Error handling: catch all, log, send user-friendly message

## Testing
- Vitest for unit tests
- Test files: `*.test.ts` next to source
- Mock DB in tests, don't hit real DB

## Security
- HMAC-SHA256 for QR codes
- PIN codes hashed with bcrypt
- Rate limiting on all API endpoints
- Input validation with Zod
- No secrets in code — .env only

## API
- Fastify with TypeBox schemas
- Versioned: /api/v1/
- Standard response: `{ success: boolean, data?: T, error?: { code, message } }`
- Auth via Bearer token (JWT) or PIN session

## File size
- Max 300 lines per file. Split if larger.
- One service per file, one router per file.
