import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

const STEPS = [
  { key: 'source_material', label: 'Kildemateriale' },
  { key: 'rammer', label: 'Rammer' },
  { key: 'dialog', label: 'Dynamisk intervju' },
  { key: 'proposed', label: 'Foreslått brief' },
  { key: 'final', label: 'Ferdig brief' }
];

export default function BriefStepper({ currentStep }) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                  ${isCompleted ? 'bg-gs1-blue border-gs1-blue text-white' : ''}
                  ${isCurrent ? 'border-gs1-orange bg-gs1-orange text-white' : ''}
                  ${!isCompleted && !isCurrent ? 'border-gs1-border text-gs1-medium-gray' : ''}
                `}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span className={`
                  text-xs mt-2 text-center hidden sm:block
                  ${isCurrent ? 'font-medium text-gs1-orange' : 'text-gs1-medium-gray'}
                `}>
                  {step.label}
                </span>
              </div>
              
              {index < STEPS.length - 1 && (
                <div className={`
                  flex-1 h-0.5 mx-2
                  ${index < currentIndex ? 'bg-gs1-blue' : 'bg-gs1-border'}
                `} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}