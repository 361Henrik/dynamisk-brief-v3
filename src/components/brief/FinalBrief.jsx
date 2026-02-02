import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  Loader2, 
  ArrowLeft,
  Download,
  CheckCircle2,
  RefreshCw,
  FileText,
  Copy,
  Check,
  FileDown,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

export default function FinalBrief({ brief, sources = [], dialogEntries = [], onBack }) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
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

    // Check for active brief template
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

    // Build prompt with template as highest priority
    const templateSection = templateText 
      ? `BRIEFMAL (HØYESTE PRIORITET - FØLG DENNE STRUKTUREN):
${templateText}

---

` 
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
      const response = await base44.functions.invoke('exportBriefToWord', { briefId: brief.id });
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

    const text = `
KOMMUNIKASJONSBRIEF: ${brief.title}
Tema: ${brief.themeName}

BAKGRUNN
${finalBrief.background}

NØKKELPUNKTER
${finalBrief.keyPoints}

HOVEDBUDSKAP
${finalBrief.message}

${finalBrief.examples ? `EKSEMPLER\n${finalBrief.examples}` : ''}

---
Generert: ${new Date(finalBrief.generatedAt).toLocaleDateString('nb-NO')}
    `.trim();

    navigator.clipboard.writeText(text);
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
            <h2 className="text-xl font-medium text-gray-900 mb-2">Kan ikke generere brief</h2>
            <p className="text-gray-500 mb-4">{templateError}</p>
            <div className="flex justify-center space-x-3">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tilbake til dialog
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
            <h2 className="text-xl font-medium text-gray-900 mb-2">Genererer brief...</h2>
            <p className="text-gray-500">
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
          ? 'bg-green-50 border border-green-200' 
          : 'bg-blue-50 border border-blue-200'
      }`}>
        <div className="flex items-center space-x-3">
          {brief.status === 'godkjent' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <FileText className="h-5 w-5 text-blue-600" />
          )}
          <div>
            <p className="font-medium text-gray-900">
              {brief.status === 'godkjent' ? 'Godkjent brief' : 'Utkast til brief'}
            </p>
            <p className="text-sm text-gray-600">
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

      {/* Brief Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{brief.title}</CardTitle>
            <CardDescription>Tema: {brief.themeName}</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleExportWord} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
              Last ned Word
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyAll}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? 'Kopiert' : 'Kopier alt'}
            </Button>
            <Button variant="outline" size="sm" onClick={generateBrief} disabled={isGenerating}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
              Regenerer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rammer Summary */}
          <div className="flex flex-wrap gap-2 pb-4 border-b">
            <Badge variant="outline">Målgruppe: {brief.rammer?.targetAudience?.substring(0, 30) || 'N/A'}...</Badge>
            {brief.rammer?.channels?.map(c => (
              <Badge key={c} variant="secondary">{c}</Badge>
            ))}
            {brief.rammer?.deadline && (
              <Badge variant="outline">Frist: {brief.rammer.deadline}</Badge>
            )}
          </div>

          {/* Background */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bakgrunn</h3>
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown>{finalBrief.background}</ReactMarkdown>
            </div>
          </div>

          {/* Key Points */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nøkkelpunkter</h3>
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown>{finalBrief.keyPoints}</ReactMarkdown>
            </div>
          </div>

          {/* Main Message */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Hovedbudskap</h3>
            <p className="text-blue-800 text-lg">{finalBrief.message}</p>
          </div>

          {/* Examples */}
          {finalBrief.examples && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Eksempler</h3>
              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown>{finalBrief.examples}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Confirmed Points */}
          {confirmedPoints.length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Bekreftede punkter fra dialogen</h3>
              <div className="space-y-2">
                {confirmedPoints.map((point, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{point.topic}:</span>{' '}
                      <span className="text-gray-600">{point.summary}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbake til dialog
        </Button>
      </div>
    </div>
  );
}