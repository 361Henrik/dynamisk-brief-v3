# UX Brief — Three-Panel BriefWorkspace

This document specifies the new UX that replaces the 5-step wizard from the Base44 implementation.

---

## The Problem with the Current UX

The current 5-step wizard (Source Material → Rammer → Dialog → Proposed Brief → Final Brief) forces users to think "what stage am I in?" instead of "what do I know?"

User feedback: it's too complicated. Users lose track of where they are. The "Rammer" form feels like a separate task. The distinction between "Proposed" and "Final" brief adds friction with no clear benefit.

---

## The New Mental Model

**Old:** "Go through 5 sequential steps to create a brief."
**New:** "Have a conversation. Watch the brief fill itself in."

The user should feel like they are talking to an intelligent assistant that is simultaneously filling in a document on the right side of the screen. There are no steps to navigate. There is just a conversation and a brief.

---

## Three-Panel Layout

### Desktop (three columns, fixed height, no page scroll)

```
┌─────────────────────┬──────────────────────────┬────────────────────────┐
│  KILDER             │  SAMTALE                 │  BRIEF                 │
│  (Sources)          │  (Conversation)          │  (Live document)       │
│  ~280px fixed       │  flex-1                  │  ~360px fixed          │
│                     │                          │                        │
│  [+ Legg til kilde] │  [conversation thread]   │  § 1 Prosjektinf... ✓  │
│                     │                          │  § 2 Bakgrunn...   ✓  │
│  📄 source1.pdf     │  AI: «Hva er hoved-      │  § 3 Mål...        ◑  │
│     ✓ Ekstrahert    │  budskapet dere vil      │  § 4 Målgrupper... ○  │
│                     │  formidle?»              │  § 5 Verdiforslag  ○  │
│  🔗 gs1.no/gln      │                          │  § 6 Budskap...    ○  │
│     ✓ Ekstrahert    │  User: «At GLN gir       │  § 7 Leveranser... ○  │
│                     │  bedre sporbarhet...»    │  § 8 Rammer...     ○  │
│  📝 Direkte tekst   │                          │  § 9 Kildemat...   ◑  │
│     ✓ Lagret        │  AI: «Forstått. Jeg      │                        │
│                     │  har notert hoved-       │  [Godkjenn & Eksport]  │
│                     │  budskapet. Er dette     │  (disabled until all ✓)│
│                     │  riktig? [preview]»      │                        │
│                     │                          │  Completion: 3/9 sek.  │
│                     │  [input field]           │                        │
└─────────────────────┴──────────────────────────┴────────────────────────┘
```

**Section status indicators:**
- ○ Empty — no content yet
- ◑ Partial — some content, more needed
- ✓ Complete — sufficient content captured

### Mobile (stacked, tab switcher)

```
[Kilder] [Samtale] [Brief]  ← tab switcher, sticky top
─────────────────────────────
[active panel content, full width, scrollable]
```

---

## Panel 1: Kilder (Sources)

**Function:** Upload and manage source material. Sources feed the AI with context and auto-fill brief sections.

**Add source options (three buttons):**
- 📄 Last opp PDF — file picker, PDF only, uploads to Supabase Storage
- 🔗 Lim inn URL — URL input, fetches and extracts text via `/api/extract`
- 📝 Skriv tekst — textarea, saves directly

**Each source shows:**
- File name / URL / "Direkte tekst"
- Extraction status: Behandler... | ✓ Ekstrahert | ✗ Feil
- Delete button (only while brief is utkast)

**Behaviour after upload:**
1. Source created in DB with status `pending`
2. `/api/extract` called immediately (fire and forget)
3. Status polls every 3 seconds until `success` or `error`
4. On `success`: call `/api/llm` with extracted text + current brief state → get proposed section updates → apply to brief right panel
5. Conversation AI is notified that new context is available

---

## Panel 2: Samtale (Conversation)

**Function:** AI-guided dialog that collects information for incomplete sections.

