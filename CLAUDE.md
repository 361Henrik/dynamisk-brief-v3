# CLAUDE.md — Dynamisk Brief (GS1 Norway)

## Read this first

Before writing a single line of code, read every file in `docs/`. They contain the product definition, UX spec, brief template (the 9-section output), and the 3-app ecosystem context. All decisions in this CLAUDE.md flow from those documents.

**Always enter plan mode first. Wait for approval before writing code.**

---

## What this project is

Dynamisk Brief is an internal AI-powered web application for GS1 Norway's communications team. It guides a user (communications manager + subject matter expert) through a structured conversation that produces a complete, approved 9-section communications brief — ready to hand off to the next tool in their workflow (InfoHub).

This is a **private, invitation-only tool** for a maximum of 4 concurrent users. No public sign-up. No public-facing content.

This is **App 1 of 3** in GS1 Norway's communications toolchain:
> **Dynamisk Brief** (this app) → InfoHub → Publisering

Dynamisk Brief is the upstream. Its approved brief output is what InfoHub consumes. Build the output format accordingly — see `docs/product-ecosystem.md`.

---

## Language rules

- **All UI text, labels, placeholders, error messages, AI dialog, and document output: Norwegian (bokmål)**
- **All code: English** (variable names, function names, comments, file names)
- **All communication with the developer (Henrik): English**
- AI system prompts that invoke Claude: English (Claude performs better in English even for Norwegian output)
- The brief document itself and all AI-generated brief content: Norwegian

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript strict + Vite 6 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Icons | Lucide React |
| Auth | Supabase Auth (email + password) |
| Database | Supabase Postgres + Row Level Security |
| File storage | Supabase Storage (bucket: `documents`) |
| API routes | Vercel serverless functions (`/api/` directory) |
| AI | Anthropic Claude API via `@anthropic-ai/sdk` |
| PDF extraction | `pdf-parse` in Vercel API route |
| DOCX generation | `docx` npm package in Vercel API route |
| Hosting | Vercel, auto-deploy from `main` branch |
| Node | 20+ |

**GS1 Norway brand colours (do not deviate):**
- Primary: `#002C6C` (GS1 navy blue)
- Accent: `#F26334` (GS1 orange)
- Background: `#FFFFFF` or `#F8F9FA`
- Text: `#1A1A1A`

---

## Domain

```
brief.gs1.threesix1.com
```

> ⚠️ Verify this domain with Henrik before configuring DNS. It may be `threesixty1.com` — confirm before pointing DNS.

Vercel project name: `dynamisk-brief`

---

## Current repo state

This repo contains:
- `/base44/` — the original Base44 export (reference only, do not modify)
- `/src/` — partially migrated React app (Base44 calls not yet replaced)
- `MIGRATION_PLAN.md` — the surgical Base44 → Supabase migration plan (reference)
- `CLAUDE.md` (this file) — the authoritative build directive

**What exists and must be preserved:**
- All shadcn/ui components in `src/components/ui/`
- GS1 colour scheme and branding
- Norwegian copy throughout
- The 9-section brief structure (see `docs/kommunikasjonsbrief-v1.2.md`)
- Admin pages: `AdminThemes.jsx`, `AdminUsers.jsx`, `AdminBriefmal.jsx`, `AdminKnowledgeBase.jsx`
- `BriefList.jsx` and `Home.jsx` (keep, clean up)

**What is being replaced:**
- All `base44.*` imports and calls → Supabase + Vercel API routes
- The 5-step wizard UI (`BriefEditor.jsx` with Source → Rammer → Dialog → Proposed → Final) → new three-panel `BriefWorkspace` component
- `src/api/base44Client.js` → delete after migration
- `src/api/entities.js` → delete after migration
- `src/api/integrations.js` → delete after migration

---

## What you are building: The Three-Panel BriefWorkspace

This is the core UX redesign. Replace the 5-step wizard with a single integrated workspace. See `docs/ux-brief.md` for the complete spec.

**Mental model shift:**
- OLD: "Go through 5 sequential wizard steps"
- NEW: "Have a conversation, watch the brief fill itself in"

