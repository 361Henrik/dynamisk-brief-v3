import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDeleteBrief } from '@/hooks/useDeleteBrief';
import { 
  ArrowLeft,
  Loader2,
  FileText,
  Pencil,
  Check,
  Trash2,
  ChevronRight,
  Home,
  Copy,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Save
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BriefStepper from '@/components/brief/BriefStepper';
import SourceMaterialUpload from '@/components/brief/SourceMaterialUpload';
import RammerForm from '@/components/brief/RammerForm';
import AIDialog from '@/components/brief/AIDialog';
import ProposedBrief from '@/components/brief/ProposedBrief';
import FinalBrief from '@/components/brief/FinalBrief';
import DeleteBriefDialog from '@/components/brief/DeleteBriefDialog';
import { toast } from 'sonner';

function BriefEditorContent() {
  const urlParams = new URLSearchParams(window.location.search);
  const briefId = urlParams.get('id');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [briefNotes, setBriefNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: brief, isLoading, error, refetch: refetchBrief } = useQuery({
    queryKey: ['brief', briefId],
    queryFn: async () => {
      if (!briefId) return null;
      const briefs = await base44.entities.Brief.filter({ id: briefId });
      return briefs[0] || null;
    },
    enabled: !!briefId
  });

  const { data: sources = [], refetch: refetchSources } = useQuery({
    queryKey: ['briefSources', briefId],
    queryFn: async () => {
      if (!briefId) return [];
      return await base44.entities.BriefSourceMaterial.filter({ briefId });
    },
    enabled: !!briefId
  });

  const { data: dialogEntries = [] } = useQuery({
    queryKey: ['dialogEntries', briefId],
    queryFn: async () => {
      if (!briefId) return [];
      return await base44.entities.DialogEntry.filter({ briefId }, 'sequenceNumber');
    },
    enabled: !!briefId
  });

  const handleUpdateStep = async (newStep) => {
    await base44.entities.Brief.update(briefId, { currentStep: newStep });
    refetchBrief();
  };

  const handleSaveTitle = async () => {
    if (titleInput.trim() && titleInput !== brief.title) {
      await base44.entities.Brief.update(briefId, { title: titleInput.trim() });
      refetchBrief();
    }
    setEditingTitle(false);
  };

  const startEditingTitle = () => {
    setTitleInput(brief.title);
    setEditingTitle(true);
  };

  const deleteBriefMutation = useDeleteBrief({
    onSuccess: () => {
      navigate(createPageUrl('BriefList'));
    }
  });

  const handleConfirmDelete = () => {
    deleteBriefMutation.mutate(briefId);
  };

  const duplicateBriefMutation = useMutation({
    mutationFn: async () => {
      const newBrief = await base44.entities.Brief.create({
        title: `${brief.title} (kopi)`,
        themeName: brief.themeName,
        themeId: brief.themeId,
        rammer: brief.rammer,
        status: 'utkast',
        currentStep: 'source_material',
      });
      const sourceMaterials = await base44.entities.BriefSourceMaterial.filter({ briefId });
      for (const source of sourceMaterials) {
        await base44.entities.BriefSourceMaterial.create({
          briefId: newBrief.id,
          sourceType: source.sourceType,
          fileName: source.fileName,
          fileUrl: source.fileUrl,
          extractedText: source.extractedText,
          extractionStatus: source.extractionStatus,
        });
      }
      return newBrief;
    },
    onSuccess: (newBrief) => {
      toast.success('Brief duplisert!');
      navigate(createPageUrl('BriefEditor') + `?id=${newBrief.id}`);
    },
    onError: () => {
      toast.error('Kunne ikke duplisere briefen');
    }
  });

  // Initialize notes from brief
  React.useEffect(() => {
    if (brief?.notes !== undefined) {
      setBriefNotes(brief.notes || '');
    }
  }, [brief?.notes]);

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    try {
      await base44.entities.Brief.update(briefId, { notes: briefNotes });
      queryClient.invalidateQueries({ queryKey: ['brief', briefId] });
      toast.success('Notater lagret!');
    } catch {
      toast.error('Kunne ikke lagre notater');
    }
    setNotesSaving(false);
  };

  const canDelete = brief && brief.status !== 'godkjent';

  if (!briefId) {
    return (
      <div className="text-center py-16">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-medium text-gray-900 mb-2">Ingen brief valgt</h2>
        <p className="text-gray-500 mb-4">Velg en brief fra listen eller opprett en ny.</p>
        <Link to={createPageUrl('BriefList')}>
          <Button>Gå til mine briefs</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="text-center py-16">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-medium text-gray-900 mb-2">Brief ikke funnet</h2>
        <p className="text-gray-500 mb-4">Briefen du leter etter finnes ikke eller er slettet.</p>
        <Link to={createPageUrl('BriefList')}>
          <Button>Gå til mine briefs</Button>
        </Link>
      </div>
    );
  }

  const currentStep = brief.currentStep || 'source_material';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to={createPageUrl('Home')} className="hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={createPageUrl('BriefList')} className="hover:text-foreground transition-colors">
          Mine briefs
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium truncate max-w-[200px]">{brief?.title || 'Brief'}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link to={createPageUrl('BriefList')}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          {editingTitle ? (
            <div className="flex items-center space-x-2">
              <Input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="text-xl font-bold"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              />
              <Button size="icon" variant="ghost" onClick={handleSaveTitle}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-foreground">{brief.title}</h1>
              <Button size="icon" variant="ghost" onClick={startEditingTitle}>
                <Pencil className="h-4 w-4 text-gray-400" />
              </Button>
            </div>
          )}
          <p className="text-gray-500">{brief.themeName} • {brief.status === 'godkjent' ? 'Godkjent' : 'Utkast'}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setShowNotes(!showNotes)}
          >
            <StickyNote className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Notater</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => duplicateBriefMutation.mutate()}
            disabled={duplicateBriefMutation.isPending}
          >
            {duplicateBriefMutation.isPending 
              ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              : <Copy className="h-4 w-4 mr-1.5" />
            }
            <span className="hidden sm:inline">Dupliser</span>
          </Button>
          {canDelete && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Slett</span>
            </Button>
          )}
        </div>
      </div>

      {/* Brief Notes Panel */}
      {showNotes && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Notater for denne briefen</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowNotes(false)} className="h-7 w-7 p-0">
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={briefNotes}
            onChange={(e) => setBriefNotes(e.target.value)}
            placeholder="Legg til notater, kommentarer eller informasjon til kommunikasjonsavdelingen..."
            className="min-h-[80px] resize-y bg-white dark:bg-background border-yellow-200 dark:border-yellow-800"
          />
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={notesSaving}>
              {notesSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Lagre notater
            </Button>
          </div>
        </div>
      )}

      {/* Stepper */}
      <BriefStepper currentStep={currentStep} onStepClick={handleUpdateStep} />

      {/* Step Content */}
      {currentStep === 'source_material' && (
        <SourceMaterialUpload
          briefId={briefId}
          sources={sources}
          onSourcesChange={refetchSources}
          onContinue={() => handleUpdateStep('rammer')}
        />
      )}

      {currentStep === 'rammer' && (
        <RammerForm
          brief={brief}
          onBack={() => handleUpdateStep('source_material')}
          onContinue={() => {
            refetchBrief();
          }}
        />
      )}

      {currentStep === 'dialog' && (
        <AIDialog
          brief={brief}
          sources={sources}
          userName={currentUser?.full_name}
          onBack={() => handleUpdateStep('rammer')}
          onContinue={() => handleUpdateStep('proposed')}
        />
      )}

      {currentStep === 'proposed' && (
        <ProposedBrief
          brief={brief}
          sources={sources}
          dialogEntries={dialogEntries}
          onBack={() => handleUpdateStep('dialog')}
          onContinue={() => handleUpdateStep('final')}
        />
      )}

      {currentStep === 'final' && (
        <FinalBrief
          brief={brief}
          sources={sources}
          dialogEntries={dialogEntries}
          onBack={() => handleUpdateStep('proposed')}
        />
      )}

      <DeleteBriefDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteBriefMutation.isPending}
      />
    </div>
  );
}

export default function BriefEditor() {
  return (
    <RequireAuth>
      <BriefEditorContent />
    </RequireAuth>
  );
}
