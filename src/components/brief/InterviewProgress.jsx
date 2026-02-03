import React from 'react';
import { 
  Circle, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Required sections for the brief - these must all be confirmed
export const BRIEF_SECTIONS = [
  { key: 'hovedbudskap', label: 'Hovedbudskap', description: 'Hva er kjernen i det du vil formidle?' },
  { key: 'malgruppe_innsikt', label: 'Målgruppeinnsikt', description: 'Hva vet vi om målgruppen og deres behov?' },
  { key: 'nokkelpunkter', label: 'Nøkkelpunkter', description: 'Hvilke konkrete punkter skal kommuniseres?' },
  { key: 'eksempler', label: 'Eksempler / Case', description: 'Har du konkrete eksempler som illustrerer budskapet?' },
  { key: 'call_to_action', label: 'Call to Action', description: 'Hva ønsker du at målgruppen skal gjøre?' },
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

export default function InterviewProgress({ confirmedPoints = [] }) {
  const sectionStatus = getSectionStatus(confirmedPoints);
  const activeFocusSection = BRIEF_SECTIONS.find(section => sectionStatus[section.key] === 'missing');

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-6">
      
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Intervjuoversikt
        </h3>
      </div>

      {/* B) Aktivt fokus */}
      <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-center">
        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Aktivt fokus</p>
        <div className="flex items-center justify-center space-x-2 text-blue-900 dark:text-blue-100">
          <Sparkles className="h-4 w-4" />
          <p className="font-semibold">
            {activeFocusSection ? activeFocusSection.label : "Alle seksjoner bekreftet"}
          </p>
        </div>
      </div>

      {/* A) Status per intervjuseksjon */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
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
                  status === 'confirmed' ? "text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"
                )}>
                  {section.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 space-y-1 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
            <p className="flex items-center gap-1.5"><Circle className="h-3 w-3 text-red-500 fill-current" /> <span className="font-semibold">Mangler</span> = ikke bekreftet ennå</p>
            <p className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-600" /> <span className="font-semibold">Bekreftet</span> = låst og brukt i briefen</p>
        </div>
      </div>

      {/* C) Bekreftelse – forklaring */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Bekreftelse – forklaring
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          Svar alene fullfører ikke en seksjon.
          Når du trykker <strong className="font-semibold text-gray-800 dark:text-gray-200">Bekreft</strong>, låses innholdet og brukes i den endelige briefen.
        </p>
      </div>

    </div>
  );
}