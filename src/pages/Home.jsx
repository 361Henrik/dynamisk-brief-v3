import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/components/auth/AuthProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { formatDateShort, formatRelativeTime } from '@/utils/dateFormatters';
import { 
  PlusCircle, 
  FileText, 
  Clock, 
  CheckCircle2,
  ArrowRight,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-24 bg-muted rounded skeleton-pulse" />
        <div className="h-8 w-12 bg-muted rounded skeleton-pulse mt-2" />
      </CardHeader>
      <CardContent>
        <div className="h-5 w-5 bg-muted rounded skeleton-pulse" />
      </CardContent>
    </Card>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3 px-4">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-muted skeleton-pulse" />
        <div>
          <div className="h-4 w-40 bg-muted rounded skeleton-pulse" />
          <div className="h-3 w-24 bg-muted rounded skeleton-pulse mt-1.5" />
        </div>
      </div>
      <div className="h-5 w-16 bg-muted rounded-full skeleton-pulse" />
    </div>
  );
}

function HomeContent() {
  const { user } = useAuth();

  const { data: briefs = [], isLoading } = useQuery({
    queryKey: ['briefs', 'recent'],
    queryFn: async () => {
      const allBriefs = await base44.entities.Brief.filter({ created_by: user?.email }, '-created_date', 5);
      return allBriefs;
    },
    enabled: !!user?.email
  });

  const draftCount = briefs.filter(b => b.status === 'utkast').length;
  const approvedCount = briefs.filter(b => b.status === 'godkjent').length;
  const lastDraft = briefs.find(b => b.status === 'utkast');

  return (
    <div className="animate-fade-in-up space-y-8">
      {/* Welcome Section */}
      <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance mb-2">
            {'Velkommen'}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}{'!'}
          </h1>
          <p className="text-blue-100 mb-6 max-w-xl leading-relaxed">
            Bruk Dynamisk Brief til å lage komplette, kvalitetssikrede kommunikasjonsbriefs for kommunikasjonsavdelingen.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to={createPageUrl('NewBrief')}>
              <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50">
                <PlusCircle className="h-5 w-5 mr-2" />
                Start ny brief
              </Button>
            </Link>
            {lastDraft && (
              <Link to={createPageUrl('BriefEditor') + `?id=${lastDraft.id}`}>
                <Button size="lg" variant="ghost" className="text-white border border-white/30 hover:bg-white/10">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Fortsett siste utkast
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardDescription>Totalt antall briefs</CardDescription>
                <CardTitle className="text-3xl">{briefs.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardDescription>Under arbeid</CardDescription>
                <CardTitle className="text-3xl text-orange-600 dark:text-orange-400">{draftCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <Clock className="h-5 w-5 text-orange-400" />
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardDescription>Godkjente</CardDescription>
                <CardTitle className="text-3xl text-green-600 dark:text-green-400">{approvedCount}</CardTitle>
              </CardHeader>
              <CardContent>
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Recent Briefs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="tracking-tight">Nylige briefs</CardTitle>
            <CardDescription>Dine siste briefs</CardDescription>
          </div>
          <Link to={createPageUrl('BriefList')}>
            <Button variant="ghost" size="sm">
              Se alle
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="divide-y divide-border -mx-4">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : briefs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p>Du har ingen briefs enno.</p>
              <Link to={createPageUrl('NewBrief')}>
                <Button variant="link" className="mt-2">
                  Opprett din første brief
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border -mx-4">
              {briefs.map((brief) => (
                <Link
                  key={brief.id}
                  to={createPageUrl('BriefEditor') + `?id=${brief.id}`}
                  className="flex items-center justify-between py-3 hover:bg-muted/50 px-4 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      brief.status === 'godkjent' ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    <div>
                      <p className="font-medium text-foreground">{brief.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {brief.themeName || 'Ukjent tema'}
                        {brief.created_date && ` · ${formatRelativeTime(brief.created_date)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      brief.status === 'godkjent' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' 
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                    }`}>
                      {brief.status === 'godkjent' ? 'Godkjent' : 'Utkast'}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to={createPageUrl('BriefList')}>
          <Card className="hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <FolderOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Mine briefs</h3>
                <p className="text-sm text-muted-foreground">Se alle dine briefs og filtrer etter status</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
        <Link to={createPageUrl('NewBrief')}>
          <Card className="hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <PlusCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Ny brief</h3>
                <p className="text-sm text-muted-foreground">Velg et tema og start en ny brief</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <RequireAuth>
      <HomeContent />
    </RequireAuth>
  );
}