**Layout (desktop, three columns):**

```
┌──────────────────┬───────────────────────┬──────────────────────┐
│   SOURCES        │   SAMTALE (dialog)    │   BRIEF (live)       │
│   (left panel)   │   (middle panel)      │   (right panel)      │
│                  │                       │                      │
│  Upload PDF      │  AI asks questions    │  § 1 Prosjektinfo    │
│  Paste URL       │  User answers         │  § 2 Bakgrunn        │
│  Type text       │  Free, any order      │  § 3 Mål             │
│                  │  Norwegian language   │  § 4 Målgrupper      │
│  [source list    │                       │  § 5 Verdiforslag    │
│   with status]   │  Sources auto-extract │  § 6 Budskap         │
│                  │  and pre-fill brief   │  § 7 Leveranser      │
│                  │  before conversation  │  § 8 Rammer          │
│                  │  even starts          │  § 9 Kildemateriale  │
│                  │                       │                      │
│                  │                       │  [Godkjenn & Eksport]│
└──────────────────┴───────────────────────┴──────────────────────┘
```

**Key rules:**
1. Sections start empty/grey. They fill and highlight as conversation extracts data.
2. Sources are processed on upload — AI pre-fills sections before any dialog starts.
3. No "Rammer" form. Those fields are collected through natural conversation.
4. No "Proposed" vs "Final" distinction — one live brief document.
5. "Godkjenn & Eksport" button activates when all 9 sections have content.
6. User can click any section in the right panel to manually edit it at any time.
7. Mobile: stack panels vertically with tab switcher (Kilder | Samtale | Brief).

**The 9 brief sections** (Norwegian labels, stored in DB as English keys):

| Key | Norwegian label |
|---|---|
| `prosjektinformasjon` | 1. Prosjektinformasjon |
| `bakgrunn` | 2. Bakgrunn og situasjonsbeskrivelse |
| `maal` | 3. Mål og suksesskriterier |
| `maalgrupper` | 4. Målgrupper |
| `verdiforslag` | 5. GS1-tilbudet og verdiforslag |
| `budskap` | 6. Budskap, tone og stil |
| `leveranser` | 7. Leveranser og kanaler |
| `rammer` | 8. Praktiske rammer og godkjenning |
| `kildemateriale` | 9. Kildemateriale |

See `docs/kommunikasjonsbrief-v1.2.md` for the complete sub-questions per section — these feed the AI system prompt.

---

## Build phases

Execute in order. Do not start a phase until the previous is complete and tested.

### Phase 1 — Foundation
- Install: `npm install @supabase/supabase-js @anthropic-ai/sdk pdf-parse docx formidable`
- Remove: `npm uninstall @base44/sdk` (if present)
- Create `src/lib/supabase.ts`
- Create `src/lib/types.ts` (TypeScript interfaces for Brief, Source, DialogEntry, Theme, User)
- Run Supabase schema (see schema section below)

### Phase 2 — Auth
- Create `src/lib/AuthContext.tsx` using Supabase Auth
- Create `src/pages/Login.tsx` (email + password, GS1 branding, Norwegian copy)
- Update `src/components/auth/RequireAuth.tsx` to redirect to `/login`
- Add `/login` route in `App.tsx` (unprotected)

### Phase 3 — DB adapter
- Create `src/api/db.ts` — typed Supabase wrappers for: Briefs, DialogEntries, BriefSources, Themes, KnowledgeDocs
- Replace all `base44.entities.*` calls in existing components with `db.ts` equivalents
- Field naming: Supabase snake_case ↔ frontend camelCase (use converter helpers)

### Phase 4 — Vercel API routes
- `api/llm.ts` — Anthropic Claude invocation (replaces InvokeLLM)
- `api/extract.ts` — PDF parse + URL fetch + Supabase status update (replaces ExtractDataFromUploadedFile)
- `api/upload.ts` — multipart upload to Supabase Storage (replaces UploadFile)
- `api/approve.ts` — generate DOCX, upload to Storage, return public URL, mark brief godkjent
- `api/feedback.ts` — store feedback in Supabase

