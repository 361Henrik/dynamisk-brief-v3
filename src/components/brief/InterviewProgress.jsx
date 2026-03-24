import React from 'react';
import { 
  Circle, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Required sections for the brief - aligned 1:1 with the 9 ProposedBrief template sections
export const BRIEF_SECTIONS = [
  { key: 'prosjektinformasjon', label: 'Prosjektinformasjon', description: 'Hva er prosjektet, tittelen og hvem er avsender?' },
  { key: 'bakgrunn', label: 'Bakgrunn', description: 'Hva er konteksten og bakgrunnen for kommunikasjonstiltaket?' },
  { key: 'maal', label: 'Mål og suksesskriterier', description: 'Hva ønsker vi å oppnå, og hvordan måler vi suksess?' },
  { key: 'maalgrupper', label: 'Målgrupper', description: 'Hvem prøver vi å nå, og hva vet vi om dem?' },
  { key: 'verdiforslag', label: 'GS1-tilbudet og verdiforslag', description: 'Hva er det unike tilbudet fra GS1 og verdien for målgruppen?' },
  { key: 'budskap', label: 'Budskap, tone og stil', description: 'Hva er hovedbudskapet, og hvordan skal det formidles?' },
  { key: 'leveranser', label: 'Leveranser og kanaler', description: 'Hvilke leveranser skal produseres og hvor publiseres de?' },
  { key: 'rammer', label: 'Praktiske rammer og godkjenning', description: 'Hva er tidsfrister, budsjett og hvem godkjenner?' },
  { key: 'kildemateriale', label: 'Kildemateriale og referanser', description: 'Hvilket bakgrunnsmateriale er relevant for briefen?' }
];

// Map confirmed topics to sections
export function getSectionStatus(confirmedPoints = []) {
  const status = {};
  
  BRIEF_SECTIONS.forEach(section => {
    const matchingPoint = confirmedPoints.find(p => 
      p.sectionKey === section.key || 
      p.topic?.toLowerCase().includes(section.key.replace('_', ' '))
    );
    
    if (matchingPoint) {
      status[section.key] = 'confirmed';
    } else {
      status[section.key] = 'missing';
    }
  });
  
  return status;
}

export function getRequiredSectionsCount() {
  return BRIEF_SECTIONS.length;
}

export function getConfirmedSectionsCount(confirmedPoints = []) {
  const status = getSectionStatus(confirmedPoints);
  return Object.values(status).filter(s => s === 'confirmed').length;
}

export function areAllSectionsConfirmed(confirmedPoints = []) {
  return getConfirmedSectionsCount(confirmedPoints) >= BRIEF_SECTIONS.length;
}

export default function InterviewProgress({ confirmedPoints = [], activeSectionKey = null }) {
  const sectionStatus = getSectionStatus(confirmedPoints);
  // Prefer explicit active section from conversation, fallback to first missing
  const activeFocusSection = (activeSectionKey && BRIEF_SECTIONS.find(s => s.key === activeSectionKey && sectionStatus[s.key] === 'missing'))
    || BRIEF_SECTIONS.find(section => sectionStatus[section.key] === 'missing');

  return (
    <div className="bg-white border border-[#B1B3B3] rounded-lg p-4 space-y-6">
      
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[#454545]">
          Intervjuoversikt
        </h3>
      </div>

      {/* B) Aktivt fokus */}
      <div className="bg-[#002C6C]/5 border border-[#002C6C]/15 p-3 rounded-lg text-center">
        <p className="text-xs text-[#002C6C] font-medium mb-1">Dette jobber vi med nå</p>
        <div className="flex items-center justify-center space-x-2 text-[#002C6C]">
          <Sparkles className="h-4 w-4" />
          <p className="font-semibold">
            {activeFocusSection ? activeFocusSection.label : "Alle seksjoner bekreftet"}
          </p>
        </div>
      </div>

      {/* A) Status per intervjuseksjon */}
      <div>
        <h4 className="text-sm font-semibold text-[#454545] mb-3">
          Status per intervjuseksjon
        </h4>
        <div className="space-y-2">
          {BRIEF_SECTIONS.map((section) => {
            const status = sectionStatus[section.key];
            return (
              <div 
                key={section.key}
                className="flex items-center gap-3 text-sm"
              >
                {status === 'confirmed' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                   <Circle className="h-5 w-5 text-red-500 fill-current flex-shrink-0" />
                )}
                <span className={cn(
                  "flex-1",
                  status === 'confirmed' ? "text-[#454545]" : "text-[#888B8D]"
                )}>
                  {section.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-[#888B8D] mt-4 space-y-1 bg-[#F4F4F4] p-2 rounded-md">
            <p className="flex items-center gap-1.5"><Circle className="h-3 w-3 text-red-500 fill-current" /> <span className="font-semibold">Mangler</span> = ikke bekreftet ennå</p>
            <p className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-600" /> <span className="font-semibold">Bekreftet</span> = låst og brukt i briefen</p>
        </div>
      </div>

      {/* C) Bekreftelse – forklaring */}
      <div className="border-t border-[#B1B3B3] pt-4">
        <h4 className="text-sm font-semibold text-[#454545] mb-2">
          Bekreftelse – forklaring
        </h4>
        <p className="text-xs text-[#888B8D] leading-relaxed">
          Svar alene fullfører ikke en seksjon.
          Når du trykker <strong className="font-semibold text-[#454545]">Bekreft</strong>, låses innholdet og brukes i den endelige briefen.
        </p>
      </div>

    </div>
  );
}