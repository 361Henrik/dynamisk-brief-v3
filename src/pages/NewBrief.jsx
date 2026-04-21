import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  FileText,
  ArrowRight,
  Loader2,
  Tags,
  Zap,
  MessageSquare,
  ChevronRight,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CreateThemeModal from '@/components/theme/CreateThemeModal';
import FastModeForm from '@/components/brief/FastModeForm';
import SourceMaterialUpload from '@/components/brief/SourceMaterialUpload';
import ContextOverviewDisplay from '@/components/brief/ContextOverviewDisplay';
import { toast } from 'sonner';

function NewBriefContent() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = urlParams.get('mode');
  const [step, setStep] = useState(modeParam === 'fast' ? 'fast_mode' : 'select_theme');
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [briefId, setBriefId] = useState(null);
  const [refreshSourcesKey, setRefreshSourcesKey] = useState(0);

  const { data: brief } = useQuery({
    queryKey: ['new-brief', briefId],
    queryFn: () => base44.entities.Brief.get(briefId),
    enabled: !!briefId
  });

  const { data: briefSources = [] } = useQuery({
    queryKey: ['briefSources', briefId, refreshSourcesKey],
    queryFn: () => base44.entities.BriefSourceMaterial.filter({ briefId }),
    enabled: !!briefId
  });

  useEffect(() => {
    if (modeParam === 'fast' && briefId) {
      setStep('fast_mode');
    }
  }, [modeParam, briefId]);

  const { data: themes = [], isLoading: themesLoading } = useQuery({
    queryKey: ['themes', 'active'],
    queryFn: async () => {
      const allThemes = await base44.entities.Theme.filter({ isActive: true });
      return allThemes;
    }
  });

  const createBriefMutation = useMutation({
    mutationFn: async (theme) => {
      const today = format(new Date(), 'dd.MM.yyyy', { locale: nb });
      const title = `${theme.name} – ${today}`;
      return base44.entities.Brief.create({
        title,
        themeId: theme.id,
        themeName: theme.name,
        status: 'utkast',
        currentStep: 'source_material'
      });
    },
    onSuccess: (brief) => {
      setBriefId(brief.id);
      setStep('source_material');
    }
  });

  const summarizeContextMutation = useMutation({
    mutationFn: async () => {
      return base44.functions.invoke('summarizeBriefContext', { briefId });
    },
    onSuccess: async () => {
      setRefreshSourcesKey((value) => value + 1);
      setStep('context_overview');
    },
    onError: () => {
      toast.error('Klarte ikke å oppsummere kildematerialet');
    }
  });

  const handleSelectTheme = (theme) => {
    setSelectedTheme(theme);
    createBriefMutation.mutate(theme);
  };

  const handleContinueFromSources = () => {
    summarizeContextMutation.mutate();
  };

  const handleContinueFromContextOverview = () => {
    setStep('select_mode');
  };

  const handleBackToSources = () => {
    setStep('source_material');
  };

  const handleSelectGuided = async () => {
    await base44.entities.Brief.update(briefId, { currentStep: 'rammer' });
    navigate(createPageUrl('BriefEditor') + `?id=${briefId}`);
  };

  // Fast mode form
  if (step === 'fast_mode') {
    return (
      <div className="max-w-3xl mx-auto">
        <FastModeForm theme={selectedTheme} onBack={() => setStep('select_mode')} />
      </div>
    );
  }

  if (step === 'source_material') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <p className="text-xs text-[#888B8D] uppercase tracking-wider mb-1">Tema valgt</p>
          <h1 className="text-2xl font-bold text-gray-900">{selectedTheme?.name}</h1>
          <p className="text-gray-500 mt-2">Legg til delt kildemateriale før du velger modus</p>
        </div>

        <Card className="border-[#002C6C]/10 bg-[#002C6C]/[0.03]">
          <CardContent className="p-4 flex items-start gap-3">
            <Upload className="h-5 w-5 text-[#002C6C] mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#454545]">Dette materialet brukes i begge moduser</p>
              <p className="text-sm text-[#888B8D] mt-1">Kildene kobles til briefen nå og oppsummeres én gang før du går videre.</p>
            </div>
          </CardContent>
        </Card>

        <SourceMaterialUpload
          key={refreshSourcesKey}
          briefId={briefId}
          sources={briefSources}
          onSourcesChange={() => setRefreshSourcesKey((value) => value + 1)}
          onContinue={handleContinueFromSources}
        />

        {summarizeContextMutation.isPending && (
          <div className="flex items-center justify-center gap-3 text-sm text-[#888B8D]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Oppsummerer kildemateriale...
          </div>
        )}
      </div>
    );
  }

  if (step === 'context_overview') {
    return (
      <ContextOverviewDisplay
        brief={brief}
        sources={briefSources.filter((source) => source.extractionStatus === 'success')}
        onBack={handleBackToSources}
        onContinue={handleContinueFromContextOverview}
      />
    );
  }

  // Mode selection
  if (step === 'select_mode') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <p className="text-xs text-[#888B8D] uppercase tracking-wider mb-1">Tema valgt</p>
          <h1 className="text-2xl font-bold text-gray-900">{selectedTheme?.name}</h1>
          <p className="text-gray-500 mt-2">Kildematerialet er klart. Velg hvordan du vil opprette briefen</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Fast Mode - visually dominant */}
          <Card
            className="cursor-pointer border-2 border-[#F26334] shadow-md hover:shadow-lg transition-all relative"
            onClick={() => {
              window.history.replaceState({}, '', createPageUrl('NewBrief') + `?briefId=${briefId}&mode=fast`);
              setStep('fast_mode');
            }}
          >

            <CardContent className="p-6">
              <div className="w-14 h-14 bg-[#F26334]/15 rounded-2xl flex items-center justify-center mb-4">
                <Zap className="h-7 w-7 text-[#F26334]" />
              </div>
              <h3 className="font-bold text-[#454545] text-xl mb-1">Hurtigmodus</h3>
              <p className="text-[#888B8D] text-sm mb-4">
                Fyll inn det du vet. Systemet følger opp det som mangler, så du kommer raskere i mål.
              </p>
              <ul className="text-xs text-[#888B8D] space-y-1.5 mb-5">
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-[#F26334] rounded-full flex-shrink-0" />Du styrer tempoet</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-[#F26334] rounded-full flex-shrink-0" />Hopper over seksjonene du allerede kan</li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-[#F26334] rounded-full flex-shrink-0" />Færre spørsmål fra systemet</li>
              </ul>
              <div className="w-full flex items-center justify-center gap-2 bg-[#F26334] text-white rounded-lg py-2.5 text-sm font-medium">
                Start hurtig <ChevronRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          {/* Guided Mode */}
          <Card
            className="cursor-pointer border-2 border-gray-200 hover:border-[#002C6C] hover:shadow-md transition-all"
            onClick={handleSelectGuided}
          >
            <CardContent className="p-6">
              {createBriefMutation.isPending ? (
                <div className="flex items-center justify-center h-full py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-[#002C6C]" />
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 bg-[#002C6C]/10 rounded-2xl flex items-center justify-center mb-4">
                    <MessageSquare className="h-7 w-7 text-[#002C6C]" />
                  </div>
                  <h3 className="font-bold text-[#454545] text-xl mb-1">Detaljert modus</h3>
                  <p className="text-[#888B8D] text-sm mb-4">
                    Systemet veileder deg gjennom alle 9 seksjoner. Perfekt når du vil tenke høyt.
                  </p>
                  <ul className="text-xs text-[#888B8D] space-y-1.5 mb-5">
                    <li className="flex items-center gap-2"><span className="w-2 h-2 bg-[#002C6C] rounded-full flex-shrink-0" />Strukturert intervju trinn for trinn</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 bg-[#002C6C] rounded-full flex-shrink-0" />Du blir ledet gjennom spørsmålene steg for steg</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 bg-[#002C6C] rounded-full flex-shrink-0" />Du kan legge til kildemateriale underveis</li>
                  </ul>
                  <div className="w-full flex items-center justify-center gap-2 border border-[#002C6C] text-[#002C6C] rounded-lg py-2.5 text-sm font-medium">
                    Start detaljert <ChevronRight className="h-4 w-4" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button variant="ghost" size="sm" className="text-[#888B8D]" onClick={() => setStep('select_theme')}>
            ← Bytt tema
          </Button>
        </div>
      </div>
    );
  }

  // Theme selection
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Start ny brief</h1>
        <p className="text-gray-500 mt-2">Velg et tema for å komme i gang</p>
      </div>

      {themesLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : themes.length === 0 ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-12 text-center">
              <Tags className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Ingen temaer ennå</h3>
              <p className="text-gray-500 mb-4">Opprett ditt første tema for å komme i gang.</p>
            </CardContent>
          </Card>
          <CreateThemeModal />
        </div>
      ) : (
        <div className="grid gap-4">
          {themes.map((theme) => (
            <Card
              key={theme.id}
              className="cursor-pointer hover:border-[#002C6C] hover:shadow-md transition-all"
              onClick={() => handleSelectTheme(theme)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-[#002C6C]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#454545] text-lg">{theme.name}</h3>
                      {theme.description && (
                        <p className="text-[#888B8D] mt-1 text-sm">{theme.description}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <CreateThemeModal />
        </div>
      )}
    </div>
  );
}

export default function NewBrief() {
  return (
    <RequireAuth>
      <NewBriefContent />
    </RequireAuth>
  );
}