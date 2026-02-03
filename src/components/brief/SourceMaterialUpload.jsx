import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, 
  FileText, 
  Link as LinkIcon, 
  Loader2, 
  X, 
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const MAX_URLS = 5;

export default function SourceMaterialUpload({ briefId, sources = [], onSourcesChange, onContinue }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);

  const urlCount = sources.filter(s => s.sourceType === 'url').length;
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

    setUploading(true);

    for (const file of files) {
      // V1: Only allow PDF files
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.pdf')) {
        toast.error(`${file.name}: Kun PDF-filer støttes i V1. Lagre dokumentet som PDF og prøv igjen.`);
        continue;
      }

      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        await createSourceMutation.mutateAsync({
          sourceType: 'file',
          fileName: file.name,
          fileUrl: file_url,
          mimeType: file.type,
          extractionStatus: 'pending'
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
        extractionStatus: 'pending'
      });
      setUrlInput('');
    } catch (error) {
      console.error('Failed to add URL:', error);
      toast.error('Klarte ikke å legge til URL');
    }
    setAddingUrl(false);
  };

  const retryExtraction = async (sourceId) => {
    try {
      await base44.entities.BriefSourceMaterial.update(sourceId, { extractionStatus: 'pending', extractionError: null });
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

  const getStatusBadge = (source) => {
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
              onClick={() => retryExtraction(source.id)}
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Last opp kildemateriale</span>
          </CardTitle>
          <CardDescription>
            Last opp PDF-filer eller legg til URL-er som skal brukes som grunnlag for briefen.
            Du må legge til minst én kilde før du kan fortsette.
          </CardDescription>
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
            <strong>V1:</strong> Støttede formater er PDF og URL. Word-, Excel- og PowerPoint-filer støttes ikke som kildemateriale.
            <br />
            <span className="text-xs">Har du et Word-dokument? Lagre det som PDF først.</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block">
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-blue-300 transition-colors cursor-pointer">
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                    <span className="text-sm text-gray-500 mt-2">Laster opp...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <FileText className="h-10 w-10 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 mt-2">Klikk for å laste opp PDF</span>
                    <span className="text-xs text-gray-500 mt-1">Kun PDF-filer støttes (maks 10 MB)</span>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>
            </label>
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <p className="text-xs text-orange-600 mt-1">Maks {MAX_URLS} URL-er per brief</p>
            )}
          </div>

          {/* Source List */}
          {sources.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Lagt til ({sources.length})
              </label>
              <div className="divide-y divide-gray-100 border rounded-lg">
                {sources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      {source.sourceType === 'file' ? (
                        <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <LinkIcon className="h-5 w-5 text-purple-500 flex-shrink-0" />
                      )}
                      <span className="text-sm text-gray-700 truncate">
                        {source.fileName || source.fileUrl}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {getStatusBadge(source)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteSource(source.id)}
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  </div>
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
          className="bg-blue-600 hover:bg-blue-700"
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