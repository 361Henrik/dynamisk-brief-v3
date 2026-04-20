# Kommunikasjonsbrief for GS1 Norway — versjon 1.2

This document defines the exact output structure of Dynamisk Brief. These are the 9 sections and their sub-questions. The AI conversation must be able to collect all of this information through dialog and source extraction.

The brief template functions as a checklist/interview guide for ensuring shared understanding of goals, target audience, and message. The order in which questions are answered will vary — the app captures information regardless of order.

---

## 1. Prosjektinformasjon

**Purpose:** Provide a quick overview so all involved understand the context immediately.

- **Tittel på tiltaket** — e.g. «GLN for sykehus – informasjonskampanje høst 2026»
- **Type tiltak** (one or more):
  - Artikkel / nettside-innhold
  - Landingsside for kampanje eller tjeneste
  - Kursbeskrivelse / Invitasjon
  - Nyhetsbrev-tekst
  - SoMe-innlegg (LinkedIn etc.)
  - Presentasjon (slides)
  - FAQ-spørsmål og svar
  - Webinar
  - Messe-/standmateriell
  - Filmer/animasjoner til Smart Centre
  - Filmer/animasjoner til ekstern bruk (partnere)
  - Suksesshistorier / brukercases
  - Andre «Harald-leveranser»
  - Annet (specify)
- **Fagområde / bransje** — e.g. Helse, Dagligvare, Bygg, DPP
- **Kontaktpersoner:**
  - Fagansvarlig: name and email
  - Kommunikasjonsansvarlig: name and email

---

## 2. Bakgrunn og situasjonsbeskrivelse

**Purpose:** Explain why the initiative is necessary and what situation the target audience is in.

- **Hva har skjedd / trigget behovet?** — 2–4 sentences about the background
- **Dagens løsning (situasjon):** How does the target audience currently solve this need or challenge?
- **Problemet vi ønsker å løse / forklare:** What specific problems do we see in the target audience, or what is not working well with the current situation?

---

## 3. Mål og suksesskriterier

**Purpose:** Define what we want to achieve and how we identify success.

- **Forretningsmål:** How does this initiative support the strategic goals in GS1 Norway's action plan? (1–2 sentences)
- **Kommunikasjonsmål:** What do we want the target audience to know, feel, or understand? e.g. «Flere skal vite at GLN finnes og hva det brukes til»
- **Ønsket handling (Call To Action):** What should recipients do after seeing the content?
  - Lese mer på nettsiden
  - Melde seg på kurs
  - Kontakte GS1
  - Bestille tjeneste / registrere seg
  - Annet (specify)
- **Definisjon av suksess:** Which outcome metrics define success? e.g. «30 påmeldinger», «200 nedlastinger», «redusert supporttrykk»

---

## 4. Målgrupper

**Purpose:** Ensure the message reaches the right industry, the right person at the right expertise level.

- **Primærmålgruppe:** Who are we primarily talking to? e.g. Innkjøpsansvarlige på sykehus
- **Sekundærmålgruppe:** Others who should understand the message — e.g. IT-leverandører eller toppledelse
- **Nåværende kunnskap hos målgruppe:** What do they know about GS1 and this specific topic today? e.g. «Kjenner oss for strekkoder, men ikke for sporbarhet»
- **Typiske barrierer / bekymringer:** What questions or objections do they often have? e.g. «Er dette dyrt?», «Må vi bytte IT-system?»

---

## 5. GS1-tilbudet og verdiforslag

**Purpose:** Describe the concrete value of what we offer, focused on customer needs rather than technical details.

- **Tjeneste / Tema:** e.g. GLN, GTIN, Kurs i datakvalitet
- **Relevante standarder / tjenester:** e.g. GLN + GDSN
- **Kort verdiforslag:** A one-sentence description explaining the value for the customer
- **Viktigste fordeler:** 2–3 points explaining the benefit — e.g. mindre manuelt arbeid, færre feil
- **Bevis og fakta:** Customer cases, numbers, quotes, or regulatory requirements supporting the benefits? From Norway, Nordics, or other GS1 MOs?

---

## 6. Budskap, tone og stil

**Purpose:** Set the framework for how we communicate to ensure consistency and impact.

- **Hovedbudskap:** 1–2 sentences written so the target audience understands immediately
- **Støttepoenger:** 2–4 short points elaborating on the main message
- **Ønsket tone:**
  - Profesjonell og tydelig
  - Enkel og pedagogisk
  - Inspirerende / mulighetsorientert
  - Annet (specify)
- **Språk og fagnivå:** Should we avoid technical language? Is this for specialists or general public?
- **Ord å unngå:** e.g. internal abbreviations or pronounced «GS1-language»

---

## 7. Leveranser og kanaler

**Purpose:** Clarify exactly what is to be produced and where it will be delivered/shown.

- **Hva skal produseres?** Specify quantity and format based on selections in section 1
- **Kanaler:** Where will the content be published? e.g. gs1.no, LinkedIn, Nyhetsbrev
- **Gjenbruk av innhold:** Can the content or elements from it be used in other channels or contexts later?

---

## 8. Praktiske rammer og godkjenning

**Purpose:** Ensure control of deadlines, resources, and responsibilities.

- **Frist for ferdig innhold:** Date by which everything must be ready
- **Planlagt publiseringsdato:** Date or period
- **Avhengigheter:** Is there anything we are waiting for? e.g. numbers from a project, regulatory changes
- **Budsjett:** Any budget constraints for production?
- **Godkjenningsprosess:** Who must approve the final content and by when?
- **Kontaktperson for spørsmål underveis:** Name and email

---

## 9. Kildemateriale

**Purpose:** Document all reference material used as the basis for the brief.

- List of all uploaded documents (PDFs, Word files)
- List of all URLs provided
- Any direct text input provided
- Extraction status of each source
- Summary of what was used from each source

---

## Notes for AI implementation

- The app MUST be able to collect this information in any order
- Information found in uploaded source documents should auto-fill sections — the AI extracts and proposes content; the user confirms or corrects
- Each section should have a confidence/completeness status: `empty` | `partial` | `complete`
- A section is `complete` when it has substantive content for its key fields
- The conversation should prioritize incomplete sections
- The AI should never re-ask for information already confirmed
