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
  Upload,
  FileText,
  ExternalLink
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

const DOC_TYPE_LABELS = {
  brand_guidelines: 'Merkevareprofil',
  tone_of_voice: 'Tone of Voice',
  playbook: 'Kommunikasjonshåndbok',
  other: 'Annet'
};

function AdminKnowledgeBaseContent() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', docType: 'other', fileUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['kbDocs', 'all'],
    queryFn: async () => {
      const allDocs = await base44.entities.KnowledgeBaseDoc.list('-created_date');
      return allDocs;
    }
  });

  const createDocMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.KnowledgeBaseDoc.create({ ...data, isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kbDocs'] });
      setShowDialog(false);
      resetForm();
    }
  });

  const updateDocMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.KnowledgeBaseDoc.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kbDocs'] });
      setShowDialog(false);
      resetForm();
    }
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.KnowledgeBaseDoc.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kbDocs'] });
    }
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', docType: 'other', fileUrl: '' });
    setEditingDoc(null);
    setSelectedFile(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleOpenEdit = (doc) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title || '',
      description: doc.description || '',
      docType: doc.docType || 'other',
      fileUrl: doc.fileUrl || ''
    });
    setShowDialog(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploading(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, fileUrl: file_url }));
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (editingDoc) {
      updateDocMutation.mutate({ id: editingDoc.id, data: formData });
    } else {
      createDocMutation.mutate(formData);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'd. MMM yyyy', { locale: nb });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kunnskapsbase</h1>
          <p className="text-gray-500 mt-1">Administrer bakgrunnsmateriale for AI-en</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleOpenCreate}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Last opp dokument
        </Button>
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
            <h3 className="text-lg font-medium text-gray-900 mb-1">Ingen dokumenter ennå</h3>
            <p className="text-gray-500 mb-4">Last opp dokumenter som AI-en skal bruke som kontekst.</p>
            <Button onClick={handleOpenCreate}>
              <Upload className="h-4 w-4 mr-2" />
              Last opp dokument
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
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                        <Badge variant="outline">{DOC_TYPE_LABELS[doc.docType] || doc.docType}</Badge>
                      </div>
                      {doc.description && (
                        <p className="text-gray-500 mt-1 text-sm">{doc.description}</p>
                      )}
                      <div className="flex items-center space-x-3 mt-2 text-xs text-gray-400">
                        <span>Oppdatert {formatDate(doc.updated_date || doc.created_date)}</span>
                        {doc.fileUrl && (
                          <a 
                            href={doc.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Åpne fil
                          </a>
                        )}
                      </div>
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
            <DialogTitle>{editingDoc ? 'Rediger dokument' : 'Last opp dokument'}</DialogTitle>
            <DialogDescription>
              {editingDoc ? 'Oppdater informasjon om dokumentet.' : 'Legg til et nytt dokument i kunnskapsbasen.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Tittel *</Label>
              <Input
                id="title"
                placeholder="f.eks. GS1 Merkevarestandard 2024"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docType">Type dokument *</Label>
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
              <Label htmlFor="description">Beskrivelse</Label>
              <Textarea
                id="description"
                placeholder="Kort beskrivelse av innholdet..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Fil</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
                {formData.fileUrl ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {selectedFile?.name || 'Fil lastet opp'}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, fileUrl: '' }));
                        setSelectedFile(null);
                      }}
                    >
                      Fjern
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center cursor-pointer">
                    {uploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    ) : (
                      <Upload className="h-8 w-8 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-500 mt-2">
                      {uploading ? 'Laster opp...' : 'Klikk for å laste opp fil'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx"
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Avbryt
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={!formData.title || !formData.fileUrl || createDocMutation.isPending || updateDocMutation.isPending}
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