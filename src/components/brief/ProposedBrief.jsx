import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Loader2, 
  ArrowLeft, 
  ArrowRight, 
  Save,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  FileText,
  Pencil,
  AlertTriangle,
  Eye,
  ChevronsUpDown,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SECTION_CONFIG } from '@/constants/briefSections';
import { formatTimestamp, formatDate } from '@/utils/dateFormatters';

const ProposedSection = React.memo(function ProposedSection({ 
  sectionKey, 
  label, 
  number, 
  content, 
  notes,
  metadata,
  onContentChange, 
  onNotesChange,
  onUpdateWithFeedback,
  isUpdating,
  forceExpanded
}) {
  const [expanded, setExpanded] = useState(true);
  const [showNotes, setShowNotes] = useState(!!notes);
  const [localNotes, setLocalNotes] = useState(notes || '');
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(content || '');

  useEffect(() => {
    if (forceExpanded !== undefined) setExpanded(forceExpanded);
  }, [forceExpanded]);

  useEffect(() => {
    setLocalNotes(notes || '');
  }, [notes]);

  useEffect(() => {
    setLocalContent(content || '');
  }, [content]);

  const handleSaveEdit = () => {
    onContentChange(sectionKey, localContent);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setLocalContent(content || '');
    setIsEditing(false);
  };

  const isUserEdited = metadata?.lastEditedBy === 'user';
  const isAiEdited = metadata?.lastEditedBy === 'ai';
  const hasContent = !!content?.trim();

  return (
    <Card className="mb-3 transition-shadow hover:shadow-sm">
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
              hasContent 
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                : 'bg-muted text-muted-foreground'
            }`}>
              {number}
            </div>
            <CardTitle className="text-base font-medium text-foreground">{label}</CardTitle>
            {!hasContent && (
              <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
                Tom
              </Badge>
            )}
            {isUserEdited && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
                <Pencil className="h-3 w-3 mr-1" />
                Endret
              </Badge>
            )}
            {isAiEdited && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </Badge>
            )}
          </div>
          {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </div>
        {metadata?.lastEditedAt && (
          <p className="text-xs text-muted-foreground mt-1 ml-10">
            Endret {metadata.lastEditedBy === 'user' ? 'av deg' : 'av AI'} &middot; {formatTimestamp(metadata.lastEditedAt)}
          </p>
        )}
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0 space-y-4">
          <div>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={localContent}
                  onChange={(e) => setLocalContent(e.target.value)}
                  placeholder={`Skriv innhold for ${label.toLowerCase()}...`}
                  className="min-h-[150px] resize-y border-blue-300 dark:border-blue-700 focus:border-blue-500"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                    Avbryt
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Save className="h-4 w-4 mr-1" />
                    Lagre endring
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative group">
                <div className="bg-muted/50 rounded-lg p-4 min-h-[80px] whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                  {content || <span className="text-muted-foreground italic">Ingen innhold enna...</span>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Rediger
                </Button>
              </div>
            )}
          </div>

          {!isEditing && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotes(!showNotes)}
                className="text-muted-foreground hover:text-foreground -ml-2"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                {showNotes ? 'Skjul notater' : 'Legg til notater'}
              </Button>
              
              {showNotes && (
                <div className="mt-2">
                  <Textarea
                    value={localNotes}
                    onChange={(e) => {
                      setLocalNotes(e.target.value);
                      onNotesChange(sectionKey, e.target.value);
                    }}
                    placeholder="Notater eller kommentarer til denne seksjonen..."
                    className="min-h-[80px] resize-y bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                  />
                </div>
              )}
            </div>
          )}

          {!isEditing && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateWithFeedback(sectionKey, localNotes)}
                disabled={isUpdating || !localNotes?.trim()}
                className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Oppdater med tilbakemelding
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
});

export default function ProposedBrief({ brief, sources, dialogEntries, onBack, onContinue }) {
  const queryClient = useQueryClient();
  const [sections, setSections] = useState({});
  const [generating, setGenerating] = useState(false);
  const [updatingSections, setUpdatingSections] = useState({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [allExpanded, setAllExpanded] = useState(true);
  const [forceExpandState, setForceExpandState] = useState(undefined);
  const [showPreview, setShowPreview] = useState(false);

  const proposedStatus = brief?.proposedBrief?.status;
  const wasApproved = proposedStatus === 'approved';
  const [editedAfterApproval, setEditedAfterApproval] = useState(false);

  useEffect(() => {
    if (brief?.proposedBrief?.sections) {
      setSections(brief.proposedBrief.sections);
    }
    if (brief?.proposedBrief?.editedAfterApproval) {
      setEditedAfterApproval(true);
    }
  }, [brief?.proposedBrief?.sections, brief?.proposedBrief?.editedAfterApproval]);

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && Object.keys(sections).length > 0) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, sections]);

  const toggleAllSections = () => {
    const next = !allExpanded;
    setAllExpanded(next);
    setForceExpandState(next);
    // Reset force state after applying
    setTimeout(() => setForceExpandState(undefined), 100);
  };

  const filledCount = SECTION_CONFIG.filter(s => sections[s.key]?.content?.trim()).length;

  const generateProposedBrief = async () => {
    setGenerating(true);
    try {
      const templates = await base44.entities.KnowledgeBaseDoc.filter({ 
        docType: 'brief_template', 
        isActive: true 
      });
      const briefTemplate = templates[0];

      if (!briefTemplate?.extractedText) {
        toast.error('Briefmalen er ikke klar. Vennligst last opp en briefmal forst.');
        setGenerating(false);
        return;
      }

      const sourceContext = sources
        .filter(s => s.extractionStatus === 'success' && s.extractedText)
        .map(s => `[${s.sourceType === 'url' ? s.fileUrl : s.fileName}]:\n${s.extractedText}`)
        .join('\n\n---\n\n');

      const dialogContext = dialogEntries
        .map(entry => `${entry.role === 'assistant' ? 'AI' : 'Bruker'}: ${entry.content}`)
        .join('\n\n');

      const rammerContext = brief.rammer ? `
Malgruppe: ${brief.rammer.targetAudience || 'Ikke spesifisert'}
Mal: ${brief.rammer.objectives || 'Ikke spesifisert'}
Kanaler: ${brief.rammer.channels?.join(', ') || 'Ikke spesifisert'}
Tone: ${brief.rammer.tone || 'Ikke spesifisert'}
Leveranser: ${brief.rammer.deliverables?.join(', ') || 'Ikke spesifisert'}
Tidsfrist: ${brief.rammer.deadline || 'Ikke spesifisert'}
Aktivering: ${brief.rammer.activationDate || 'Ikke spesifisert'}
      `.trim() : '';

      const prompt = `Du er en ekspert pa a skrive kommunikasjonsbriefs for GS1 Norway.

BRIEFMAL (folg denne strukturen noyaktig):
${briefTemplate.extractedText}

KILDEMATERIALE:
${sourceContext || 'Ingen kilder lastet opp.'}

INTERVJUET MED FAGPERSONEN:
${dialogContext || 'Ingen dialog registrert.'}

RAMMER OG BEGRENSNINGER:
${rammerContext || 'Ingen rammer spesifisert.'}

BEKREFTEDE PUNKTER:
${brief.confirmedPoints?.map(p => `- ${p.topic}: ${p.summary}`).join('\n') || 'Ingen bekreftede punkter.'}

---

Generer et fullstendig kommunikasjonsbrief basert pa informasjonen over. 
Folg GS1-briefmalen noyaktig med de 9 seksjonene.
Skriv profesjonelt, presist og pa norsk.

Returner et JSON-objekt med folgende struktur:
{
  "prosjektinformasjon": "innhold...",
  "bakgrunn": "innhold...",
  "maal": "innhold...",
  "maalgrupper": "innhold...",
  "verdiforslag": "innhold...",
  "budskap": "innhold...",
  "leveranser": "innhold...",
  "rammer": "innhold...",
  "kildemateriale": "innhold..."
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            prosjektinformasjon: { type: 'string' },
            bakgrunn: { type: 'string' },
            maal: { type: 'string' },
            maalgrupper: { type: 'string' },
            verdiforslag: { type: 'string' },
            budskap: { type: 'string' },
            leveranser: { type: 'string' },
            rammer: { type: 'string' },
            kildemateriale: { type: 'string' }
          },
          required: ['prosjektinformasjon', 'bakgrunn', 'maal', 'maalgrupper', 'verdiforslag', 'budskap', 'leveranser', 'rammer', 'kildemateriale']
        }
      });

      const newSections = {};
      const now = new Date().toISOString();
      for (const key of Object.keys(response)) {
        newSections[key] = {
          content: response[key],
          notes: '',
          metadata: {
            lastEditedAt: now,
            lastEditedBy: 'ai'
          }
        };
      }

      setSections(newSections);
      setHasChanges(true);

      const newEditedAfterApproval = wasApproved;
      if (newEditedAfterApproval) {
        setEditedAfterApproval(true);
      }

      await base44.entities.Brief.update(brief.id, {
        proposedBrief: {
          sections: newSections,
          status: 'draft',
          updatedAt: now,
          approvedAt: brief.proposedBrief?.approvedAt,
          editedAfterApproval: newEditedAfterApproval
        }
      });

      queryClient.invalidateQueries({ queryKey: ['brief', brief.id] });
      toast.success('Foreslatt brief generert!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Kunne ikke generere brief. Prov igjen.');
    }
    setGenerating(false);
  };

  const handleContentChange = useCallback((sectionKey, content) => {
    const now = new Date().toISOString();
    setSections(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        content,
        metadata: {
          lastEditedAt: now,
          lastEditedBy: 'user'
        }
      }
    }));
    setHasChanges(true);
    if (wasApproved) setEditedAfterApproval(true);
  }, [wasApproved]);

  const handleNotesChange = useCallback((sectionKey, notes) => {
    setSections(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        notes
      }
    }));
    setHasChanges(true);
  }, []);

  const handleUpdateWithFeedback = async (sectionKey, feedback) => {
    if (!feedback?.trim()) return;

    setUpdatingSections(prev => ({ ...prev, [sectionKey]: true }));
    
    try {
      const sectionConfig = SECTION_CONFIG.find(s => s.key === sectionKey);
      const currentContent = sections[sectionKey]?.content || '';

      const prompt = `Du er en ekspert pa GS1-kommunikasjonsbriefs.

Gjeldende innhold i seksjonen "${sectionConfig.label}":
${currentContent}

Tilbakemelding fra brukeren:
${feedback}

Oppdater seksjonsinnholdet basert pa tilbakemeldingen. Behold det som fungerer, og juster eller utvid basert pa kommentaren.
Skriv profesjonelt, presist og pa norsk.

Returner BARE det oppdaterte innholdet for denne seksjonen, uten ekstra formatering.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt
      });

      const now = new Date().toISOString();
      setSections(prev => ({
        ...prev,
        [sectionKey]: {
          content: response,
          notes: '',
          metadata: {
            lastEditedAt: now,
            lastEditedBy: 'ai'
          }
        }
      }));
      setHasChanges(true);
      if (wasApproved) setEditedAfterApproval(true);
      toast.success(`"${sectionConfig.label}" oppdatert!`);
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Kunne ikke oppdatere seksjonen.');
    }
    
    setUpdatingSections(prev => ({ ...prev, [sectionKey]: false }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newStatus = (wasApproved && (hasChanges || editedAfterApproval)) ? 'draft' : (brief.proposedBrief?.status || 'draft');
      
      await base44.entities.Brief.update(brief.id, {
        proposedBrief: {
          sections,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          approvedAt: brief.proposedBrief?.approvedAt,
          editedAfterApproval: editedAfterApproval || (wasApproved && hasChanges)
        }
      });
      queryClient.invalidateQueries({ queryKey: ['brief', brief.id] });
      setHasChanges(false);
      toast.success('Endringer lagret!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Kunne ikke lagre endringer.');
    }
    setSaving(false);
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      
      const approvedSnapshot = {};
      for (const key of Object.keys(sections)) {
        approvedSnapshot[key] = {
          content: sections[key]?.content || '',
          notes: sections[key]?.notes || '',
          metadata: sections[key]?.metadata
        };
      }

      await base44.entities.Brief.update(brief.id, {
        proposedBrief: {
          sections,
          status: 'approved',
          updatedAt: now,
          approvedAt: now,
          approvedSnapshot: approvedSnapshot,
          editedAfterApproval: false
        }
      });
      queryClient.invalidateQueries({ queryKey: ['brief', brief.id] });
      setHasChanges(false);
      setEditedAfterApproval(false);
      toast.success('Foreslatt brief godkjent!');
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Kunne ikke godkjenne briefen.');
    }
    setSaving(false);
  };

  const handleContinue = async () => {
    if (hasChanges) {
      await handleSave();
    }
    
    await base44.entities.Brief.update(brief.id, {
      currentStep: 'final'
    });
    queryClient.invalidateQueries({ queryKey: ['brief', brief.id] });
    onContinue();
  };

  const hasSections = Object.keys(sections).length > 0;
  const isApproved = proposedStatus === 'approved' && !editedAfterApproval;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Edited after approval warning */}
      {editedAfterApproval && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Briefen er endret etter godkjenning
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Godkjenn pa nytt for a oppdatere ferdig brief.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Foreslatt brief</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Rediger og tilpass innholdet for endelig godkjenning
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isApproved && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Godkjent
            </Badge>
          )}
          {(proposedStatus === 'draft' || editedAfterApproval) && hasSections && (
            <Badge variant="secondary">Utkast</Badge>
          )}
          {hasSections && (
            <Badge variant="outline" className="text-xs">
              {filledCount}/{SECTION_CONFIG.length} seksjoner
            </Badge>
          )}
        </div>
      </div>

      {/* Generate Button (if no sections yet) */}
      {!hasSections && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Generer foreslatt brief
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Basert pa kildematerialet, intervjuet og rammene vil AI generere et utkast til kommunikasjonsbriefet.
            </p>
            <Button onClick={generateProposedBrief} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Genererer...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generer brief
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sections */}
      {hasSections && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleAllSections}>
                <ChevronsUpDown className="h-4 w-4 mr-1.5" />
                {allExpanded ? 'Lukk alle' : 'Apne alle'}
              </Button>
              {hasSections && (
                <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                  <Eye className="h-4 w-4 mr-1.5" />
                  Forhandsvisning
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRegenerateConfirm(true)}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Generer pa nytt
            </Button>
          </div>

          {/* Regenerate Confirmation */}
          <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                <AlertDialogDescription>
                  Dette vil erstatte alle endringer du har gjort i den foreslatte briefen. Handlingen kan ikke angres.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setShowRegenerateConfirm(false);
                    generateProposedBrief();
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Generer pa nytt
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Section Editors */}
          {SECTION_CONFIG.map(section => (
            <ProposedSection
              key={section.key}
              sectionKey={section.key}
              label={section.label}
              number={section.number}
              content={sections[section.key]?.content || ''}
              notes={sections[section.key]?.notes || ''}
              metadata={sections[section.key]?.metadata}
              onContentChange={handleContentChange}
              onNotesChange={handleNotesChange}
              onUpdateWithFeedback={handleUpdateWithFeedback}
              isUpdating={updatingSections[section.key]}
              forceExpanded={forceExpandState}
            />
          ))}

          {/* Preview Dialog */}
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>Forhandsvisning av ferdig brief</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div className="border-b border-border pb-4">
                  <h2 className="text-lg font-bold text-foreground">{brief.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tema: {brief.themeName} &middot; {formatDate(new Date().toISOString())}
                  </p>
                </div>
                {SECTION_CONFIG.map(section => {
                  const content = sections[section.key]?.content;
                  return (
                    <section key={section.key}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs font-semibold text-blue-700 dark:text-blue-300">
                          {section.number}
                        </span>
                        <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
                      </div>
                      <div className="pl-8 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                        {content || <span className="text-muted-foreground italic">Ingen innhold</span>}
                      </div>
                      {section.number < 9 && <div className="border-b border-border/50 mt-4" />}
                    </section>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbake til intervju
        </Button>
        
        <div className="flex items-center gap-3 flex-wrap">
          {hasChanges && hasSections && (
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Lagre
              <kbd className="hidden sm:inline ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">Ctrl+S</kbd>
            </Button>
          )}
          
          {hasSections && (!isApproved || editedAfterApproval) && (
            <Button 
              onClick={handleApprove} 
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Godkjenn
            </Button>
          )}

          <Button 
            onClick={handleContinue} 
            disabled={!hasSections || saving}
            variant={isApproved ? "default" : "outline"}
          >
            Ferdig brief
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
