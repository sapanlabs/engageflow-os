# EngageFlow — Product Specification

> The operating system for creative studios.
> Client → Project → Content is the backbone. Calendar, Whiteboards, Notes, Assets, and Analytics attach to that spine — never float beside it.

---

## 0. Document Purpose

This is the source-of-truth product document for **EngageFlow**, a multi-tenant SaaS platform for creative and social-media studios. It defines what every module does, how the modules relate, the technical architecture, the role model, and the design system. It is written to be read by designers, engineers, and product without prior context.

**Status of brand assets:** The domain `engageflow.media` is currently parked (registrar placeholder), so no live logo could be retrieved. This document defines a typography-driven placeholder wordmark (see §24). Swap in the official mark once available; nothing else in the design system needs to change.

---

## 1. What EngageFlow Is (Technical Summary)

EngageFlow is a **creative agency operations platform** — a single workspace that carries a piece of content from idea to published, with the client in the loop for review and approval.

It composes several proven product patterns into one product with a shared data spine:

| Capability | Comparable to | Why it's here |
|---|---|---|
| Content review + approval | Frame.io, Filestage | The core value loop |
| Versioning | Google Docs history | Creative work iterates constantly |
| Pinned comments | Figma comments | Precise, contextual feedback |
| Whiteboard | Figma / FigJam | Visual planning workspace |
| Notes | Notion | Briefs, scripts, strategy docs |
| Calendar / scheduling | Later, Planoly | Publishing plan across platforms |
| Analytics | Simplified dashboards | Client-facing performance view |

The differentiator is **not** any single module. It is that all of them share one `Client → Project → Content` hierarchy with role-scoped visibility, so nothing feels like a bolted-on separate tool.

### 1.1 Recommended Stack

```
Next.js (App Router, React Server Components) + TypeScript
├── PostgreSQL + Prisma/Drizzle        Client→Project→Content spine + RBAC
├── Auth.js / Clerk / WorkOS           5 roles, strict client isolation
├── S3 / Cloudflare R2 + Mux           versioned media & assets
├── Liveblocks or Yjs (CRDT)           real-time layer (shared)
│    ├── tldraw SDK                    infinite-canvas whiteboard
│    └── BlockNote (ProseMirror/TipTap) Notion-style notes
├── Resend/Postmark + Inngest          notifications & scheduled jobs
├── Postgres FTS → Meilisearch         global search
└── Tailwind + shadcn/ui + Framer      minimal B/W design system
```

Server Components render data-heavy dashboards and lists; Client Components carry interactive surfaces (whiteboard, editor, calendar drag-drop, preview annotator). Mutations use Server Actions / route handlers.

### 1.2 Architectural Non-Negotiables

1. **Permissions live in the data layer**, not the UI. Use Postgres Row-Level Security or a single enforced data-access layer. The Client role must never see internal notes or other clients' work.
2. **Content is never overwritten.** Every revision is a new immutable version with its own media object + metadata.
3. **One real-time layer** serves whiteboard, live comments, and presence.
4. **Every meaningful mutation writes an activity event** (append-only log). This is both the audit trail and the feed for dashboards.

---

## 2. Data Model (Backbone)

```
Workspace (the studio / tenant)
└── Client
    ├── profile, contacts, industry, status
    ├── team assignments (role-scoped access)
    └── Project
        ├── status: Planning → In Progress → Review → Approved → Completed
        ├── dates, description, assigned members + roles
        ├── Tasks
        ├── Content
        │   ├── Version (1..n, immutable)
        │   │   ├── media asset(s)
        │   │   ├── created_by, created_at
        │   │   └── approval flag
        │   ├── Comments (threaded, resolvable, optionally pinned)
        │   └── Approval state
        ├── Whiteboards
        ├── Notes (pages / sub-pages)
        └── Files / Assets
```

`activity_log` and `notifications` are workspace-level tables that reference any entity above.

---

## 3. Client Management

Central place to manage everything about a client.

