import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Sparkles, FileText, MessageSquare, Pencil, Rocket, Target, Zap, Download, BookOpen } from 'lucide-react';

const SLIDES = [
  {
    title: 'Slik bruker du GS1 Norway Dynamisk Brief',
    bullets: [
      { icon: Sparkles,      text: 'En rask og strukturert flyt fra kildemateriale til ferdig kommunikasjonsbrief' },
      { icon: Zap,           text: 'Velg mellom Hurtigmodus (anbefalt) eller Guidet modus ved oppstart' },
      { icon: FileText,      text: 'Fem steg: Kildemateriale → Rammer → Intervju → Foreslått brief → Ferdig brief' },
    ],
    proTip: 'Usikker? Velg Hurtigmodus – du kan alltid redigere alt etterpå.'
  },
  {
    title: '⚡ Hurtigmodus (Anbefalt)',
    bullets: [
      { icon: Zap,           text: 'Fyll inn det du allerede vet i et enkelt skjema – del for del' },
      { icon: Zap,           text: 'AI stiller bare spørsmål om seksjonene du ikke har fylt ut' },
      { icon: Rocket,        text: 'Raskere prosess: færre spørsmål, mer presis brief' },
    ],
    proTip: 'Jo mer du fyller inn på forhånd, jo kortere blir intervjuet.'
  },
  {
    title: '💬 Guidet modus',
    bullets: [
      { icon: MessageSquare, text: 'AI stiller deg spørsmål gjennom alle 9 seksjoner, én om gangen' },
      { icon: MessageSquare, text: 'Perfekt når du vil tenke høyt eller er usikker på hva som trengs' },
      { icon: Pencil,        text: 'Alle svar lagres og brukes automatisk i utkastet i steg 4' },
    ],
    proTip: 'Stikkord holder – du trenger ikke fullstendige setninger.'
  },
  {
    title: 'Steg 1: Kildemateriale',
    bullets: [
      { icon: FileText,      text: 'Last opp PDF eller lim inn tekst – Word/DOCX støttes ikke' },
      { icon: FileText,      text: 'Maks 5 filer, maks 10 MB per fil' },
      { icon: FileText,      text: 'Veldig lange dokumenter trunkeres automatisk til 100 000 tegn' },
    ],
    proTip: 'Lim inn bare de viktigste avsnittene for best resultat.'
  },
  {
    title: 'Steg 2–3: Rammer og intervju',
    bullets: [
      { icon: Target,        text: 'Steg 2: Sett tema, målgruppe, kanaler og frist for prosjektet' },
      { icon: MessageSquare, text: 'Steg 3: AI stiller spørsmål om det som mangler (færre i Hurtigmodus)' },
      { icon: Pencil,        text: 'Alle svar lagres og brukes i utkastet i steg 4' },
    ],
    proTip: 'Hold deg til én tydelig målgruppe – det gir et mer presist resultat.'
  },
  {
    title: 'Steg 4: Foreslått brief',
    bullets: [
      { icon: Zap,           text: 'Trykk «Generer utkast» for å lage et komplett briefutkast basert på intervjuet' },
      { icon: Pencil,        text: 'Rediger hver seksjon direkte – du ser hvilken kilde innholdet kommer fra' },
      { icon: Target,        text: 'Finjuster og fyll hull før du godkjenner' },
    ],
    proTip: 'Se etter hull i innholdet – fyll dem inn før du godkjenner.'
  },
  {
    title: 'Steg 5: Ferdig brief',
    bullets: [
      { icon: Download,      text: 'Godkjenn for å generere og laste ned Word-dokument' },
      { icon: Pencil,        text: 'Kopier alt til utklippstavlen med ett klikk' },
      { icon: Rocket,        text: 'Gjenåpne og rediger ved behov – godkjenn på nytt for nytt Word-dokument' },
    ],
    proTip: 'Godkjenn først når det føles sendeklart.'
  },
];

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
          <h2 className="text-xl font-bold leading-snug">{current.title}</h2>
          <p className="text-xs text-blue-200 mt-1">v1</p>
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
              <Button size="sm" onClick={handleDismiss} className="bg-[#002C6C] hover:bg-[#002C6C]/80 text-white">
                Start
              </Button>
            ) : (
              <Button size="sm" onClick={() => setSlide(s => s + 1)} className="bg-[#002C6C] hover:bg-[#002C6C]/80 text-white">
                Neste <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}