import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import SourceBlock, { getContentText, SOURCE_CONFIG } from './SourceBlock';
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
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
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

function formatTimestamp(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }) + 
         ' kl. ' + date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

function ProposedSection({ 
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
  showSources
}) {
  const [expanded, setExpanded] = useState(true);
  const [showNotes, setShowNotes] = useState(!!notes);
  const [localNotes, setLocalNotes] = useState(notes || '');
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(content || '');

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

  return (
    <Card className="mb-4">
      <CardHeader 
        className="cursor-pointer hover:bg-gs1-light-gray transition-colors py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-full bg-gs1-blue/10 flex items-center justify-center text-sm font-semibold text-gs1-blue">
              {number}
            </div>
            <CardTitle className="text-base font-medium">{label}</CardTitle>
            {isUserEdited && (
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                <Pencil className="h-3 w-3 mr-1" />
                Endret
              </Badge>
            )}
            {isAiEdited && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                <Sparkles className="h-3 w-3 mr-1" />
                System-oppdatert
              </Badge>
            )}
          </div>
          {expanded ? <ChevronUp className="h-5 w-5 text-gs1-medium-gray" /> : <ChevronDown className="h-5 w-5 text-gs1-medium-gray" />}
        </div>
        {/* Metadata line */}
        {metadata?.lastEditedAt && (
          <p className="text-xs text-gs1-medium-gray mt-1 ml-10">
            Endret {metadata.lastEditedBy === 'user' ? 'av deg' : 'av systemet'} · {formatTimestamp(metadata.lastEditedAt)}
          </p>
        )}
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Content Display / Editor */}
          <div>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={typeof localContent === 'string' ? localContent : getContentText(localContent)}
                  onChange={(e) => setLocalContent(e.target.value)}
                  placeholder={`Skriv innhold for ${label.toLowerCase()}...`}
                  className="min-h-[150px] resize-y border-gs1-blue/30 focus:border-gs1-blue"
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
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
                <div className="bg-gs1-light-gray rounded-lg p-4 min-h-[100px]">
                  {Array.isArray(content) ? (
                    content.map((block, i) => <SourceBlock key={i} block={block} showTags={showSources} />)
                  ) : content ? (
                    <p className="text-sm whitespace-pre-wrap text-gs1-dark-gray leading-relaxed">{typeof content === 'string' ? content.replace(/\\n/g, '\n') : content}</p>
                  ) : (
                    <span className="text-gs1-border italic text-sm">Ingen innhold ennå...</span>
                  )}
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

          {/* Notes Toggle & Editor */}
          {!isEditing && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotes(!showNotes)}
                className="text-gs1-medium-gray hover:text-gs1-dark-gray -ml-2"
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

          {/* Update with Feedback Button */}
          {!isEditing && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateWithFeedback(sectionKey, localNotes)}
                disabled={isUpdating || !localNotes?.trim()}
                className="text-gs1-blue border-gs1-blue/30 hover:bg-gs1-blue/5"
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
}

