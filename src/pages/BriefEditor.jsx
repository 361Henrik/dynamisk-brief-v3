import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { 
  ArrowLeft,
  Loader2,
  FileText,
  Pencil,
  Check,
  Trash2
} from 'lucide-react';
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

  const deleteBriefMutation = useMutation({
    mutationFn: async () => {
      // Delete related data first
      const [sources, dialogEntries] = await Promise.all([
        base44.entities.BriefSourceMaterial.filter({ briefId }),
        base44.entities.DialogEntry.filter({ briefId })
      ]);
      
      // Delete all related records
      await Promise.all([
        ...sources.map(s => base44.entities.BriefSourceMaterial.delete(s.id)),
        ...dialogEntries.map(d => base44.entities.DialogEntry.delete(d.id))
      ]);
      
      // Delete the brief itself
      await base44.entities.Brief.delete(briefId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefs'] });
      toast.success('Briefen ble slettet');
      navigate(createPageUrl('BriefList'));
    },
    onError: () => {
      toast.error('Kunne ikke slette briefen');
    }
  });

  const handleConfirmDelete = () => {
    deleteBriefMutation.mutate();
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
    <div className="max-w-4xl mx-auto space-y-6">
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
              <h1 className="text-2xl font-bold text-gray-900">{brief.title}</h1>
              <Button size="icon" variant="ghost" onClick={startEditingTitle}>
                <Pencil className="h-4 w-4 text-gray-400" />
              </Button>
            </div>
          )}
          <p className="text-gray-500">{brief.themeName} • {brief.status === 'godkjent' ? 'Godkjent' : 'Utkast'}</p>
        </div>
        {canDelete && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Slett
          </Button>
        )}
      </div>

      {/* Stepper */}
      <BriefStepper currentStep={currentStep} />

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