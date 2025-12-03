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
  ArrowRight
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
    if (brief?.rammer) {
      setFormData({
        targetAudience: brief.rammer.targetAudience || '',
        objectives: brief.rammer.objectives || '',
        channels: brief.rammer.channels || [],
        tone: brief.rammer.tone || '',
        deliverables: brief.rammer.deliverables || [],
        deadline: brief.rammer.deadline || '',
        activationDate: brief.rammer.activationDate || ''
      });
    }
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
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Målgruppe */}
          <div className="space-y-2">
            <Label htmlFor="targetAudience" className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span>Målgruppe *</span>
            </Label>
            <Textarea
              id="targetAudience"
              placeholder="Beskriv hvem som er målgruppen for denne kommunikasjonen..."
              value={formData.targetAudience}
              onChange={(e) => handleChange('targetAudience', e.target.value)}
              rows={3}
            />
          </div>

          {/* Mål */}
          <div className="space-y-2">
            <Label htmlFor="objectives" className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-gray-500" />
              <span>Mål *</span>
            </Label>
            <Textarea
              id="objectives"
              placeholder="Hva ønsker du å oppnå med denne kommunikasjonen?"
              value={formData.objectives}
              onChange={(e) => handleChange('objectives', e.target.value)}
              rows={3}
            />
          </div>

          {/* Kanaler */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Radio className="h-4 w-4 text-gray-500" />
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
              <MessageSquare className="h-4 w-4 text-gray-500" />
              <span>Tone</span>
            </Label>
            <Input
              id="tone"
              placeholder="f.eks. profesjonell, inspirerende, informativ..."
              value={formData.tone}
              onChange={(e) => handleChange('tone', e.target.value)}
            />
          </div>

          {/* Leveranser */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-gray-500" />
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
                <Calendar className="h-4 w-4 text-gray-500" />
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
                <Calendar className="h-4 w-4 text-gray-500" />
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
          className="bg-blue-600 hover:bg-blue-700"
        >
          {updateBriefMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Fortsett til AI-dialog
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {!isValid && (
        <p className="text-center text-sm text-gray-500">
          Fyll ut målgruppe, mål og velg minst én kanal for å fortsette
        </p>
      )}
    </div>
  );
}