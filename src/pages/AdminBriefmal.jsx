import React, { useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Trash2,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

function AdminBriefmalContent() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data: briefTemplate, isLoading, refetch } = useQuery({
    queryKey: ['briefTemplate'],
    queryFn: async () => {
      const templates = await base44.entities.KnowledgeBaseDoc.filter({ 
        docType: 'brief_template', 
        isActive: true 
      });
      return templates[0] || null;
    },
    refetchInterval: (data) => {
      // Auto-refresh while pending
      if (data?.extractionStatus === 'pending') return 3000;
      return false;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.KnowledgeBaseDoc.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefTemplate'] });
      toast.success('Briefmal slettet');
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // V1: Only allow PDF files
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf')) {
      toast.error('Kun PDF-filer støttes i V1. Lagre dokumentet som PDF og prøv igjen.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Deactivate existing template if any
      if (briefTemplate) {
        await base44.entities.KnowledgeBaseDoc.update(briefTemplate.id, { isActive: false });
      }

      // Create new template
      await base44.entities.KnowledgeBaseDoc.create({
        title: file.name.replace(/\.pdf$/i, ''),
        description: 'Aktiv briefmal for generering av kommunikasjonsbriefs',
        docType: 'brief_template',
        fileUrl: file_url,
        extractionStatus: 'pending',
        isActive: true
      });

      queryClient.invalidateQueries({ queryKey: ['briefTemplate'] });
      toast.success('Briefmal lastet opp! Tekstuttrekk starter...');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Kunne ikke laste opp briefmal');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleRetryExtraction = async () => {
    if (!briefTemplate) return;
    try {
      await base44.entities.KnowledgeBaseDoc.update(briefTemplate.id, { 
        extractionStatus: 'pending',
        extractionError: null 
      });
      refetch();
      toast.success('Prøver tekstuttrekk på nytt...');
    } catch (error) {
      toast.error('Kunne ikke starte ny behandling');
    }
  };

  const getStatusBadge = () => {
    if (!briefTemplate) return null;
    switch (briefTemplate.extractionStatus) {
      case 'success':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Klar</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="h-3 w-3 mr-1" />Feilet</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-700"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Behandles</Badge>;
    }
  };

  const getPreviewText = () => {
    if (!briefTemplate?.extractedText) return null;
    return briefTemplate.extractedText.substring(0, 1000) + (briefTemplate.extractedText.length > 1000 ? '...' : '');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Briefmal (Kunnskapsbase)</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Last opp malen som definerer strukturen for alle genererte briefs.
        </p>
      </div>

      {/* Current Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Aktiv briefmal</span>
            {getStatusBadge()}
          </CardTitle>
          <CardDescription>
            Denne malen brukes som grunnlag for all AI-generering av briefs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {briefTemplate ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{briefTemplate.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Lastet opp {new Date(briefTemplate.created_date).toLocaleDateString('nb-NO')}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {briefTemplate.extractionStatus === 'failed' && (
                    <Button variant="outline" size="sm" onClick={handleRetryExtraction}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Prøv igjen
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowPreview(!showPreview)}
                    disabled={!briefTemplate.extractedText}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {showPreview ? 'Skjul' : 'Forhåndsvis'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => deleteMutation.mutate(briefTemplate.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {briefTemplate.extractionStatus === 'failed' && briefTemplate.extractionError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    <strong>Feil:</strong> {briefTemplate.extractionError}
                  </p>
                </div>
              )}

              {showPreview && briefTemplate.extractedText && (
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg max-h-96 overflow-y-auto">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Utdrag fra malen:</p>
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                    {getPreviewText()}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 dark:text-gray-400 mb-1">Ingen briefmal lastet opp ennå.</p>
              <p className="text-sm text-orange-600 dark:text-orange-400">
                AI-generering vil ikke fungere optimalt uten en briefmal.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload New */}
      <Card>
        <CardHeader>
          <CardTitle>Last opp ny briefmal</CardTitle>
          <CardDescription>
            {briefTemplate 
              ? 'Last opp en ny mal for å erstatte den eksisterende. Den gamle malen deaktiveres automatisk.' 
              : 'Last opp en PDF-fil som definerer malstrukturen for briefs.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
            <strong>V1:</strong> Kun PDF støttes. Har du et Word-dokument? Lagre det som PDF først (Fil → Lagre som → PDF).
          </div>
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">Laster opp...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="h-10 w-10 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">
                    Klikk for å laste opp briefmal (PDF)
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Kun PDF-filer støttes (maks 10 MB)
                  </span>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Hvordan brukes briefmalen?</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <ul>
            <li><strong>Struktur:</strong> AI-en følger strukturen og overskriftene i malen når den genererer briefs.</li>
            <li><strong>Prioritet:</strong> Malens innhold har høyeste prioritet i AI-genereringen.</li>
            <li><strong>Oppfølgingsspørsmål:</strong> Hvis brukerens input mangler detaljer som trengs for malen, stiller AI-en fokuserte oppfølgingsspørsmål.</li>
            <li><strong>Konsistens:</strong> Alle nye briefs bruker den aktive malen automatisk.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminBriefmal() {
  return (
    <RequireAuth requireAdmin>
      <AdminBriefmalContent />
    </RequireAuth>
  );
}