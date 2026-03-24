import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import SourceBlock, { getContentText } from './SourceBlock';
import { Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
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

export default function FinalBrief({ brief, sources = [], onBack }) {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showSourceMaterials, setShowSourceMaterials] = useState(false);
  const [showSourceTags, setShowSourceTags] = useState(true);
  const [reopening, setReopening] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const sections = brief?.proposedBrief?.sections || {};
  const approvedAt = brief?.proposedBrief?.approvedAt || brief?.approvedAt;
  const isApproved = brief?.status === 'godkjent';
  const hasSections = Object.keys(sections).length > 0;
  const hasDocument = !!brief?.generatedDocumentUrl;

  const updateBriefMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Brief.update(brief.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brief', brief.id] });
    }
  });

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

    // Flatten block arrays to plain text for clipboard
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
        const text = getContentText(content);
        fullText += `${section.number}. ${section.label.toUpperCase()}\n${text}\n\n`;
      }
    });

    navigator.clipboard.writeText(fullText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Kopiert til utklippstavlen');
  };

  // No content available at all
  if (!hasSections && !isApproved) {
    return (
      <div className="space-y-6">
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gs1-border" />
            <h3 className="text-lg font-medium text-gs1-dark-gray mb-2">
              Ingen brief tilgjengelig
            </h3>
            <p className="text-gs1-medium-gray mb-6">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSourceTags(!showSourceTags)}
              className="text-xs"
            >
              {showSourceTags ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
              {showSourceTags ? 'Skjul kilder' : 'Vis kilder'}
            </Button>
            {hasDocument && (
              <Button variant="outline" size="sm" onClick={handleDownloadSignedUrl} disabled={downloading}>
                {downloading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
                Last ned Word
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleCopyAll}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? 'Kopiert' : 'Kopier alt'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {SECTION_CONFIG.map(section => {
            const rawContent = sections[section.key]?.content;
            const isBlocks = Array.isArray(rawContent);
            const plainText = isBlocks ? null : (rawContent ? rawContent.replace(/\\n/g, '\n') : null);
            return (
              <section key={section.key}>
                <h3 className="text-base font-semibold text-gs1-dark-gray mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gs1-blue/10 flex items-center justify-center text-xs font-semibold text-gs1-blue">
                    {section.number}
                  </span>
                  {section.label}
                </h3>
                <div className="pl-8">
                  {isBlocks ? (
                    rawContent.map((block, i) => <SourceBlock key={i} block={block} showTags={showSourceTags} />)
                  ) : plainText ? (
                    <p className="text-sm whitespace-pre-wrap text-gs1-dark-gray leading-relaxed">{plainText}</p>
                  ) : (
                    <p className="text-gs1-border italic text-sm">Ingen informasjon lagt til.</p>
                  )}
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
          : 'bg-gs1-blue/5 border border-gs1-blue/20'
      }`}>
        <div className="flex items-center space-x-3">
          {isApproved ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <FileText className="h-5 w-5 text-gs1-blue" />
          )}
          <div>
            <p className="font-medium text-gs1-dark-gray">
              {isApproved ? 'Fullført brief' : 'Ferdig brief'}
            </p>
            <p className="text-sm text-gs1-medium-gray">
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
      <Card className="bg-gs1-light-gray">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-gs1-medium-gray" />
              <div>
                <p className="text-xs text-gs1-medium-gray">Tema</p>
                <p className="font-medium text-gs1-dark-gray">{brief.themeName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gs1-medium-gray" />
              <div>
                <p className="text-xs text-gs1-medium-gray">Målgruppe</p>
                <p className="font-medium text-gs1-dark-gray truncate max-w-[150px]">
                  {brief.rammer?.targetAudience || 'Ikke spesifisert'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gs1-medium-gray" />
              <div>
                <p className="text-xs text-gs1-medium-gray">Kanaler</p>
                <p className="font-medium text-gs1-dark-gray">
                  {brief.rammer?.channels?.join(', ') || 'Ikke spesifisert'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gs1-medium-gray" />
              <div>
                <p className="text-xs text-gs1-medium-gray">Frist</p>
                <p className="font-medium text-gs1-dark-gray">
                  {brief.rammer?.deadline || 'Ikke spesifisert'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brief Content - from approved Step 4 */}
      {renderBriefContent()}

      {/* Source Materials */}
      {sources.length > 0 && (
        <Card className="border-gs1-blue/20">
         <CardHeader
          className="py-3 cursor-pointer hover:bg-gs1-light-gray transition-colors"
            onClick={() => setShowSourceMaterials(!showSourceMaterials)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gs1-blue" />
                <CardTitle className="text-sm font-medium text-gs1-dark-gray">
                  Kildemateriale brukt i denne briefen
                </CardTitle>
                <Badge variant="outline" className="text-xs">{sources.length}</Badge>
              </div>
              {showSourceMaterials
                ? <ChevronUp className="h-4 w-4 text-gs1-medium-gray" />
                : <ChevronDown className="h-4 w-4 text-gs1-medium-gray" />}
            </div>
          </CardHeader>
          {showSourceMaterials && (
            <CardContent className="pt-0">
              <p className="text-xs text-gs1-medium-gray mb-3">
                Disse kildene ble lagt til grunn for briefen og kan brukes som referanse i produksjonen.
              </p>
              <div className="space-y-2">
                {sources.map((source, idx) => (
                  <div key={source.id || idx} className="flex items-start gap-3 p-3 bg-gs1-light-gray rounded-lg">
                    <div className="w-7 h-7 rounded bg-gs1-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="h-4 w-4 text-gs1-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gs1-dark-gray truncate">
                          {source.fileName || source.fileUrl || 'Tekst-notat'}
                        </p>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {source.sourceType === 'file' ? 'Fil' : source.sourceType === 'url' ? 'URL' : 'Tekst'}
                        </Badge>
                      </div>
                      {source.extractionSummary?.bullets?.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {source.extractionSummary.bullets.slice(0, 3).map((b, i) => (
                            <li key={i} className="text-xs text-gs1-medium-gray flex items-start gap-1">
                              <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                      {source.fileUrl && source.sourceType === 'url' && (
                        <a
                          href={source.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gs1-blue hover:underline mt-1 block truncate"
                        >
                          {source.fileUrl}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Helper text for editing */}
      <div className="text-center py-2">
        <p className="text-sm text-gs1-medium-gray">
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