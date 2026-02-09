import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  Loader2, 
  ArrowLeft,
  CheckCircle2,
  FileText,
  Copy,
  Check,
  FileDown,
  AlertTriangle,
  Calendar,
  Users,
  Target,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const SECTION_CONFIG = [
  { key: 'prosjektinformasjon', label: 'Prosjektinformasjon', number: 1 },
  { key: 'bakgrunn', label: 'Bakgrunn og situasjonsbeskrivelse', number: 2 },
  { key: 'maal', label: 'Mål og suksesskriterier', number: 3 },
  { key: 'maalgrupper', label: 'Målgrupper', number: 4 },
  { key: 'verdiforslag', label: 'GS1-tilbudet og verdiforslag', number: 5 },
  { key: 'budskap', label: 'Budskap, tone og stil', number: 6 },
  { key: 'leveranser', label: 'Leveranser og kanaler', number: 7 },
  { key: 'rammer', label: 'Praktiske rammer og godkjenning', number: 8 },
  { key: 'kildemateriale', label: 'Kildemateriale', number: 9 }
];

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('nb-NO', { 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  });
}

export default function FinalBrief({ brief, onBack }) {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  // CRITICAL: Step 4 reads ONLY from approved Step 3 snapshot - NEVER from other sources
  const proposedBrief = brief?.proposedBrief;
  const isStep3Approved = proposedBrief?.status === 'approved' && !proposedBrief?.editedAfterApproval;
  
  // ONLY use approved snapshot - do NOT fall back to draft sections, interview data, or sources
  const sections = proposedBrief?.approvedSnapshot || {};
  const approvedAt = proposedBrief?.approvedAt;
  const hasSections = Object.keys(sections).length > 0;

  const updateBriefMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Brief.update(brief.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brief', brief.id] });
    }
  });

  const handleApprove = async () => {
    await updateBriefMutation.mutateAsync({
      status: 'godkjent',
      approvedAt: new Date().toISOString()
    });
    toast.success('Briefen er fullført!');
  };

  const handleExportWord = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportBriefToWord', { briefId: brief.id });
      const { data: base64Data, filename, mimeType } = response.data;
      
      // Decode base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
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
    if (!hasSections) return;

    let fullText = `═══════════════════════════════════════
KOMMUNIKASJONSBRIEF
═══════════════════════════════════════

Tittel: ${brief.title}
Tema: ${brief.themeName}
Dato: ${formatDate(new Date().toISOString())}
Status: Godkjent
Basert på: Foreslått brief${approvedAt ? ` (godkjent ${formatDate(approvedAt)})` : ''}

Målgruppe: ${brief.rammer?.targetAudience || 'Ikke spesifisert'}
Kanaler: ${brief.rammer?.channels?.join(', ') || 'Ikke spesifisert'}
Frist: ${brief.rammer?.deadline || 'Ikke spesifisert'}

═══════════════════════════════════════

`;

    SECTION_CONFIG.forEach(section => {
      const content = sections[section.key]?.content;
      if (content) {
        fullText += `${section.number}. ${section.label.toUpperCase()}
${content}

`;
      }
    });

    navigator.clipboard.writeText(fullText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Kopiert til utklippstavlen');
  };

  // Show warning if Step 3 is not approved
  if (!isStep3Approved && hasSections) {
    return (
      <div className="space-y-6">
        {/* Warning Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Foreslått brief er ikke godkjent
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Gå tilbake til Foreslått brief og godkjenn for å oppdatere denne visningen.
            </p>
          </div>
        </div>

        {/* Show based on last approved version or current draft */}
        <Card className="bg-gray-50 dark:bg-gray-800/50 border-dashed">
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {proposedBrief?.approvedSnapshot 
                ? "Denne visningen er basert på sist godkjente foreslåtte brief. Godkjenn endringene i Foreslått brief for å oppdatere."
                : "Ingen godkjent brief tilgjengelig ennå. Gå til Foreslått brief og godkjenn innholdet."
              }
            </p>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake til foreslått brief
            </Button>
          </CardContent>
        </Card>

        {/* Still show content if there's an approved snapshot */}
        {proposedBrief?.approvedSnapshot && (
          <div className="opacity-75">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center">
              Basert på sist godkjente foreslåtte brief ({formatDate(approvedAt)})
            </p>
            {renderBriefContent()}
          </div>
        )}
      </div>
    );
  }

  // No sections at all
  if (!hasSections) {
    return (
      <div className="space-y-6">
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Ingen brief tilgjengelig
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Fullfør og godkjenn den foreslåtte briefen først.
            </p>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake til foreslått brief
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderBriefContent() {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{brief.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Calendar className="h-3 w-3" />
              Godkjent {formatDate(approvedAt)}
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
        <CardContent className="space-y-6">
          {SECTION_CONFIG.map(section => {
            const sectionContent = sections[section.key]?.content;
            
            return (
              <section key={section.key}>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs font-semibold text-blue-700 dark:text-blue-300">
                    {section.number}
                  </span>
                  {section.label}
                </h3>
                <div className={`whitespace-pre-wrap pl-8 ${sectionContent ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                  {sectionContent || 'Ingen informasjon lagt til.'}
                </div>
              </section>
            );
          })}
        </CardContent>
      </Card>
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
              {brief.status === 'godkjent' ? 'Fullført brief' : 'Ferdig brief'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {brief.status === 'godkjent' 
                ? `Markert som fullført ${formatDate(brief.approvedAt)}`
                : `Basert på godkjent foreslått brief fra ${formatDate(approvedAt)}`
              }
            </p>
          </div>
        </div>
        {brief.status !== 'godkjent' && (
          <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Fullfør brief
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

      {/* Brief Content - from approved Step 4 */}
      {renderBriefContent()}

      {/* Helper text for editing */}
      <div className="text-center py-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          For å gjøre endringer, gå tilbake til Foreslått brief.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbake til foreslått brief
        </Button>
      </div>
    </div>
  );
}