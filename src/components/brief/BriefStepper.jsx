import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

const STEPS = [
  { key: 'source_material', label: 'Kildemateriale' },
  { key: 'rammer', label: 'Rammer' },
  { key: 'dialog', label: 'Dynamisk intervju' },
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
                  ${isCompleted ? 'bg-blue-600 border-blue-600 text-white' : ''}
                  ${isCurrent ? 'border-blue-600 text-blue-600 bg-blue-50' : ''}
                  ${!isCompleted && !isCurrent ? 'border-gray-300 text-gray-400' : ''}
                `}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span className={`
                  text-xs mt-2 text-center hidden sm:block
                  ${isCurrent ? 'font-medium text-blue-600' : 'text-gray-500'}
                `}>
                  {step.label}
                </span>
              </div>
              
              {index < STEPS.length - 1 && (
                <div className={`
                  flex-1 h-0.5 mx-2
                  ${index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'}
                `} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}