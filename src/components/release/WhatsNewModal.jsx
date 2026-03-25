import React from 'react';
import { Sparkles, X } from 'lucide-react';

const VERSION_KEY = 'whatsNewDismissed_v1.2.0';

export function hasSeenCurrentVersion() {
  return localStorage.getItem(VERSION_KEY) === 'true';
}

export function markVersionAsSeen() {
  localStorage.setItem(VERSION_KEY, 'true');
}

export default function WhatsNewModal({ open, onClose }) {
  if (!open) return null;

  const handleClose = () => {
    markVersionAsSeen();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-[#888B8D] hover:text-[#454545] transition-colors"
          aria-label="Lukk"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-[#002C6C]" />
          <h2 className="text-base font-semibold text-[#002C6C]">Endringer og forbedringer siden siste versjon</h2>
        </div>

        {/* Content */}
        <p className="text-sm text-[#454545]">
          Denne versjonen gjør Dynamisk Brief enklere å bruke og lettere å forstå. Hurtigmodus er nå tilgjengelig for deg som vil komme raskere i gang. Vi har også gjort arbeidsflyten tydeligere og forbedret innsynet i kildemateriale og input, slik at det er enklere å forstå hva innholdet bygger på og hva som kan justeres.
        </p>

        {/* Dismiss button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-[#002C6C] text-white text-sm font-medium rounded-lg hover:bg-[#002C6C]/80 transition-colors"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
}