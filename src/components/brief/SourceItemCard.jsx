import React, { useState } from 'react';
import { 
  FileText, 
  Link as LinkIcon, 
  Type,
  Loader2, 
  X, 
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Globe,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function SourceItemCard({ source, onRetry, onDelete }) {
  const [showExtract, setShowExtract] = useState(false);

  const getSourceIcon = () => {
    switch (source.sourceType) {
      case 'file':
        return <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />;
      case 'url':
        return <LinkIcon className="h-5 w-5 text-purple-500 flex-shrink-0" />;
      case 'text':
        return <Type className="h-5 w-5 text-green-500 flex-shrink-0" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />;
    }
  };

  const getSourceLabel = () => {
    switch (source.sourceType) {
      case 'file':
        return source.fileName || 'PDF-dokument';
      case 'url':
        return source.urlMetadata?.pageTitle || source.fileUrl;
      case 'text':
        return 'Innlimt tekst';
      default:
        return 'Kilde';
    }
  };

  const getStatusBadge = () => {
    switch (source.extractionStatus) {
      case 'success':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Klar</Badge>;
      case 'failed':
        return (
          <div className="flex items-center gap-1">
            <Badge className="bg-red-100 text-red-700" title={source.extractionError || 'Ukjent feil'}>
              <AlertCircle className="h-3 w-3 mr-1" />Feilet
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onRetry(source.id)}
              title="Prøv igjen"
            >
              <RefreshCw className="h-3 w-3 text-gray-500" />
            </Button>
          </div>
        );
      default:
        return <Badge className="bg-yellow-100 text-yellow-700"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Behandles...</Badge>;
    }
  };

  const getExtractPreview = () => {
    if (!source.extractedText) return null;
    const maxLen = 800;
    const text = source.extractedText;
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  };

  const hasContent = source.extractionStatus === 'success' && source.extractedText;

  return (
    <div className="border rounded-lg bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {getSourceIcon()}
          <div className="min-w-0 flex-1">
            <span className="text-sm text-gray-700 dark:text-gray-200 truncate block font-medium">
              {getSourceLabel()}
            </span>
            {/* URL metadata */}
            {source.sourceType === 'url' && source.urlMetadata && (
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {source.urlMetadata.domain && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {source.urlMetadata.domain}
                  </span>
                )}
                {source.urlMetadata.fetchedAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Hentet: {format(new Date(source.urlMetadata.fetchedAt), 'd. MMM HH:mm', { locale: nb })}
                  </span>
                )}
              </div>
            )}
            {/* Text source preview */}
            {source.sourceType === 'text' && source.extractedText && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {source.extractedText.length} tegn
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {getStatusBadge()}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDelete(source.id)}
          >
            <X className="h-4 w-4 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* Error display */}
      {source.extractionStatus === 'failed' && source.extractionError && (
        <div className="px-3 pb-3">
          <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
            {source.extractionError}
          </div>
        </div>
      )}

      {/* Summary and content preview */}
      {hasContent && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {/* Summary bullets */}
          {source.extractionSummary?.bullets && source.extractionSummary.bullets.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Oppsummering:</p>
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-0.5">
                {source.extractionSummary.bullets.slice(0, 4).map((bullet, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-blue-500">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key points */}
          {source.extractionSummary?.keyPoints && source.extractionSummary.keyPoints.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nøkkelpunkter:</p>
              <div className="flex flex-wrap gap-1">
                {source.extractionSummary.keyPoints.slice(0, 8).map((point, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal">
                    {point}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Extract toggle */}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setShowExtract(!showExtract)}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showExtract ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showExtract ? 'Skjul utdrag' : 'Se utdrag'}
            </button>
            {showExtract && (
              <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {getExtractPreview()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}