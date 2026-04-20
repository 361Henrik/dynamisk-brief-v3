# GS1 Norway Communications Toolchain — Ecosystem Context

Dynamisk Brief is App 1 of 3 in GS1 Norway's AI-powered communications toolchain. This document gives Claude Code the architectural context needed to build App 1 correctly so the downstream apps work.

---

## The Three-App Chain

```
  App 1                    App 2                  App 3
  DYNAMISK BRIEF    →      INFOHUB         →      PUBLISERING
  (this app)               (to be built)           (to be built)

  Creates the              Processes source         Produces channel-
  communications           material against         ready text content
  brief via AI             the approved brief       (articles, posts,
  conversation                                      newsletters, etc.)
```

**Critical:** All transitions between apps are manual and human-controlled. No automatic data flow between apps in V1.

---

## The Three Human Gates

| Gate | After app | Who approves | What is approved |
|---|---|---|---|
| Gate 1 | Dynamisk Brief | Kommunikasjonsansvarlig | Brief is complete, correct, and ready for InfoHub |
| Gate 2 | InfoHub | Kommunikasjonsansvarlig | Source document verified, reflects GS1's neutral position |
| Gate 3 | Publisering | Kommunikasjonsansvarlig | Text is GS1-correct, tone is right, ready for distribution |

---

## What Dynamisk Brief Must Output (for InfoHub compatibility)

When a brief is approved (`status: 'godkjent'`), the DB record must contain:

```json
{
  "id": "uuid",
  "title": "string",
  "status": "godkjent",
  "theme_name": "string",
  "sections": {
    "prosjektinformasjon": "string (Norwegian text)",
    "bakgrunn": "string",
    "maal": "string",
    "maalgrupper": "string",
    "verdiforslag": "string",
    "budskap": "string",
    "leveranser": "string",
    "rammer": "string",
    "kildemateriale": "string"
  },
  "generated_document_url": "string (public URL to .docx file)",
  "created_at": "timestamptz",
  "updated_at": "timestamptz"
}
```

Do not rename these fields. InfoHub will read them.

---

## Shared Authentication

All three apps share the same authentication system. The Supabase project used for Dynamisk Brief will also be used by InfoHub and Publisering in V1. Build auth with this in mind:
- Use `user_profiles` table with `role` field (not just Supabase metadata)
- Keep roles simple: `user`, `fagperson`, `admin`
- Do not embed auth logic that can't be shared across apps

---

## Users

- Max 4 concurrent users in V1
- No self-registration — admin invites users via Supabase dashboard
- All users share access to all three apps via the same login
- Language: Norwegian (bokmål) throughout all three apps

---

## What is explicitly out of scope for V1

- No direct API integration between apps (manual export/import only)
- No automatic publishing to CMS, LinkedIn, email tools
- No image, video, or audio generation
- No advanced approval hierarchies
- No analytics or reporting beyond brief count/status
- No real-time collaboration
