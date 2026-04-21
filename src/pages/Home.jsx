import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/components/auth/AuthProvider';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  PlusCircle, 
  FileText, 
  Clock, 
  CheckCircle2,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function HomeContent() {
  const { user } = useAuth();

  const { data: briefs = [], isLoading } = useQuery({
    queryKey: ['briefs', 'all'],
    queryFn: async () => {
      return base44.entities.Brief.filter({ created_by: user?.email }, '-created_date');
    },
    enabled: !!user?.email
  });

  const draftCount = briefs.filter(b => b.status === 'utkast').length;
  const approvedCount = briefs.filter(b => b.status === 'godkjent').length;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gs1-blue rounded-2xl p-8 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Velkommen{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-blue-100 mb-4 max-w-xl">
          Bruk Dynamisk Brief til å lage komplette, kvalitetssikrede kommunikasjonsbriefs for kommunikasjonsavdelingen.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to={createPageUrl('NewBrief')}>
            <Button size="lg" variant="secondary" className="bg-white text-gs1-blue hover:bg-gs1-light-gray">
              <PlusCircle className="h-5 w-5 mr-2" />
              Start ny brief
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Totalt antall briefs</CardDescription>
            <CardTitle className="text-3xl text-gs1-dark-gray">{isLoading ? '-' : briefs.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <FileText className="h-5 w-5 text-gray-400" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Under arbeid</CardDescription>
            <CardTitle className="text-3xl text-gs1-orange">{isLoading ? '-' : draftCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Clock className="h-5 w-5 text-gs1-orange" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Godkjente</CardDescription>
            <CardTitle className="text-3xl text-gs1-blue">{isLoading ? '-' : approvedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckCircle2 className="h-5 w-5 text-gs1-blue" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Briefs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Nylige briefs</CardTitle>
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
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gs1-medium-gray" />
            </div>
          ) : briefs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gs1-border" />
              <p className="text-gs1-medium-gray">Du har ingen briefs ennå.</p>
              <Link to={createPageUrl('NewBrief')}>
                <Button variant="link" className="mt-2">
                  Opprett din første brief
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gs1-border">
              {briefs.map((brief) => (
                <Link
                  key={brief.id}
                  to={createPageUrl('BriefEditor') + `?id=${brief.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gs1-light-gray -mx-4 px-4 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      brief.status === 'godkjent' ? 'bg-[#002C6C]' : 'bg-[#F26334]'
                    }`} />
                    <div>
                      <p className="font-medium text-gs1-dark-gray">{brief.title}</p>
                      <p className="text-sm text-gs1-medium-gray">{brief.themeName || 'Ukjent tema'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      brief.status === 'godkjent' 
                        ? 'bg-gs1-blue/10 text-gs1-blue' 
                        : 'bg-gs1-orange/10 text-gs1-orange'
                    }`}>
                      {brief.status === 'godkjent' ? 'Godkjent' : 'Utkast'}
                    </span>
                    <ArrowRight className="h-4 w-4 text-gs1-medium-gray" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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