import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Send, 
  Mic, 
  MicOff,
  Loader2, 
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Bot,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

export default function AIDialog({ brief, sources = [], onBack, onContinue }) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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

  const startConversation = async () => {
    setIsProcessing(true);
    
    const sourceContext = sources.map(s => 
      s.extractedText || `[${s.sourceType}: ${s.fileName || s.fileUrl}]`
    ).join('\n\n');

    const prompt = `Du er en kommunikasjonsrådgiver for GS1 Norway som hjelper fageksperter med å lage kommunikasjonsbriefs.

TEMA: ${brief.themeName}
MÅLGRUPPE: ${brief.rammer?.targetAudience || 'Ikke spesifisert'}
MÅL: ${brief.rammer?.objectives || 'Ikke spesifisert'}
KANALER: ${brief.rammer?.channels?.join(', ') || 'Ikke spesifisert'}
TONE: ${brief.rammer?.tone || 'Ikke spesifisert'}
LEVERANSER: ${brief.rammer?.deliverables?.join(', ') || 'Ikke spesifisert'}

KILDEMATERIALE:
${sourceContext || 'Ingen kilder lastet opp'}

Start en dialog med fageksperten for å forstå kommunikasjonsbehovet bedre. Still ett spørsmål om gangen for å klargjøre:
1. Hovedbudskapet de vil formidle
2. Viktige detaljer eller eksempler
3. Hva som gjør dette relevant for målgruppen

Skriv på norsk. Vær vennlig og profesjonell. Start med en kort introduksjon og ditt første spørsmål.`;

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

    const prompt = `Du er en kommunikasjonsrådgiver for GS1 Norway. Fortsett dialogen basert på samtalehistorikken.

KONTEKST:
Tema: ${brief.themeName}
Målgruppe: ${brief.rammer?.targetAudience || 'Ikke spesifisert'}
Mål: ${brief.rammer?.objectives || 'Ikke spesifisert'}

ALLEREDE BEKREFTET:
${confirmedPoints.map(p => `- ${p.topic}: ${p.summary}`).join('\n') || 'Ingen punkter bekreftet ennå'}

SAMTALEHISTORIKK:
${history}

Fortsett dialogen. Hvis du har fått nok informasjon om et tema, oppsummer det og be om bekreftelse med formatet:

**[BEKREFT]** [Tema]: [Oppsummering av det du har forstått]

Brukeren kan da bekrefte eller korrigere. Når nok informasjon er samlet (3-5 bekreftede punkter), foreslå å gå videre til å generere briefen.

Skriv på norsk. Vær kortfattet men grundig.`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      
      // Check if this is a confirmation request
      const confirmMatch = response.match(/\*\*\[BEKREFT\]\*\*\s*([^:]+):\s*(.+)/s);
      
      const entryData = {
        role: 'assistant',
        content: response
      };

      if (confirmMatch) {
        entryData.clarifyConfirm = {
          isConfirmationRequest: true,
          topic: confirmMatch[1].trim(),
          summary: confirmMatch[2].trim(),
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
      // Add to brief's confirmed points
      const newPoint = {
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        setIsProcessing(true);
        
        try {
          // Upload audio file
          const { file_url } = await base44.integrations.Core.UploadFile({ 
            file: new File([audioBlob], 'voice.webm', { type: 'audio/webm' })
          });

          // Transcribe using LLM
          const transcription = await base44.integrations.Core.InvokeLLM({
            prompt: 'Transkriber denne lydfilen til tekst på norsk. Returner kun transkripsjonen, ingen annen tekst.',
            file_urls: [file_url]
          });

          if (transcription && transcription.trim()) {
            await sendMessage(transcription.trim(), 'voice');
          }
        } catch (error) {
          console.error('Transcription failed:', error);
        }
        
        setIsProcessing(false);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const canProceed = confirmedPoints.length >= 2;

  return (
    <div className="space-y-4">
      {/* Confirmed Points Summary */}
      {confirmedPoints.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-3">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Bekreftede punkter ({confirmedPoints.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {confirmedPoints.map((point, idx) => (
                <Badge key={idx} variant="secondary" className="bg-green-100 text-green-800">
                  {point.topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Messages */}
      <Card className="h-[400px] overflow-hidden flex flex-col">
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
                  <div className={`max-w-[80%] ${entry.role === 'user' ? 'order-2' : ''}`}>
                    <div className="flex items-center space-x-2 mb-1">
                      {entry.role === 'assistant' ? (
                        <Bot className="h-4 w-4 text-blue-600" />
                      ) : (
                        <User className="h-4 w-4 text-gray-600" />
                      )}
                      <span className="text-xs text-gray-500">
                        {entry.role === 'assistant' ? 'Rådgiver' : 'Deg'}
                        {entry.inputMethod === 'voice' && ' (tale)'}
                      </span>
                    </div>
                    <div
                      className={`rounded-lg p-3 ${
                        entry.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {entry.role === 'assistant' ? (
                        <ReactMarkdown className="prose prose-sm max-w-none prose-p:my-1">
                          {entry.content}
                        </ReactMarkdown>
                      ) : (
                        <p className="text-sm">{entry.content}</p>
                      )}
                    </div>

                    {/* Confirm/Reject buttons */}
                    {entry.clarifyConfirm?.isConfirmationRequest && 
                     entry.clarifyConfirm?.status === 'pending' && (
                      <div className="flex space-x-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-300 hover:bg-green-50"
                          onClick={() => handleConfirm(entry, true)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Bekreft
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => handleConfirm(entry, false)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Korriger
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
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
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv din melding..."
              className="min-h-[44px] max-h-32 resize-none"
              disabled={isProcessing || isRecording}
            />
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isProcessing}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {isRecording && (
            <p className="text-xs text-red-600 mt-2 flex items-center">
              <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-2" />
              Tar opp... Klikk mikrofon for å stoppe
            </p>
          )}
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbake til rammer
        </Button>
        <Button
          onClick={onContinue}
          disabled={!canProceed}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Generer brief
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {!canProceed && (
        <p className="text-center text-sm text-gray-500">
          Bekreft minst 2 punkter i dialogen for å fortsette
        </p>
      )}
    </div>
  );
}