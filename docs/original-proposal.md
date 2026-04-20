# Original Proposal — Dynamisk Brief V1.0 for GS1 Norway

This document captures the original proposal context (October 2025). It gives the "why this exists" background that Claude Code should understand.

---

## The Problem GS1 Norway Faced

GS1 Norway's subject matter experts (fagpersoner) with deep technical knowledge needed to commission communications content, but lacked tools to effectively convey their knowledge to the communications team. The result was long email chains, unclear briefs, and valuable time spent on clarifications instead of production.

---

## The Solution Proposed

Dynamisk Brief: an intelligent web application that makes the briefing process easier, faster, and quality-assured. It combines structured dialog with intelligent follow-up to ensure all necessary details are captured.

**How it works (original proposal):**
1. Subject matter expert starts a brief and selects relevant theme (GLN, GTIN, Sporbarhet, etc.)
2. Uploads source material — documents, links, presentations
3. Defines frames — target audience, goals, channels, tone, desired deliverable
4. Guided AI dialog — system asks follow-up questions based on source material
5. «Clarify & Confirm» — AI confirms and clarifies each answer
6. Completed brief generated — complete document ready for communications team

---

## V1 Scope (as delivered in Base44)

- User login and simple UX for subject matter experts
- Document, link, and presentation upload as source material
- Guided AI dialog with Clarify & Confirm mechanism
- Brief generation with structured content and clear frames (goal, target audience, channel, tone, deliverable)
- Export and sharing of brief to communications team
- Basic administration of users and brief history

---

## Why the Rebuild

The V1 Base44 implementation proved the concept works. However:
- Base44 is a low-code platform that limits customisation and reliability
- Patching and iterating in Base44 created technical debt
- Users found the 5-step wizard UI too complex to navigate
- GS1 Norway needs a production-grade, owned codebase they control
- The 3-app chain (Brief → InfoHub → Publisering) requires shared auth and consistent data contracts that Base44 cannot provide

**The rebuild goal:** Same product logic, simplified UX, production infrastructure, owned codebase.

---

## Customer Context

- **Customer:** GS1 Norway (the Norwegian member organisation of GS1 Global)
- **Primary contact:** Anders (communications lead)
- **GS1 Norway mission:** Promote and manage GS1 standards (barcodes, GLN, GTIN, GDSN, etc.) across Norwegian industry
- **Key sectors:** Helse (health), Dagligvare (grocery), Bygg (construction), DPP (Digital Product Passport)
- **Brand colours:** `#002C6C` (navy), `#F26334` (orange)
- **Language:** Norwegian (bokmål) — all UI and all output
