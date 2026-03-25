import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Send, 
  Loader2, 
  ArrowLeft,
  ArrowRight,
  User,
  MessageSquare,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import InterviewProgress, { 
  BRIEF_SECTIONS, 
  areAllSectionsConfirmed,
  getConfirmedSectionsCount 
} from './InterviewProgress';
function getFirstMissingSectionKey(confirmedPoints = []) {
  const confirmedKeys = new Set(confirmedPoints.map(p => p.sectionKey).filter(Boolean));
  const first = BRIEF_SECTIONS.find(s => !confirmedKeys.has(s.key));
  return first ? first.key : null;
}

export default function AIDialog({ brief, sources = [], onBack, onContinue, userName = '' }) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showIntroPanel, setShowIntroPanel] = useState(false);
  // Race-condition guard: holds latest confirmedPoints before react-query refresh completes
  const pendingPointsRef = useRef([]);
  const messagesEndRef = useRef(null);

  // Deterministic section tracker – advances after each user answer
  const [currentSectionKey, setCurrentSectionKey] = useState(() =>
    getFirstMissingSectionKey(brief?.confirmedPoints)
  );

  const { data: dialogEntries = [], isLoading } = useQuery({
    queryKey: ['dialogEntries', brief.id],
    queryFn: async () => {
      const entries = await base44.entities.DialogEntry.filter(
        { briefId: brief.id },
        'sequenceNumber'
      );
      return entries;
    }
  });

  const confirmedPoints = brief.confirmedPoints || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialogEntries]);

  // Show intro panel if no dialog entries and not previously dismissed
  useEffect(() => {
    if (!isLoading && dialogEntries.length === 0 && localStorage.getItem('briefIntroSeen') !== 'true') {
      setShowIntroPanel(true);
    } else {
      setShowIntroPanel(false);
    }
  }, [isLoading, dialogEntries.length]);

  // Start conversation if empty and intro panel is not shown
  useEffect(() => {
    if (!isLoading && dialogEntries.length === 0 && !showIntroPanel) {
      startConversation();
    }
  }, [isLoading, dialogEntries.length, showIntroPanel]);

  const addEntryMutation = useMutation({
    mutationFn: async (entryData) => {
      const maxSeq = dialogEntries.length > 0 
        ? Math.max(...dialogEntries.map(e => e.sequenceNumber || 0)) 
        : 0;
      
      await base44.entities.DialogEntry.create({
        briefId: brief.id,
        sequenceNumber: maxSeq + 1,
        ...entryData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialogEntries', brief.id] });
    }
  });

  const updateBriefMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Brief.update(brief.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brief', brief.id] });
    }
  });

  // Build context summary from sources and rammer
  const buildContextSummary = () => {
    const known = [];
    const missing = [];

    // What we know
    if (brief.themeName) known.push(`Tema: ${brief.themeName}`);
    if (brief.rammer?.targetAudience) known.push(`Målgruppe: ${brief.rammer.targetAudience}`);
    if (brief.rammer?.objectives) known.push(`Mål: ${brief.rammer.objectives}`);
    if (brief.rammer?.channels?.length) known.push(`Kanaler: ${brief.rammer.channels.join(', ')}`);
    if (brief.rammer?.tone) known.push(`Tone: ${brief.rammer.tone}`);
    if (sources.length > 0) known.push(`${sources.length} kildemateriale(r) lastet opp`);

    // What we're missing (based on BRIEF_SECTIONS)
    BRIEF_SECTIONS.forEach(section => {
      const hasConfirmed = confirmedPoints.some(p => p.sectionKey === section.key);
      if (!hasConfirmed) {
        missing.push(section.label);
      }
    });

    return { known, missing };
  };

  const startConversation = async () => {
    setIsProcessing(true);
    
    const sourceContext = sources.map(s => 
      s.extractedText || `[${s.sourceType}: ${s.fileName || s.fileUrl}]`
    ).join('\n\n');

    const { known, missing } = buildContextSummary();

    // Determine the target section for the first question
    const targetSection = BRIEF_SECTIONS.find(s => s.key === currentSectionKey) || BRIEF_SECTIONS[0];

    const prompt = `Du er en kommunikasjonsrådgiver for GS1 Norway som hjelper fageksperter med å lage kommunikasjonsbriefs gjennom et strukturert intervju.

KONTEKST:
Tema: ${brief.themeName}
Målgruppe: ${brief.rammer?.targetAudience || 'Ikke spesifisert'}
Mål: ${brief.rammer?.objectives || 'Ikke spesifisert'}
Kanaler: ${brief.rammer?.channels?.join(', ') || 'Ikke spesifisert'}
Tone: ${brief.rammer?.tone || 'Ikke spesifisert'}

KILDEMATERIALE:
${sourceContext || 'Ingen kilder lastet opp'}

Start samtalen med denne strukturen:

**Dette vet vi så langt:**
${known.map(k => `• ${k}`).join('\n')}

**For å fullføre briefen mangler vi:**
${missing.map(m => `• ${m}`).join('\n')}

---

Still deretter ETT fokusert spørsmål om BARE denne seksjonen:
Seksjon: "${targetSection.label}"
Beskrivelse: "${targetSection.description}"

VIKTIGE REGLER:
- Still KUN ETT hovedspørsmål om denne ene seksjonen.
- IKKE still oppfølgingsspørsmål.
- IKKE spør om andre seksjoner.
- Brukeren svarer én gang per seksjon. Systemet går automatisk videre til neste seksjon etterpå.

SPØRSMÅLSFORMAT:
1. Start med ÉN tydelig hovedspørsmål i fet skrift.
2. Legg til: "Svar fritt – du trenger ikke dekke alt."
3. Deretter valgfri støtte, innledet med: "For å hjelpe deg å svare, kan du tenke på:" – etterfulgt av kulepunkter.

Skriv på norsk. Vær profesjonell, rolig og rådgivende.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      
      await addEntryMutation.mutateAsync({
        role: 'assistant',
        content: response
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
    
    setIsProcessing(false);
  };

  // Merge server confirmedPoints with any pending local additions not yet refreshed by react-query
  const getEffectiveConfirmedPoints = () => {
    const base = confirmedPoints;
    const pending = pendingPointsRef.current;
    if (pending.length === 0) return base;
    // Deduplicate by sectionKey, pending wins over base
    const merged = [...base];
    for (const p of pending) {
      const idx = merged.findIndex(m => m.sectionKey === p.sectionKey);
      if (idx > -1) {
        merged[idx] = p; // overwrite with latest
      } else {
        merged.push(p);
      }
    }
    return merged;
  };

  const sendMessage = async (message, inputMethod = 'text') => {
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);
    setInput('');

    // Add user message
    await addEntryMutation.mutateAsync({
      role: 'user',
      content: message,
      inputMethod
    });

    // --- Deterministic capture: save answer for currentSectionKey ---
    const effectivePointsBefore = getEffectiveConfirmedPoints();
    const capturedSection = BRIEF_SECTIONS.find(s => s.key === currentSectionKey);

    if (capturedSection) {
      const newSummary = message.trim().substring(0, 500);
      const newPoint = {
        sectionKey: capturedSection.key,
        topic: capturedSection.label,
        summary: newSummary,
        confirmedAt: new Date().toISOString()
      };

      const currentPoints = effectivePointsBefore;
      const existingIndex = currentPoints.findIndex(p => p.sectionKey === capturedSection.key);
      let updatedConfirmedPoints;
      if (existingIndex > -1) {
        updatedConfirmedPoints = [
          ...currentPoints.slice(0, existingIndex),
          newPoint,
          ...currentPoints.slice(existingIndex + 1)
        ];
      } else {
        updatedConfirmedPoints = [...currentPoints, newPoint];
      }

      pendingPointsRef.current = updatedConfirmedPoints;
      await updateBriefMutation.mutateAsync({ confirmedPoints: updatedConfirmedPoints });

      // Advance to next missing section
      const nextKey = getFirstMissingSectionKey(updatedConfirmedPoints);
      setCurrentSectionKey(nextKey);
    }

    // Use effective confirmed points (includes just-captured point)
    const effectivePoints = getEffectiveConfirmedPoints();

    // Check if all sections are now covered
    const nextSectionKey = getFirstMissingSectionKey(effectivePoints);

    if (!nextSectionKey) {
      // All sections covered – tell user they can generate
      const completionMessage = 'Alle seksjoner er nå dekket! Du kan nå klikke «Generer brief» for å lage et komplett briefutkast basert på svarene dine.';
      await addEntryMutation.mutateAsync({
        role: 'assistant',
        content: completionMessage
      });
      pendingPointsRef.current = [];
      setIsProcessing(false);
      return;
    }

    // Build conversation history
    const history = [...dialogEntries, { role: 'user', content: message }]
      .map(e => `${e.role === 'assistant' ? 'Rådgiver' : 'Fagekspert'}: ${e.content}`)
      .join('\n\n');

    // Get the next target section
    const nextSection = BRIEF_SECTIONS.find(s => s.key === nextSectionKey);

    const prompt = `Du er en kommunikasjonsrådgiver for GS1 Norway. Fortsett det strukturerte intervjuet.

KONTEKST:
Tema: ${brief.themeName}
Målgruppe: ${brief.rammer?.targetAudience || 'Ikke spesifisert'}
Mål: ${brief.rammer?.objectives || 'Ikke spesifisert'}

ALLEREDE BEKREFTET (${effectivePoints.length}/${BRIEF_SECTIONS.length}):
${effectivePoints.map(p => `✓ ${p.sectionKey}: ${p.summary}`).join('\n')}

SAMTALEHISTORIKK:
${history}

INSTRUKSJONER:
Gi en kort kvittering på brukerens svar (1 setning maks), og still deretter ETT fokusert spørsmål om BARE denne seksjonen:
Seksjon: "${nextSection.label}"
Beskrivelse: "${nextSection.description}"

VIKTIGE REGLER:
- Still KUN ETT hovedspørsmål om denne ene seksjonen.
- IKKE still oppfølgingsspørsmål.
- IKKE spør om andre seksjoner.
- IKKE be om bekreftelse eller validering av tidligere svar.
- Brukeren svarer én gang per seksjon. Systemet går automatisk videre til neste seksjon etterpå.

SPØRSMÅLSFORMAT:
1. Start med ÉN tydelig hovedspørsmål i fet skrift.
2. Legg til: "Svar fritt – du trenger ikke dekke alt."
3. Deretter valgfri støtte, innledet med: "For å hjelpe deg å svare, kan du tenke på:" – etterfulgt av kulepunkter.

Skriv på norsk. Vær profesjonell, rolig og rådgivende.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      
      await addEntryMutation.mutateAsync({
        role: 'assistant',
        content: response
      });
    } catch (error) {
      console.error('Failed to get AI response:', error);
    }

    pendingPointsRef.current = [];
    setIsProcessing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const textareaRef = useRef(null);

  const autoResizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const minHeight = 120; // ~5-6 lines default
      const maxHeight = 240; // ~10 lines max
      textarea.style.height = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight)) + 'px';
    }
  }, []);

  useEffect(() => {
    autoResizeTextarea();
  }, [input, autoResizeTextarea]);

  const canProceed = areAllSectionsConfirmed(confirmedPoints);
  const confirmedCount = getConfirmedSectionsCount(confirmedPoints);

  // Active section label for chat message headers
  const currentSectionObj = currentSectionKey
    ? BRIEF_SECTIONS.find(s => s.key === currentSectionKey)
    : null;

  const handleDismissIntro = (startConvo) => {
    localStorage.setItem('briefIntroSeen', 'true');
    setShowIntroPanel(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Progress sidebar */}
      <div className="lg:col-span-1 order-2 lg:order-1">
        <div className="sticky top-4">
          <InterviewProgress confirmedPoints={confirmedPoints} activeSectionKey={currentSectionKey} />
        </div>
      </div>

      {/* Main chat area */}
      <div className="lg:col-span-2 order-1 lg:order-2 space-y-4">
        {/* Intro / Help Panel */}
        {showIntroPanel && dialogEntries.length === 0 && (
          <Card className="border-gs1-blue/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg font-semibold text-gs1-blue">
                <Info className="h-5 w-5 mr-2 flex-shrink-0" />
                Velkommen til det dynamiske intervjuet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gs1-dark-gray">
              <p>
                Dette intervjuet veileder deg gjennom prosessen med å samle all nødvendig informasjon for en kommunikasjonsbrief. Systemet stiller spørsmål – dine svar blir grunnlaget for briefutkastet.
              </p>

              <div>
                <p className="font-medium text-gs1-blue mb-1">Slik fungerer det:</p>
                <ul className="list-disc list-inside space-y-0.5 text-gs1-medium-gray">
                  <li>Du får ett fokusert spørsmål om gangen</li>
                  <li>Svarene dine lagres automatisk</li>
                  <li>Systemet guider deg gjennom alle nødvendige seksjoner</li>
                  <li>Når alt er dekket, kan du generere et komplett briefutkast</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-gs1-blue mb-1">Viktig å vite:</p>
                <ul className="list-disc list-inside space-y-0.5 text-gs1-medium-gray">
                  <li>Ingen bekreftelse per seksjon er nødvendig</li>
                  <li>Alt kan redigeres og justeres i briefutkastet etterpå</li>
                  <li>Det finnes ingen «feil» svar – bare svar så godt du kan</li>
                </ul>
              </div>

              <div className="bg-gs1-light-gray border border-gs1-border rounded-md px-3 py-2 text-xs text-gs1-medium-gray">
                Intervju → Svar fanges opp → Neste spørsmål → … → Generer brief
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleDismissIntro(false)} className="text-gs1-medium-gray border-gs1-border">
                  Skjul
                </Button>
                <Button size="sm" onClick={() => handleDismissIntro(true)} className="bg-gs1-blue hover:bg-gs1-blue/90">
                  Start intervju
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Messages */}
        <Card className="h-[450px] overflow-hidden flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-gs1-medium-gray" />
              </div>
            ) : (
              <>
                {dialogEntries.map((entry) => {
                  return (
                  <div
                    key={entry.id}
                    className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${entry.role === 'user' ? 'order-2' : ''}`}>
                      <div className="flex items-center space-x-2 mb-1">
                        {entry.role === 'assistant' ? (
                          <MessageSquare className="h-4 w-4 text-gs1-blue" />
                        ) : (
                          <User className="h-4 w-4 text-gs1-medium-gray" />
                        )}
                        <span className="text-xs text-gs1-medium-gray">
                          {entry.role === 'assistant' ? 'Dynamisk brief' : (userName || 'Deg')}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg p-3 ${
                          entry.role === 'user'
                            ? 'bg-gs1-blue text-white'
                            : 'bg-gs1-blue/5 border border-gs1-blue/20 text-gs1-dark-gray'
                        }`}
                      >
                        {/* Section label for assistant messages */}
                        {entry.role === 'assistant' && currentSectionObj && (
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-gs1-blue uppercase tracking-wide">
                              {currentSectionObj.label}
                            </div>
                          </div>
                        )}
                        {entry.role === 'assistant' ? (
                          <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-li:my-1 prose-ul:my-2 prose-ol:my-2 prose-headings:my-3 prose-hr:my-4">
                            {entry.content.replace(/^(Rådgiver|Dynamisk brief):\s*/i, '')}
                          </ReactMarkdown>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
                
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-gs1-light-gray rounded-lg p-3">
                      <Loader2 className="h-5 w-5 animate-spin text-gs1-medium-gray" />
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Input Area */}
          <div className="border-t border-gs1-border p-4">
            <div className="flex space-x-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Skriv svaret ditt her – eller bruk tale-til-tekst via PC/Mac-mikrofonen."
                className="flex-1 min-h-[120px] max-h-[240px] resize-none overflow-y-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gs1-medium-gray focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isProcessing}
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isProcessing}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onBack} className="border-gs1-border text-gs1-dark-gray hover:bg-gs1-light-gray">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake til rammer
          </Button>
          <div className="flex items-center gap-3">
            {!canProceed && (
              <span className="text-sm text-gs1-medium-gray">
                {confirmedCount}/{BRIEF_SECTIONS.length} seksjoner dekket
              </span>
            )}
            <Button
              onClick={async () => {
                // Auto-fill any missing sections with placeholder before proceeding
                const existingKeys = new Set((brief.confirmedPoints || []).map(p => p.sectionKey));
                const missingSections = BRIEF_SECTIONS.filter(s => !existingKeys.has(s.key));
                if (missingSections.length > 0) {
                  const placeholders = missingSections.map(s => ({
                    sectionKey: s.key,
                    topic: s.label,
                    summary: 'Ikke oppgitt',
                    confirmedAt: new Date().toISOString()
                  }));
                  await updateBriefMutation.mutateAsync({
                    confirmedPoints: [...(brief.confirmedPoints || []), ...placeholders]
                  });
                }
                onContinue();
              }}
              className="bg-gs1-blue hover:bg-gs1-blue/90"
            >
              Generer brief
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}