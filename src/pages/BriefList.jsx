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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [briefToDelete, setBriefToDelete] = useState(null);

  const { data: briefs = [], isLoading } = useQuery({
    queryKey: ['briefs', 'all'],
    queryFn: async () => {
      const allBriefs = await base44.entities.Brief.filter({ created_by: user?.email }, '-created_date');
      return allBriefs;
    },
    enabled: !!user?.email
  });

  const deleteBriefMutation = useMutation({
    mutationFn: async (briefId) => {
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

  const filteredBriefs = briefs.filter(brief => {
    const matchesSearch = !searchQuery || 
      brief.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brief.themeName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || brief.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'd. MMM yyyy', { locale: nb });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mine briefs</h1>
          <p className="text-gray-500 mt-1">Oversikt over alle dine briefs</p>
        </div>
        <Link to={createPageUrl('NewBrief')}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="h-4 w-4 mr-2" />
            Start ny brief
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredBriefs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            {briefs.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Ingen briefs ennå</h3>
                <p className="text-gray-500 mb-4">Kom i gang ved å opprette din første brief.</p>
                <Link to={createPageUrl('NewBrief')}>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Start ny brief
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Ingen treff</h3>
                <p className="text-gray-500">Prøv å endre søket eller filteret ditt.</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBriefs.map((brief) => (
            <Link
              key={brief.id}
              to={createPageUrl('BriefEditor') + `?id=${brief.id}`}
              className="block"
            >
              <Card className="hover:border-blue-200 hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        brief.status === 'godkjent' ? 'bg-green-100' : 'bg-orange-100'
                      }`}>
                        {brief.status === 'godkjent' 
                          ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                          : <Clock className="h-5 w-5 text-orange-600" />
                        }
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{brief.title}</h3>
                        <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <span>{brief.themeName || 'Ukjent tema'}</span>
                          <span>•</span>
                          <span>Opprettet {formatDate(brief.created_date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        brief.status === 'godkjent' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-700'
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
                            <DropdownMenuItem disabled className="text-gray-400">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Kan ikke slette godkjent brief
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
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