- **Create Client** — company name, contact info, industry, assigned team members, client status.
- **Client Profile** — information, active projects, completed projects, content, calendar, notes, analytics, feedback history.
- **Team Assignment** — assign Creative Leads, Social Media Managers, Editors; control which members can access the client.
- **Client Activity** — content approvals, feedback, comments, project updates, recent activity.
- **Client Dashboard** — active projects, upcoming content, pending approvals, recent activity, analytics.

---

## 4. Project Management

Projects organize the actual work for a client.

- Create projects under a client; name, description, status, start/end dates.
- Assign team members and roles.
- Project tasks, calendar, content, notes, whiteboard, files, activity history.

**Status flow (visible platform-wide):**

```
Planning → In Progress → Review → Approved → Completed
```

---

## 5. Calendar Management

Central planning system for the team.

- Views: monthly, weekly, daily.
- Surfaces: project deadlines, content publishing dates, internal tasks, meetings, client deadlines, revision deadlines, approval deadlines.
- **Content scheduling fields:** platform, publishing date, publishing time, assigned person, status, approval status.
- **Filters:** client, project, team member, platform, content type, status.

---

## 6. Content Management (Core Module)

Manages the full lifecycle of a content piece from creation to approval.

**Create content with:** title, description, caption, media, platform, content type, tags, assigned editor, assigned social media manager, publishing date, status.

Content lifecycle states (also used as navigation buckets):

```
Draft → In Review → Changes Requested → Approved → Scheduled → Published
```

---

## 7. Platform-Specific Preview

The same content asset renders inside a **realistic platform frame** — an Instagram post looks like an Instagram post, not a bare image.

Supported preview surfaces:

- Instagram Post
- Instagram Reel
- Instagram Story
- LinkedIn
- Facebook
- YouTube
- YouTube Shorts
- X
- Website

**Implementation:** each preview is a presentational React "chrome" component that wraps the shared content asset. No third party required.

---

## 8. Creative Style Support

Each content piece can declare a creative style:

Static post · Carousel · Reel · Story · Advertisement · Announcement · Educational · Promotional · Product · Meme · Quote · Video

The content record stores and manages the style; previews and filters use it.

---

## 9. Content Version Management

Creative work iterates, so versions are first-class and immutable.

Example lifecycle:

```
V1  Designer creates first version
V2  Client requests changes
V3  Designer makes changes
V4  Final approved version
```

**Features:** create new version, version number, version history, upload revised media, compare versions (side-by-side), see who created each version and when, restore an older version, mark a version as approved.

**Data note:** never replace the previous file — store each version as a distinct media object with metadata.

---

## 10. Content Preview Links

Generate a shareable, tokenized preview link so clients don't navigate the whole platform.

```
app.com/preview/client/content-123
```

The preview page shows: content, platform preview, caption, version, comments, feedback, **Approve** button, **Request Changes** button. Gated by a signed token rather than a full login.

---

## 11. Comments & Feedback

Feedback behaves like **Figma comments**.

- Add comments, reply, mention team members, resolve, reopen.
- Comment history + notifications.
- **Pinned comments on visual content:** a comment can attach to a specific location on an image/video (e.g. "Move this logo slightly to the left").

**Implementation:** store normalized coordinates (x/y as 0–1 fractions of media dimensions) plus the version ID, so the pin stays anchored at any display size.

---

## 12. Content Approval

A simple client-facing decision.

**Approve** — or — **Request Changes**

If changes are requested:

```
Client adds feedback
→ content moves back to revision
→ editor is notified
→ new version is created
→ client reviews again
```

This is the platform's core value loop; everything else supports it.

---

## 13. Roles & Permissions (RBAC)

Enforced at the data layer. Five roles:

**Admin** — full access: manage users, clients, projects, content, calendars, whiteboards, notes, permissions, platform settings; view analytics.

**Creative Lead** — full access to *assigned* clients: manage assigned projects/content, review, assign work, manage creative direction, view feedback, approve internal work, access whiteboards + notes.

