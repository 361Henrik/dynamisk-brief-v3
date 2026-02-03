import React from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { 
  FileText, 
  Link as LinkIcon, 
  FileWarning, 
  Download,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Info,
  ArrowRight,
  Type
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function HelpInstructionsContent() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hjelp & Instruksjoner</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Alt du trenger å vite om hvordan Dynamisk Brief fungerer
        </p>
      </div>

      {/* How the Flow Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-blue-600" />
            Slik fungerer flyten
          </CardTitle>
          <CardDescription>
            Fra kildemateriale til ferdig brief i fire steg
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">1</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Kildemateriale</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Last opp PDF, legg til URL-er, eller lim inn tekst som grunnlag for briefen.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">2</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Rammer</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Definer målgruppe, mål, kanaler og tone for kommunikasjonen.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">3</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Dynamisk intervju</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  AI-en stiller deg spørsmål for å forstå kommunikasjonsbehovet. Bekreft eller korriger punktene underveis.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">4</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Ferdig brief</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  AI-en genererer briefen basert på alt du har lagt inn. Eksporter til Word når du er fornøyd.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How Source Material Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Slik fungerer kildemateriale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Kildemateriale er dokumenter og lenker du legger til som grunnlag for å lage en brief. 
            AI-en leser og analyserer dette innholdet for å forstå konteksten og hjelpe deg med å 
            utforme kommunikasjonen.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Hvordan det fungerer:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>Du laster opp filer eller legger til URL-er</li>
              <li>Systemet henter ut tekst automatisk</li>
              <li>Teksten brukes som kontekst for AI-dialogen</li>
              <li>AI-en genererer briefen basert på dette</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Supported Formats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Støttede formater i V1
          </CardTitle>
          <CardDescription>
            Disse formatene fungerer for tekstuttrekk og AI-kontekst
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900 dark:text-green-100">PDF</span>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200">Anbefalt</Badge>
              </div>
              <p className="text-sm text-green-800 dark:text-green-200">
                PDF-filer støttes fullt ut. Tekst hentes automatisk.
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900 dark:text-green-100">URL</span>
              </div>
              <p className="text-sm text-green-800 dark:text-green-200">
                Lenker til nettsider. Innhold hentes automatisk.
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900 dark:text-green-100">Tekst</span>
              </div>
              <p className="text-sm text-green-800 dark:text-green-200">
                Lim inn tekst direkte i dialogen med AI.
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
            Formater som IKKE støttes i V1
          </CardTitle>
          <CardDescription>
            Disse formatene kan ikke brukes som kildemateriale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border rounded-lg p-3 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-900 dark:text-red-100">Word (.docx)</span>
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-900 dark:text-red-100">Excel (.xlsx)</span>
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-900 dark:text-red-100">PowerPoint (.pptx)</span>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Hvorfor støttes ikke disse formatene?
            </h4>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Word-, Excel- og PowerPoint-filer har kompleks struktur som gjør det teknisk 
              krevende å hente ut tekst pålitelig. I V1 prioriterer vi formater som gir 
              konsistent og forutsigbar tekstuttrekking. Dette er en teknisk begrensning, 
              ikke en brukerfeil.
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-2 font-medium">
              Løsning: Lagre dokumentet som PDF før du laster det opp.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Input vs Output */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-purple-600" />
            Forskjellen på input og output
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                📥 Input (kildemateriale)
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Filer og lenker du gir til AI-en som grunnlag.
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
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                📤 Output (eksport)
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Den ferdige briefen du laster ned.
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> Word (.docx) – støttet!
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                Du kan alltid eksportere den ferdige briefen til Word-format.
              </p>
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <p className="text-sm text-purple-800 dark:text-purple-200">
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
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
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
              <span>Du kan også lime inn tekst direkte i AI-dialogen</span>
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