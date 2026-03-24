import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Loader2, Zap, ArrowLeft, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const SECTIONS = [
  { key: 'prosjektinformasjon', label: 'Prosjektinformasjon', description: 'Hva er prosjektet, tittelen og hvem er avsender?', required: true },
  { key: 'bakgrunn', label: 'Bakgrunn', description: 'Hva er konteksten og bakgrunnen for kommunikasjonstiltaket?' },
  { key: 'maal', label: 'Mål og suksesskriterier', description: 'Hva ønsker vi å oppnå, og hvordan måler vi suksess?' },
  { key: 'maalgrupper', label: 'Målgrupper', description: 'Hvem prøver vi å nå, og hva vet vi om dem?' },
  { key: 'verdiforslag', label: 'GS1-tilbudet og verdiforslag', description: 'Hva er det unike tilbudet fra GS1 og verdien for målgruppen?' },
  { key: 'budskap', label: 'Budskap, tone og stil', description: 'Hva er hovedbudskapet, og hvordan skal det formidles?' },
  { key: 'leveranser', label: 'Leveranser og kanaler', description: 'Hvilke leveranser skal produseres og hvor publiseres de?' },
  { key: 'rammer', label: 'Praktiske rammer og godkjenning', description: 'Hva er tidsfrister, budsjett og hvem godkjenner?' },
  { key: 'kildemateriale', label: 'Kildemateriale og referanser', description: 'Hvilket bakgrunnsmateriale er relevant for briefen?' },
];

export default function FastModeForm({ theme, onBack }) {
  const navigate = useNavigate();
  const [values, setValues] = useState({});
  const [expanded, setExpanded] = useState({ prosjektinformasjon: true });
  const [submitting, setSubmitting] = useState(false);

  const filledCount = SECTIONS.filter(s => values[s.key]?.trim()).length;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const today = format(new Date(), 'dd.MM.yyyy', { locale: nb });
      const title = `${theme.name} – ${today}`;

      // Build confirmedPoints from whatever the user filled in
      const confirmedPoints = SECTIONS
        .filter(s => values[s.key]?.trim())
        .map(s => ({
          sectionKey: s.key,
          topic: s.label,
          summary: values[s.key].trim(),
          confirmedAt: new Date().toISOString()
        }));

      const brief = await base44.entities.Brief.create({
        title,
        themeId: theme.id,
        themeName: theme.name,
        status: 'utkast',
        currentStep: confirmedPoints.length === SECTIONS.length ? 'proposed' : 'dialog',
        confirmedPoints
      });

      navigate(createPageUrl('BriefEditor') + `?id=${brief.id}`);
    } catch (err) {
      console.error(err);
      toast.error('Kunne ikke opprette briefen. Prøv igjen.');
    }
    setSubmitting(false);
  };

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-[#F26334]/10 text-[#F26334] border-[#F26334]/20">
              <Zap className="h-3 w-3 mr-1" />
              Hurtigmodus
            </Badge>
            <span className="text-sm text-[#888B8D]">Tema: <strong>{theme.name}</strong></span>
          </div>
          <h2 className="text-xl font-semibold text-[#454545]">Fyll inn det du vet</h2>
          <p className="text-sm text-[#888B8D] mt-1">
            Skriv inn informasjon der du har den. AI vil automatisk stille spørsmål om det som mangler ({SECTIONS.length - filledCount} gjenstår).
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#002C6C]">{filledCount}/{SECTIONS.length}</div>
          <div className="text-xs text-[#888B8D]">seksjoner fylt</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-[#F4F4F4] rounded-full h-2">
        <div
          className="bg-[#002C6C] h-2 rounded-full transition-all duration-300"
          style={{ width: `${(filledCount / SECTIONS.length) * 100}%` }}
        />
      </div>

      {/* Section forms */}
      {SECTIONS.map((section, idx) => {
        const isFilled = !!values[section.key]?.trim();
        const isExpanded = expanded[section.key];

        return (
          <Card
            key={section.key}
            className={`border transition-colors ${isFilled ? 'border-[#002C6C]/30 bg-[#002C6C]/[0.02]' : ''}`}
          >
            <CardHeader
              className="py-3 cursor-pointer hover:bg-[#F4F4F4] transition-colors"
              onClick={() => toggle(section.key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-colors ${
                    isFilled ? 'bg-[#002C6C] text-white' : 'bg-[#002C6C]/10 text-[#002C6C]'
                  }`}>
                    {isFilled ? '✓' : idx + 1}
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">{section.label}</CardTitle>
                    <p className="text-xs text-[#888B8D] mt-0.5">{section.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isFilled && (
                    <Badge variant="outline" className="text-xs text-[#888B8D]">
                      AI fyller inn
                    </Badge>
                  )}
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0">
                <Textarea
                  value={values[section.key] || ''}
                  onChange={(e) => setValues(prev => ({ ...prev, [section.key]: e.target.value }))}
                  placeholder={`Valgfritt – skriv hva du vet om ${section.label.toLowerCase()}...`}
                  className="min-h-[100px] resize-y text-sm"
                  autoFocus={section.key === 'prosjektinformasjon' && !values[section.key]}
                />
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Actions */}
      <div className="flex justify-between items-center pt-2 border-t border-[#B1B3B3]">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbake
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-[#002C6C] hover:bg-[#001a45]"
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Oppretter brief...</>
          ) : filledCount === SECTIONS.length ? (
            <><Zap className="h-4 w-4 mr-2" />Generer brief direkte<ArrowRight className="h-4 w-4 ml-2" /></>
          ) : (
            <><ArrowRight className="h-4 w-4 mr-2" />Start – AI fullfører resten ({SECTIONS.length - filledCount} spørsmål)</>
          )}
        </Button>
      </div>
    </div>
  );
}