**Social Media Manager** — social planning/execution on assigned clients: manage/schedule assigned content, manage captions + publishing info, review content, handle client feedback, access relevant calendars.

**Editor** — production only on assigned projects: view/upload/edit content, create versions, view + respond to feedback, mark work ready for review. No access to unrelated clients/projects.

**Client** — simplified interface: view their projects/content/previews, comment, give feedback, approve, request changes, view calendar + analytics + relevant project info. **Never** sees internal discussions, internal notes, or other clients' work.

---

## 14. Whiteboard

Figma-style collaborative infinite canvas for planning. Built on **tldraw**.

Elements: text, images, shapes, sticky notes, links, frames, connectors, drawings, moodboards, content references. Drag-and-drop.

Use cases: campaign planning (references → ideas → concepts → campaign), content planning (idea → script → visual → caption → final), client presentation (concept → design → examples → direction).

---

## 15. Real-Time Whiteboard Collaboration

Multiple members on one board — closer to Figma than a task board.

Multiple users · live cursors · real-time changes · comments · mentions · version history · board permissions · shareable board links.

**Implementation:** tldraw synced over Yjs (CRDT) via websocket provider, or Liveblocks (documented tldraw + Next.js + Yjs integration). Note tldraw requires a commercial license to remove its watermark.

---

## 16. Notes & Documentation

Notion-style workspace for information that doesn't live inside a content file. Built on **BlockNote** (ProseMirror/TipTap).

Rich text · headings · lists · tables · checklists · images · links · attachments · pages · sub-pages.

Use cases: meeting notes, client briefs, content briefs, scripts, campaign ideas, brand guidelines, research, strategy docs, internal notes, content ideas.

---

## 17. Notes Organization

Notes mirror the platform hierarchy, never sit separately.

```
Client → Client Strategy · Brand Guidelines · Meeting Notes · Projects
Project → Brief · Scripts · Ideas · Research · Meeting Notes
```

---

## 18. Analytics Dashboard

Simple, client-friendly view — not an overwhelming interface.

**Metrics:** content published/scheduled/approved, engagement, reach, impressions, likes, comments, shares, saves, follower growth.

**Views:** overview · platform-wise · content-wise performance · date-based performance.

---

## 19. Notifications

Notify users when something needs attention.

Triggers: new content assigned, content submitted for review, client feedback, new comment, comment reply, content approved, content rejected, deadline approaching, new project, new task, calendar changes.

Channels: in-app, email, optional browser push.

**Implementation:** in-app persisted in Postgres + real-time push; email via Resend/Postmark; deadline reminders + async fan-out via a background job queue (Inngest / Trigger.dev).

---

## 20. Search

Global search across clients, projects, content, notes, whiteboards, comments, files.

Example — searching **"Summer Campaign"** returns the client, project, content pieces, whiteboard, notes, and related files.

**Implementation:** start with Postgres full-text search; graduate to Meilisearch/Typesense for fast fuzzy search.

---

## 21. Activity History

Every important action is recorded (append-only).

```
Albin uploaded Version 3
Sarah requested changes
Client approved Version 4
Project status changed to Completed
Editor assigned to Campaign A
```

---

## 22. File & Asset Management

Central home for project assets.

Upload images/videos/documents/design files · organize · preview · download · replace · link files to content.

Organized as: `Client → Project → Content → Files`.

---

## 23. Dashboards (Role-Aware)

The dashboard changes by role.

- **Admin** — total clients, active projects, pending approvals, upcoming deadlines, team activity, recent content.
- **Team** — assigned projects, assigned content, pending work, upcoming deadlines, feedback requiring action.
- **Client** — active projects, content awaiting approval, upcoming content, recent feedback, analytics.

---

## 24. Sharing & External Access

Share selected work without full platform access.

Link types: content preview link, whiteboard link, project link, client review link.
Permission levels: **View only · Comment · Edit · Approve**.

---

## 25. Global Workspace Structure

```
Workspace
├── Clients
├── Projects
├── Content
├── Calendar
├── Whiteboards
├── Notes
├── Analytics
└── Assets
```

