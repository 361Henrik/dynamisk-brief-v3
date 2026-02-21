import React, { useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Tags, 
  PlusCircle, 
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

function AdminThemesContent() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', linkedKnowledgeBaseDocs: [] });

  const { data: themes = [], isLoading: themesLoading } = useQuery({
    queryKey: ['themes'],
    queryFn: async () => {
      const allThemes = await base44.entities.Theme.list('-created_date');
      return allThemes;
    }
  });

  const { data: kbDocs = [] } = useQuery({
    queryKey: ['kbDocs'],
    queryFn: async () => {
      const allDocs = await base44.entities.KnowledgeBaseDoc.filter({ isActive: true });
      return allDocs;
    }
  });

  const createThemeMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Theme.create({ ...data, isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      setShowDialog(false);
      resetForm();
    }
  });

  const updateThemeMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Theme.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      setShowDialog(false);
      resetForm();
    }
  });

  const deleteThemeMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Theme.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
    }
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', linkedKnowledgeBaseDocs: [] });
    setEditingTheme(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleOpenEdit = (theme) => {
    setEditingTheme(theme);
    setFormData({
      name: theme.name || '',
      description: theme.description || '',
      linkedKnowledgeBaseDocs: theme.linkedKnowledgeBaseDocs || []
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (editingTheme) {
      updateThemeMutation.mutate({ id: editingTheme.id, data: formData });
    } else {
      createThemeMutation.mutate(formData);
    }
  };

  const toggleLinkedDoc = (docId) => {
    setFormData(prev => ({
      ...prev,
      linkedKnowledgeBaseDocs: prev.linkedKnowledgeBaseDocs.includes(docId)
        ? prev.linkedKnowledgeBaseDocs.filter(id => id !== docId)
        : [...prev.linkedKnowledgeBaseDocs, docId]
    }));
  };

  const getLinkedDocNames = (theme) => {
    if (!theme.linkedKnowledgeBaseDocs?.length) return [];
    return theme.linkedKnowledgeBaseDocs
      .map(id => kbDocs.find(doc => doc.id === id)?.title)
      .filter(Boolean);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#454545]">Temaer</h1>
          <p className="text-[#888B8D] mt-1">Administrer temaer for briefs</p>
        </div>
        <Button className="bg-[#002C6C] hover:bg-[#001d47]" onClick={handleOpenCreate}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nytt tema
        </Button>
      </div>

      {/* Theme List */}
      {themesLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : themes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Tags className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">Ingen temaer ennå</h3>
            <p className="text-gray-500 mb-4">Opprett det første temaet for å komme i gang.</p>
            <Button onClick={handleOpenCreate}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Opprett tema
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {themes.map((theme) => (
            <Card key={theme.id} className={theme.isActive === false ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-[#002C6C]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Tags className="h-5 w-5 text-[#002C6C]" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-[#454545]">{theme.name}</h3>
                        {theme.isActive === false && (
                          <Badge variant="secondary">Deaktivert</Badge>
                        )}
                      </div>
                      {theme.description && (
                        <p className="text-[#888B8D] mt-1">{theme.description}</p>
                      )}
                      {getLinkedDocNames(theme).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {getLinkedDocNames(theme).map((name, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              <BookOpen className="h-3 w-3 mr-1" />
                              {name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEdit(theme)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Rediger
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => deleteThemeMutation.mutate(theme.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Slett
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTheme ? 'Rediger tema' : 'Nytt tema'}</DialogTitle>
            <DialogDescription>
              {editingTheme ? 'Oppdater informasjon om temaet.' : 'Opprett et nytt tema for briefs.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Navn *</Label>
              <Input
                id="name"
                placeholder="f.eks. GLN, GTIN, Sporbarhet"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beskrivelse</Label>
              <Textarea
                id="description"
                placeholder="Kort beskrivelse av temaet..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            {kbDocs.length > 0 && (
              <div className="space-y-2">
                <Label>Koblede kunnskapsbase-dokumenter</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {kbDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`doc-${doc.id}`}
                        checked={formData.linkedKnowledgeBaseDocs.includes(doc.id)}
                        onCheckedChange={() => toggleLinkedDoc(doc.id)}
                      />
                      <label htmlFor={`doc-${doc.id}`} className="text-sm cursor-pointer">
                        {doc.title}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Avbryt
            </Button>
            <Button 
            className="bg-[#002C6C] hover:bg-[#001d47]"
              onClick={handleSubmit}
              disabled={!formData.name || createThemeMutation.isPending || updateThemeMutation.isPending}
            >
              {createThemeMutation.isPending || updateThemeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingTheme ? 'Lagre endringer' : 'Opprett tema'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminThemes() {
  return (
    <RequireAuth requireAdmin>
      <AdminThemesContent />
    </RequireAuth>
  );
}