### Phase 5 — BriefWorkspace (the new core UI)
- Create `src/pages/BriefWorkspace.tsx` — three-panel layout
- Create `src/components/workspace/SourcesPanel.tsx`
- Create `src/components/workspace/ConversationPanel.tsx`
- Create `src/components/workspace/BriefPanel.tsx`
- Create `src/components/workspace/BriefSection.tsx` (individual editable section)
- Wire up: upload → extract → pre-fill brief → conversation continues filling → approve
- The AI system prompt for the conversation must know all 9 sections and their sub-questions (from `docs/kommunikasjonsbrief-v1.2.md`), the uploaded source text, and which sections are already filled

### Phase 6 — Brief list + dashboard
- Clean up `Home.tsx` — show recent briefs, quick "Ny brief" button
- Clean up `BriefList.tsx` — list with search, filter by status (utkast/godkjent) and theme
- Route `/brief/:id` → `BriefWorkspace.tsx`
- Route `/brief/new` → `NewBrief.tsx` (theme selection only, then → BriefWorkspace)

### Phase 7 — Admin pages
- Migrate `AdminThemes.tsx` — replace base44 calls with db.ts
- Migrate `AdminUsers.tsx` — replace base44 auth calls with Supabase admin
- Migrate `AdminBriefmal.tsx` — replace base44 calls, upload PDF to Supabase Storage, store extracted text in `knowledge_docs`
- Migrate `AdminKnowledgeBase.tsx` — replace base44 calls

### Phase 8 — Cleanup
- Delete: `src/api/base44Client.js`, `src/api/entities.js`, `src/api/integrations.js`
- Delete: `src/lib/VisualEditAgent.jsx`
- Search entire codebase for `base44` — every remaining reference is a bug
- Run `npm run build` — zero errors required

### Phase 9 — Deploy
- Push to `main`
- Set env vars in Vercel dashboard (see `.env.example`)
- Create Supabase Storage bucket `documents` (public)
- Verify custom domain: `brief.gs1.threesix1.com`
- Run smoke tests (see below)

---

## Database schema

Run this in Supabase SQL editor. Full schema — run once, do not modify manually after.

```sql
-- TABLES
create table public.themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  theme_id uuid references public.themes(id),
  theme_name text,
  title text,
  status text default 'utkast', -- 'utkast' | 'godkjent'
  sections jsonb default '{}', -- { prosjektinformasjon: string, bakgrunn: string, ... }
  section_status jsonb default '{}', -- { prosjektinformasjon: 'empty'|'partial'|'complete', ... }
  generated_document_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.dialog_entries (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references public.briefs(id) on delete cascade,
  role text not null, -- 'user' | 'assistant'
  content text not null,
  sequence_number integer,
  created_at timestamptz default now()
);

create table public.brief_sources (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references public.briefs(id) on delete cascade,
  source_type text not null, -- 'file' | 'url' | 'text'
  file_name text,
  file_url text,
  mime_type text,
  extracted_text text,
  extraction_status text default 'pending', -- 'pending' | 'processing' | 'success' | 'error'
  extraction_error text,
  created_at timestamptz default now()
);

create table public.knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  doc_type text, -- 'brief_template' | 'knowledge_base'
  title text,
  extracted_text text,
  file_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  brief_id uuid,
  category text,
  message text,
  severity text,
  created_at timestamptz default now()
);

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text default 'user', -- 'user' | 'fagperson' | 'admin'
  created_at timestamptz default now()
);

-- RLS
alter table public.themes enable row level security;
alter table public.briefs enable row level security;
alter table public.dialog_entries enable row level security;
alter table public.brief_sources enable row level security;
alter table public.knowledge_docs enable row level security;
alter table public.feedback enable row level security;
alter table public.user_profiles enable row level security;

-- POLICIES
create policy "Authenticated users read themes" on public.themes
  for select using (auth.role() = 'authenticated');

create policy "Users own their briefs" on public.briefs
  for all using (auth.uid() = user_id);

create policy "Dialog entries via brief" on public.dialog_entries
  for all using (exists (select 1 from public.briefs where id = brief_id and user_id = auth.uid()));

create policy "Sources via brief" on public.brief_sources
  for all using (exists (select 1 from public.briefs where id = brief_id and user_id = auth.uid()));

create policy "Authenticated users read knowledge docs" on public.knowledge_docs
  for select using (auth.role() = 'authenticated');

create policy "Users read own profile" on public.user_profiles
  for select using (auth.uid() = id);

create policy "Authenticated can submit feedback" on public.feedback
  for insert with check (auth.role() = 'authenticated');

-- SEED THEMES
insert into public.themes (name, description, is_active) values
  ('GLN', 'Global Location Number – identifikasjon av lokasjoner', true),
  ('GTIN', 'Global Trade Item Number – produktidentifikasjon', true),
  ('Sporbarhet', 'Sporing av varer gjennom verdikjeden', true),
  ('Kursmarkedsføring', 'Markedsføring av GS1-kurs og opplæring', true),
  ('Datakvalitet', 'Kvalitetssikring av produktdata', true),
  ('DPP', 'Digital Product Passport', true),
  ('Helse', 'GS1-standarder i helsesektoren', true);
```

