import React, { useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { 
  BookOpen, 
  PlusCircle, 
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  AlignLeft,
  Info
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const MAX_CHARS = 2000;

const DOC_TYPE_LABELS = {
  brand_guidelines: 'Merkevareprofil',
  tone_of_voice: 'Tone of Voice',
  playbook: 'Kommunikasjonshåndbok',
  other: 'Annet'
};

const emptyForm = { title: '', description: '', docType: 'other', extractedText: '' };

function AdminKnowledgeBaseContent() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['kbDocs', 'all'],
    queryFn: () => base44.entities.KnowledgeBaseDoc.list('-created_date')
  });

  const createDocMutation = useMutation({
    mutationFn: (data) => base44.entities.KnowledgeBaseDoc.create({ 
      ...data, 
      isActive: true,
      extractionStatus: 'success'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kbDocs'] });
      setShowDialog(false);
      setFormData(emptyForm);
      setEditingDoc(null);
    }
  });

  const updateDocMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KnowledgeBaseDoc.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kbDocs'] });
      setShowDialog(false);
      setFormData(emptyForm);
      setEditingDoc(null);
    }
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id) => base44.entities.KnowledgeBaseDoc.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kbDocs'] })
  });

  const handleOpenCreate = () => {
    setEditingDoc(null);
    setFormData(emptyForm);
    setShowDialog(true);
  };

  const handleOpenEdit = (doc) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title || '',
      description: doc.description || '',
      docType: doc.docType || 'other',
      extractedText: doc.extractedText || ''
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (editingDoc) {
      updateDocMutation.mutate({ id: editingDoc.id, data: formData });
    } else {
      createDocMutation.mutate(formData);
    }
  };

  const charsUsed = formData.extractedText.length;
  const charsRemaining = MAX_CHARS - charsUsed;
  const isOverLimit = charsUsed > MAX_CHARS;
  const canSubmit = formData.title && formData.extractedText.trim() && !isOverLimit;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'd. MMM yyyy', { locale: nb });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#454545]">Kunnskapsbase</h1>
          <p className="text-[#888B8D] mt-1">Administrer bakgrunnstekster for AI-kontekst</p>
        </div>
        <Button className="bg-[#002C6C] hover:bg-[#002C6C]/90" onClick={handleOpenCreate}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Legg til dokument
        </Button>
      </div>

      {/* Info notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Teksten du skriver her blir brukt som bakgrunnskontekst for AI-en når briefs genereres for tilknyttede temaer. 
            Maks {MAX_CHARS.toLocaleString()} tegn (~300 ord).
          </p>
        </div>
      </div>

      {/* Document List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-[#454545] mb-1">Ingen dokumenter ennå</h3>
            <p className="text-[#888B8D] mb-4">Legg til bakgrunnstekster som AI-en skal bruke som kontekst.</p>
            <Button onClick={handleOpenCreate} className="bg-[#002C6C] hover:bg-[#002C6C]/90">
              <PlusCircle className="h-4 w-4 mr-2" />
              Legg til dokument
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {docs.map((doc) => (
            <Card key={doc.id} className={doc.isActive === false ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-[#002C6C]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlignLeft className="h-5 w-5 text-[#002C6C]" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h3 className="font-semibold text-[#454545]">{doc.title}</h3>
                        <Badge variant="outline">{DOC_TYPE_LABELS[doc.docType] || doc.docType}</Badge>
                      </div>
                      {doc.description && (
                        <p className="text-[#888B8D] mt-1 text-sm">{doc.description}</p>
                      )}
                      {doc.extractedText && (
                        <p className="text-[#454545] mt-2 text-sm line-clamp-2">{doc.extractedText}</p>
                      )}
                      <p className="text-xs text-[#B1B3B3] mt-2">
                        Oppdatert {formatDate(doc.updated_date || doc.created_date)}
                        {doc.extractedText && ` · ${doc.extractedText.length} tegn`}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEdit(doc)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Rediger
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => deleteDocMutation.mutate(doc.id)}
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
            <DialogTitle>{editingDoc ? 'Rediger dokument' : 'Legg til dokument'}</DialogTitle>
            <DialogDescription>
              {editingDoc ? 'Oppdater bakgrunnsteksten.' : 'Skriv inn bakgrunnstekst som AI-en skal bruke som kontekst.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Tittel *</Label>
              <Input
                id="title"
                placeholder="f.eks. GS1 Merkevarestandard"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docType">Type</Label>
              <Select 
                value={formData.docType} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, docType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brand_guidelines">Merkevareprofil</SelectItem>
                  <SelectItem value="tone_of_voice">Tone of Voice</SelectItem>
                  <SelectItem value="playbook">Kommunikasjonshåndbok</SelectItem>
                  <SelectItem value="other">Annet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Kort beskrivelse</Label>
              <Input
                id="description"
                placeholder="Hva handler dette dokumentet om?"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="extractedText">Bakgrunnstekst *</Label>
                <span className={`text-xs ${isOverLimit ? 'text-red-500 font-medium' : 'text-[#888B8D]'}`}>
                  {charsRemaining >= 0 ? `${charsRemaining} tegn igjen` : `${Math.abs(charsRemaining)} tegn for mye`}
                </span>
              </div>
              <Textarea
                id="extractedText"
                placeholder="Lim inn eller skriv inn bakgrunnsteksten her..."
                className="min-h-[160px] resize-none"
                value={formData.extractedText}
                onChange={(e) => setFormData(prev => ({ ...prev, extractedText: e.target.value }))}
              />
              {isOverLimit && (
                <p className="text-xs text-red-500">Teksten er for lang. Maks {MAX_CHARS.toLocaleString()} tegn.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Avbryt
            </Button>
            <Button 
              className="bg-[#002C6C] hover:bg-[#002C6C]/90"
              onClick={handleSubmit}
              disabled={!canSubmit || createDocMutation.isPending || updateDocMutation.isPending}
            >
              {createDocMutation.isPending || updateDocMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingDoc ? 'Lagre endringer' : 'Legg til'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminKnowledgeBase() {
  return (
    <RequireAuth requireAdmin>
      <AdminKnowledgeBaseContent />
    </RequireAuth>
  );
}