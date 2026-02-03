import React from 'react';
import { 
  Circle, 
  CircleDot, 
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

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
  const confirmedCount = getConfirmedSectionsCount(confirmedPoints);
  const totalCount = BRIEF_SECTIONS.length;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Fremdrift: {confirmedCount}/{totalCount} seksjoner
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <HelpCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-sm">
                <strong>Hva skjer når jeg bekrefter?</strong><br/>
                Bekreftede punkter blir låst og brukes direkte i den ferdige briefen. 
                Du kan ikke endre dem etterpå.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
        <div 
          className="bg-green-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(confirmedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Section list */}
      <div className="space-y-2">
        {BRIEF_SECTIONS.map((section) => {
          const status = sectionStatus[section.key];
          const confirmedPoint = confirmedPoints.find(p => 
            p.sectionKey === section.key || 
            p.topic?.toLowerCase().includes(section.key.replace('_', ' '))
          );

          return (
            <div 
              key={section.key}
              className={cn(
                "flex items-center gap-2 text-sm py-1 px-2 rounded",
                status === 'confirmed' && "bg-green-50 dark:bg-green-900/20",
                status === 'partial' && "bg-yellow-50 dark:bg-yellow-900/20",
                status === 'missing' && "bg-gray-50 dark:bg-gray-700/30"
              )}
            >
              {status === 'confirmed' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : status === 'partial' ? (
                <CircleDot className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-red-400 flex-shrink-0" />
              )}
              <span className={cn(
                "flex-1",
                status === 'confirmed' && "text-green-800 dark:text-green-300",
                status === 'partial' && "text-yellow-800 dark:text-yellow-300",
                status === 'missing' && "text-gray-500 dark:text-gray-400"
              )}>
                {section.label}
              </span>
              {status === 'missing' && (
                <span className="text-xs text-red-500">Mangler</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
        <strong>Bekreft</strong> = dette blir låst og brukt i briefen.
      </p>
    </div>
  );
}