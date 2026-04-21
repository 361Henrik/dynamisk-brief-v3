import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, FileText, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

const DOC_TYPE_LABELS = {
  brief_template: 'Briefmal',
  brand_guidelines: 'Merkevareprofil',
  tone_of_voice: 'Tone of Voice',
  playbook: 'Kommunikasjonshåndbok',
  other: 'Annet'
};

function ReferenceLibraryList({ docs = [], selectedIds = [], onToggle }) {
  if (docs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gs1-border p-6 text-center">
        <BookOpen className="h-8 w-8 mx-auto text-gs1-medium-gray mb-2" />
        <p className="text-sm text-gs1-medium-gray">Ingen delte referansedokumenter er lagt inn ennå.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      {docs.map((doc) => {
        const checked = selectedIds.includes(doc.id);
        return (
          <label
            key={doc.id}
            className="flex items-start gap-3 rounded-lg border border-gs1-border p-4 cursor-pointer hover:bg-gs1-light-gray/40"
          >
            <Checkbox checked={checked} onCheckedChange={() => onToggle(doc.id)} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gs1-dark-gray">{doc.title}</p>
                <Badge variant="outline">{DOC_TYPE_LABELS[doc.docType] || doc.docType}</Badge>
              </div>
              {doc.description && (
                <p className="text-xs text-gs1-medium-gray mt-1">{doc.description}</p>
              )}
              {doc.extractedText && (
                <p className="text-sm text-gs1-dark-gray mt-2 line-clamp-3">{doc.extractedText}</p>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}

export default function SharedReferenceSelector({ selectedIds = [], onChange }) {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['kbDocs', 'active-reference'],
    queryFn: async () => {
      const allDocs = await base44.entities.KnowledgeBaseDoc.filter({ isActive: true });
      return allDocs.filter((doc) => doc.extractedText);
    }
  });

  const selectedDocs = docs.filter((doc) => selectedIds.includes(doc.id));

  const handleToggle = (docId) => {
    if (selectedIds.includes(docId)) {
      onChange(selectedIds.filter((id) => id !== docId));
      return;
    }
    onChange([...selectedIds, docId]);
  };

  return (
    <Card className="border-[#002C6C]/10 bg-white">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#002C6C]" />
              <p className="text-sm font-medium text-gs1-dark-gray">Delte referansedokumenter</p>
            </div>
            <p className="text-sm text-gs1-medium-gray mt-1">
              Dette er supplerende referansemateriale som lagres på briefen. Det erstatter ikke brief-spesifikke kilder, og brukes ikke i den nåværende AI-oppsummeringen.
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Velg dokumenter</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Velg delte referansedokumenter</DialogTitle>
                <DialogDescription>
                  Marker dokumenter som er relevante for denne briefen. De lagres som supplerende referanser for briefen, men inngår ikke i den nåværende AI-oppsummeringen av kildematerialet.
                </DialogDescription>
              </DialogHeader>
              {isLoading ? (
                <div className="py-10 text-center text-sm text-gs1-medium-gray">Laster referansedokumenter...</div>
              ) : (
                <ReferenceLibraryList docs={docs} selectedIds={selectedIds} onToggle={handleToggle} />
              )}
            </DialogContent>
          </Dialog>
        </div>

        {selectedDocs.length > 0 ? (
          <div className="space-y-3">
            {selectedDocs.map((doc) => (
              <div key={doc.id} className="flex items-start gap-3 rounded-lg border border-gs1-border bg-gs1-light-gray/30 p-3">
                <div className="rounded-md bg-[#002C6C]/10 p-2 mt-0.5">
                  <FileText className="h-4 w-4 text-[#002C6C]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gs1-dark-gray">{doc.title}</p>
                    <Badge variant="outline">{DOC_TYPE_LABELS[doc.docType] || doc.docType}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-gs1-medium-gray">
                      <CheckCircle2 className="h-3 w-3" /> Valgt
                    </span>
                  </div>
                  {doc.description && <p className="text-xs text-gs1-medium-gray mt-1">{doc.description}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gs1-border p-4 flex items-start gap-2">
            <Info className="h-4 w-4 text-gs1-medium-gray mt-0.5" />
            <p className="text-sm text-gs1-medium-gray">
              Ingen supplerende referansedokumenter er valgt for denne briefen ennå.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}