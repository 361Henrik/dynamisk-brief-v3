import React from 'react';
import { AlertTriangle, CheckCircle2, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StuckRecovery({ sectionLabel, onManualConfirm, onSkip }) {
  return (
    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Det ser ut som intervjuet har stoppet opp på <strong>{sectionLabel}</strong>. 
          Du kan bekrefte manuelt eller hoppe over.
        </p>
      </div>
      <div className="flex gap-2 ml-6">
        <Button
          size="sm"
          variant="outline"
          className="text-green-700 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 text-xs"
          onClick={onManualConfirm}
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          Bekreft manuelt
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-gray-600 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/30 text-xs"
          onClick={onSkip}
        >
          <SkipForward className="h-3.5 w-3.5 mr-1" />
          Hopp over
        </Button>
      </div>
    </div>
  );
}