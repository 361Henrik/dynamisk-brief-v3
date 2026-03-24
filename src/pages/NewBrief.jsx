import React, { useState } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CreateThemeModal from '@/components/theme/CreateThemeModal';
import FastModeForm from '@/components/brief/FastModeForm';

function NewBriefContent() {
  const navigate = useNavigate();
  const [step, setStep] = useState('select_theme'); // 'select_theme' | 'select_mode' | 'fast_mode'
  const [selectedTheme, setSelectedTheme] = useState(null);

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
      const brief = await base44.entities.Brief.create({
        title,
        themeId: theme.id,
        themeName: theme.name,
        status: 'utkast',
        currentStep: 'source_material'
      });
      return brief;
    },
    onSuccess: (brief) => {
      navigate(createPageUrl('BriefEditor') + `?id=${brief.id}`);
    }
  });

  const handleSelectTheme = (theme) => {
    setSelectedTheme(theme);
    setStep('select_mode');
  };

  const handleSelectGuided = () => {
    createBriefMutation.mutate(selectedTheme);
  };

  // Fast mode form
  if (step === 'fast_mode') {
    return (
      <div className="max-w-3xl mx-auto">
        <FastModeForm theme={selectedTheme} onBack={() => setStep('select_mode')} />
      </div>
    );
  }

  // Mode selection
  if (step === 'select_mode') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <p className="text-xs text-[#888B8D] uppercase tracking-wider mb-1">Tema valgt</p>
          <h1 className="text-2xl font-bold text-gray-900">{selectedTheme?.name}</h1>
          <p className="text-gray-500 mt-2">Velg hvordan du vil opprette briefen</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Fast Mode */}
          <Card
            className="cursor-pointer hover:border-[#F26334] hover:shadow-md transition-all border-2"
            onClick={() => setStep('fast_mode')}
          >
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-[#F26334]/10 rounded-xl flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-[#F26334]" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-[#454545] text-lg">Hurtigmodus</h3>
                <Badge className="bg-[#F26334]/10 text-[#F26334] border-[#F26334]/20 text-xs">Anbefalt</Badge>
              </div>
              <p className="text-[#888B8D] text-sm mb-4">
                Fyll inn det du vet på forhånd. AI stiller kun spørsmål om det som mangler. Raskere og mer presis.
              </p>
              <ul className="text-xs text-[#888B8D] space-y-1">
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-[#F26334] rounded-full" />Du styrer tempoet</li>
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-[#F26334] rounded-full" />Hopper over seksjonene du allerede kan</li>
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-[#F26334] rounded-full" />Færre spørsmål fra AI</li>
              </ul>
              <div className="mt-4 flex justify-end">
                <ChevronRight className="h-5 w-5 text-[#F26334]" />
              </div>
            </CardContent>
          </Card>

          {/* Guided Mode */}
          <Card
            className="cursor-pointer hover:border-[#002C6C] hover:shadow-md transition-all border-2"
            onClick={handleSelectGuided}
          >
            <CardContent className="p-6">
              {createBriefMutation.isPending ? (
                <div className="flex items-center justify-center h-full py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-[#002C6C]" />
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 bg-[#002C6C]/10 rounded-xl flex items-center justify-center mb-4">
                    <MessageSquare className="h-6 w-6 text-[#002C6C]" />
                  </div>
                  <h3 className="font-semibold text-[#454545] text-lg mb-2">Guidet modus</h3>
                  <p className="text-[#888B8D] text-sm mb-4">
                    AI stiller deg spørsmål gjennom alle 9 seksjoner. Perfekt når du vil tenke høyt eller er usikker på hva som trengs.
                  </p>
                  <ul className="text-xs text-[#888B8D] space-y-1">
                    <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-[#002C6C] rounded-full" />Strukturert intervju trinn for trinn</li>
                    <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-[#002C6C] rounded-full" />AI hjelper deg å formulere svarene</li>
                    <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-[#002C6C] rounded-full" />Laster opp kildemateriale underveis</li>
                  </ul>
                  <div className="mt-4 flex justify-end">
                    <ChevronRight className="h-5 w-5 text-[#002C6C]" />
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Start ny brief</h1>
        <p className="text-gray-500 mt-2">Velg et tema for å komme i gang</p>
      </div>
  return (
    <RequireAuth>
      <NewBriefContent />
    </RequireAuth>
  );
}