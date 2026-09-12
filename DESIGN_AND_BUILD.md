# EngageFlow — Design & Build Research

> Companion to `PRODUCT.md`. This doc answers one question: how do we ship EngageFlow so it feels like a $2B product — fast, functional, beautiful, professional — **without building from scratch and without AI slop**.
>
> Two disciplines govern everything here:
> 1. The **taste skill** (`.kiro/skills/design-taste-frontend`) — anti-slop rules for the marketing/preview/auth surfaces.
> 2. A **real, owned design system** (Radix + shadcn/ui) — for the dense product UI the taste skill explicitly does not cover.

---

## 0. The Honest Split (read this first)

The installed taste skill is scoped, by its own Section 13, to **landing pages, portfolios, and redesigns — NOT dashboards, data tables, or multi-step product UI.** EngageFlow is ~80% dense product UI. Misapplying landing-page rules to a data grid would make the product worse, not better.

So we split the surface area:

| Surface | Discipline | Why |
|---|---|---|
| Marketing site, pricing, `/preview/*` client pages, login/onboarding | **Taste skill** rules (hero discipline, motion motivation, anti-tells) | These are first-impression, expressive surfaces |
| App shell, dashboards, tables, calendar, kanban, editor, whiteboard, settings | **Radix Themes + shadcn/ui** (an owned, real design system) | Dense, functional, keyboard-driven UI — the taste skill points here itself |

Both share the same tokens (§3) so the seam is invisible.

---

## 1. Font Decision — Justified, Not Default

The taste skill **bans Instrument Serif and Inter as defaults** (Section 4.1 + Pre-Flight) because they are the two most common LLM "tells." The skill's own override clause: a font is fine **when the brief explicitly names it.**

You named both, explicitly and twice. That converts them from lazy defaults into deliberate brand choices. They stay. This is documented so no future contributor "fixes" them thinking they're slop.

- **Instrument Serif** — editorial display only: page titles, big empty-state statements, marketing hero, the wordmark. Never body, never UI labels.
- **Inter** — the entire working UI: nav, tables, forms, buttons, metadata, dense data.

Guardrail from the skill we DO keep: **italic descender clearance** — any italic Instrument Serif word containing `y g j p q` needs `leading-[1.1]` min + `pb-1`, or the descender clips. And **never mix a serif word into a sans headline for "interest"** — emphasis uses italic/bold of the same family.

Load via `next/font` (already sketched in `PRODUCT.md` §27.2). Never `<link>` Google Fonts in production.

---

## 2. Reuse Map — Nothing Built From Scratch

Every subsystem maps to a mature, maintained open-source library. Ordered by subsystem. Verify each against `package.json` before importing (skill §3.F), and pin exact versions.

### 2.1 Foundation

