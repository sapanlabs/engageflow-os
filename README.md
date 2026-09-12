# engageflow-os

EngageFlow — the operating system for creative studios. A multi-tenant SaaS that carries a piece of content from idea to published, with the client in the loop for review and approval.

`Client → Project → Content` is the backbone. Calendar, chat & calling, whiteboards, notes, assets, analytics, and the **Heisenberg** AI teammate attach to that spine.

## Stack

- Next.js 16 (App Router, React Server Components) + TypeScript
- Prisma ORM on SQLite locally (Postgres-portable schema)
- Tailwind CSS v4 · Instrument Serif + Inter
- Auth + RBAC, encrypted-at-rest credentials, Dodo Payments billing
- Configurable AI (Gemini / OpenRouter) powering Heisenberg
- Chat + calls: dependency-light SSE realtime + LiveKit for A/V

## Run locally

```bash
cd web
npm install
npx prisma migrate dev      # creates prisma/dev.db (gitignored)
npm run db:seed             # demo workspace, users, clients, chat, calendar
npm run dev                 # http://localhost:3000
```

Sign in with any seeded account (password `demo1234`), e.g. `nadia@engageflow.media` (Admin).

## Docs

- `PRODUCT.md` — full product specification
- `DESIGN_AND_BUILD.md` — design system + build guidance
- `BUILD_PROGRESS.md` — living build log
