import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Send, 
  Loader2, 
  ArrowLeft,
  ArrowRight,
  User,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Card, CardContent } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import InterviewProgress, { 
  BRIEF_SECTIONS, 
  areAllSectionsConfirmed,
  getConfirmedSectionsCount 
} from './InterviewProgress';
// Static mapping: interview section → brief template sections (UI display only)
const SECTION_TO_TEMPLATE_MAP = {
  hovedbudskap: 'Budskap, tone og stil + GS1-tilbudet og verdiforslag',
  malgruppe_innsikt: 'Målgrupper',
  nokkelpunkter: 'Budskap, tone og stil + GS1-tilbudet og verdiforslag',
  eksempler: 'Bakgrunn og situasjonsbeskrivelse + GS1-tilbudet og verdiforslag',
  call_to_action: 'Mål og suksesskriterier + Budskap, tone og stil'
};

// Detect which section an AI question is targeting based on content keywords
const detectActiveSection = (content, confirmedPoints = []) => {
  if (!content) return null;
  const lowerContent = content.toLowerCase();
  
  // Check each section for keyword matches
  const sectionKeywords = {
    hovedbudskap: ['hovedbudskap', 'kjernebudskap', 'viktigste budskap', 'kommunisere'],
    malgruppe_innsikt: ['målgruppe', 'målgruppeinnsikt', 'hvem er', 'kjenner du', 'deres behov'],
    nokkelpunkter: ['nøkkelpunkt', 'konkrete punkt', 'viktige punkt', 'detaljer'],
    eksempler: ['eksempel', 'case', 'illustrer', 'konkret historie', 'erfaring'],
    call_to_action: ['call to action', 'handling', 'ønsker du at', 'neste steg', 'gjøre etterpå']
  };
  
  for (const section of BRIEF_SECTIONS) {
    // Skip already confirmed sections
    const isConfirmed = confirmedPoints.some(p => 
      p.sectionKey === section.key || 
      p.topic?.toLowerCase().includes(section.key.replace('_', ' '))
    );
    if (isConfirmed) continue;
    
    const keywords = sectionKeywords[section.key] || [];
    if (keywords.some(kw => lowerContent.includes(kw))) {
      return section;
    }
  }
  
  // Default to first unconfirmed section
  return BRIEF_SECTIONS.find(section => 
    !confirmedPoints.some(p => 
      p.sectionKey === section.key || 
      p.topic?.toLowerCase().includes(section.key.replace('_', ' '))
    )
  );
};

