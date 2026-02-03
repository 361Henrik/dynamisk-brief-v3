import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  Loader2, 
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  FileText,
  Copy,
  Check,
  FileDown,
  AlertCircle,
  Calendar,
  Users,
  Target,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import ExpandableText from './ExpandableText';
import FeedbackPanel from './FeedbackPanel';

export default function FinalBrief({ brief, sources = [], dialogEntries = [], onBack }) {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [templateError, setTemplateError] = useState(null);

  const finalBrief = brief.finalBrief;
  const confirmedPoints = brief.confirmedPoints || [];

  // Fetch active brief template
  const { data: briefTemplate } = useQuery({
    queryKey: ['briefTemplate'],
    queryFn: async () => {
      const templates = await base44.entities.KnowledgeBaseDoc.filter({ 
        docType: 'brief_template', 
        isActive: true 
      });
      return templates[0] || null;
    }
  });

  useEffect(() => {
    if (!finalBrief && !isGenerating) {
      generateBrief();
    }
  }, [finalBrief]);

  const updateBriefMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Brief.update(brief.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brief', brief.id] });
    }
  });

  const generateBrief = async () => {
    setIsGenerating(true);
    setTemplateError(null);

    const templateText = briefTemplate?.extractedText;
    if (!templateText && briefTemplate?.extractionStatus === 'pending') {
      setTemplateError('Briefmalen behandles fortsatt. Vennligst vent og prøv igjen.');
      setIsGenerating(false);
      return;
    }
    if (!templateText && briefTemplate?.extractionStatus === 'failed') {
      setTemplateError('Tekstuttrekk fra briefmalen feilet. Kontakt administrator.');
      setIsGenerating(false);
      return;
    }

    const sourceContext = sources.map(s => 
      s.extractedText || `[${s.sourceType}: ${s.fileName || s.fileUrl}]`
    ).join('\n\n');

    const dialogContext = dialogEntries.map(e => 
      `${e.role === 'assistant' ? 'Rådgiver' : 'Fagekspert'}: ${e.content}`
    ).join('\n\n');

    const confirmedContext = confirmedPoints.map(p => 
      `- ${p.topic}: ${p.summary}`
    ).join('\n');

    const templateSection = templateText 
      ? `BRIEFMAL (HØYESTE PRIORITET - FØLG DENNE STRUKTUREN):\n${templateText}\n\n---\n\n` 
      : '';

    const prompt = `Du er en kommunikasjonsekspert for GS1 Norway. Generer en komplett kommunikasjonsbrief.

${templateSection}VIKTIG: 
- Følg strukturen og overskriftene fra briefmalen nøyaktig.
- Hvis informasjon mangler for å fylle ut en seksjon i malen, skriv "[Mangler informasjon om X]" i den seksjonen.
- Bruk bekreftede punkter fra dialogen som grunnlag for innholdet.

TEMA: ${brief.themeName}

RAMMER:
- Målgruppe: ${brief.rammer?.targetAudience || 'Ikke spesifisert'}
- Mål: ${brief.rammer?.objectives || 'Ikke spesifisert'}
- Kanaler: ${brief.rammer?.channels?.join(', ') || 'Ikke spesifisert'}
- Tone: ${brief.rammer?.tone || 'Ikke spesifisert'}
- Ønskede leveranser: ${brief.rammer?.deliverables?.join(', ') || 'Ikke spesifisert'}
- Tidsfrist: ${brief.rammer?.deadline || 'Ikke spesifisert'}
- Aktiveringstidspunkt: ${brief.rammer?.activationDate || 'Ikke spesifisert'}

KILDEMATERIALE:
${sourceContext || 'Ingen kilder'}

BEKREFTEDE PUNKTER FRA DIALOG:
${confirmedContext || 'Ingen bekreftede punkter'}

DIALOGHISTORIKK:
${dialogContext || 'Ingen dialog'}

Generer en strukturert brief i JSON-format med følgende felter:
- background: Bakgrunn og kontekst (2-3 avsnitt)
- keyPoints: Nøkkelpunkter som må formidles (punktliste)
- message: Hovedbudskap (1-2 setninger)
- examples: Konkrete eksempler eller case som kan brukes`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            background: { type: 'string' },
            keyPoints: { type: 'string' },
            message: { type: 'string' },
            examples: { type: 'string' }
          },
          required: ['background', 'keyPoints', 'message']
        }
      });

      await updateBriefMutation.mutateAsync({
        finalBrief: {
          ...response,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to generate brief:', error);
    }

    setIsGenerating(false);
  };

  const handleFeedbackSubmit = async ({ feedback, constraints }) => {
    setIsUpdating(true);

    const currentBrief = finalBrief;
    const constraintText = constraints ? `\n\nMÅ INKLUDERES (krav fra admin):\n${constraints}` : '';

    const prompt = `Du er en kommunikasjonsekspert. Oppdater følgende brief basert på tilbakemeldingen.

NÅVÆRENDE BRIEF:
Bakgrunn: ${currentBrief.background}
Nøkkelpunkter: ${currentBrief.keyPoints}
Hovedbudskap: ${currentBrief.message}
Eksempler: ${currentBrief.examples || 'Ingen'}

TILBAKEMELDING FRA BRUKER:
${feedback}${constraintText}

INSTRUKSJONER:
- Gjør KUN de endringene som tilbakemeldingen ber om.
- Behold resten av innholdet uendret.
- Hvis admin har spesifisert "må inkluderes"-krav, sørg for at disse er med.

Returner den oppdaterte briefen i JSON-format med feltene: background, keyPoints, message, examples`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            background: { type: 'string' },
            keyPoints: { type: 'string' },
            message: { type: 'string' },
            examples: { type: 'string' }
          },
          required: ['background', 'keyPoints', 'message']
        }
      });

      await updateBriefMutation.mutateAsync({
        finalBrief: {
          ...response,
          generatedAt: new Date().toISOString(),
          lastFeedback: feedback
        }
      });
      toast.success('Briefen er oppdatert');
    } catch (error) {
      console.error('Failed to update brief:', error);
      toast.error('Kunne ikke oppdatere briefen');
    }

    setIsUpdating(false);
  };

  const handleApprove = async () => {
    await updateBriefMutation.mutateAsync({
      status: 'godkjent',
      approvedAt: new Date().toISOString()
    });
    toast.success('Briefen er godkjent!');
  };

  const [exporting, setExporting] = useState(false);

  const handleExportWord = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportBriefToWord', { briefId: brief.id }, { responseType: 'arraybuffer' });
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${brief.title.replace(/[^a-zA-Z0-9æøåÆØÅ\s-]/g, '').replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Word-dokument lastet ned');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Kunne ikke eksportere til Word');
    }
    setExporting(false);
  };

  const handleCopyAll = () => {
    if (!finalBrief) return;

    const metadata = `═══════════════════════════════════════
KOMMUNIKASJONSBRIEF
═══════════════════════════════════════

Tittel: ${brief.title}
Tema: ${brief.themeName}
Målgruppe: ${brief.rammer?.targetAudience || 'Ikke spesifisert'}
Kanaler: ${brief.rammer?.channels?.join(', ') || 'Ikke spesifisert'}
Frist: ${brief.rammer?.deadline || 'Ikke spesifisert'}
Generert: ${new Date(finalBrief.generatedAt).toLocaleDateString('nb-NO')}

═══════════════════════════════════════
`;

    const content = `
BAKGRUNN
${finalBrief.background}

NØKKELPUNKTER
${finalBrief.keyPoints}

HOVEDBUDSKAP
${finalBrief.message}
${finalBrief.examples ? `
EKSEMPLER
${finalBrief.examples}` : ''}
`.trim();

    const fullText = metadata + content;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Kopiert til utklippstavlen');
  };

  if (templateError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Kan ikke generere brief</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">{templateError}</p>
            <div className="flex justify-center space-x-3">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tilbake til intervju
              </Button>
              <Button onClick={() => { setTemplateError(null); generateBrief(); }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Prøv igjen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isGenerating || !finalBrief) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Genererer brief...</h2>
            <p className="text-gray-500 dark:text-gray-400">
              AI-en analyserer all informasjon og lager en komplett brief.
            </p>
            {!briefTemplate && (
              <p className="text-xs text-orange-500 mt-2">
                Merk: Ingen briefmal er lastet opp. Genererer med standardstruktur.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`p-4 rounded-lg flex items-center justify-between ${
        brief.status === 'godkjent' 
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
          : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
      }`}>
        <div className="flex items-center space-x-3">
          {brief.status === 'godkjent' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <FileText className="h-5 w-5 text-blue-600" />
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {brief.status === 'godkjent' ? 'Godkjent brief' : 'Utkast til brief'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {brief.status === 'godkjent' 
                ? `Godkjent ${new Date(brief.approvedAt).toLocaleDateString('nb-NO')}`
                : 'Gå gjennom og godkjenn når du er fornøyd'
              }
            </p>
          </div>
        </div>
        {brief.status !== 'godkjent' && (
          <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Godkjenn brief
          </Button>
        )}
      </div>

      {/* Metadata Summary */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tema</p>
                <p className="font-medium text-gray-900 dark:text-white">{brief.themeName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Målgruppe</p>
                <p className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                  {brief.rammer?.targetAudience || 'Ikke spesifisert'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Kanaler</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {brief.rammer?.channels?.join(', ') || 'Ikke spesifisert'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Frist</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {brief.rammer?.deadline || 'Ikke spesifisert'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brief Content */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{brief.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Calendar className="h-3 w-3" />
              Generert {new Date(finalBrief.generatedAt).toLocaleDateString('nb-NO')}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportWord} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
              Word
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyAll}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? 'Kopiert' : 'Kopier alt'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Background */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              Bakgrunn
            </h3>
            <ExpandableText content={finalBrief.background} maxLines={8} />
          </section>

          {/* Key Points */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              Nøkkelpunkter
            </h3>
            <ExpandableText content={finalBrief.keyPoints} maxLines={10} />
          </section>

          {/* Main Message */}
          <section className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Hovedbudskap
            </h3>
            <p className="text-blue-800 dark:text-blue-200 text-lg leading-relaxed">{finalBrief.message}</p>
          </section>

          {/* Examples */}
          {finalBrief.examples && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                Eksempler
              </h3>
              <ExpandableText content={finalBrief.examples} maxLines={6} />
            </section>
          )}

          {/* Confirmed Points */}
          {confirmedPoints.length > 0 && (
            <section className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Bekreftede punkter fra intervjuet
              </h3>
              <div className="grid gap-2">
                {confirmedPoints.map((point, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-sm bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">{point.topic}:</span>{' '}
                      <span className="text-gray-600 dark:text-gray-300">{point.summary}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </CardContent>
      </Card>

      {/* Feedback Panel */}
      {brief.status !== 'godkjent' && (
        <FeedbackPanel 
          onSubmit={handleFeedbackSubmit} 
          isProcessing={isUpdating}
          isAdmin={isAdmin}
        />
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbake til intervju
        </Button>
      </div>
    </div>
  );
}