import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

const VERSION_KEY = 'whatsNewDismissed_v1.2.0';

export default function WhatsNewCard() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(VERSION_KEY) === 'true'
  );

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(VERSION_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="border border-[#002C6C]/20 bg-[#002C6C]/5 rounded-lg p-4 mb-6 flex items-start gap-3">
      <Sparkles className="h-4 w-4 text-[#002C6C] mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#002C6C] mb-1">Nyheter i Dynamisk Brief – v1.2.0</p>
        <p className="text-sm text-[#454545]">
          Denne versjonen inneholder forbedringer i språk og brukeropplevelse. «Guidet modus» heter nå «Detaljert modus», og vi har fjernet anbefalinger slik at du selv velger den arbeidsflyten som passer best.
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="text-[#888B8D] hover:text-[#454545] transition-colors flex-shrink-0 mt-0.5"
        aria-label="Lukk"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}