Sections visible depend on the user's role.

---

## 26. Product Navigation

```
Dashboard
Clients
  ├── Client Overview
  ├── Projects
  ├── Content
  ├── Calendar
  ├── Analytics
  ├── Notes
  ├── Whiteboards
  └── Assets
Projects
  ├── Overview
  ├── Tasks
  ├── Content
  ├── Calendar
  ├── Whiteboard
  ├── Notes
  └── Files
Content
  ├── All Content
  ├── Drafts
  ├── In Review
  ├── Changes Requested
  ├── Approved
  ├── Scheduled
  └── Published
Calendar
Whiteboards
Notes
Analytics
Notifications
Settings
```

---

## 27. Design System

A minimal black-and-white visual identity with an editorial, premium feel. Highly functional first; expressive second.

### 27.1 Brand / Logo

Until the official `engageflow.media` mark is available, use a **typography-driven wordmark** (this is intentional, not a stopgap that looks unfinished):

- **Wordmark:** `EngageFlow` set in **Instrument Serif**, tight tracking, black on white.
- **Optional mark:** a single monochrome glyph (e.g. a flowing "E" or an abstract flow line) usable as favicon/app icon.
- Swap the official asset into a single `Logo` component; no other changes needed.

### 27.2 Typography

**Instrument Serif** — editorial voice
- Large headings, page titles, important statements, hero/editorial elements.

**Inter** — the working UI
- Navigation, buttons, forms, tables, body text, metadata.

Load both via `next/font` (both are on Google Fonts).

```ts
// app/fonts.ts
import { Instrument_Serif, Inter } from "next/font/google";

export const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
```

```css
/* usage */
:root {
  --font-serif: "Instrument Serif", ui-serif, Georgia, serif;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}
h1, h2, .display { font-family: var(--font-serif); }
body, button, input, table { font-family: var(--font-sans); }
```

### 27.3 Color

Primary palette: white, black, shades of grey. Color is used **sparingly**, only for:

- Status
- Notifications
- Important actions
- Analytics

```css
:root {
  --bg:            #FFFFFF;
  --fg:            #0A0A0A;
  --muted:         #6B6B6B;
  --border:        #E7E7E7;
  --surface:       #FAFAFA;

  /* used sparingly, functional only */
  --accent:        #111111;  /* primary action */
  --status-draft:  #9AA0A6;
  --status-review: #C9A227;  /* amber */
  --status-changes:#C0442E;  /* red */
  --status-approved:#2E7D4F; /* green */
  --status-published:#2F6FEB;/* blue */
}
```

### 27.4 Visual Language

Clean layouts · generous whitespace · soft shadows · subtle glassmorphism · rounded (not overly) components · thin borders · smooth transitions · small micro-interactions · subtle hover states · smooth page transitions.

### 27.5 Motion

Animations feel **quiet and premium**, never flashy. Built with Framer Motion.

- Cards gently lift on hover
- Smooth page transitions
- Content preview transitions
- Soft modal animations
- Whiteboard zoom/pan
- Subtle button interactions
- Smooth status changes

Guideline: durations ~150–250ms, gentle easing (`ease-out` / spring with low stiffness), no bounce, no attention-grabbing motion.

---

## 28. Build Sequencing (Recommendation)

The scope spans 4–6 substantial subsystems, each a product on its own. Sequence to de-risk:

1. **Core loop first:** Client → Project → Content → Versions → Comments → Approval (this is the actual value and the spine).
2. Preview links + platform previews (turns the loop client-facing).
3. Calendar + scheduling.
4. Notes (BlockNote).
5. Whiteboard + real-time (tldraw + Yjs/Liveblocks — highest effort).
6. Analytics + advanced search.

Whiteboard, Notes, and Analytics are high-effort additions best added after the core review loop works end to end.

---

*Sources informing the technical choices (tldraw, Liveblocks, BlockNote, pinned-comment coordinate approach) were external references, rephrased for compliance with licensing restrictions.*
