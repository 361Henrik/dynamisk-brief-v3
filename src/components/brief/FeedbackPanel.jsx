import React, { useState } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function FeedbackPanel({ onSubmit, isProcessing, isAdmin = false }) {
  const [feedback, setFeedback] = useState('');
  const [constraints, setConstraints] = useState('');

  const handleSubmit = () => {
    if (!feedback.trim()) return;
    onSubmit({ feedback: feedback.trim(), constraints: constraints.trim() });
    setFeedback('');
    setConstraints('');
  };

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          Gi tilbakemelding
        </CardTitle>
        <CardDescription>
          Beskriv hva som skal endres – kun de relevante delene oppdateres.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
            Hva skal endres?
          </label>
          <Textarea
            placeholder="F.eks. «Gjør hovedbudskapet kortere» eller «Legg til mer om sporbarhet i bakgrunnen»"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            className="resize-none"
            disabled={isProcessing}
          />
        </div>

        {isAdmin && (
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Må inkluderes (kun admin)
            </label>
            <Textarea
              placeholder="Punkter som MÅ være med i briefen..."
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              rows={2}
              className="resize-none bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
              disabled={isProcessing}
            />
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Disse kravene vil tvinge AI-en til å inkludere spesifikke punkter.
            </p>
          </div>
        )}

        <Button 
          onClick={handleSubmit} 
          disabled={!feedback.trim() || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Oppdaterer...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send tilbakemelding
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}