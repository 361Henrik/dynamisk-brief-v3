import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { 
  Users, 
  Target, 
  Radio, 
  MessageSquare, 
  Package, 
  Calendar,
  Loader2,
  ArrowLeft,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const CHANNEL_OPTIONS = [
  'Nyhetsbrev',
  'LinkedIn',
  'Facebook',
  'Nettside',
  'Pressemelding',
  'Webinar',
  'Kurs/opplæring',
  'Annet'
];

const DELIVERABLE_OPTIONS = [
  'Nyhetsbrev-artikkel',
  'SoMe-poster (LinkedIn)',
  'SoMe-poster (Facebook)',
  'Nettsidetekst',
  'Landingsside',
  'Pressemelding',
  'Presentasjon',
  'Brosjyre/flyer',
  'Video-manus',
  'E-post til medlemmer'
];

export default function RammerForm({ brief, onBack, onContinue }) {
  const [formData, setFormData] = useState({
    targetAudience: '',
    objectives: '',
    channels: [],
    tone: '',
    deliverables: [],
    deadline: '',
    activationDate: ''
  });

  useEffect(() => {
    if (!brief) return;

    setFormData({
      targetAudience: brief.rammer?.targetAudience || brief.contextSummary?.targetAudienceSummary || '',
      objectives: brief.rammer?.objectives || brief.contextSummary?.objectivesSummary || '',
      channels: brief.rammer?.channels || [],
      tone: brief.rammer?.tone || brief.contextSummary?.toneSummary || '',
      deliverables: brief.rammer?.deliverables || [],
      deadline: brief.rammer?.deadline || '',
      activationDate: brief.rammer?.activationDate || ''
    });
  }, [brief]);

  const updateBriefMutation = useMutation({
    mutationFn: async (rammer) => {
      await base44.entities.Brief.update(brief.id, {
        rammer,
        currentStep: 'dialog'
      });
    },
    onSuccess: () => {
      if (onContinue) onContinue();
    }
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const handleSubmit = () => {
    updateBriefMutation.mutate(formData);
  };

  const isValid = formData.targetAudience && formData.objectives && formData.channels.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Definer rammer for briefen</CardTitle>
          <CardDescription>
            Fyll ut grunnleggende informasjon som vil styre AI-dialogen og den endelige briefen.
          </CardDescription>
          {brief?.contextSummary && (
            <div className="px-6 pb-2 space-y-1">
              <p className="text-sm text-gs1-medium-gray">
                Forslag fra delt kildemateriale er lagt inn der det finnes, og kan redigeres fritt.
              </p>
              <p className="text-xs text-gs1-medium-gray">
                Dette bygger videre på konteksten du nettopp gjennomgikk i kontekstoversikten.
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {brief?.contextSummary?.missingInformationSummary && (
            <div className="rounded-lg border border-gs1-orange/20 bg-gs1-orange/5 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-gs1-orange mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gs1-dark-gray">Mangler fortsatt fra kildematerialet</p>
                  <p className="text-sm text-gs1-medium-gray mt-1 whitespace-pre-wrap">{brief.contextSummary.missingInformationSummary}</p>
                  <p className="text-xs text-gs1-medium-gray mt-2">Bruk dette som støtte for hva du bør fylle inn manuelt i Rammer.</p>
                </div>
              </div>
            </div>
          )}

          {/* Målgruppe */}
          <div className="space-y-2">
            <Label htmlFor="targetAudience" className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gs1-medium-gray" />
              <span>Målgruppe *</span>
            </Label>
            <Textarea
              id="targetAudience"
              placeholder="Beskriv hvem som er målgruppen for denne kommunikasjonen..."
              value={formData.targetAudience}
              onChange={(e) => handleChange('targetAudience', e.target.value)}
              rows={3}
            />
            {brief?.contextSummary?.targetAudienceSummary && !brief?.rammer?.targetAudience && (
              <p className="text-xs text-gs1-medium-gray">Forhåndsutfylt fra targetAudienceSummary.</p>
            )}
          </div>

          {/* Mål */}
          <div className="space-y-2">
            <Label htmlFor="objectives" className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-gs1-medium-gray" />
              <span>Mål *</span>
            </Label>
            <Textarea
              id="objectives"
              placeholder="Hva ønsker du å oppnå med denne kommunikasjonen?"
              value={formData.objectives}
              onChange={(e) => handleChange('objectives', e.target.value)}
              rows={3}
            />
            {brief?.contextSummary?.objectivesSummary && !brief?.rammer?.objectives && (
              <p className="text-xs text-gs1-medium-gray">Forhåndsutfylt fra objectivesSummary.</p>
            )}
          </div>

          {/* Kanaler */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Radio className="h-4 w-4 text-gs1-medium-gray" />
              <span>Kanaler *</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CHANNEL_OPTIONS.map((channel) => (
                <div key={channel} className="flex items-center space-x-2">
                  <Checkbox
                    id={`channel-${channel}`}
                    checked={formData.channels.includes(channel)}
                    onCheckedChange={() => toggleArrayItem('channels', channel)}
                  />
                  <label htmlFor={`channel-${channel}`} className="text-sm cursor-pointer">
                    {channel}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label htmlFor="tone" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-gs1-medium-gray" />
              <span>Tone</span>
            </Label>
            <Input
              id="tone"
              placeholder="f.eks. profesjonell, inspirerende, informativ..."
              value={formData.tone}
              onChange={(e) => handleChange('tone', e.target.value)}
            />
            {brief?.contextSummary?.toneSummary && !brief?.rammer?.tone && (
              <p className="text-xs text-gs1-medium-gray">Forhåndsutfylt fra toneSummary.</p>
            )}
          </div>

          {brief?.contextSummary?.keyMessagesSummary && (
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-gs1-medium-gray" />
                <span>Støtte fra kildematerialet</span>
              </Label>
              <div className="rounded-lg border border-gs1-border bg-gs1-light-gray/50 p-4">
                <p className="text-sm text-gs1-dark-gray whitespace-pre-wrap">{brief.contextSummary.keyMessagesSummary}</p>
                <p className="text-xs text-gs1-medium-gray mt-2">Dette brukes ikke som et eget Rammer-felt, men kan hjelpe deg med å spisse mål, tone og prioriteringer.</p>
              </div>
            </div>
          )}

          {/* Leveranser */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-gs1-medium-gray" />
              <span>Ønskede leveranser</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {DELIVERABLE_OPTIONS.map((deliverable) => (
                <div key={deliverable} className="flex items-center space-x-2">
                  <Checkbox
                    id={`deliverable-${deliverable}`}
                    checked={formData.deliverables.includes(deliverable)}
                    onCheckedChange={() => toggleArrayItem('deliverables', deliverable)}
                  />
                  <label htmlFor={`deliverable-${deliverable}`} className="text-sm cursor-pointer">
                    {deliverable}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Datoer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadline" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gs1-medium-gray" />
                <span>Tidsfrist for leveranse</span>
              </Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => handleChange('deadline', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activationDate" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gs1-medium-gray" />
                <span>Aktiveringstidspunkt</span>
              </Label>
              <Input
                id="activationDate"
                type="date"
                value={formData.activationDate}
                onChange={(e) => handleChange('activationDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbake
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || updateBriefMutation.isPending}
          className="bg-gs1-blue hover:bg-gs1-blue/90"
        >
          {updateBriefMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Fortsett til dynamisk intervju
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {!isValid && (
        <p className="text-center text-sm text-gs1-medium-gray">
          Fyll ut målgruppe, mål og velg minst én kanal for å fortsette
        </p>
      )}

    </div>
  );
}