---

## AI conversation design

The conversation AI (middle panel) must:
1. Know the full brief template (all 9 sections and sub-questions from `docs/kommunikasjonsbrief-v1.2.md`)
2. Know what source text has been extracted (injected into system prompt)
3. Know which sections are already filled (from current brief state)
4. Ask questions in Norwegian
5. After each user answer, update the relevant brief section(s) via the API
6. Confirm what it captured: "Jeg har notert at målgruppen er X. Stemmer det?"
7. Ask follow-up questions for incomplete sections
8. Never ask for information already in the sources or already confirmed
9. When all sections are filled, say: "Briefen ser komplett ut. Du kan nå godkjenne og eksportere den."

**Model to use:** `claude-sonnet-4-5` (or latest available)
**System prompt:** English (for accuracy) — inject Norwegian UI instructions as needed
**Output parsing:** After each turn, call a separate extraction function that reads the conversation and returns JSON section updates

---

## Smoke tests

After deploy, verify each of these flows:

1. Login → user authenticates with email/password
2. New brief → theme selection → BriefWorkspace opens
3. Upload PDF → extraction triggers → extraction status polls to 'success'
4. Add URL source → text extracted
5. Add text source → saved immediately
6. Sources pre-fill brief sections → right panel shows partial content
7. Conversation → AI asks questions → user answers → sections update in right panel
8. Manual section edit → user clicks section in right panel, edits directly
9. All sections complete → "Godkjenn & Eksport" activates
10. Approve → DOCX generated → download link appears
11. Brief list → user sees all their briefs with status
12. Admin: theme CRUD works
13. Admin: upload brief template PDF → extracted text stored in knowledge_docs

---

## What NOT to change

- GS1 colour scheme: `#002C6C` navy, `#F26334` orange
- All Norwegian copy (labels, buttons, placeholders, error messages)
- shadcn/ui component library
- The 9 brief sections and their Norwegian labels
- Admin pages structure (just migrate the data layer)
- Supabase RLS policies (security boundary)
- The `approved_at` and `status: 'godkjent'` fields — InfoHub reads these

---

## Commit format

```
feat: / fix: / chore: / docs: / refactor:
```

Examples:
- `feat: add three-panel BriefWorkspace component`
- `fix: correct extraction status polling in SourcesPanel`
- `chore: remove base44 dependencies`

---

## Docs in this repo

| File | What it contains |
|---|---|
| `docs/kommunikasjonsbrief-v1.2.md` | The 9-section brief template with all sub-questions — the AI must know all of this |
| `docs/product-definition.md` | Complete product definition from reverse engineering the Base44 app |
| `docs/product-ecosystem.md` | The 3-app chain context (Dynamisk Brief → InfoHub → Publisering) |
| `docs/ux-brief.md` | Detailed UX spec for the three-panel BriefWorkspace |
| `docs/original-proposal.md` | Original V1 proposal to GS1 Norway — gives the "why this exists" context |
| `MIGRATION_PLAN.md` | The Base44 → Supabase migration plan (use as reference for data layer) |
