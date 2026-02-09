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
  HelpCircle
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

export default function AIDialog({ brief, sources = [], onBack, onContinue }) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
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

Skriv på norsk. Vær profesjonell og tydelig. Husk at målet er å samle inn nok informasjon til å fylle ut alle seksjonene i briefen.`;

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

    // Add user message
    await addEntryMutation.mutateAsync({
      role: 'user',
      content: message,
      inputMethod
    });

    // Build conversation history
    const history = [...dialogEntries, { role: 'user', content: message }]
      .map(e => `${e.role === 'assistant' ? 'Rådgiver' : 'Fagekspert'}: ${e.content}`)
      .join('\n\n');

    // Get remaining sections
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

Gyldige seksjonsnøkler: ${BRIEF_SECTIONS.map(s => s.key).join(', ')}

Skriv på norsk. Vær kortfattet og fokusert.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      
      // Check if this is a confirmation request with section key
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

      // Send confirmation message
      await sendMessage(`Bekreftet: ${entry.clarifyConfirm.topic}`, 'text');
    } else {
      await sendMessage(`Jeg vil korrigere: ${entry.clarifyConfirm.topic}`, 'text');
    }

    queryClient.invalidateQueries({ queryKey: ['dialogEntries', brief.id] });
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
      textarea.style.height = Math.min(textarea.scrollHeight, 192) + 'px'; // max ~8 lines (192px)
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
                {dialogEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${entry.role === 'user' ? 'order-2' : ''}`}>
                      <div className="flex items-center space-x-2 mb-1">
                        {entry.role === 'assistant' ? (
                          <Bot className="h-4 w-4 text-blue-600" />
                        ) : (
                          <User className="h-4 w-4 text-gray-600" />
                        )}
                        <span className="text-xs text-gray-500">
                          {entry.role === 'assistant' ? 'Rådgiver' : 'Deg'}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg p-3 ${
                          entry.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {entry.role === 'assistant' ? (
                          <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0">
                            {entry.content}
                          </ReactMarkdown>
                        ) : (
                          <p className="text-sm">{entry.content}</p>
                        )}
                      </div>

                      {/* Confirm/Reject buttons */}
                      {entry.clarifyConfirm?.isConfirmationRequest && 
                       entry.clarifyConfirm?.status === 'pending' && (
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
                            onClick={() => handleConfirm(entry, false)}
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
                      )}
                    </div>
                  </div>
                ))}
                
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

          {/* Input Area */}
          <div className="border-t dark:border-gray-700 p-4">
            <div className="flex space-x-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Skriv svaret ditt her – eller bruk tale-til-tekst via PC/Mac-mikrofonen."
                className="flex-1 min-h-[120px] max-h-[240px] resize-none overflow-y-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
          <Button variant="outline" onClick={onBack}>
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