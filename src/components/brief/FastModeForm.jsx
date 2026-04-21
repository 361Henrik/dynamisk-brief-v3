import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
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
  const urlParams = new URLSearchParams(window.location.search);
  const briefId = urlParams.get('briefId');
  const [values, setValues] = useState({});
  const [expanded, setExpanded] = useState({ prosjektinformasjon: true });
  const [submitting, setSubmitting] = useState(false);

  const { data: brief, isLoading: briefLoading } = useQuery({
    queryKey: ['brief-fast-mode', briefId],
    queryFn: () => base44.entities.Brief.get(briefId),
    enabled: !!briefId
  });

  useEffect(() => {
    if (!brief?.contextSummary) return;

    setValues((prev) => ({
      ...prev,
      bakgrunn: prev.bakgrunn || brief.contextSummary.backgroundSummary || '',
      maal: prev.maal || brief.contextSummary.objectivesSummary || '',
      maalgrupper: prev.maalgrupper || brief.contextSummary.targetAudienceSummary || '',
      budskap: prev.budskap || [brief.contextSummary.keyMessagesSummary, brief.contextSummary.toneSummary].filter(Boolean).join('\n\n'),
      prosjektinformasjon: prev.prosjektinformasjon || brief.contextSummary.missingInformationSummary || '',
      kildemateriale: prev.kildemateriale || brief.contextSummary.backgroundSummary || ''
    }));
  }, [brief]);

  const filledCount = SECTIONS.filter(s => values[s.key]?.trim()).length;

  const handleSubmit = async () => {
    if (!briefId) {
      toast.error('Mangler brief-ID for hurtigmodus');
      return;
    }

    setSubmitting(true);
    try {
      const confirmedPoints = SECTIONS
        .filter(s => values[s.key]?.trim())
        .map(s => ({
          sectionKey: s.key,
          topic: s.label,
          summary: values[s.key].trim(),
          confirmedAt: new Date().toISOString()
        }));

      await base44.entities.Brief.update(briefId, {
        currentStep: confirmedPoints.length === SECTIONS.length ? 'proposed' : 'dialog',
        confirmedPoints
      });

      navigate(createPageUrl('BriefEditor') + `?id=${briefId}`);
    } catch (err) {
      console.error(err);
      toast.error('Kunne ikke oppdatere briefen. Prøv igjen.');
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
            <Badge className="bg-gs1-orange/10 text-gs1-orange border-gs1-orange/20">
              <Zap className="h-3 w-3 mr-1" />
              Hurtigmodus
            </Badge>
            <span className="text-sm text-gs1-medium-gray">Tema: <strong>{theme.name}</strong></span>
          </div>
          <h2 className="text-xl font-semibold text-gs1-dark-gray">Fyll inn det du vet</h2>
          <p className="text-sm text-gs1-medium-gray mt-1">
            Skriv inn informasjon der du har den. AI vil automatisk stille spørsmål om det som mangler ({SECTIONS.length - filledCount} gjenstår).
          </p>
          {brief?.contextSummary && (
            <p className="text-xs text-gs1-medium-gray mt-2">
              Felter er forhåndsutfylt fra delt kildemateriale der det finnes forslag.
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gs1-blue">{filledCount}/{SECTIONS.length}</div>
          <div className="text-xs text-gs1-medium-gray">seksjoner fylt</div>
        </div>
      </div>

      {briefLoading && (
        <div className="flex items-center gap-2 text-sm text-gs1-medium-gray">
          <Loader2 className="h-4 w-4 animate-spin" />
          Laster delt kildesammendrag...
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full bg-gs1-light-gray rounded-full h-2">
        <div
          className="bg-gs1-blue h-2 rounded-full transition-all duration-300"
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
            className={`border transition-colors ${isFilled ? 'border-gs1-blue/30 bg-gs1-blue/[0.02]' : ''}`}
          >
            <CardHeader
              className="py-3 cursor-pointer hover:bg-gs1-light-gray transition-colors"
              onClick={() => toggle(section.key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-colors ${
                    isFilled ? 'bg-gs1-blue text-white' : 'bg-gs1-blue/10 text-gs1-blue'
                  }`}>
                    {isFilled ? '✓' : idx + 1}
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">{section.label}</CardTitle>
                    <p className="text-xs text-gs1-medium-gray mt-0.5">{section.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isFilled && (
                    <Badge variant="outline" className="text-xs text-gs1-medium-gray">
                      AI fyller inn
                    </Badge>
                  )}
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-gs1-medium-gray" /> : <ChevronDown className="h-4 w-4 text-gs1-medium-gray" />}
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
                {section.key === 'prosjektinformasjon' && brief?.contextSummary?.missingInformationSummary && (
                  <p className="text-xs text-gs1-medium-gray mt-2">Manglende informasjon fra kildene er lagt inn som utgangspunkt og kan redigeres.</p>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Actions */}
      <div className="flex justify-between items-center pt-2 border-t border-gs1-border">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbake
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-gs1-blue hover:bg-gs1-blue/90"
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