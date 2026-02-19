import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Send, 
  Loader2, 
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Bot,
  User,
  HelpCircle,
  ClipboardList,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ReactMarkdown from 'react-markdown';
import InterviewProgress, { 
  BRIEF_SECTIONS, 
  areAllSectionsConfirmed,
  getConfirmedSectionsCount 
} from './InterviewProgress';
import StuckRecovery from './StuckRecovery';

// Try multiple strategies to parse a confirmation from AI response
function parseConfirmation(response) {
  if (!response) return null;

  // Strategy 1: Strict original format  **[BEKREFT: key]** Topic: Summary
  const strict = response.match(/\*\*\[BEKREFT:\s*(\w+)\]\*\*\s*([^:\n]+):\s*(.+)/s);
  if (strict) {
    const key = strict[1].trim().toLowerCase();
    if (BRIEF_SECTIONS.some(s => s.key === key)) {
      return { sectionKey: key, topic: strict[2].trim(), summary: strict[3].trim() };
    }
  }

  // Strategy 2: Relaxed — [BEKREFT: key] anywhere, with or without bold
  const relaxed = response.match(/\[BEKREFT:\s*(\w+)\]\s*\**\s*([^:\n]*?):\s*(.+)/si);
  if (relaxed) {
    const key = relaxed[1].trim().toLowerCase();
    if (BRIEF_SECTIONS.some(s => s.key === key)) {
      return { sectionKey: key, topic: relaxed[2].trim() || BRIEF_SECTIONS.find(s => s.key === key)?.label || key, summary: relaxed[3].trim() };
    }
  }

  // Strategy 3: Just [BEKREFT: key] with summary on next line or same line
  const minimal = response.match(/\[BEKREFT:\s*(\w+)\]\s*[:\-–]?\s*(.+)/si);
  if (minimal) {
    const key = minimal[1].trim().toLowerCase();
    const section = BRIEF_SECTIONS.find(s => s.key === key);
    if (section) {
      return { sectionKey: key, topic: section.label, summary: minimal[2].replace(/^\*+|\*+$/g, '').trim() };
    }
  }

  // Strategy 4: Contains BEKREFT keyword + a valid section key somewhere
  const bekreftIdx = response.toLowerCase().indexOf('bekreft');
  if (bekreftIdx !== -1) {
    for (const section of BRIEF_SECTIONS) {
      if (response.toLowerCase().includes(section.key)) {
        // Extract everything after the section key mention as summary
        const afterKey = response.substring(response.toLowerCase().indexOf(section.key) + section.key.length);
        const summaryText = afterKey.replace(/^[\s:\]\*\-–]+/, '').split('\n')[0].trim();
        if (summaryText.length > 10) {
          return { sectionKey: section.key, topic: section.label, summary: summaryText };
        }
      }
    }
  }

  return null;
}

