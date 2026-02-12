import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'source_material', label: 'Kildemateriale', subtitle: 'Last opp kilder' },
  { key: 'rammer', label: 'Rammer', subtitle: 'Definer rammer' },
  { key: 'dialog', label: 'Intervju', subtitle: 'AI-dialog' },
  { key: 'proposed', label: 'Foreslått brief', subtitle: 'Rediger utkast' },
  { key: 'final', label: 'Ferdig brief', subtitle: 'Eksporter' }
];

export default function BriefStepper({ currentStep, onStepClick }) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isClickable = isCompleted || isCurrent;
          
          return (
            <React.Fragment key={step.key}>
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(step.key)}
                disabled={!isClickable}
                className={cn(
                  "flex flex-col items-center group transition-all",
                  isClickable && "cursor-pointer",
                  !isClickable && "cursor-default"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                  isCompleted && "bg-blue-600 border-blue-600 text-white group-hover:scale-110",
                  isCurrent && "border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900/30",
                  !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground/50"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span className={cn(
                  "text-xs mt-2 text-center hidden sm:block transition-colors",
                  isCurrent && "font-medium text-blue-600 dark:text-blue-400",
                  isCompleted && "text-foreground",
                  !isCompleted && !isCurrent && "text-muted-foreground"
                )}>
                  {step.label}
                </span>
                {isCurrent && (
                  <span className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">
                    {step.subtitle}
                  </span>
                )}
              </button>
              
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-2 rounded-full transition-colors",
                  index < currentIndex ? 'bg-blue-600' : 'bg-muted'
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
