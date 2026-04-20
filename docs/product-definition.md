# Dynamisk Brief V1 — Product Definition

Derived from reverse engineering the Base44 implementation (March 2026). This is the authoritative product definition for what the app does and how it works.

---

## Product Purpose

Dynamisk Brief is a web application designed to facilitate the creation and management of communication briefs. It serves as an interactive platform for users to input, refine, and generate structured brief documents.

It helps users create complete, quality-assured communications briefs («lage komplette, kvalitetssikrede kommunikasjonsbriefs») for a communications department. It guides users through various stages, from providing source material to generating a final approved brief.

**What it is not:**
- A generic AI chatbot — AI capabilities are specifically scoped to brief creation
- A full-fledged document editing suite
- A traditional project management system
- A collaborative real-time editing platform

---

## User & Roles

- **Kommunikasjonsansvarlig** — the communications manager, primary user, owns the brief, approves output
- **Fagperson** — the subject matter expert, contributes knowledge through the dialog, does not own the brief
- **Admin** — manages themes, users, brief template PDF, knowledge base
- Max 4 concurrent users (V1)

---

## Core Operating Model

The application operates on a structured workflow for brief creation, driven by the briefmal (brief template) and guided AI interaction.

**Information collection pipeline:**
1. **Source material** — user uploads PDFs, provides URLs, or types text
2. **AI extraction** — extracted text is processed and used to pre-fill brief sections
3. **Conversation** — AI asks clarifying questions for incomplete sections, user answers
4. **Confirmation** — AI confirms what it captured, user corrects if needed
5. **Brief assembly** — 9 sections fill progressively
6. **Approval** — user reviews completed brief, approves, exports as DOCX

**The app is optimized for structured, controlled outputs.** The briefmal and fixed 9-section structure dictate content categories. This is intentional — it ensures quality-assured, consistent briefs.

---

## Mode Selection (V1)

- **Detaljert modus** — full guided conversation, all 9 sections explored thoroughly
- **Hurtigmodus** — faster entry for experienced users; key fields only, less back-and-forth

In the new three-panel UX, this distinction collapses: sources pre-fill what they can, conversation fills the rest. Speed is determined by how much source material the user provides upfront.

---

## Brief Lifecycle

| Status | Norwegian | Meaning |
|---|---|---|
| `utkast` | Utkast | Draft — in progress, editable, can be deleted |
| `godkjent` | Godkjent | Approved — final, locked, exported to DOCX, cannot be deleted |

**Approved briefs flow to InfoHub** as the upstream data source for the next app in the chain.

---

## Source Material Handling

- **Supported upload types:** PDF files
- **URL sources:** web pages (text extracted, HTML stripped)
- **Direct text input:** saved immediately, status `success`
- **Extraction statuses:** `pending` → `processing` → `success` | `error`
- **Unsupported for upload (V1):** Word, Excel, PowerPoint — users can copy-paste content from these as text

---

## Theming

Themes categorise briefs and are selected at brief creation. Examples: GLN, GTIN, Sporbarhet, Kursmarkedsføring, Datakvalitet, DPP, Helse.

Admins manage themes (create, edit, activate/deactivate).

---

## Design Principles (from V1 implementation)

- **Progressive guidance** — onboarding for new users, help always accessible
- **Structure over freeform** — predefined sections ensure consistent quality
- **Clarity over novelty** — Norwegian labels, clean UI, GS1 branding
- **Human approval always required** — system proposes, human approves
- **Trust through source visibility** — user always sees what sources fed the brief
- **Scandinavian simplicity** — functional design, minimal ornamentation

---

## Key V1 Constraints

- Human must approve before brief is finalised — no auto-approval
- Approved briefs cannot be deleted
- Admin pages restricted by role
- No real-time collaborative editing
- No direct publishing to external channels
- Users must be invited — no self-registration