export default function AIDialog({ brief, sources = [], onBack, onContinue, userName = '' }) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  // Race-condition guard: holds latest confirmedPoints before react-query refresh completes
  const pendingPointsRef = useRef([]);
  const messagesEndRef = useRef(null);

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

  // Start conversation if empty
  useEffect(() => {
    if (!isLoading && dialogEntries.length === 0) {
      startConversation();
    }
  }, [isLoading, dialogEntries.length]);

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
      const hasConfirmed = confirmedPoints.some(p => 
        p.sectionKey === section.key || 
        p.topic?.toLowerCase().includes(section.key.replace('_', ' '))
      );
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
    const sectionsToCollect = BRIEF_SECTIONS.map(s => `- ${s.label}: ${s.description}`).join('\n');

    const prompt = `Du er en kommunikasjonsrådgiver for GS1 Norway som hjelper fageksperter med å lage kommunikasjonsbriefs gjennom et strukturert intervju.

KONTEKST:
Tema: ${brief.themeName}
Målgruppe: ${brief.rammer?.targetAudience || 'Ikke spesifisert'}
Mål: ${brief.rammer?.objectives || 'Ikke spesifisert'}
Kanaler: ${brief.rammer?.channels?.join(', ') || 'Ikke spesifisert'}
Tone: ${brief.rammer?.tone || 'Ikke spesifisert'}

KILDEMATERIALE:
${sourceContext || 'Ingen kilder lastet opp'}

SEKSJONER SOM MÅ FYLLES UT FOR BRIEFEN:
${sectionsToCollect}

Start samtalen med denne strukturen:

**Dette vet vi så langt:**
${known.map(k => `• ${k}`).join('\n')}

**For å fullføre briefen mangler vi:**
${missing.map(m => `• ${m}`).join('\n')}

---

Still deretter ETT fokusert spørsmål for å begynne å samle informasjon om "${missing[0] || 'Hovedbudskap'}".

VIKTIG – SPØRSMÅLSFORMAT (følg dette alltid):
1. Start med ÉN tydelig hovedspørsmål i fet skrift. Dette er det eneste brukeren MÅ svare på.
2. Legg til beroligende linje rett etter spørsmålet:
   "Svar fritt – du trenger ikke dekke alt."
3. Deretter valgfri støtte, innledet med:
   "For å hjelpe deg å svare, kan du tenke på:"
   – etterfulgt av kulepunkter med veiledning (ikke obligatoriske underspørsmål)

Eksempelformat:
**Hva er det viktigste budskapet vi ønsker å kommunisere?**

Svar fritt – du trenger ikke dekke alt.

For å hjelpe deg å svare, kan du tenke på:
• Hva er kjerneinnholdet eller hovedideen?
• Hvilken handling ønsker vi at målgruppen skal gjøre?
• Hvorfor er dette viktig for målgruppen akkurat nå?

Skriv på norsk. Vær profesjonell, rolig og rådgivende – ikke chatbot-aktig.`;

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

    // --- Deterministic confirmedPoints capture ---
    // Determine active section from latest assistant message before this user answer
    const effectivePointsBefore = getEffectiveConfirmedPoints();
    const activeSectionForCapture = (() => {
      for (let i = dialogEntries.length - 1; i >= 0; i--) {
        const e = dialogEntries[i];
        if (e.role === 'assistant') {
          const section = detectActiveSection(e.content, effectivePointsBefore);
          return section || null;
        }
      }
      return null;
    })();

    if (activeSectionForCapture) {
      const newSummary = message.trim().substring(0, 500);
      const newPoint = {
        sectionKey: activeSectionForCapture.key,
        topic: activeSectionForCapture.label,
        summary: newSummary,
        confirmedAt: new Date().toISOString()
      };

      const currentPoints = effectivePointsBefore;
      const existingIndex = currentPoints.findIndex(p => p.sectionKey === activeSectionForCapture.key);
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

      // Immediately update pendingPointsRef for race-condition safety
      pendingPointsRef.current = updatedConfirmedPoints;
      await updateBriefMutation.mutateAsync({ confirmedPoints: updatedConfirmedPoints });
    }

    // Use effective confirmed points (includes just-captured point)
    const effectivePoints = getEffectiveConfirmedPoints();

    // Build conversation history
    const history = [...dialogEntries, { role: 'user', content: message }]
      .map(e => `${e.role === 'assistant' ? 'Rådgiver' : 'Fagekspert'}: ${e.content}`)
      .join('\n\n');

    // Get remaining sections using effective points
    const remainingSections = BRIEF_SECTIONS.filter(section => {
      return !effectivePoints.some(p => 
        p.sectionKey === section.key || 
        p.topic?.toLowerCase().includes(section.key.replace('_', ' '))
      );
    });

    const prompt = `Du er en kommunikasjonsrådgiver for GS1 Norway. Fortsett det strukturerte intervjuet.

KONTEKST:
Tema: ${brief.themeName}
Målgruppe: ${brief.rammer?.targetAudience || 'Ikke spesifisert'}
Mål: ${brief.rammer?.objectives || 'Ikke spesifisert'}

ALLEREDE BEKREFTET (${effectivePoints.length}/${BRIEF_SECTIONS.length}):
${effectivePoints.map(p => `✓ ${p.sectionKey || p.topic}: ${p.summary}`).join('\n') || 'Ingen seksjoner bekreftet ennå'}

GJENSTÅENDE SEKSJONER:
${remainingSections.map(s => `• ${s.label}: ${s.description}`).join('\n') || 'Alle seksjoner er bekreftet!'}

SAMTALEHISTORIKK:
${history}

INSTRUKSJONER:
1. Still ETT fokusert hovedspørsmål om den mest relevante ubesvarte seksjonen.
2. Be ALDRI om bekreftelse eller validering av brukerens svar. Din rolle er kun å samle informasjon.
3. Ikke oppsummer for godkjenning – bare gå videre til neste spørsmål.
4. Still maks TO oppfølgingsspørsmål per seksjon før du går videre til neste manglende seksjon.
5. Flytt alltid videre til neste manglende seksjon etter tilstrekkelig informasjon.
6. Ikke still flere hovedspørsmål i samme svar.
7. Når alle seksjoner er dekket, si at brukeren kan generere briefen.

VIKTIG – SPØRSMÅLSFORMAT (følg dette alltid når du stiller spørsmål):
1. Start med ÉN tydelig hovedspørsmål i fet skrift. Dette er det eneste brukeren MÅ svare på.
2. Legg til beroligende linje rett etter spørsmålet:
   "Svar fritt – du trenger ikke dekke alt."
3. Deretter valgfri støtte, innledet med:
   "For å hjelpe deg å svare, kan du tenke på:"
   – etterfulgt av kulepunkter med veiledning (ikke obligatoriske underspørsmål)

ALDRI stable flere likeverdige spørsmål i samme avsnitt. Hovedspørsmålet kommer alltid først.

Skriv på norsk. Vær profesjonell, rolig og rådgivende – ikke chatbot-aktig.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      
      await addEntryMutation.mutateAsync({
        role: 'assistant',
        content: response
      });
    } catch (error) {
      console.error('Failed to get AI response:', error);
    }

    // Clear pending points after query invalidation has been triggered
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

  // Derive active section from the most recent assistant message
  const derivedActiveSectionKey = (() => {
    for (let i = dialogEntries.length - 1; i >= 0; i--) {
      const e = dialogEntries[i];
      if (e.role === 'assistant') {
        const section = detectActiveSection(e.content, confirmedPoints);
        if (section) return section.key;
        // Fallback: first missing section
        const firstMissing = BRIEF_SECTIONS.find(s =>
          !confirmedPoints.some(p => p.sectionKey === s.key)
        );
        return firstMissing?.key || null;
      }
    }
    return null;
  })();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Progress sidebar */}
      <div className="lg:col-span-1 order-2 lg:order-1">
        <div className="sticky top-4">
          <InterviewProgress confirmedPoints={confirmedPoints} activeSectionKey={derivedActiveSectionKey} />
        </div>
      </div>

      {/* Main chat area */}
      <div className="lg:col-span-2 order-1 lg:order-2 space-y-4">
        {/* Chat Messages */}
        <Card className="h-[450px] overflow-hidden flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {dialogEntries.map((entry) => {
                  const activeSection = entry.role === 'assistant'
                    ? detectActiveSection(entry.content, confirmedPoints)
                    : null;
                  
                  return (
                  <div
                    key={entry.id}
                    className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${entry.role === 'user' ? 'order-2' : ''}`}>
                      <div className="flex items-center space-x-2 mb-1">
                        {entry.role === 'assistant' ? (
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <User className="h-4 w-4 text-gray-600" />
                        )}
                        <span className="text-xs text-gray-500">
                          {entry.role === 'assistant' ? 'Dynamisk brief' : (userName || 'Deg')}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg p-3 ${
                          entry.role === 'user'
                            ? 'bg-[#002C6C] text-white'
                            : 'bg-[#002C6C]/5 border border-[#002C6C]/20 text-gray-900'
                        }`}
                      >
                        {/* Section label + template placement for assistant messages */}
                        {activeSection && (
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-[#002C6C] uppercase tracking-wide">
                              {activeSection.label}
                            </div>
                            <div className="text-xs text-[#002C6C]/60 mt-0.5">
                              Plasseres i briefmal: {SECTION_TO_TEMPLATE_MAP[activeSection.key] || 'Flere seksjoner'}
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
                    <div className="bg-gray-100 rounded-lg p-3">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Input Area */}
          <div className="border-t border-[#B1B3B3] p-4">
            <div className="flex space-x-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Skriv svaret ditt her – eller bruk tale-til-tekst via PC/Mac-mikrofonen."
                className="flex-1 min-h-[120px] max-h-[240px] resize-none overflow-y-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
          <Button variant="outline" onClick={onBack} className="border-gray-300 text-gray-700 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake til rammer
          </Button>
          <div className="flex items-center gap-3">
            {!canProceed && (
              <span className="text-sm text-gray-500">
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
              className="bg-[#002C6C] hover:bg-[#001a45]"
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