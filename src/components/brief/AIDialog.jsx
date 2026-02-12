import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatRelativeTime } from '@/utils/dateFormatters';
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
  ChevronDown,
  ChevronUp,
  FileText,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { ClipboardList, MessageCircleQuestion } from 'lucide-react';

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-lg p-3 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-muted-foreground/60 typing-dot" />
        <div className="w-2 h-2 rounded-full bg-muted-foreground/60 typing-dot" />
        <div className="w-2 h-2 rounded-full bg-muted-foreground/60 typing-dot" />
      </div>
    </div>
  );
}

// Quick reply chips
const QUICK_REPLIES = [
  { label: 'Ja, det stemmer', value: 'Ja, det stemmer.' },
  { label: 'Kan du utdype?', value: 'Kan du utdype dette litt mer?' },
  { label: 'Hopp over denne', value: 'Hopp over denne seksjonen for nå, gå videre til neste.' },
];

// Determine AI message type based on content heuristics
const getMessageType = (entry) => {
  if (entry.clarifyConfirm?.isConfirmationRequest) {
    return 'summary';
  }
  const content = entry.content || '';
  const hasQuestion = content.includes('?') || /\*\*[^*]+\?\*\*/.test(content);
  if (hasQuestion) {
    return 'question';
  }
  return 'context';
};

