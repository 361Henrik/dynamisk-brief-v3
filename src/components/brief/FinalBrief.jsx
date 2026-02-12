import React, { useState, useRef } from 'react';
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
  Clock,
  Printer,
  List,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { SECTION_CONFIG } from '@/constants/briefSections';
import { formatDate } from '@/utils/dateFormatters';

export default function FinalBrief({ brief, onBack }) {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showToc, setShowToc] = useState(true);
  const sectionRefs = useRef({});

  const proposedBrief = brief?.proposedBrief;
  const isStep3Approved = proposedBrief?.status === 'approved' && !proposedBrief?.editedAfterApproval;
  const sections = proposedBrief?.approvedSnapshot || {};
  const approvedAt = proposedBrief?.approvedAt;
  const hasSections = Object.keys(sections).length > 0;

  const filledSections = SECTION_CONFIG.filter(s => sections[s.key]?.content?.trim());
  const emptySections = SECTION_CONFIG.filter(s => !sections[s.key]?.content?.trim());

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
    toast.success('Briefen er fullfort!');
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (key) => {
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleExportWord = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportBriefToWord', { briefId: brief.id });
      const { data: base64Data, filename, mimeType } = response.data;
      
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

    let fullText = `KOMMUNIKASJONSBRIEF\n${'='.repeat(40)}\n\n`;
    fullText += `Tittel: ${brief.title}\n`;
    fullText += `Tema: ${brief.themeName}\n`;
    fullText += `Dato: ${formatDate(new Date().toISOString())}\n`;
    fullText += `Status: ${brief.status === 'godkjent' ? 'Godkjent' : 'Utkast'}\n\n`;
    fullText += `${'='.repeat(40)}\n\n`;

    SECTION_CONFIG.forEach(section => {
      const content = sections[section.key]?.content;
      if (content) {
        fullText += `${section.number}. ${section.label.toUpperCase()}\n${'-'.repeat(30)}\n${content}\n\n`;
      }
    });

    navigator.clipboard.writeText(fullText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Kopiert til utklippstavlen');
  };

  // Warning: Step 3 not approved
  if (!isStep3Approved && !hasSections) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Ingen brief tilgjengelig
            </h3>
            <p className="text-muted-foreground mb-6">
              Fullfar og godkjenn den foreslatte briefen forst.
            </p>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake til foreslatt brief
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isStep3Approved && hasSections) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Foreslatt brief er ikke godkjent
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Ga tilbake til Foreslatt brief og godkjenn for a oppdatere denne visningen.
            </p>
          </div>
        </div>

        <Card className="border-dashed bg-muted/30">
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground mb-4">
              {proposedBrief?.approvedSnapshot 
                ? "Denne visningen er basert pa sist godkjente foreslatte brief."
                : "Ingen godkjent brief tilgjengelig enna."
              }
            </p>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake til foreslatt brief
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Status Banner */}
      <div className={`p-4 rounded-lg flex items-center justify-between ${
        brief.status === 'godkjent' 
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
          : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
      }`}>
        <div className="flex items-center gap-3">
          {brief.status === 'godkjent' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          )}
          <div>
            <p className="font-medium text-foreground">
              {brief.status === 'godkjent' ? 'Fullfort brief' : 'Ferdig brief'}
            </p>
            <p className="text-sm text-muted-foreground">
              {brief.status === 'godkjent' 
                ? `Markert som fullfort ${formatDate(brief.approvedAt)}`
                : `Basert pa godkjent foreslatt brief fra ${formatDate(approvedAt)}`
              }
            </p>
          </div>
        </div>
        {brief.status !== 'godkjent' && (
          <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Fullfar brief
          </Button>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowToc(!showToc)}>
            <List className="h-4 w-4 mr-1.5" />
            {showToc ? 'Skjul innhold' : 'Vis innhold'}
          </Button>
          <Badge variant="secondary" className="text-xs">
            {filledSections.length}/{SECTION_CONFIG.length} seksjoner
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Skriv ut</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportWord} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileDown className="h-4 w-4 mr-1.5" />}
            <span className="hidden sm:inline">Word</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyAll}>
            {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
            <span className="hidden sm:inline">{copied ? 'Kopiert' : 'Kopier'}</span>
          </Button>
        </div>
      </div>

      {/* Metadata Grid */}
      <Card className="bg-muted/30 no-print">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Tema</p>
                <p className="font-medium text-foreground">{brief.themeName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Malgruppe</p>
                <p className="font-medium text-foreground truncate max-w-[150px]">
                  {brief.rammer?.targetAudience || 'Ikke spesifisert'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Kanaler</p>
                <p className="font-medium text-foreground">
                  {brief.rammer?.channels?.join(', ') || 'Ikke spesifisert'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Frist</p>
                <p className="font-medium text-foreground">
                  {brief.rammer?.deadline || 'Ikke spesifisert'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table of Contents */}
      {showToc && (
        <Card className="no-print">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Innholdsfortegnelse</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <nav className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {SECTION_CONFIG.map(section => {
                const hasContent = !!sections[section.key]?.content?.trim();
                return (
                  <button
                    key={section.key}
                    onClick={() => scrollToSection(section.key)}
                    className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded-md text-left transition-colors ${
                      hasContent 
                        ? 'hover:bg-muted text-foreground' 
                        : 'text-muted-foreground/60 hover:bg-muted/50'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                      hasContent 
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {section.number}
                    </span>
                    <span className="truncate">{section.label}</span>
                    <ChevronRight className="h-3 w-3 ml-auto flex-shrink-0 text-muted-foreground/40" />
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>
      )}

      {/* Brief Document */}
      <Card className="print-brief">
        <CardHeader className="border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl text-foreground">{brief.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Calendar className="h-3 w-3" />
                Godkjent {formatDate(approvedAt)}
              </CardDescription>
            </div>
            {brief.status === 'godkjent' && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Fullfort
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-6 space-y-8">
          {SECTION_CONFIG.map(section => {
            const sectionContent = sections[section.key]?.content;
            const hasContent = !!sectionContent?.trim();
            
            return (
              <section 
                key={section.key} 
                ref={el => sectionRefs.current[section.key] = el}
                className="scroll-mt-24"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                    hasContent
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                      : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                  }`}>
                    {section.number}
                  </span>
                  <h3 className="text-base font-semibold text-foreground">
                    {section.label}
                  </h3>
                </div>
                <div className="pl-10">
                  {hasContent ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                      {sectionContent}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-md px-3 py-2 border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      Denne seksjonen mangler innhold. Ga tilbake til foreslatt brief for a fylle inn.
                    </div>
                  )}
                </div>
                {section.number < 9 && <div className="border-b border-border/50 mt-6" />}
              </section>
            );
          })}
        </CardContent>
      </Card>

      {/* Empty sections summary */}
      {emptySections.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 no-print">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
            {emptySections.length} seksjon{emptySections.length > 1 ? 'er' : ''} mangler innhold
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {emptySections.map(s => s.label).join(', ')}
          </p>
        </div>
      )}

      {/* Helper text */}
      <div className="text-center py-2 no-print">
        <p className="text-sm text-muted-foreground">
          For a gjore endringer, ga tilbake til Foreslatt brief.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between no-print">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbake til foreslatt brief
        </Button>
      </div>
    </div>
  );
}