export default function ProposedBrief({ brief, sources, dialogEntries, onBack, onContinue }) {
  const queryClient = useQueryClient();
  const [sections, setSections] = useState({});
  const [generating, setGenerating] = useState(false);
  const [showSources, setShowSources] = useState(true);
  const [updatingSections, setUpdatingSections] = useState({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const proposedStatus = brief?.proposedBrief?.status;
  const wasApproved = proposedStatus === 'approved';
  const [editedAfterApproval, setEditedAfterApproval] = useState(false);

  // Initialize sections from brief or generate if empty
  useEffect(() => {
    if (brief?.proposedBrief?.sections) {
      setSections(brief.proposedBrief.sections);
    }
    // Check if edited after approval
    if (brief?.proposedBrief?.editedAfterApproval) {
      setEditedAfterApproval(true);
    }
  }, [brief?.proposedBrief?.sections, brief?.proposedBrief?.editedAfterApproval]);

  const generateProposedBrief = async () => {
    setGenerating(true);
    try {
      // Fetch brief template
      const templates = await base44.entities.KnowledgeBaseDoc.filter({ 
        docType: 'brief_template', 
        isActive: true 
      });
      const briefTemplate = templates[0];

      if (!briefTemplate?.extractedText) {
        toast.error('Briefmalen er ikke klar. Vennligst last opp en briefmal først.');
        setGenerating(false);
        return;
      }

      // Build context from sources
      const sourceContext = sources
        .filter(s => s.extractionStatus === 'success' && s.extractedText)
        .map(s => `[${s.sourceType === 'url' ? s.fileUrl : s.fileName}]:\n${s.extractedText}`)
        .join('\n\n---\n\n');

      // Build dialog context
      const dialogContext = dialogEntries
        .map(entry => `${entry.role === 'assistant' ? 'Systemet' : 'Bruker'}: ${entry.content}`)
        .join('\n\n');

      // Build rammer context
      const rammerContext = brief.rammer ? `
Målgruppe: ${brief.rammer.targetAudience || 'Ikke spesifisert'}
Mål: ${brief.rammer.objectives || 'Ikke spesifisert'}
Kanaler: ${brief.rammer.channels?.join(', ') || 'Ikke spesifisert'}
Tone: ${brief.rammer.tone || 'Ikke spesifisert'}
Leveranser: ${brief.rammer.deliverables?.join(', ') || 'Ikke spesifisert'}
Tidsfrist: ${brief.rammer.deadline || 'Ikke spesifisert'}
Aktivering: ${brief.rammer.activationDate || 'Ikke spesifisert'}
      `.trim() : '';

      const prompt = `Du er en ekspert på å skrive kommunikasjonsbriefs for GS1 Norway.

BRIEFMAL (følg denne strukturen nøyaktig):
${briefTemplate.extractedText}

KILDEMATERIALE (merket som "kildemateriale" i output):
${sourceContext || 'Ingen kilder lastet opp.'}

INTERVJUET MED FAGPERSONEN (brukerens egne svar, merket som "brukerinput" i output):
${dialogContext || 'Ingen dialog registrert.'}

RAMMER OG BEGRENSNINGER (fra bruker, merket som "brukerinput"):
${rammerContext || 'Ingen rammer spesifisert.'}

BEKREFTEDE PUNKTER FRA INTERVJUET (merket som "brukerinput"):
${brief.confirmedPoints?.map(p => `- ${p.topic}: ${p.summary}`).join('\n') || 'Ingen bekreftede punkter.'}

---

Generer et fullstendig kommunikasjonsbrief basert på informasjonen over.
Følg GS1-briefmalen nøyaktig med de 9 seksjonene.
Skriv profesjonelt, presist og på norsk.

KRITISK: Hver seksjon MÅ returnere en liste med kildetaggede blokker. Bruk ALLTID én av tre typer:
- "brukerinput": informasjon eksplisitt gitt av brukeren i intervjuet eller rammene
- "kildemateriale": informasjon hentet direkte fra opplastede dokumenter/URL-er
- "forslag_fra_systemet": innhold systemet foreslår/utleder – aldri presentert som fakta

Hvis du er usikker på kilden, bruk "forslag_fra_systemet". Ikke inkluder innhold uten kildemerking.

Returner et JSON-objekt der hver seksjon er en ARRAY av blokker:
{
  "prosjektinformasjon": [{"type": "brukerinput", "content": "..."}, {"type": "forslag_fra_systemet", "content": "..."}],
  "bakgrunn": [{"type": "kildemateriale", "content": "..."}, {"type": "forslag_fra_systemet", "content": "..."}],
  "maal": [...],
  "maalgrupper": [...],
  "verdiforslag": [...],
  "budskap": [...],
  "leveranser": [...],
  "rammer": [...],
  "kildemateriale": [...]
}`;

      const blockSchema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['brukerinput', 'kildemateriale', 'forslag_fra_systemet'] },
            content: { type: 'string' }
          },
          required: ['type', 'content']
        }
      };
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'claude_sonnet_4_6',
        response_json_schema: {
          type: 'object',
          properties: {
            prosjektinformasjon: blockSchema,
            bakgrunn: blockSchema,
            maal: blockSchema,
            maalgrupper: blockSchema,
            verdiforslag: blockSchema,
            budskap: blockSchema,
            leveranser: blockSchema,
            rammer: blockSchema,
            kildemateriale: blockSchema
          },
          required: ['prosjektinformasjon', 'bakgrunn', 'maal', 'maalgrupper', 'verdiforslag', 'budskap', 'leveranser', 'rammer', 'kildemateriale']
        }
      });

      // Convert to sections format with metadata
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

      // If was approved, mark as edited after approval
      const newEditedAfterApproval = wasApproved;
      if (newEditedAfterApproval) {
        setEditedAfterApproval(true);
      }

      // Save to database - revert to draft if was approved
      await base44.entities.Brief.update(brief.id, {
        proposedBrief: {
          sections: newSections,
          status: wasApproved ? 'draft' : 'draft',
          updatedAt: now,
          approvedAt: brief.proposedBrief?.approvedAt,
          editedAfterApproval: newEditedAfterApproval
        }
      });

      queryClient.invalidateQueries({ queryKey: ['brief', brief.id] });
      toast.success('Foreslått brief generert!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Kunne ikke generere brief. Prøv igjen.');
    }
    setGenerating(false);
  };

  const handleContentChange = (sectionKey, content) => {
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
    // If was approved, mark as edited after approval
    if (wasApproved) {
      setEditedAfterApproval(true);
    }
  };

  const handleNotesChange = (sectionKey, notes) => {
    setSections(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        notes
      }
    }));
    setHasChanges(true);
  };

  const handleUpdateWithFeedback = async (sectionKey, feedback) => {
    if (!feedback?.trim()) return;

    setUpdatingSections(prev => ({ ...prev, [sectionKey]: true }));
    
    try {
      const sectionConfig = SECTION_CONFIG.find(s => s.key === sectionKey);
      const currentContent = sections[sectionKey]?.content || '';

      const currentContentText = getContentText(currentContent);
      const prompt = `Du er en ekspert på GS1-kommunikasjonsbriefs.

Gjeldende innhold i seksjonen "${sectionConfig.label}":
${currentContentText}

Tilbakemelding fra brukeren:
${feedback}

Oppdater seksjonsinnholdet basert på tilbakemeldingen. Behold det som fungerer, og juster eller utvid basert på kommentaren.
Skriv profesjonelt, presist og på norsk.

KRITISK: Returner en JSON-array med kildetaggede blokker. Bruk:
- "brukerinput" for informasjon eksplisitt fra brukeren
- "kildemateriale" for informasjon fra opplastede kilder
- "forslag_fra_systemet" for systemets forslag/utledninger

Eksempel: [{"type": "brukerinput", "content": "..."}, {"type": "forslag_fra_systemet", "content": "..."}]`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            blocks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['brukerinput', 'kildemateriale', 'forslag_fra_systemet'] },
                  content: { type: 'string' }
                },
                required: ['type', 'content']
              }
            }
          },
          required: ['blocks']
        }
      });

      const now = new Date().toISOString();
      setSections(prev => ({
        ...prev,
        [sectionKey]: {
          content: response.blocks || response,
          notes: '', // Clear notes after applying
          metadata: {
            lastEditedAt: now,
            lastEditedBy: 'ai'
          }
        }
      }));
      setHasChanges(true);
      // If was approved, mark as edited after approval
      if (wasApproved) {
        setEditedAfterApproval(true);
      }
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
      // If was approved and has changes, revert to draft
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

  const [approving, setApproving] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      // Save current sections snapshot before calling backend (no status/approvedAt changes)
      if (hasChanges) {
        await base44.entities.Brief.update(brief.id, {
          proposedBrief: {
            ...brief.proposedBrief,
            sections,
            updatedAt: new Date().toISOString()
          }
        });
      }

      // Backend owns ALL status transitions: generates DOCX, uploads, then atomically sets status+approvedAt+generatedDocumentUrl
      const response = await base44.functions.invoke('approveBrief', { briefId: brief.id });
      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      queryClient.invalidateQueries({ queryKey: ['brief', brief.id] });
      setHasChanges(false);
      setEditedAfterApproval(false);
      toast.success('Brief godkjent og dokument generert!');
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Kunne ikke godkjenne briefen: ' + (error.message || 'Ukjent feil'));
    }
    setApproving(false);
  };

  const handleContinue = async () => {
    // Save if there are changes first
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
    <div className="space-y-6">
      {/* Edited after approval warning */}
      {editedAfterApproval && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">
              Briefen er endret etter godkjenning
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Godkjenn på nytt for å oppdatere ferdig brief.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gs1-dark-gray">Foreslått brief</h2>
          <p className="text-sm text-gs1-medium-gray mt-1">
            Rediger og tilpass innholdet før endelig godkjenning
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSources(!showSources)}
            className="text-xs flex items-center gap-1.5"
          >
            {showSources ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showSources ? 'Skjul kilder' : 'Vis kilder'}
          </Button>
          {isApproved && (
            <Badge className="bg-gs1-blue/10 text-gs1-blue">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Godkjent
            </Badge>
          )}
          {(proposedStatus === 'draft' || editedAfterApproval) && hasSections && (
            <Badge variant="secondary">Utkast</Badge>
          )}
        </div>
      </div>

      {/* Generate Button (if no sections yet) */}
      {!hasSections && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gs1-border" />
            <h3 className="text-lg font-medium text-gs1-dark-gray mb-2">
              Generer foreslått brief
            </h3>
            <p className="text-gs1-medium-gray mb-6 max-w-md mx-auto">
              Basert på kildematerialet, intervjuet og rammene vil Dynamisk Brief generere et utkast til kommunikasjonsbriefet.
            </p>
            <Button onClick={generateProposedBrief} disabled={generating} className="bg-gs1-blue hover:bg-gs1-blue/90">
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
          {/* Regenerate Button */}
          <div className="flex justify-end">
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
              Generer på nytt
            </Button>
          </div>

          {/* Regenerate Confirmation Dialog */}
          <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
                <AlertDialogDescription>
                  Dette vil erstatte alle endringer du har gjort i den foreslåtte briefen. Handlingen kan ikke angres.
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
                  Generer på nytt
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
              showSources={showSources}
            />
          ))}
        </>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-gs1-border">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbake til intervju
        </Button>
        
        <div className="flex items-center space-x-3">
          {hasChanges && hasSections && (
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Lagre endringer
            </Button>
          )}
          
          {/* Approve button - show if not approved or edited after approval */}
          {hasSections && (!isApproved || editedAfterApproval) && (
            <Button 
              onClick={handleApprove} 
              disabled={saving || approving}
              className="bg-gs1-blue hover:bg-gs1-blue/90 text-white"
            >
              {approving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Genererer dokument...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Godkjenn foreslått brief
                </>
              )}
            </Button>
          )}

          {/* Continue to Step 5 */}
          <Button 
            onClick={handleContinue} 
            disabled={!hasSections || saving}
            variant={isApproved ? "default" : "outline"}
            className={isApproved ? "bg-gs1-blue hover:bg-gs1-blue/90" : ""}
          >
            Gå til ferdig brief
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}