// Static mapping: interview section -> brief template sections (UI display only)
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
  
  const sectionKeywords = {
    hovedbudskap: ['hovedbudskap', 'kjernebudskap', 'viktigste budskap', 'kommunisere'],
    malgruppe_innsikt: ['målgruppe', 'målgruppeinnsikt', 'hvem er', 'kjenner du', 'deres behov'],
    nokkelpunkter: ['nøkkelpunkt', 'konkrete punkt', 'viktige punkt', 'detaljer'],
    eksempler: ['eksempel', 'case', 'illustrer', 'konkret historie', 'erfaring'],
    call_to_action: ['call to action', 'handling', 'ønsker du at', 'neste steg', 'gjøre etterpå']
  };
  
  for (const section of BRIEF_SECTIONS) {
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
  const [showContext, setShowContext] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

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
  }, [dialogEntries, isProcessing]);

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

    if (brief.themeName) known.push(`Tema: ${brief.themeName}`);
    if (brief.rammer?.targetAudience) known.push(`Målgruppe: ${brief.rammer.targetAudience}`);
    if (brief.rammer?.objectives) known.push(`Mål: ${brief.rammer.objectives}`);
    if (brief.rammer?.channels?.length) known.push(`Kanaler: ${brief.rammer.channels.join(', ')}`);
    if (brief.rammer?.tone) known.push(`Tone: ${brief.rammer.tone}`);
    if (sources.length > 0) known.push(`${sources.length} kildemateriale(r) lastet opp`);

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

  const sendMessage = async (message, inputMethod = 'text') => {
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);
    setInput('');

    await addEntryMutation.mutateAsync({
      role: 'user',
      content: message,
      inputMethod
    });

    const history = [...dialogEntries, { role: 'user', content: message }]
      .map(e => `${e.role === 'assistant' ? 'Rådgiver' : 'Fagekspert'}: ${e.content}`)
      .join('\n\n');

    const remainingSections = BRIEF_SECTIONS.filter(section => {
      return !confirmedPoints.some(p => 
        p.sectionKey === section.key || 
        p.topic?.toLowerCase().includes(section.key.replace('_', ' '))
      );
    });

    const prompt = `Du er en kommunikasjonsrådgiver for GS1 Norway. Fortsett det strukturerte intervjuet.

KONTEKST:
Tema: ${brief.themeName}
Målgruppe: ${brief.rammer?.targetAudience || 'Ikke spesifisert'}
Mål: ${brief.rammer?.objectives || 'Ikke spesifisert'}

ALLEREDE BEKREFTET (${confirmedPoints.length}/${BRIEF_SECTIONS.length}):
${confirmedPoints.map(p => `✓ ${p.sectionKey || p.topic}: ${p.summary}`).join('\n') || 'Ingen seksjoner bekreftet ennå'}

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
      
      const confirmMatch = response.match(/\*\*\[BEKREFT:\s*(\w+)\]\*\*\s*([^:]+):\s*(.+)/s);
      
      const entryData = {
        role: 'assistant',
        content: response
      };

      if (confirmMatch) {
        entryData.clarifyConfirm = {
          isConfirmationRequest: true,
          sectionKey: confirmMatch[1].trim(),
          topic: confirmMatch[2].trim(),
          summary: confirmMatch[3].trim(),
          status: 'pending'
        };
      }

      await addEntryMutation.mutateAsync(entryData);
    } catch (error) {
      console.error('Failed to get AI response:', error);
    }

    setIsProcessing(false);
  };

  const handleConfirm = async (entry, confirmed) => {
    if (!entry.clarifyConfirm) return;

    await base44.entities.DialogEntry.update(entry.id, {
      clarifyConfirm: {
        ...entry.clarifyConfirm,
        status: confirmed ? 'confirmed' : 'rejected'
      }
    });

    if (confirmed) {
      const newPoint = {
        sectionKey: entry.clarifyConfirm.sectionKey,
        topic: entry.clarifyConfirm.topic,
        summary: entry.clarifyConfirm.summary,
        confirmedAt: new Date().toISOString()
      };

      await updateBriefMutation.mutateAsync({
        confirmedPoints: [...confirmedPoints, newPoint]
      });

      queryClient.invalidateQueries({ queryKey: ['dialogEntries', brief.id] });
    } else {
      await sendMessage(`Jeg vil korrigere: ${entry.clarifyConfirm.topic}`, 'text');
      queryClient.invalidateQueries({ queryKey: ['dialogEntries', brief.id] });
    }
  };

  const handleKeyDown = (e) => {
    // Enter or Ctrl+Enter to send
    if (e.key === 'Enter' && (e.ctrlKey || !e.shiftKey)) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const autoResizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const minHeight = 56;
      const maxHeight = 160;
      textarea.style.height = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight)) + 'px';
    }
  }, []);

  useEffect(() => {
    autoResizeTextarea();
  }, [input, autoResizeTextarea]);

  const canProceed = areAllSectionsConfirmed(confirmedPoints);
  const confirmedCount = getConfirmedSectionsCount(confirmedPoints);
  const { known } = buildContextSummary();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Progress sidebar */}
      <div className="lg:col-span-1 order-2 lg:order-1">
        <div className="sticky top-20">
          <InterviewProgress confirmedPoints={confirmedPoints} />
        </div>
      </div>

      {/* Main chat area */}
      <div className="lg:col-span-2 order-1 lg:order-2 flex flex-col gap-4">

        {/* Collapsible Context Panel */}
        <button
          type="button"
          onClick={() => setShowContext(!showContext)}
          className="flex items-center justify-between w-full text-left px-4 py-2.5 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            Kontekst
            <Badge variant="secondary" className="text-xs">{known.length} elementer</Badge>
          </div>
          {showContext ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showContext && (
          <div className="bg-muted/30 border border-border rounded-lg p-4 -mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {known.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
              {sources.length > 0 && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{sources.length} kilde(r): {sources.map(s => s.fileName || s.fileUrl).join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state card */}
        {!isLoading && dialogEntries.length === 0 && !isProcessing && (
          <Card className="border-dashed bg-blue-50/50 dark:bg-blue-900/10">
            <CardContent className="p-6 text-center">
              <Bot className="h-10 w-10 mx-auto mb-3 text-blue-500" />
              <h3 className="font-semibold text-foreground mb-1">AI-radgiver</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                AI-rådgiveren vil stille deg spørsmål for å fylle ut briefen. Svar så godt du kan -- du kan alltid korrigere etterpå.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Chat Messages */}
        <Card className="min-h-[300px] max-h-[calc(100vh-400px)] overflow-hidden flex flex-col">
          <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
                    className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                  >
                    <div className={`max-w-[85%] ${entry.role === 'user' ? 'order-2' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {entry.role === 'assistant' ? (
                          messageType === 'summary' ? (
                            <ClipboardList className="h-4 w-4 text-amber-600" />
                          ) : messageType === 'question' ? (
                            <MessageCircleQuestion className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Bot className="h-4 w-4 text-muted-foreground" />
                          )
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {entry.role === 'assistant' 
                            ? (messageType === 'summary' ? 'Bekreft oppsummering' : 'Dynamisk brief')
                            : (userName || 'Deg')}
                        </span>
                        {entry.created_date && (
                          <span className="text-xs text-muted-foreground/60">
                            {formatRelativeTime(entry.created_date)}
                          </span>
                        )}
                      </div>
                      <div
                        className={`rounded-lg p-3 ${
                          entry.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : messageType === 'summary'
                              ? 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-600 text-foreground'
                              : messageType === 'question'
                                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-foreground'
                                : 'bg-muted text-foreground'
                        }`}
                      >
                        {/* Section label for summary messages */}
                        {messageType === 'summary' && entry.clarifyConfirm?.topic && (
                          <div className="mb-2">
                            <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700">
                              {entry.clarifyConfirm.topic}
                            </Badge>
                          </div>
                        )}
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
                          <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-li:my-1 prose-ul:my-2 prose-ol:my-2 prose-headings:my-3 prose-hr:my-4 leading-relaxed">
                            {entry.content.replace(/^(Rådgiver|Dynamisk brief):\s*/i, '')}
                          </ReactMarkdown>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                        )}
                      </div>

                      {/* Confirm/Reject buttons or confirmed state */}
                      {entry.clarifyConfirm?.isConfirmationRequest && (
                        entry.clarifyConfirm?.status === 'pending' ? (
                          <div className="flex items-center gap-2 mt-2">
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
                                  <p className="text-sm">Dette blir last og brukt i briefen</p>
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
                                  <button className="text-muted-foreground hover:text-foreground">
                                    <HelpCircle className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="text-sm">
                                    <strong>Hva skjer når jeg bekrefter?</strong><br/>
                                    Punktet blir last og brukes direkte i den ferdige briefen. 
                                    Velg "Korriger" hvis du vil endre noe.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        ) : entry.clarifyConfirm?.status === 'confirmed' ? (
                          <div className="flex items-center gap-2 mt-2 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-medium">Bekreftet</span>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                  );
                })}
                
                {isProcessing && <TypingIndicator />}
                
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Input Area */}
          <div className="border-t border-border p-4 space-y-3">
            {/* Quick reply chips */}
            {dialogEntries.length > 0 && !isProcessing && (
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply.label}
                    type="button"
                    onClick={() => sendMessage(reply.value)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {reply.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Skriv svaret ditt her..."
                  className="w-full min-h-[56px] max-h-[160px] resize-none overflow-y-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isProcessing}
                />
                {input.length > 0 && (
                  <span className="absolute bottom-1.5 right-2 text-[10px] text-muted-foreground/60">
                    {input.length}
                  </span>
                )}
              </div>
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isProcessing}
                className="self-end"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Send</span>
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/60 text-center">
              Trykk Enter for å sende, Shift+Enter for ny linje
            </p>
          </div>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tilbake til rammer
          </Button>
          <div className="flex items-center gap-3">
            {!canProceed && (
              <span className="text-sm text-muted-foreground">
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
