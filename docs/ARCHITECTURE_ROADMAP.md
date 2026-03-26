# Architecture Roadmap — Phase 12 Codebase Audit Resolution

Tracks the systematic resolution of the 16-point codebase audit.
See the [assessment](../../.gemini/antigravity/brain/29612522-bcfe-4e88-9bd6-1dacc1723513/assessment.md) for full details on each item.

---

## Phase 12.1: Quick Wins & Basic Security `[DONE]`

| # | Item | Status |
|---|------|--------|
| 1 | Unauthenticated API routes (blanket middleware) | [x] |
| 7 | Next.js middleware for auth | [x] |
| 12 | Zod validation on remaining POST/PATCH routes | [x] |
| 14 | Convert `proxy.js` → `middleware.ts` | [x] |
| 15 | Scope `next.config.mjs` image remote patterns | [x] |
| 16 | Dynamic imports for heavy components | [x] |

---

## Phase 12.2: State Management & God Object Dismantling `[DONE]`

| # | Item | Status |
|---|------|--------|
| 4 | Split PortfolioContext (1,040-line god object) | [x] |
| 5 | Eliminate dual state (React Query ↔ Zustand bridge) | [x] |

---

## Phase 12.3: Type Safety & Hardcoded Data Removal `[DONE]`

| # | Item | Status |
|---|------|--------|
| 3 | Remove `@ts-nocheck` from portfolioUtils, ledgerUtils, spreadsheetParser | [x] |
| 6 | Type `portfolioUtils.ts` (1,171 lines of untyped business logic) | [x] |
| 9 | Move hardcoded business data to DB config | [x] |
| 10 | Replace `any` proliferation with proper interfaces | [x] |

---

## Phase 12.4: External Providers, Testing & Error Handling `[DONE]`

| # | Item | Status |
|---|------|--------|
| 2 | Abstract Google Finance scraping behind provider interface | [x] |
| 8 | Expand test coverage (budget APIs, components, integration) | [x] |
| 11 | Structured error handling & logging | [x] |
| 13 | Apply rate limiting to route handlers | [x] |