**Conversation rules:**
- AI communicates in Norwegian
- AI knows the full brief template (all 9 sections, all sub-questions)
- AI knows what source text has been extracted
- AI knows which sections are already complete
- AI focuses questions on incomplete sections
- After each user answer, AI confirms: «Jeg har notert at [X]. Stemmer det?»
- User can correct: «Nei, det er egentlig Y»
- AI never re-asks for confirmed information
- When all sections complete: «Briefen ser komplett ut! Du kan nå godkjenne og eksportere den fra panelet til høyre."

**Conversation opening (when brief is new):**
- If sources just uploaded: «Jeg har lest gjennom kildematerialet og har allerede fylt inn noen seksjoner. La oss gå gjennom det som mangler. [First incomplete section question]"
- If no sources: «La oss starte med det viktigste — hva handler dette kommunikasjonstiltaket om?"

**Input:** Textarea with send button. Enter sends. Shift+Enter for new line.

**Each AI message includes:**
- The question or confirmation
- Optional: small preview of what was captured (collapsed by default)

---

## Panel 3: Brief (Live document)

**Function:** Shows the brief being built in real-time. User can click any section to edit directly.

**Each section:**
- Section number + Norwegian title
- Status indicator (○ ◑ ✓)
- Content text (empty state shows gentle placeholder)
- Click to expand and edit inline
- Changes save automatically (debounced, 800ms)

**Section expand/edit state:**
```
§ 3 Mål og suksesskriterier                              ◑ [×]
──────────────────────────────────────────────────────────
[textarea with current content, editable]

  Forretningsmål: Støtte GS1 Norways mål om å øke
  bruken av GLN i helsesektoren med 20% innen 2027.

  Kommunikasjonsmål: Innkjøpsansvarlige på sykehus
  skal forstå at GLN løser sporbarhetskravet fra
  Helsedirektoratet.

  CTA: Melde seg på kurs (ikke valgt enda)

[Lagre] [Lukk]
──────────────────────────────────────────────────────────
```

**Approve & Export button:**
- Disabled until all 9 sections are ✓ complete
- On click: confirm modal «Er du sikker på at du vil godkjenne denne briefen? Den kan ikke endres etterpå."
- On confirm: call `/api/approve`, show loading, then show download link
- After approval: all panels become read-only, brief status shows "Godkjent [date]"

---

## New Brief Creation Flow

1. User clicks "Ny brief" from Home or BriefList
2. Simple modal (not a separate page):
   - Select theme (dropdown)
   - Brief title (optional, auto-generated if empty: «[Theme] – [date]»)
   - [Start] button
3. BriefWorkspace opens with empty state
4. User adds sources first (recommended) or starts conversation directly

---

## Admin Pages (unchanged structure)

Admin pages keep their current structure and layout. Only the data layer is migrated. No UX changes to admin.

- `/admin/themes` — CRUD for themes
- `/admin/users` — invite/manage users
- `/admin/briefmal` — upload the brief template PDF (feeds knowledge_docs)
- `/admin/knowledge` — manage knowledge base documents

---

## Navigation

**Sidebar (desktop, persistent):**
- GS1 Norway logo / Dynamisk Brief wordmark
- Mine briefer (link to /)
- Ny brief (opens new brief modal)
- [Admin section — admin role only]
  - Temaer
  - Brukere
  - Briefmal
  - Kunnskapsbase
- [bottom] User name + role + Logg ut

**Header (mobile only):**
- Hamburger menu → drawer
- Same nav structure as sidebar

---

## Empty States

**No briefs yet (Home):**
> «Ingen briefer ennå. Start med å lage din første brief.»
> [Ny brief] button

**BriefWorkspace — no sources yet (Sources panel):**
> «Legg til kildemateriale for å hjelpe AI-en med å fylle inn briefen automatisk."

**BriefWorkspace — conversation not started (Conversation panel):**
> «Klar til å starte. Legg til kilder, eller start samtalen direkte."
> [Start samtale] button (sends opening message)

---

## Performance Requirements

- Conversation turn latency: < 4 seconds for AI response
- Extraction status polling: every 3 seconds, max 120 seconds before timeout
- Section save debounce: 800ms after last keystroke
- DOCX generation: < 10 seconds
- Page load (logged in, brief list): < 2 seconds
