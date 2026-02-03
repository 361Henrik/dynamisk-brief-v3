import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

export default function ExpandableText({ content, maxLines = 6, className = '' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      const lineHeight = parseInt(getComputedStyle(contentRef.current).lineHeight) || 24;
      const maxHeight = lineHeight * maxLines;
      setNeedsExpansion(contentRef.current.scrollHeight > maxHeight + 10);
    }
  }, [content, maxLines]);

  return (
    <div className={className}>
      <div 
        ref={contentRef}
        className={`prose prose-sm max-w-none text-gray-700 dark:text-gray-300 dark:prose-invert overflow-hidden transition-all duration-300 ${
          !isExpanded && needsExpansion ? 'max-h-36' : ''
        }`}
        style={!isExpanded && needsExpansion ? { maxHeight: `${maxLines * 1.5}rem` } : {}}
      >
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
      {needsExpansion && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-blue-600 hover:text-blue-700 p-0 h-auto"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Vis mindre
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Vis mer
            </>
          )}
        </Button>
      )}
    </div>
  );
}