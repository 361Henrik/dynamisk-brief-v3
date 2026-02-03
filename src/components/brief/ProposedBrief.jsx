import React, { useState, useEffect } from 'react';
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
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

function ProposedSection({ 
  sectionKey, 
  label, 
  number, 
  content, 
  notes, 
  onContentChange, 
  onNotesChange,
  onUpdateWithFeedback,
  isUpdating 
}) {
  const [expanded, setExpanded] = useState(true);
  const [showNotes, setShowNotes] = useState(!!notes);
  const [localNotes, setLocalNotes] = useState(notes || '');

  useEffect(() => {
    setLocalNotes(notes || '');
  }, [notes]);

  return (
    <Card className="mb-4">
      <CardHeader 
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-sm font-semibold text-blue-700 dark:text-blue-300">
              {number}
            </div>
            <CardTitle className="text-base font-medium">{label}</CardTitle>
          </div>
          {expanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Content Editor */}
          <div>
            <Textarea
              value={content || ''}
              onChange={(e) => onContentChange(sectionKey, e.target.value)}
              placeholder={`Skriv innhold for ${label.toLowerCase()}...`}
              className="min-h-[120px] resize-y"
            />
          </div>

          {/* Notes Toggle & Editor */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes(!showNotes)}
              className="text-gray-500 hover:text-gray-700 -ml-2"
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

          {/* Update with Feedback Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdateWithFeedback(sectionKey, localNotes)}
              disabled={isUpdating || !localNotes?.trim()}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Oppdater med tilbakemelding
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function ProposedBrief({ brief, sources, dialogEntries, onBack, onContinue }) {
  const queryClient = useQueryClient();
  const [sections, setSections] = useState({});
  const [generating, setGenerating] = useState(false);
  const [updatingSections, setUpdatingSections] = useState({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize sections from brief or generate if empty
  useEffect(() => {
    if (brief?.proposedBrief?.sections) {
      setSections(brief.proposedBrief.sections);
    }
  }, [brief?.proposedBrief?.sections]);

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
        .map(entry => `${entry.role === 'assistant' ? 'AI' : 'Bruker'}: ${entry.content}`)
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

KILDEMATERIALE:
${sourceContext || 'Ingen kilder lastet opp.'}

INTERVJUET MED FAGPERSONEN:
${dialogContext || 'Ingen dialog registrert.'}

RAMMER OG BEGRENSNINGER:
${rammerContext || 'Ingen rammer spesifisert.'}

BEKREFTEDE PUNKTER:
${brief.confirmedPoints?.map(p => `- ${p.topic}: ${p.summary}`).join('\n') || 'Ingen bekreftede punkter.'}

---

Generer et fullstendig kommunikasjonsbrief basert på informasjonen over. 
Følg GS1-briefmalen nøyaktig med de 9 seksjonene.
Skriv profesjonelt, presist og på norsk.

Returner et JSON-objekt med følgende struktur:
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

      // Convert to sections format
      const newSections = {};
      for (const key of Object.keys(response)) {
        newSections[key] = {
          content: response[key],
          notes: ''
        };
      }

      setSections(newSections);
      setHasChanges(true);

      // Save to database
      await base44.entities.Brief.update(brief.id, {
        proposedBrief: {
          sections: newSections,
          status: 'draft',
          updatedAt: new Date().toISOString()
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
    setSections(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        content
      }
    }));
    setHasChanges(true);
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

      const prompt = `Du er en ekspert på GS1-kommunikasjonsbriefs.

Gjeldende innhold i seksjonen "${sectionConfig.label}":
${currentContent}

Tilbakemelding fra brukeren:
${feedback}

Oppdater seksjonsinnholdet basert på tilbakemeldingen. Behold det som fungerer, og juster eller utvid basert på kommentaren.
Skriv profesjonelt, presist og på norsk.

Returner BARE det oppdaterte innholdet for denne seksjonen, uten ekstra formatering.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt
      });

      setSections(prev => ({
        ...prev,
        [sectionKey]: {
          content: response,
          notes: '' // Clear notes after applying
        }
      }));
      setHasChanges(true);
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
      await base44.entities.Brief.update(brief.id, {
        proposedBrief: {
          sections,
          status: brief.proposedBrief?.status || 'draft',
          updatedAt: new Date().toISOString(),
          approvedAt: brief.proposedBrief?.approvedAt
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

  const handleApproveAndContinue = async () => {
    setSaving(true);
    try {
      await base44.entities.Brief.update(brief.id, {
        proposedBrief: {
          sections,
          status: 'approved',
          updatedAt: new Date().toISOString(),
          approvedAt: new Date().toISOString()
        },
        currentStep: 'final'
      });
      queryClient.invalidateQueries({ queryKey: ['brief', brief.id] });
      toast.success('Brief godkjent! Går videre til eksport.');
      onContinue();
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Kunne ikke godkjenne briefen.');
    }
    setSaving(false);
  };

  const hasSections = Object.keys(sections).length > 0;
  const proposedStatus = brief?.proposedBrief?.status;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Foreslått brief</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Rediger og tilpass innholdet før endelig godkjenning
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {proposedStatus === 'approved' && (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Godkjent
            </Badge>
          )}
          {proposedStatus === 'draft' && (
            <Badge variant="secondary">Utkast</Badge>
          )}
        </div>
      </div>

      {/* Generate Button (if no sections yet) */}
      {!hasSections && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Generer foreslått brief
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Basert på kildematerialet, intervjuet og rammene vil AI generere et utkast til kommunikasjonsbriefet.
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
          {/* Regenerate Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={generateProposedBrief}
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

          {/* Section Editors */}
          {SECTION_CONFIG.map(section => (
            <ProposedSection
              key={section.key}
              sectionKey={section.key}
              label={section.label}
              number={section.number}
              content={sections[section.key]?.content || ''}
              notes={sections[section.key]?.notes || ''}
              onContentChange={handleContentChange}
              onNotesChange={handleNotesChange}
              onUpdateWithFeedback={handleUpdateWithFeedback}
              isUpdating={updatingSections[section.key]}
            />
          ))}
        </>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
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
          
          <Button 
            onClick={handleApproveAndContinue} 
            disabled={!hasSections || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Godkjenn og fortsett
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}