| Need | Use | Notes |
|---|---|---|
| App scaffold | [`Kiranism/next-shadcn-dashboard-starter`](https://github.com/Kiranism/next-shadcn-dashboard-starter) (MIT) | Next.js + shadcn/ui on Base UI, Tailwind v4, TS. Production tables/forms/auth already wired. Use as the **shell**, strip the demo pages. |
| Alt scaffold | [`arhamkhnz/next-shadcn-admin-dashboard`](https://github.com/arhamkhnz/next-shadcn-admin-dashboard) | "Studio Admin" variant with theme presets + auth layouts if the above doesn't fit. |
| Component primitives | [Radix Primitives](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/) | You **own** the component code — required by the skill (never ship shadcn default state; retheme radii/color/shadow to EngageFlow). |
| Theme layer | [Radix Themes](https://www.radix-ui.com/themes) | Set theme ONCE at layout root; sections never override (skill §4.11 theme lock). |

### 2.2 The Hard Subsystems

| Subsystem | Use | License / caveat |
|---|---|---|
| **Whiteboard** | [tldraw SDK](https://github.com/tldraw/tldraw) | Feature-complete infinite canvas. Commercial license needed to remove watermark. |
| **Whiteboard multiplayer** | [Liveblocks](https://liveblocks.io/docs/get-started/nextjs-tldraw) (tldraw+Yjs docs) or self-hosted Yjs | One real-time layer serves whiteboard + comments + presence. |
| **Notes editor** | [BlockNote](https://www.blocknotejs.org/) (ProseMirror/TipTap) | Notion-style blocks; Yjs collab shares the whiteboard's infra. |
| **Video review player** | [Vidstack Player](https://github.com/vidstack/player) | Accessible, customizable; frame-accurate time for pinned video comments. |
| **Pinned comments** | Build thin layer on stored normalized coords (x/y 0–1 + versionId) | No library owns this; ~150 lines over the media element. |

### 2.3 Product UI Building Blocks

| Need | Use | Notes |
|---|---|---|
| Data tables (content lists, clients) | [TanStack Table](https://tanstack.com/table) (headless) | Headless = we style with our tokens, no vendor look. Add [TanStack Virtual](https://tanstack.com/virtual) for long lists. |
| Calendar / scheduling | [FullCalendar](https://github.com/fullcalendar/fullcalendar) React (free core) or [react-big-calendar](https://github.com/jquense/react-big-calendar) | FullCalendar for drag-drop + resource views; RBC if we want a lighter free option. |
| Kanban / status boards | [dnd-kit](https://dndkit.com/) | Accessible drag-drop for project task boards + content pipeline columns. |
| Global search palette | [`cmdk`](https://github.com/pacocoursey/cmdk) | ⌘K palette; wire to Postgres FTS → Meilisearch later. |
| Toasts / notifications | [Sonner](https://sonner.emilkowal.ski/) | Transient feedback only (skill: toasts for transient, inline for forms). |
| File upload | [react-dropzone](https://react-dropzone.js.org/) | Drag-drop asset ingestion → S3/R2 presigned URLs. |
| Charts (analytics) | [Recharts](https://recharts.org/) or [Tremor](https://tremor.so/) | Tremor gives dashboard-grade blocks; keep client analytics simple. |
| Icons | [Phosphor](https://phosphoricons.com/) (`@phosphor-icons/react`) | Skill discourages Lucide as default. One family, global `strokeWidth`. |
| Motion | [`motion/react`](https://motion.dev/) | Quiet premium micro-interactions; GSAP only if a scroll-story is needed on marketing. |

### 2.4 Backend / Platform

| Need | Use |
|---|---|
| ORM | [Prisma](https://www.prisma.io/) or [Drizzle](https://orm.drizzle.team/) |
| Auth + RBAC | [Auth.js](https://authjs.dev/), [Clerk](https://clerk.com/), or [WorkOS](https://workos.com/) |
| Multi-tenant isolation | Postgres Row-Level Security or a single enforced data-access layer |
| Email | [Resend](https://resend.com/) / Postmark |
| Background jobs | [Inngest](https://www.inngest.com/) / [Trigger.dev](https://trigger.dev/) |
| Object storage | S3 / Cloudflare R2; [Mux](https://www.mux.com/) for video |
| Search (scale) | [Meilisearch](https://www.meilisearch.com/) / Typesense |

---

## 3. Shared Design Tokens

One token set spans both disciplines. Minimal black-and-white; color reserved for status, notifications, actions, analytics (per `PRODUCT.md` §27.3).

```css
:root {
  /* neutrals — off-black/off-white, never pure per skill §8.B/9.A */
  --bg:            #FFFFFF;
  --surface:       #FAFAFA;
  --surface-2:     #F4F4F5;
  --fg:            #0A0A0A;   /* off-black, not #000 */
  --muted:         #6B6B6B;
  --border:        #E7E7E7;

  /* single locked accent (skill §4.2 color-consistency lock) */
  --accent:        #111111;

  /* functional-only status ramp */
  --status-draft:     #9AA0A6;
  --status-review:    #C9A227;
  --status-changes:   #C0442E;
  --status-approved:  #2E7D4F;
  --status-scheduled: #2F6FEB;
  --status-published: #6B6B6B;

  /* shape lock — one radius scale (skill §4.4) */
  --radius-input: 8px;
  --radius-card:  14px;
  --radius-pill:  9999px;

  --font-serif: "Instrument Serif", ui-serif, Georgia, serif;
  --font-sans:  "Inter", ui-sans-serif, system-ui, sans-serif;
}
```

Dark mode is mandatory for the app (skill §6.C/§8). Define the same tokens under `[data-theme="dark"]` with off-black surfaces; test both modes before shipping.

---

## 4. Layout Architecture

### 4.1 App shell (the 80%)
- **Persistent left sidebar** — workspace switcher, then the nav tree from `PRODUCT.md` §26. Collapsible to icons. Role-filtered items (Client sees a stripped tree).
- **Top bar** — breadcrumb showing `Client › Project › Content` position, ⌘K search trigger, notifications bell, avatar.
- **Content area** — `max-w-[1400px]` for reading views; full-bleed for calendar/whiteboard/table.
- **Density** — this is a "daily app" (skill VISUAL_DENSITY ~4): `py-16`–`py-24` rhythm, tables tighter. Not an art gallery, not a cockpit.

### 4.2 Client-facing preview page (`/preview/*` — taste-skill governed)
This is the surface clients see most, so it carries the premium feel:
- Realistic platform-chrome preview centered, generous whitespace.
- Right rail: version selector, caption, threaded + pinned comments.
- Two clear actions: **Approve** / **Request changes** — one primary, one secondary; no duplicate-intent CTAs (skill §4.5).
- Quiet motion: soft version cross-fade, comment pins easing in. Reduced-motion honored.

### 4.3 Marketing site (taste-skill governed)
- Asymmetric split hero, Instrument Serif display headline ≤ 2 lines, subtext ≤ 20 words, one primary CTA.
- Real product screenshots (generated or captured) — **never div-based fake dashboards** (the #1 tell).
- Max 1 eyebrow per 3 sections, zero em-dashes, one accent, ≥ 4 different section layout families.

---

## 5. End-to-End Use Cases

Every feature is specified as a concrete flow with the exact components and data touched. This is the "does it actually work end to end" contract.

### UC-1 · Create a client and assign the team
**Actor:** Admin / Creative Lead
1. Sidebar → Clients → "New Client" (shadcn Dialog + react-hook-form + Zod).
2. Fill company, contacts, industry, status; assign Creative Lead + SMM + Editor (multi-select combobox).
3. Save → Server Action writes `client` + `client_member` rows under the workspace; RLS scopes visibility.
4. `activity_log` event: "Albin created client Acme." Assigned members get an in-app notification (Sonner + persisted row).
**Done when:** the client appears only for assigned members and the workspace admins.

### UC-2 · Spin up a project and its board
**Actor:** Creative Lead
1. Client profile → Projects → "New Project" (name, description, dates, status = Planning).
2. Project opens with tabs: Overview, Tasks, Content, Calendar, Whiteboard, Notes, Files.
3. Tasks tab = dnd-kit kanban (Planning → In Progress → Review → Approved → Completed).
**Done when:** status is visible on the project card platform-wide and dragging a task writes status + activity event.

### UC-3 · Editor produces content and submits for review
**Actor:** Editor
1. Project → Content → "New Content": title, caption, platform (Instagram Reel), content type/style (Reel), assigned SMM, publish date.
2. Upload media via react-dropzone → presigned S3/R2 → creates **Version 1** (immutable).
3. Editor picks platform preview → sees a realistic Instagram Reel chrome around the asset.
4. "Mark ready for review" → status = In Review; Creative Lead + SMM notified.
**Done when:** V1 exists with `created_by`/`created_at`, status = In Review, activity logged.

### UC-4 · Share a preview link with the client
**Actor:** SMM
1. Content → "Share preview" → generates tokenized `app.com/preview/acme/content-123`.
2. Permission = Approve. Link is signed, no login required.
**Done when:** opening the link (incognito) renders the preview page (UC in §4.2) with only that content, no internal nav.

### UC-5 · Client leaves a pinned comment and requests changes
**Actor:** Client (via preview link)
1. Client clicks a spot on the image → comment composer opens anchored there.
2. Types "move the logo left" → stored as `{versionId, x:0.42, y:0.18, body}`. Pin renders at that fraction at any zoom.
3. Client clicks **Request Changes** → status = Changes Requested; Editor notified; comment thread opens on their side.
**Done when:** the pin shows at the exact location for all viewers and the status transition is logged.

### UC-6 · Editor revises → new version → re-approval
**Actor:** Editor → Client
1. Editor sees feedback, uploads revised media → **Version 2** (V1 preserved).
2. "Compare versions" shows V1/V2 side by side; resolves the pinned comment.
3. Status → In Review → client re-opens same preview link, now defaulted to V2.
4. Client clicks **Approve** → version flagged approved, content status = Approved, activity logged.
**Done when:** both versions remain retrievable and the approval is attributed + timestamped.

### UC-7 · Schedule approved content
**Actor:** SMM
1. Calendar → drag the approved content onto a date/time (FullCalendar drag-drop).
2. Set platform + publish time + assignee → status = Scheduled.
3. Inngest job scheduled for the publish datetime; deadline-approaching notification queued.
**Done when:** the item shows on client + team calendars, filterable by platform/status, with a scheduled job.

### UC-8 · Plan a campaign on the whiteboard (real-time)
**Actor:** Creative Lead + Editor together
1. Project → Whiteboard → tldraw canvas loads via Liveblocks room = projectId.
2. Both see live cursors; drop references, sticky notes, frames, connectors.
3. Drag a content reference chip that deep-links back to the content item.
**Done when:** edits sync in real time, presence shows both users, board is restricted to project members.

### UC-9 · Write a brief in Notes
**Actor:** Creative Lead
1. Project → Notes → new page "Campaign Brief" (BlockNote).
2. Headings, checklist, embedded reference image, sub-page "Scripts."
3. Notes tree mirrors Client → Project structure (PRODUCT.md §17).
**Done when:** the note lives under the project, is searchable, and clients never see internal notes (RLS).

### UC-10 · Global search
**Actor:** any internal role
1. ⌘K (cmdk) → type "Summer Campaign."
2. Grouped results: Client, Project, Content, Whiteboard, Notes, Files — each row deep-links.
**Done when:** results respect the user's role scope (no cross-client leakage).

### UC-11 · Client reviews analytics
**Actor:** Client
1. Client dashboard → Analytics → simple overview (published/approved counts, engagement, reach).
2. Recharts/Tremor cards; platform + date filters.
**Done when:** only their data shows, presented simply — not an overwhelming ops dashboard.

### UC-12 · Notifications across channels
**Actor:** system
1. Any of the triggers in PRODUCT.md §19 fires → persisted notification row + real-time push + optional email (Resend) via Inngest.
**Done when:** in-app bell updates live, email sends for high-signal events, deadline reminders fire on schedule.

---

## 6. Anti-Slop Checklist (applied to EngageFlow)

Pulled from the taste skill's Pre-Flight, filtered to what applies here:

- [ ] Instrument Serif + Inter documented as **explicit brand choices**, not defaults.
- [ ] One locked accent across the whole app; status ramp is the only other color.
- [ ] One radius scale (input 8 / card 14 / pill full) everywhere.
- [ ] Off-black/off-white only — no `#000`/`#fff`.
- [ ] Dark mode built and tested from day one.
- [ ] Zero em-dashes in any UI copy (use hyphen).
- [ ] Real screenshots on marketing, never div-based fake product UI.
- [ ] Every CTA passes WCAG AA contrast; no duplicate-intent CTAs.
- [ ] Motion is motivated (feedback/hierarchy/state), reduced-motion honored above intensity 3.
- [ ] Tables use TanStack (owned styling), not a vendor grid look.
- [ ] shadcn components rethemed off default state.
- [ ] Icons: Phosphor only, one strokeWidth.
- [ ] Loading (skeletons matching layout), empty, and error states for every data view.
- [ ] Permissions enforced at the data layer; Client role verified against leakage before ship.

---

## 7. Build Order (de-risked)

1. Shell + auth + RBAC + tokens (fork the shadcn starter, retheme).
2. Client → Project → Content → **Versions → Comments → Approval** core loop (UC-1→6).
3. Preview links + platform previews (UC-4/5) — makes it client-facing.
4. Calendar + scheduling (UC-7).
5. Notes / BlockNote (UC-9).
6. Whiteboard + real-time (UC-8) — highest effort.
7. Analytics + Meilisearch search (UC-10/11).
8. Marketing site (taste-skill full treatment) — last, once product screenshots are real.

---

*Library and design-system references above are external sources, linked inline and rephrased for compliance with licensing restrictions.*
