import React from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { 
  FileText, 
  Link as LinkIcon, 
  FileWarning, 
  HelpCircle,
  CheckCircle2,
  XCircle,
  Info,
  ArrowRight,
  BookMarked
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGuide } from '@/components/onboarding/GuideContext';

function HelpInstructionsContent() {
  const { openGuide } = useGuide();
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#454545]">Instruksjoner</h1>
        <p className="text-[#888B8D] mt-1">
          Alt du trenger å vite om hvordan Dynamisk Brief fungerer
        </p>
      </div>

      {/* Guide CTA */}
      <div className="bg-[#002C6C]/5 border border-[#002C6C]/20 rounded-xl p-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-[#002C6C]">Kom i gang</h3>
          <p className="text-sm text-[#454545] mt-0.5">Bruk guiden for en rask gjennomgang av flyten.</p>
        </div>
        <Button
          onClick={openGuide}
          className="bg-[#002C6C] hover:bg-[#001a45] text-white flex-shrink-0"
          size="sm"
        >
          <BookMarked className="h-4 w-4 mr-2" />
          Åpne guide
        </Button>
      </div>

      {/* How the Flow Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-[#002C6C]" />
            Slik fungerer flyten
          </CardTitle>
          <CardDescription>
            Fra kildemateriale til ferdig brief i fem steg
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#002C6C] text-white flex items-center justify-center text-sm font-medium flex-shrink-0">1</div>
              <div>
                <h4 className="font-medium text-[#454545]">Briefmal</h4>
                <p className="text-sm text-[#888B8D]">
                  Briefmalen styrer strukturen i intervjuet og den ferdige briefen.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#002C6C] text-white flex items-center justify-center text-sm font-medium flex-shrink-0">2</div>
              <div>
                <h4 className="font-medium text-[#454545]">Kildemateriale</h4>
                <p className="text-sm text-[#888B8D]">
                  Last opp PDF, legg til URL-er, eller lim inn tekst som grunnlag for briefen.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#002C6C] text-white flex items-center justify-center text-sm font-medium flex-shrink-0">3</div>
              <div>
                <h4 className="font-medium text-[#454545]">Dynamisk intervju</h4>
                <p className="text-sm text-[#888B8D]">
                  Applikasjonen stiller deg spørsmål for å fylle inn manglende informasjon – ett spørsmål per seksjon.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#002C6C] text-white flex items-center justify-center text-sm font-medium flex-shrink-0">4</div>
              <div>
                <h4 className="font-medium text-[#454545]">Foreslått brief</h4>
                <p className="text-sm text-[#888B8D]">
                  Du får en komplett, redigerbar brief basert på intervjuet. Alle seksjoner kan redigeres manuelt. Når du er fornøyd, må briefen <strong>godkjennes</strong> før den regnes som endelig.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#002C6C] text-white flex items-center justify-center text-sm font-medium flex-shrink-0">5</div>
              <div>
                <h4 className="font-medium text-[#454545]">Ferdig brief</h4>
                <p className="text-sm text-[#888B8D]">
                  Den ferdige briefen er alltid basert på <strong>sist godkjente foreslåtte brief</strong>. Her kan du kopiere innhold eller eksportere til Word.
                </p>
              </div>
            </div>
          </div>

          {/* Clarification block */}
          <div className="mt-6 bg-[#002C6C]/5 border border-[#002C6C]/20 rounded-lg p-4">
            <p className="text-sm text-[#002C6C]">
              <strong>Foreslått brief</strong> er redigerings- og godkjenningssteget. <strong>Ferdig brief</strong> viser alltid den sist godkjente versjonen. Hvis du gjør endringer etter godkjenning, må briefen godkjennes på nytt.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* How Source Material Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#002C6C]" />
            Slik fungerer kildemateriale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[#888B8D]">
            Kildemateriale er dokumenter og lenker du legger til som grunnlag for å lage en brief. 
            Applikasjonen leser og analyserer dette innholdet for å forstå konteksten og hjelpe deg med å 
            utforme kommunikasjonen.
          </p>
          <div className="bg-[#002C6C]/5 border border-[#002C6C]/20 rounded-lg p-4">
            <h4 className="font-medium text-[#002C6C] mb-2">Hvordan det fungerer:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-[#002C6C]">
              <li>Du laster opp filer eller legger til URL-er</li>
              <li>Systemet henter ut tekst automatisk</li>
              <li>Teksten brukes som kontekst i intervjuet</li>
              <li>Applikasjonen genererer briefen basert på dette</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Supported Formats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Støttede formater
          </CardTitle>
          <CardDescription>
            Disse formatene fungerer for tekstuttrekk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">PDF</span>
                <Badge className="bg-green-100 text-green-700">Anbefalt</Badge>
              </div>
              <p className="text-sm text-green-800">
                PDF-filer støttes fullt ut. Tekst hentes automatisk.
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">URL</span>
              </div>
              <p className="text-sm text-green-800">
                Lenker til nettsider. Innhold hentes automatisk.
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Tekst</span>
              </div>
              <p className="text-sm text-green-800">
                Lim inn tekst direkte i kildemateriale-steget.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NOT Supported Formats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Formater som ikke støttes
          </CardTitle>
          <CardDescription>
            Disse formatene kan ikke brukes som kildemateriale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border rounded-lg p-3 bg-red-50 border-red-200">
              <div className="flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-900">Word (.docx)</span>
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-red-50 border-red-200">
              <div className="flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-900">Excel (.xlsx)</span>
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-red-50 border-red-200">
              <div className="flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-900">PowerPoint (.pptx)</span>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Hvorfor støttes ikke disse formatene?
            </h4>
            <p className="text-sm text-amber-800">
            Word-, Excel- og PowerPoint-filer har kompleks struktur som gjør det teknisk 
            krevende å hente ut tekst pålitelig. Vi prioriterer formater som gir 
            konsistent og forutsigbar tekstuttrekking. Dette er en teknisk begrensning, 
            ikke en brukerfeil.
            </p>
            <p className="text-sm text-amber-800 mt-2 font-medium">
              Løsning: Lagre dokumentet som PDF før du laster det opp.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Input vs Output */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[#002C6C]" />
            Forskjellen på input og output
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-[#454545] mb-2">
                📥 Input (kildemateriale)
              </h4>
              <p className="text-sm text-[#888B8D] mb-3">
                Filer og lenker du gir som grunnlag for briefen.
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> PDF
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> URL
                </div>
                <div className="flex items-center gap-2 text-red-500">
                  <XCircle className="h-4 w-4" /> Word (ikke støttet)
                </div>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-[#454545] mb-2">
                📤 Output (eksport)
              </h4>
              <p className="text-sm text-[#888B8D] mb-3">
                Den ferdige briefen du laster ned.
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> Word (.docx) – støttet!
                </div>
              </div>
              <p className="text-xs text-[#888B8D] mt-3">
                Du kan alltid eksportere den ferdige briefen til Word-format.
              </p>
            </div>
          </div>
          <div className="bg-[#F4F4F4] border border-[#B1B3B3] rounded-lg p-4">
            <p className="text-sm text-[#454545]">
              <strong>Viktig å forstå:</strong> Word støttes som <em>output</em> (eksport av ferdig brief), 
              men ikke som <em>input</em> (kildemateriale). Dette er fordi å lese tekst fra Word-filer 
              er teknisk upålitelig, mens å generere Word-filer fungerer utmerket.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Tips for best resultat</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-[#888B8D]">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Bruk PDF for dokumenter – det gir mest pålitelig tekstuttrekk</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Har du et Word-dokument? Lagre det som PDF først (Fil → Lagre som → PDF)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>URL-er fungerer best for artikler og nettsider med tydelig tekstinnhold</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Du kan også lime inn tekst direkte i kildemateriale-steget</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default function HelpInstructions() {
  return (
    <RequireAuth>
      <HelpInstructionsContent />
    </RequireAuth>
  );
}