// Check if AI message looks like it's trying to summarize/confirm (even if parsing failed)
function looksLikeConfirmation(content) {
  if (!content) return false;
  const lower = content.toLowerCase();
  return (
    lower.includes('bekreft') ||
    lower.includes('oppsummering') ||
    (lower.includes('oppsummert') && lower.includes(':')) ||
    /\[bekreft/i.test(content)
  );
}

// Determine AI message type based on content heuristics
const getMessageType = (entry) => {
  if (entry.clarifyConfirm?.isConfirmationRequest) {
    return 'summary';
  }
  const content = entry.content || '';
  if (looksLikeConfirmation(content)) {
    return 'summary';
  }
  // Check if message contains a question (ends with ? or has bold question line)
  const hasQuestion = content.includes('?') || /\*\*[^*]+\?\*\*/.test(content);
  if (hasQuestion) {
    return 'question';
  }
  return 'context';
};

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
  // Loop guard: { [sectionKey]: { count: number, confirmedAtStart: number } }
  const [sectionRepeatCounts, setSectionRepeatCounts] = useState({});
  // Local overlay of confirmed points used to immediately reflect skip/confirm in the next LLM prompt
  // without waiting for query invalidation. Cleared on each re-render from brief prop.
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

  // Merge server confirmedPoints with any pending local additions (skip/confirm that hasn't round-tripped yet)
  const getEffectiveConfirmedPoints = () => {
    const base = confirmedPoints;
    const pending = pendingPointsRef.current;
    if (pending.length === 0) return base;
    // Deduplicate by sectionKey
    const baseKeys = new Set(base.map(p => p.sectionKey));
    const merged = [...base, ...pending.filter(p => !baseKeys.has(p.sectionKey))];
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

    // Use effective confirmed points (includes pending skip/confirm)
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
1. Hvis brukerens svar gir nok informasjon til å fylle ut en seksjon, oppsummer og be om bekreftelse med dette formatet:

**[BEKREFT: seksjonsnøkkel]** Seksjonsnavn: Oppsummering

Eksempel: **[BEKREFT: hovedbudskap]** Hovedbudskap: Bedrifter bør ta i bruk GS1-standarder for å oppnå sporbarhet.

2. Hvis svaret ikke er tilstrekkelig, still et oppfølgingsspørsmål.
3. Fokuser på én seksjon om gangen.
4. Når alle seksjoner er bekreftet, gratulerer brukeren og si at de kan generere briefen.

VIKTIG – SPØRSMÅLSFORMAT (følg dette alltid når du stiller spørsmål):
1. Start med ÉN tydelig hovedspørsmål i fet skrift. Dette er det eneste brukeren MÅ svare på.
2. Legg til beroligende linje rett etter spørsmålet:
   "Svar fritt – du trenger ikke dekke alt."
3. Deretter valgfri støtte, innledet med:
   "For å hjelpe deg å svare, kan du tenke på:"
   – etterfulgt av kulepunkter med veiledning (ikke obligatoriske underspørsmål)

ALDRI stable flere likeverdige spørsmål i samme avsnitt. Hovedspørsmålet kommer alltid først.

Gyldige seksjonsnøkler: ${BRIEF_SECTIONS.map(s => s.key).join(', ')}

Skriv på norsk. Vær profesjonell, rolig og rådgivende – ikke chatbot-aktig.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      
      // Use multi-strategy parser
      const parsed = parseConfirmation(response);
      
      const entryData = {
        role: 'assistant',
        content: response
      };

      if (parsed) {
        entryData.clarifyConfirm = {
          isConfirmationRequest: true,
          sectionKey: parsed.sectionKey,
          topic: parsed.topic,
          summary: parsed.summary,
          status: 'pending'
        };
        // Reset loop count for this section since we got a valid confirmation
        setSectionRepeatCounts(prev => {
          const next = { ...prev };
          delete next[parsed.sectionKey];
          return next;
        });
      } else {
        // Only track repeat counts for QUESTION-type messages (not summaries or context)
        const responseType = getMessageType({ content: response });
        if (responseType === 'question') {
          const detectedSection = detectActiveSection(response, effectivePoints);
          if (detectedSection) {
            setSectionRepeatCounts(prev => {
              const existing = prev[detectedSection.key];
              const currentConfirmedCount = effectivePoints.length;
              if (existing) {
                // If confirmedPoints grew since we started counting, reset — it's a new topic cycle
                if (currentConfirmedCount > existing.confirmedAtStart) {
                  return { ...prev, [detectedSection.key]: { count: 1, confirmedAtStart: currentConfirmedCount } };
                }
                return { ...prev, [detectedSection.key]: { count: existing.count + 1, confirmedAtStart: existing.confirmedAtStart } };
              }
              return { ...prev, [detectedSection.key]: { count: 1, confirmedAtStart: currentConfirmedCount } };
            });
          }
        }
      }

      await addEntryMutation.mutateAsync(entryData);
    } catch (error) {
      console.error('Failed to get AI response:', error);
    }

    // Clear pending points — by now the query invalidation from the mutation should have fresh data
    pendingPointsRef.current = [];
    setIsProcessing(false);
  };

  // Manual confirm: used when parsing failed but user agrees the content is a valid summary
  const handleManualConfirm = async (entry, sectionKey) => {
    const section = BRIEF_SECTIONS.find(s => s.key === sectionKey);
    if (!section) return;

    // Extract a summary from the message content (strip markdown formatting cruft)
    const rawSummary = (entry?.content || '')
      .replace(/\*\*\[BEKREFT[^\]]*\]\*\*/gi, '')
      .replace(/^\s*[\*\-–]+\s*/gm, '')
      .trim();
    const summary = rawSummary.substring(0, 500) || section.label;

    const newPoint = {
      sectionKey: section.key,
      topic: section.label,
      summary,
      confirmedAt: new Date().toISOString()
    };

    await updateBriefMutation.mutateAsync({
      confirmedPoints: [...confirmedPoints, newPoint]
    });

    // Also update the dialog entry so it shows as confirmed
    if (entry?.id) {
      await base44.entities.DialogEntry.update(entry.id, {
        clarifyConfirm: {
          isConfirmationRequest: true,
          sectionKey: section.key,
          topic: section.label,
          summary,
          status: 'confirmed'
        }
      });
    }

    setSectionRepeatCounts(prev => ({ ...prev, [sectionKey]: 0 }));
    queryClient.invalidateQueries({ queryKey: ['dialogEntries', brief.id] });
  };

  // Skip a section: marks it with a placeholder so interview advances
  const handleSkipSection = async (sectionKey) => {
    const section = BRIEF_SECTIONS.find(s => s.key === sectionKey);
    if (!section) return;

    const newPoint = {
      sectionKey: section.key,
      topic: section.label,
      summary: '(Hoppet over av bruker)',
      confirmedAt: new Date().toISOString()
    };

    await updateBriefMutation.mutateAsync({
      confirmedPoints: [...confirmedPoints, newPoint]
    });

    setSectionRepeatCounts(prev => ({ ...prev, [sectionKey]: 0 }));
    queryClient.invalidateQueries({ queryKey: ['dialogEntries', brief.id] });

    // Prompt AI to move on
    await sendMessage('Jeg hopper over denne seksjonen. Gå videre til neste.', 'text');
  };

  const handleConfirm = async (entry, confirmed) => {
    if (!entry.clarifyConfirm) return;

    // Update the dialog entry
    await base44.entities.DialogEntry.update(entry.id, {
      clarifyConfirm: {
        ...entry.clarifyConfirm,
        status: confirmed ? 'confirmed' : 'rejected'
      }
    });

    if (confirmed) {
      // Add to brief's confirmed points with section key
      const newPoint = {
        sectionKey: entry.clarifyConfirm.sectionKey,
        topic: entry.clarifyConfirm.topic,
        summary: entry.clarifyConfirm.summary,
        confirmedAt: new Date().toISOString()
      };

      await updateBriefMutation.mutateAsync({
        confirmedPoints: [...confirmedPoints, newPoint]
      });

      // No extra chat message - confirmation is shown in-place on the summary card
      queryClient.invalidateQueries({ queryKey: ['dialogEntries', brief.id] });
    } else {
      await sendMessage(`Jeg vil korrigere: ${entry.clarifyConfirm.topic}`, 'text');
      queryClient.invalidateQueries({ queryKey: ['dialogEntries', brief.id] });
    }
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Progress sidebar */}
      <div className="lg:col-span-1 order-2 lg:order-1">
        <div className="sticky top-4">
          <InterviewProgress confirmedPoints={confirmedPoints} />
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
                  const messageType = entry.role === 'assistant' ? getMessageType(entry) : null;
                  const activeSection = (entry.role === 'assistant' && messageType === 'question') 
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
                          messageType === 'summary' ? (
                            <ClipboardList className="h-4 w-4 text-amber-600" />
                          ) : messageType === 'question' ? (
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Bot className="h-4 w-4 text-gray-500" />
                          )
                        ) : (
                          <User className="h-4 w-4 text-gray-600" />
                        )}
                        <span className="text-xs text-gray-500">
                          {entry.role === 'assistant' 
                            ? (messageType === 'summary' ? 'Bekreft oppsummering' : 'Dynamisk brief')
                            : (userName || 'Deg')}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg p-3 ${
                          entry.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : messageType === 'summary'
                              ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-dashed border-amber-300 dark:border-amber-700 text-gray-900 dark:text-gray-100'
                              : messageType === 'question'
                                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-gray-900 dark:text-gray-100'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {/* Section label + template placement for question messages */}
                        {activeSection && messageType === 'question' && (
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                              {activeSection.label}
                            </div>
                            <div className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">
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

                      {/* Confirm/Reject buttons or confirmed state */}
                      {entry.clarifyConfirm?.isConfirmationRequest && (
                        entry.clarifyConfirm?.status === 'pending' ? (
                          <div className="flex items-center space-x-2 mt-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/30"
                                    onClick={() => handleConfirm(entry, true)}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Bekreft
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-sm">Dette blir låst og brukt i briefen</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                              onClick={() => {
                                setInput(entry.clarifyConfirm.summary);
                                textareaRef.current?.focus();
                                handleConfirm(entry, false);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Korriger
                            </Button>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="text-gray-400 hover:text-gray-600">
                                    <HelpCircle className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="text-sm">
                                    <strong>Hva skjer når jeg bekrefter?</strong><br/>
                                    Punktet blir låst og brukes direkte i den ferdige briefen. 
                                    Velg "Korriger" hvis du vil endre noe.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        ) : entry.clarifyConfirm?.status === 'confirmed' ? (
                          <div className="flex items-center space-x-2 mt-2 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-medium">Bekreftet</span>
                          </div>
                        ) : null
                      )}

                      {/* Manual confirm fallback: message looks like confirmation but parsing failed */}
                      {entry.role === 'assistant' && !entry.clarifyConfirm && looksLikeConfirmation(entry.content) && (() => {
                        const fallbackSection = detectActiveSection(entry.content, confirmedPoints);
                        return fallbackSection && !confirmedPoints.some(p => p.sectionKey === fallbackSection.key);
                      })() && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                          <span className="text-xs text-amber-700 dark:text-amber-300">Bekreftelse ikke gjenkjent automatisk.</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 text-xs ml-auto h-7"
                            onClick={() => {
                              const section = detectActiveSection(entry.content, confirmedPoints);
                              if (section) handleManualConfirm(entry, section.key);
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Bekreft manuelt
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
                
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Loop guard: stuck recovery UI */}
          {(() => {
            const stuckKey = Object.entries(sectionRepeatCounts).find(([key, count]) => 
              count >= 3 && !confirmedPoints.some(p => p.sectionKey === key)
            );
            if (!stuckKey) return null;
            const [sectionKey] = stuckKey;
            const section = BRIEF_SECTIONS.find(s => s.key === sectionKey);
            if (!section) return null;
            // Find the last assistant message for manual confirm
            const lastAssistant = [...dialogEntries].reverse().find(e => e.role === 'assistant');
            return (
              <StuckRecovery
                sectionLabel={section.label}
                onManualConfirm={() => handleManualConfirm(lastAssistant, sectionKey)}
                onSkip={() => handleSkipSection(sectionKey)}
              />
            );
          })()}

          {/* Input Area */}
          <div className="border-t dark:border-gray-700 p-4">
            <div className="flex space-x-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Skriv svaret ditt her – eller bruk tale-til-tekst via PC/Mac-mikrofonen."
                className="flex-1 min-h-[120px] max-h-[240px] resize-none overflow-y-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
          <Button variant="outline" onClick={onBack} className="border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake til rammer
          </Button>
          <div className="flex items-center gap-3">
            {!canProceed && (
              <span className="text-sm text-gray-500">
                {confirmedCount}/{BRIEF_SECTIONS.length} seksjoner bekreftet
              </span>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={onContinue}
                      disabled={!canProceed}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Generer brief
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canProceed && (
                  <TooltipContent>
                    <p className="text-sm">Bekreft alle {BRIEF_SECTIONS.length} seksjoner for å fortsette</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}