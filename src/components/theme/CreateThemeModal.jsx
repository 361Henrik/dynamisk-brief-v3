import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function CreateThemeModal({ onThemeCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const createThemeMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.Theme.create({
        name: name.trim(),
        description: description.trim() || undefined,
        isActive: true
      });
    },
    onSuccess: (newTheme) => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      toast.success('Tema opprettet!');
      setName('');
      setDescription('');
      setOpen(false);
      if (onThemeCreated) {
        onThemeCreated(newTheme);
      }
    },
    onError: () => {
      toast.error('Kunne ikke opprette tema');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    createThemeMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full border-dashed border-2 h-auto py-6">
          <Plus className="h-5 w-5 mr-2" />
          Opprett nytt tema
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Opprett nytt tema</DialogTitle>
          <DialogDescription>
            Legg til et nytt tema som du og andre kan bruke til å lage briefs. En god beskrivelse hjelper AI-en med å generere mer relevante utkast.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Navn på tema *</Label>
            <Input
              id="name"
              placeholder="F.eks. Produktdata og kvalitet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse *</Label>
            <Textarea
              id="description"
              placeholder="Beskriv hva temaet handler om. Dette brukes som kontekst når AI-en genererer briefs for dette temaet. (maks 500 tegn)"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={4}
              required
            />
            <p className="text-xs text-right text-[#888B8D]">{description.length}/500</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={!name.trim() || !description.trim() || createThemeMutation.isPending}>
              {createThemeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Oppretter...
                </>
              ) : (
                'Opprett tema'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}