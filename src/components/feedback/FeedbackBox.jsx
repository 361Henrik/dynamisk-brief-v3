import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/auth/AuthProvider';
import { MessageSquarePlus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'bug',         label: '🐛 Feil / bug' },
  { value: 'improvement', label: '💡 Forbedring' },
  { value: 'idea',        label: '✨ Idé' },
];

const SEVERITIES = [
  { value: 'stopper_meg', label: 'Stopper meg' },
  { value: 'irriterende', label: 'Irriterende' },
  { value: 'mindre',      label: 'Mindre viktig' },
];

export default function FeedbackBox({ pageContext, stepContext, briefId }) {
  const { user } = useAuth();
  const boxRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [severity, setSeverity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggle = () => {
    setOpen(v => {
      if (!v) setTimeout(() => boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
      return !v;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !message.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        category,
        message: message.trim(),
        pageContext: pageContext || '',
        stepContext: stepContext || '',
      };
      if (briefId) payload.briefId = briefId;
      if (email.trim()) payload.submittedEmail = email.trim();
      if (category === 'bug' && severity) payload.severity = severity;

      const res = await base44.functions.invoke('submitFeedback', payload);
      const result = res.data;

      if (result?.stored && result?.emailed) {
        toast.success('Takk! Tilbakemeldingen er sendt.');
      } else if (result?.stored) {
        toast.success('Takk! Tilbakemeldingen er lagret, men e-post kunne ikke sendes.');
      } else {
        toast.error('Klarte ikke å lagre tilbakemelding. Prøv igjen.');
      }

      setCategory('');
      setMessage('');
      setSeverity('');
      setOpen(false);
    } catch (err) {
      toast.error('Klarte ikke å sende tilbakemelding. Prøv igjen.');
    }
    setSubmitting(false);
  };

  return (
    <div ref={boxRef} className="mt-6">
      {/* Trigger */}
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs text-[#888B8D] hover:text-[#002C6C] transition-colors"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
        Gi tilbakemelding
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {/* Collapsible form */}
      {open && (
        <form onSubmit={handleSubmit} className="mt-3 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
          <p className="text-xs font-medium text-[#454545]">Din tilbakemelding hjelper oss å forbedre!</p>

          {/* Category */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => { setCategory(c.value); if (c.value !== 'bug') setSeverity(''); }}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  category === c.value
                    ? 'bg-[#002C6C] text-white border-[#002C6C]'
                    : 'bg-white text-[#454545] border-gray-300 hover:border-[#002C6C]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Severity (bug only) */}
          {category === 'bug' && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-[#888B8D] self-center">Alvorlighetsgrad:</span>
              {SEVERITIES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSeverity(s.value)}
                  className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                    severity === s.value
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-[#454545] border-gray-300 hover:border-red-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Message */}
          <Textarea
            placeholder="Hva fungerte bra? Hva kan bli bedre? Hvilke ideer har du?"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />

          {/* Optional email */}
          <Input
            type="email"
            placeholder="E-post (valgfritt)"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="text-sm"
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Avbryt</Button>
            <Button
              type="submit"
              size="sm"
              disabled={!category || !message.trim() || submitting}
              className="bg-[#002C6C] hover:bg-[#001a45] text-white"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Send inn
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}