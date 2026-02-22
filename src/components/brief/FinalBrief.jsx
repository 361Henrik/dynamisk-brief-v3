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

  // Source of truth: approvedSnapshot (set by approveBrief backend), fallback to proposedBrief.sections
  const proposedBrief = brief?.proposedBrief;
  const sections = proposedBrief?.approvedSnapshot || proposedBrief?.sections || {};
  const approvedAt = brief?.approvedAt || proposedBrief?.approvedAt;
  const hasSections = Object.keys(sections).length > 0;
  const isApproved = brief?.status === 'godkjent';
  const hasDocument = !!brief?.generatedDocumentUrl;

  const updateBriefMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Brief.update(brief.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brief', brief.id] });
    }
  });

  const [reopening, setReopening] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleReopen = async () => {
    setReopening(true);
    try {
      await updateBriefMutation.mutateAsync({
        status: 'utkast',
        approvedAt: null,
        generatedDocumentUrl: null,
        proposedBrief: {
          ...brief.proposedBrief,
          status: 'draft',
          editedAfterApproval: false
        }
      });
      toast.success('Briefen er gjenåpnet for redigering.');
    } catch (error) {
      console.error('Reopen error:', error);
      toast.error('Kunne ikke gjenåpne briefen.');
    }
    setReopening(false);
  };

  const handleDownloadSignedUrl = async () => {
    if (!brief.generatedDocumentUrl) {
      toast.error('Ingen dokument tilgjengelig for nedlasting.');
      return;
    }
    setDownloading(true);
    try {
      const result = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: brief.generatedDocumentUrl,
        expires_in: 300
      });
      const a = document.createElement('a');
      a.href = result.signed_url;
      a.download = `${brief.title || 'brief'}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Dokument lastet ned');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Kunne ikke laste ned dokumentet.');
    }
    setDownloading(false);
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

  // No content available at all
  if (!hasSections && !hasDocument && !isApproved) {
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
            {hasDocument && (
              <Button variant="outline" size="sm" onClick={handleDownloadSignedUrl} disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
                Last ned Word
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExportWord} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
              Eksporter Word
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
                <h3 className="text-base font-semibold text-[#454545] mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#002C6C]/10 flex items-center justify-center text-xs font-semibold text-[#002C6C]">
                    {section.number}
                  </span>
                  {section.label}
                </h3>
                <div className={`whitespace-pre-wrap pl-8 ${sectionContent ? 'text-[#454545]' : 'text-[#B1B3B3] italic'}`}>
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
        isApproved 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-[#002C6C]/5 border border-[#002C6C]/20'
      }`}>
        <div className="flex items-center space-x-3">
          {isApproved ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <FileText className="h-5 w-5 text-[#002C6C]" />
          )}
          <div>
            <p className="font-medium text-[#454545]">
              {isApproved ? 'Fullført brief' : 'Ferdig brief'}
            </p>
            <p className="text-sm text-[#888B8D]">
              {isApproved 
                ? `Godkjent ${formatDate(brief.approvedAt)}${hasDocument ? ' – dokument generert' : ''}`
                : `Basert på foreslått brief fra ${formatDate(approvedAt)}`
              }
            </p>
          </div>
        </div>
        {isApproved && (
          <Button variant="outline" onClick={handleReopen} disabled={reopening}>
            {reopening ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowLeft className="h-4 w-4 mr-2" />}
            Gjenåpne for redigering
          </Button>
        )}
      </div>

      {/* Metadata Summary */}
      <Card className="bg-[#F4F4F4]">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-[#888B8D]">Tema</p>
                <p className="font-medium text-[#454545]">{brief.themeName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-[#888B8D]">Målgruppe</p>
                <p className="font-medium text-[#454545] truncate max-w-[150px]">
                  {brief.rammer?.targetAudience || 'Ikke spesifisert'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-[#888B8D]">Kanaler</p>
                <p className="font-medium text-[#454545]">
                  {brief.rammer?.channels?.join(', ') || 'Ikke spesifisert'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-[#888B8D]">Frist</p>
                <p className="font-medium text-[#454545]">
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
        <p className="text-sm text-[#888B8D]">
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