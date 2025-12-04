import React from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SYSTEM_DESCRIPTION_MARKDOWN = `
## Systeminstruksjon for Dynamisk Brief V1

### 1. Formål og rolle i GS1

Dynamisk Brief V1 er et innovativt verktøy utviklet for GS1 Norge for å effektivisere prosessen med å lage kommunikasjonsbriefs. Applikasjonen gir fageksperter mulighet til å generere detaljerte og konsise briefs basert på kildemateriale, spesifikke rammer og interaktiv dialog med en avansert kunstig intelligens (AI). Målet er å sikre høy kvalitet, relevans og konsistens i all ekstern og intern kommunikasjon, samtidig som tidsbruken på utarbeidelse av briefs reduseres.

AI-en fungerer som en intelligent assistent som forstår komplekst fagstoff og hjelper brukeren med å strukturere og formulere budskap i tråd med GS1s retningslinjer og kommunikasjonsstrategi.

### 2. Hvilken informasjon AI-en bruker

For å levere presise og relevante utkast, baserer AI-en seg på flere informasjonskilder:

*   **Opplastet kildemateriale**: Brukeren laster opp relevante dokumenter (PDF, Word) og URL-er. AI-en ekstrakterer og analyserer tekstinnholdet fra disse kildene for å sikre at briefen bygger på faktisk informasjon.
*   **Brief-rammer**: Informasjonen brukeren spesifiserer om målgruppe, mål, kanaler, tone, ønskede leveranser og tidsfrister er avgjørende for AI-ens forståelse av oppdraget.
*   **Kunnskapsbase-dokumenter**: Forhåndsdefinerte Knowledge Base-dokumenter, lenket til valgte temaer (f.eks. om GLN, GTIN, Sporbarhet), gir AI-en dypere faglig kontekst og sikrer at briefen reflekterer GS1s offisielle posisjoner og terminologi. Disse dokumentene vedlikeholdes av administratorer.
*   **Dialoghistorikk**: AI-en husker hele dialogen med brukeren. Tidligere meldinger og bekreftelser er en del av konteksten, slik at AI-en kan bygge videre på det som allerede er diskutert og godkjent.

### 3. Hvordan brief-prosessen fungerer steg for steg

Prosessen for å lage en dynamisk brief er strukturert i en tydelig flyt:

1.  **Start ny brief**: Brukeren starter en ny brief og velger et overordnet tema.
2.  **Kildemateriale**: Nødvendige underlagsdokumenter og URL-er lastes opp. AI-en forbereder seg ved å lese og forstå dette materialet.
3.  **Rammer**: Brukeren definerer viktige rammer for briefen (hvem skal den snakke til, hva er målet, osv.).
4.  **AI-dialog**: Brukeren og AI-en har en interaktiv samtale. AI-en foreslår innhold, stiller spørsmål for å avklare detaljer og foreslår formuleringer.
5.  **Clarify & Confirm**: Under dialogen vil AI-en presentere sentrale punkter for brukeren for eksplisitt bekreftelse. Dette sikrer at AI-en har forstått korrekt og at viktige beslutninger er godkjent av fageksperten.
6.  **Ferdig brief**: Når dialogen er fullført og alle nødvendige punkter er bekreftet, genererer AI-en den komplette briefen.
7.  **Word-eksport**: Den ferdige briefen kan lastes ned som et Word-dokument (DOCX), klar for videre bearbeiding eller distribusjon.
8.  **Historikk**: Alle briefs lagres, og brukeren kan enkelt se en oversikt over sine tidligere briefs.

### 4. Clarify & Confirm-mekanismen

Clarify & Confirm er en kritisk mekanisme for å sikre nøyaktighet og brukertillit. Når AI-en identifiserer et informasjonsområde eller en beslutning som er avgjørende for briefen, men som kan ha rom for misforståelser eller tvetydighet, vil den aktivt be om brukerens bekreftelse.

*   **Hvordan det fungerer**: AI-en presenterer et oppsummert punkt eller spørsmål og venter på brukerens eksplisitte godkjenning.
*   **Formål**: Dette forhindrer at AI-en "gjetter" og integrerer feilaktig informasjon i briefen. Det sikrer at brukeren har full kontroll over de viktigste delene av briefen.
*   **Lagring**: Alle bekreftede punkter lagres permanent i brief-entiteten, og bidrar til den endelige briefens innhold og som en dokumentasjon av viktige beslutninger.

AI-en er designet til å prioritere å stille oppfølgingsspørsmål og be om avklaring fremfor å ta egne tolkninger når den er usikker. Dette minimerer risikoen for feilinformasjon i den ferdige briefen.

### 5. Generering og lagring av ferdig brief

Når AI-dialogen er avsluttet og alle bekreftelsespunkter er håndtert, genererer AI-en den endelige kommunikasjonsbriefen. AI-en strukturerer innholdet i følgende seksjoner:

*   **Bakgrunn**: En kontekstualisering av kommunikasjonsoppdraget.
*   **Nøkkelpunkter**: De viktigste budskapene eller faktaene som briefen skal formidle.
*   **Hovedbudskap**: Den overordnede, samlende meldingen briefen skal kommunisere.
*   **Eksempler**: Konkrete illustrasjoner eller anvendelser av budskapet.

Resultatet av AI-genereringen lagres som en del av brief-entiteten i Base44-databasen (\`Brief.finalBrief\`). Brukeren kan da lese gjennom briefen og godkjenne den, noe som oppdaterer briefens status til "godkjent". Godkjente briefs kan deretter eksporteres til Word, som et profesjonelt dokument. Word-eksporten inkluderer all relevant informasjon fra briefen, inkludert rammer, bekreftede punkter, og selve AI-genererte briefteksten, formatert for optimal lesbarhet.

### 6. Språk, tone og begrensninger

*   **Språk og tone**: AI-en er finjustert for å kommunisere på norsk (bokmål). Den er instruert til å opprettholde en profesjonell, faglig presis og objektiv tone, i tråd med GS1s kommunikasjonsstil. Dette bidrar til konsistens på tvers av alle briefene.
*   **Menneskelig overvåking**: Det er avgjørende å understreke at AI-genererte utkast alltid skal kvalitetssikres av en menneskelig fagekspert. AI-en er et verktøy for å effektivisere og assistere, ikke for å erstatte den menneskelige vurderingen.
*   **Kreativitet og kompleksitet**: Mens AI-en er dyktig til å strukturere og formulere, kan den ha begrensninger når det gjelder svært nyansert kreativitet eller håndtering av ekstremt komplekse, emosjonelle eller sensitive kommunikasjonsoppdrag uten tilstrekkelig kildemateriale.

### 7. Anbefalt bruk og hva Admin bør følge med på

Dynamisk Brief V1 er ment å være et daglig verktøy for fageksperter som ofte utarbeider kommunikasjonsbriefs.

Administratorer bør følge med på:
*   **Kunnskapsbasen**: Sørg for at Knowledge Base-dokumentene er oppdaterte, nøyaktige og relevante for å sikre at AI-en har det beste grunnlaget for å forstå GS1s fagfelt. Dette er avgjørende for AI-ens ytelse.
*   **Brukerfeedback**: Vær oppmerksom på tilbakemeldinger fra brukere om AI-ens presisjon, relevans og brukervennlighet.
*   **Brief-kvalitet**: Stikkprøver av genererte briefs kan utføres for å sikre at utskriftkvaliteten holder mål og at AI-en leverer i henhold til forventningene.

Ved å aktivt vedlikeholde og overvåke disse områdene, kan administratorer sikre at Dynamisk Brief V1 forblir et verdifullt verktøy for GS1 Norge.
`;

function AdminSystemInstructionsContent() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Systeminstruksjon</h1>
        <p className="text-gray-500 dark:text-gray-400">Dokumentasjon for administratorer</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle>Om denne siden</CardTitle>
              <CardDescription>
                Denne siden beskriver hvordan Dynamisk Brief V1 fungerer "under panseret". 
                Informasjonen er kun tilgjengelig for administratorer og gir en oversikt over 
                AI-logikken, brief-prosessen og viktige begrensninger å være klar over.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h2: ({ children }) => <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900 dark:text-white border-b pb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-200">{children}</h3>,
                p: ({ children }) => <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="mb-4 ml-4 list-disc space-y-2">{children}</ul>,
                ol: ({ children }) => <ol className="mb-4 ml-4 list-decimal space-y-2">{children}</ol>,
                li: ({ children }) => <li className="text-gray-700 dark:text-gray-300">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                code: ({ children }) => <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm">{children}</code>,
              }}
            >
              {SYSTEM_DESCRIPTION_MARKDOWN}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminSystemInstructions() {
  return (
    <RequireAuth requireAdmin>
      <AdminSystemInstructionsContent />
    </RequireAuth>
  );
}