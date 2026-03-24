import React from 'react';

export const SOURCE_CONFIG = {
  brukerinput: {
    label: 'Brukerinput',
    className: 'bg-green-50 border border-green-200 text-green-800',
    dotClass: 'bg-green-500'
  },
  kildemateriale: {
    label: 'Kildemateriale',
    className: 'bg-blue-50 border border-blue-200 text-blue-800',
    dotClass: 'bg-blue-500'
  },
  forslag_fra_systemet: {
    label: 'Forslag fra systemet',
    className: 'bg-amber-50 border border-amber-200 text-amber-800',
    dotClass: 'bg-amber-500'
  },
};

export function getContentText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content.replace(/\\n/g, '\n');
  if (Array.isArray(content)) return content.map(b => b.content).join('\n\n');
  return '';
}

export default function SourceBlock({ block, showTags }) {
  const config = SOURCE_CONFIG[block.type] || SOURCE_CONFIG.forslag_fra_systemet;
  return (
    <div className="mb-3 last:mb-0">
      {showTags && (
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dotClass}`} />
          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${config.className}`}>
            {config.label}
          </span>
        </div>
      )}
      <p className="text-sm whitespace-pre-wrap text-gs1-dark-gray leading-relaxed">{block.content}</p>
    </div>
  );
}