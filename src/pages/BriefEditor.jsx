import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft,
  Loader2,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function BriefEditorContent() {
  const urlParams = new URLSearchParams(window.location.search);
  const briefId = urlParams.get('id');

  const { data: brief, isLoading, error } = useQuery({
    queryKey: ['brief', briefId],
    queryFn: async () => {
      if (!briefId) return null;
      const briefs = await base44.entities.Brief.filter({ id: briefId });
      return briefs[0] || null;
    },
    enabled: !!briefId
  });

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

  // Placeholder - will be expanded in Phase 4
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link to={createPageUrl('BriefList')}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{brief.title}</h1>
          <p className="text-gray-500">{brief.themeName} • {brief.status === 'godkjent' ? 'Godkjent' : 'Utkast'}</p>
        </div>
      </div>

      {/* Placeholder content */}
      <Card>
        <CardHeader>
          <CardTitle>Brief-editor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Brief-editoren vil bli implementert i fase 4. Her vil du kunne:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-gray-600">
            <li>Laste opp kildemateriale (dokumenter og URL-er)</li>
            <li>Fylle ut rammer (målgruppe, mål, kanaler, etc.)</li>
            <li>Ha en AI-drevet dialog for å utdype briefen</li>
            <li>Generere den endelige briefen</li>
          </ul>
        </CardContent>
      </Card>
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