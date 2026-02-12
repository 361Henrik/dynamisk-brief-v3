import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useDeleteBrief({ onSuccess } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
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
      onSuccess?.();
    },
    onError: () => {
      toast.error('Kunne ikke slette briefen');
    }
  });
}
