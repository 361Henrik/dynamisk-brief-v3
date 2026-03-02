import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Sparkles, FileText, MessageSquare, Pencil, Rocket } from 'lucide-react';

const SLIDES = [
  {
    title: 'Velkommen til Dynamisk Brief – Versjon 1',
    bullets: [
      { icon: FileText,      text: 'Generer raskt et førsteutkast basert på kildemateriale og dine svar' },
      { icon: MessageSquare, text: 'Strukturert intervju som guider deg gjennom briefprosessen' },
      { icon: Pencil,        text: 'Rediger og finjuster i steg 4 før godkjenning' },
      { icon: FileText,      text: 'Kildemateriale i V1: kun PDF eller lim inn tekst (ikke Word/DOCX)' },
    ],
    future: 'I fremtidige versjoner kommer mer avansert tilpasning og team-samarbeid.',
    proTip: 'Jo bedre kildemateriale, jo mer presis blir AI-ens assistanse!'
  }
];

const STORAGE_KEY = 'briefTourSeen';

export function useOnboarding() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== 'true') {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  const replay = () => setOpen(true);

  return { open, dismiss, replay };
}

export default function OnboardingModal({ open, onDismiss }) {
  const [slide, setSlide] = useState(0);
  const current = SLIDES[slide];
  const isLast = slide === SLIDES.length - 1;

  const handleDismiss = () => {
    setSlide(0);
    onDismiss();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="bg-[#002C6C] px-8 pt-8 pb-6 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-[#F26334]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#F26334]">Versjon 1</span>
          </div>
          <h2 className="text-xl font-bold leading-snug">{current.title}</h2>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-4">
          <ul className="space-y-3">
            {current.bullets.map((b, i) => {
              const Icon = b.icon;
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-[#002C6C]/10 flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-[#002C6C]" />
                  </span>
                  <span className="text-sm text-[#454545] leading-snug">{b.text}</span>
                </li>
              );
            })}
          </ul>

          {current.future && (
            <div className="flex items-start gap-2 pt-1 border-t border-gray-100">
              <Rocket className="h-4 w-4 text-[#F26334] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#888B8D]">{current.future}</p>
            </div>
          )}

          {current.proTip && (
            <p className="text-xs italic text-[#888B8D] text-right">💡 {current.proTip}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-[#888B8D]">
            Hopp over
          </Button>
          <div className="flex items-center gap-2">
            {SLIDES.length > 1 && slide > 0 && (
              <Button variant="outline" size="sm" onClick={() => setSlide(s => s - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {/* Dots */}
            {SLIDES.length > 1 && (
              <div className="flex gap-1.5">
                {SLIDES.map((_, i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === slide ? 'bg-[#002C6C]' : 'bg-gray-300'}`} />
                ))}
              </div>
            )}
            {isLast ? (
              <Button size="sm" onClick={handleDismiss} className="bg-[#002C6C] hover:bg-[#001a45] text-white">
                Start
              </Button>
            ) : (
              <Button size="sm" onClick={() => setSlide(s => s + 1)} className="bg-[#002C6C] hover:bg-[#001a45] text-white">
                Neste <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}