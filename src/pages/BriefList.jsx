import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/components/auth/AuthProvider';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { 
  FileText, 
  PlusCircle, 
  Search,
  Filter,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DeleteBriefDialog from '@/components/brief/DeleteBriefDialog';
import { toast } from 'sonner';

function BriefListContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const urlParams = new URLSearchParams(window.location.search);
  const activeThemeId = urlParams.get('themeId');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [briefToDelete, setBriefToDelete] = useState(null);

  const { data: briefs = [], isLoading } = useQuery({
    queryKey: ['briefs', 'all'],
    queryFn: async () => {
      return base44.entities.Brief.filter({ created_by: user?.email }, '-created_date');
    },
    enabled: !!user?.email
  });

  const { data: themes = [] } = useQuery({
    queryKey: ['themes'],
    queryFn: async () => base44.entities.Theme.list(),
  });

  const deleteBriefMutation = useMutation({
    mutationFn: async (briefId) => {
      const [sources, dialogEntries] = await Promise.all([
        base44.entities.BriefSourceMaterial.filter({ briefId }),
        base44.entities.DialogEntry.filter({ briefId })
      ]);
      await Promise.all([
        ...sources.map(s => base44.entities.BriefSourceMaterial.delete(s.id)),
        ...dialogEntries.map(d => base44.entities.DialogEntry.delete(d.id))
      ]);
      await base44.entities.Brief.delete(briefId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefs'] });
      toast.success('Briefen ble slettet');
      setDeleteDialogOpen(false);
      setBriefToDelete(null);
    },
    onError: () => {
      toast.error('Kunne ikke slette briefen');
    }
  });

  const handleDeleteClick = (e, brief) => {
    e.preventDefault();
    e.stopPropagation();
    setBriefToDelete(brief);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (briefToDelete) {
      deleteBriefMutation.mutate(briefToDelete.id);
    }
  };

  const activeThemeName = activeThemeId ? themes.find(t => t.id === activeThemeId)?.name : null;

  const filteredBriefs = briefs.filter(brief => {
    const matchesSearch = !searchQuery || 
      brief.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brief.themeName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || brief.status === statusFilter;
    const matchesTheme = !activeThemeId || brief.themeId === activeThemeId;
    return matchesSearch && matchesStatus && matchesTheme;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'd. MMM yyyy', { locale: nb });
  };

  // Group filtered briefs by theme name
  const grouped = {};
  filteredBriefs.forEach((brief) => {
    const key = brief.themeName || 'Ukategorisert';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(brief);
  });

  // Order: known themes first (in their defined order), then Ukategorisert last
  const themeOrder = themes.map(t => t.name);
  const sortedKeys = [
    ...themeOrder.filter(name => grouped[name]),
    ...Object.keys(grouped).filter(k => !themeOrder.includes(k))
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gs1-dark-gray">Mine briefs</h1>
          <p className="text-gs1-medium-gray mt-1">Oversikt over alle dine briefs</p>
        </div>
        <Link to={createPageUrl('NewBrief')}>
          <Button className="bg-gs1-blue hover:bg-gs1-blue/90">
            <PlusCircle className="h-4 w-4 mr-2" />
            Start ny brief
          </Button>
        </Link>
      </div>

      {/* Active theme filter pill */}
      {activeThemeName && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#454545]">Filtrert på tema:</span>
          <span className="inline-flex items-center gap-1 bg-[#002C6C]/10 text-[#002C6C] text-sm px-3 py-1 rounded-full font-medium">
            {activeThemeName}
            <a href={createPageUrl('BriefList')} className="ml-1 text-[#002C6C]/60 hover:text-[#002C6C]">✕</a>
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gs1-medium-gray" />
          <Input
            placeholder="Søk i briefs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2 text-gray-400" />
            <SelectValue placeholder="Filtrer på status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statuser</SelectItem>
            <SelectItem value="utkast">Utkast</SelectItem>
            <SelectItem value="godkjent">Godkjent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Brief List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gs1-medium-gray" />
        </div>
      ) : filteredBriefs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gs1-border" />
            {briefs.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-gs1-dark-gray mb-1">Ingen briefs ennå</h3>
                <p className="text-gs1-medium-gray mb-4">Kom i gang ved å opprette din første brief.</p>
                <Link to={createPageUrl('NewBrief')}>
                  <Button className="bg-gs1-blue hover:bg-gs1-blue/90">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Start ny brief
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gs1-dark-gray mb-1">Ingen treff</h3>
                <p className="text-gs1-medium-gray">Prøv å endre søket eller filteret ditt.</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {sortedKeys.map((themeName) => (
            <div key={themeName}>
              <h2 className="text-xs font-semibold text-gs1-medium-gray uppercase tracking-wider mb-3 px-1">
                {themeName}
              </h2>
              <div className="space-y-3">
                {grouped[themeName].map((brief) => (
                  <Link
                    key={brief.id}
                    to={createPageUrl('BriefEditor') + `?id=${brief.id}`}
                    className="block"
                  >
                    <Card className="hover:border-[#002C6C]/30 hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              brief.status === 'godkjent' ? 'bg-gs1-blue/10' : 'bg-gs1-orange/10'
                            }`}>
                              {brief.status === 'godkjent'
                                ? <CheckCircle2 className="h-5 w-5 text-gs1-blue" />
                                : <Clock className="h-5 w-5 text-gs1-orange" />
                              }
                            </div>
                            <div>
                              <h3 className="font-medium text-gs1-dark-gray">{brief.title}</h3>
                              <div className="flex items-center space-x-3 text-sm text-gs1-medium-gray mt-1">
                                <span>Opprettet {formatDate(brief.created_date)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                              brief.status === 'godkjent'
                                ? 'bg-gs1-blue/10 text-gs1-blue'
                                : 'bg-gs1-orange/10 text-gs1-orange'
                            }`}>
                              {brief.status === 'godkjent' ? 'Godkjent' : 'Utkast'}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {brief.status !== 'godkjent' ? (
                                  <DropdownMenuItem
                                    onClick={(e) => handleDeleteClick(e, brief)}
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Slett brief
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled className="text-gs1-medium-gray">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Kan ikke slette godkjent brief
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <ArrowRight className="h-5 w-5 text-gs1-medium-gray" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
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

export default function BriefList() {
  return (
    <RequireAuth>
      <BriefListContent />
    </RequireAuth>
  );
}