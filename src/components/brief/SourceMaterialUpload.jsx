import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { 
  Upload, 
  FileText, 
  Link as LinkIcon, 
  Type,
  Loader2, 
  Plus,
  HelpCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import SourceItemCard from './SourceItemCard';

const MAX_PDFS = 10;
const MAX_URLS = 5;

export default function SourceMaterialUpload({ briefId, sources = [], onSourcesChange, onContinue }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [addingText, setAddingText] = useState(false);

  const pdfCount = sources.filter(s => s.sourceType === 'file').length;
  const urlCount = sources.filter(s => s.sourceType === 'url').length;
  const textCount = sources.filter(s => s.sourceType === 'text').length;
  
  const hasAtLeastOneSource = sources.length > 0;
  const hasPendingSources = sources.some(s => s.extractionStatus === 'pending');
  const allSourcesReady = hasAtLeastOneSource && sources.every(s => s.extractionStatus === 'success');

  // Auto-refresh when there are pending sources
  useEffect(() => {
    if (!hasPendingSources) return;
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['briefSources', briefId] });
      if (onSourcesChange) onSourcesChange();
    }, 3000);

    return () => clearInterval(interval);
  }, [hasPendingSources, briefId, queryClient, onSourcesChange]);

  const createSourceMutation = useMutation({
    mutationFn: async (sourceData) => {
      const source = await base44.entities.BriefSourceMaterial.create({
        briefId,
        ...sourceData
      });
      return source;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefSources', briefId] });
      if (onSourcesChange) onSourcesChange();
    }
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (sourceId) => {
      await base44.entities.BriefSourceMaterial.delete(sourceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefSources', briefId] });
      if (onSourcesChange) onSourcesChange();
    }
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_PDFS - pdfCount;
    if (files.length > remainingSlots) {
      toast.error(`Du kan laste opp maks ${remainingSlots} flere PDF-filer`);
      return;
    }

    setUploading(true);

    for (const file of files) {
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.pdf')) {
        toast.error(`${file.name}: Kun PDF-filer støttes. Lagre dokumentet som PDF og prøv igjen.`);
        continue;
      }

      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        await createSourceMutation.mutateAsync({
          sourceType: 'file',
          fileName: file.name,
          fileUrl: file_url,
          mimeType: file.type,
          extractionStatus: 'pending',
          extractionError: null
        });
      } catch (error) {
        console.error('File upload failed:', error);
        toast.error(`Klarte ikke å laste opp: ${file.name}`);
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim() || urlCount >= MAX_URLS) return;

    setAddingUrl(true);
    try {
      await createSourceMutation.mutateAsync({
        sourceType: 'url',
        fileUrl: urlInput.trim(),
        extractionStatus: 'pending',
        extractionError: null
      });
      setUrlInput('');
    } catch (error) {
      console.error('Failed to add URL:', error);
      toast.error('Klarte ikke å legge til URL');
    }
    setAddingUrl(false);
  };

  const handleAddText = async () => {
    if (!textInput.trim()) return;

    setAddingText(true);
    try {
      await createSourceMutation.mutateAsync({
        sourceType: 'text',
        extractedText: textInput.trim(),
        extractionStatus: 'success', // Text is immediately ready - no extraction needed
        extractionError: null
      });
      setTextInput('');
      toast.success('Tekst lagt til');
    } catch (error) {
      console.error('Failed to add text:', error);
      toast.error('Klarte ikke å legge til tekst');
    }
    setAddingText(false);
  };

  const retryExtraction = async (sourceId) => {
    try {
      await base44.entities.BriefSourceMaterial.update(sourceId, { 
        extractionStatus: 'pending', 
        extractionError: null 
      });
      queryClient.invalidateQueries({ queryKey: ['briefSources', briefId] });
      if (onSourcesChange) onSourcesChange();
      toast.success('Prøver på nytt...');
    } catch (error) {
      toast.error('Klarte ikke å starte ny behandling');
    }
  };

  const handleDeleteSource = (sourceId) => {
    deleteSourceMutation.mutate(sourceId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Kildemateriale</span>
          </CardTitle>
          <CardDescription>
            Legg til materiale som skal brukes som grunnlag for briefen.
            Du må legge til minst én kilde før du kan fortsette.
          </CardDescription>
          
          {/* Helper text */}
          <div className="mt-3 p-3 bg-[#002C6C]/5 border border-[#002C6C]/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-[#002C6C] mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#002C6C]">
              <p><strong>Støttet i V1:</strong> PDF, URL og lim inn tekst.</p>
              <p className="text-xs mt-1 text-[#002C6C]/70">
                Word/Excel/PowerPoint støttes ikke som kildemateriale i V1.
              </p>
              <Link 
                to={createPageUrl('HelpInstructions')} 
                className="inline-flex items-center gap-1 text-xs mt-1 text-[#002C6C] hover:underline"
              >
                  <HelpCircle className="h-3 w-3" />
                  Les mer
                </Link>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Counters */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
              📄 {pdfCount}/{MAX_PDFS} dokumenter
            </span>
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
              🔗 {urlCount}/{MAX_URLS} URL-er
            </span>
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
              📝 {textCount} tekster
            </span>
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Type className="h-4 w-4 text-green-500" />
              Lim inn tekst / notater
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Legg til bakgrunnsinformasjon, notater fra møter, eller annet relevant innhold som ikke finnes i dokumenter.
            </p>
            <Textarea
              placeholder="Lim inn tekst, notater, eller annet innhold her..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={4}
              className="resize-y min-h-[100px]"
              style={{ minHeight: '100px' }}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {textInput.length > 0 ? `${textInput.length} tegn` : 'Tekstfeltet utvides automatisk'}
              </span>
              <Button
                onClick={handleAddText}
                disabled={!textInput.trim() || addingText}
                size="sm"
              >
                {addingText ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Legg til tekst
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <FileText className="h-4 w-4 text-[#002C6C]" />
              Last opp PDF ({pdfCount}/{MAX_PDFS})
            </label>
            <label className="block">
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
                ${pdfCount >= MAX_PDFS 
                  ? 'border-gray-200 bg-gray-50 dark:bg-gray-800 cursor-not-allowed' 
                  : 'border-gray-200 hover:border-[#002C6C]/40'}`}>
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 text-[#002C6C] animate-spin" />
                    <span className="text-sm text-gray-500 mt-2">Laster opp...</span>
                  </div>
                ) : pdfCount >= MAX_PDFS ? (
                  <div className="flex flex-col items-center text-gray-400">
                    <FileText className="h-8 w-8" />
                    <span className="text-sm mt-2">Maks antall dokumenter nådd</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <FileText className="h-8 w-8 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">
                      Klikk for å laste opp PDF
                    </span>
                    <span className="text-xs text-gray-500 mt-1">Maks 10 MB per fil</span>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading || pdfCount >= MAX_PDFS}
                />
              </div>
            </label>
          </div>

          {/* URL Input */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <LinkIcon className="h-4 w-4 text-purple-500" />
              Legg til URL ({urlCount}/{MAX_URLS})
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="https://example.com/artikkel"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="pl-10"
                  disabled={urlCount >= MAX_URLS || addingUrl}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                />
              </div>
              <Button
                onClick={handleAddUrl}
                disabled={!urlInput.trim() || urlCount >= MAX_URLS || addingUrl}
              >
                {addingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            {urlCount >= MAX_URLS && (
              <p className="text-xs text-orange-600">Maks {MAX_URLS} URL-er per brief</p>
            )}
          </div>

          {/* Source List */}
          {sources.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Lagt til ({sources.length})
              </label>
              <div className="space-y-2">
                {sources.map((source) => (
                  <SourceItemCard
                    key={source.id}
                    source={source}
                    onRetry={retryExtraction}
                    onDelete={handleDeleteSource}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          onClick={onContinue}
          disabled={!allSourcesReady}
          className="bg-[#002C6C] hover:bg-[#001a45]"
        >
          {hasPendingSources ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Venter på behandling...
            </>
          ) : (
            'Fortsett til rammer'
          )}
        </Button>
      </div>

      {!hasAtLeastOneSource && (
        <p className="text-center text-sm text-gray-500">
          Legg til minst én kilde for å fortsette
        </p>
      )}
      {hasAtLeastOneSource && !allSourcesReady && !hasPendingSources && (
        <p className="text-center text-sm text-orange-600">
          Noen kilder feilet under behandling. Prøv igjen eller fjern dem.
        </p>
      )}
    </div>
  );
}