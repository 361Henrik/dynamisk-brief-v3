import React from 'react';
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
  Tags
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import CreateThemeModal from '@/components/theme/CreateThemeModal';

function NewBriefContent() {
  const navigate = useNavigate();

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
    createBriefMutation.mutate(theme);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Start ny brief</h1>
        <p className="text-gray-500 mt-2">Velg et tema for å komme i gang</p>
      </div>

      {/* Theme Selection */}
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
              className="cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
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
                  <Button 
                    variant="ghost" 
                    size="icon"
                    disabled={createBriefMutation.isPending}
                  >
                    {createBriefMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-5 w-5" />
                    )}
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