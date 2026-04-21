import React from 'react';
import { ArrowLeft, ArrowRight, FileText, Link as LinkIcon, Type, Info, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const UNDERSTOOD_ITEMS = [
  { key: 'backgroundSummary', label: 'Bakgrunn' },
  { key: 'targetAudienceSummary', label: 'Målgruppe' },
  { key: 'objectivesSummary', label: 'Mål' },
  { key: 'keyMessagesSummary', label: 'Hovedbudskap' },
  { key: 'toneSummary', label: 'Tone' }
];

function getSourceLabel(source) {
  if (source.sourceType === 'file') {
    return source.fileName || 'PDF-dokument';
  }

  if (source.sourceType === 'url') {
    const title = source.urlMetadata?.pageTitle || source.fileUrl || 'URL-kilde';
    const domain = source.urlMetadata?.domain;
    return domain ? `${title} (${domain})` : title;
  }

  const snippet = source.extractedText?.trim() || 'Tekstnotat';
  return snippet.length > 80 ? `${snippet.slice(0, 80)}...` : snippet;
}

function getSourceIcon(sourceType) {
  if (sourceType === 'file') return FileText;
  if (sourceType === 'url') return LinkIcon;
  return Type;
}

export default function ContextOverviewDisplay({ brief, sources = [], failedSources = [], onBack, onContinue }) {
  const contextSummary = brief?.contextSummary || {};
  const understoodItems = UNDERSTOOD_ITEMS.filter((item) => contextSummary[item.key]);
  const missingSummary = contextSummary.missingInformationSummary;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <p className="text-xs text-[#888B8D] uppercase tracking-wider">Kontekstoversikt</p>
        <h1 className="text-2xl font-bold text-gray-900">Dette har systemet hentet ut fra kildematerialet</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Denne oversikten er laget fra kildene du har lagt inn og brukes til å hjelpe Hurtigmodus, gi bedre retning i Detaljert modus og synliggjøre hva som fortsatt mangler.
        </p>
      </div>

      <Card className="border-[#002C6C]/10 bg-[#002C6C]/[0.03]">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-[#002C6C] mt-0.5 flex-shrink-0" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-[#454545]">Slik brukes denne oversikten videre</p>
            <p className="text-[#888B8D]">Forslagene her brukes til å prefill i Hurtigmodus og til å gi bedre retning i Detaljert modus / Rammer.</p>
            <p className="text-[#888B8D]">Manglende informasjon betyr ikke at noe er feil — bare at du trolig må fylle inn mer manuelt senere i briefprosessen.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#454545]">
            <Sparkles className="h-5 w-5 text-[#002C6C]" />
            Hva vi har forstått
          </CardTitle>
          <CardDescription>
            Dette er de viktigste punktene systemet har hentet ut fra materialet ditt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {understoodItems.length > 0 ? understoodItems.map((item) => (
            <div key={item.key} className="rounded-lg border border-[#E5E7EB] p-4">
              <h3 className="text-sm font-semibold text-[#454545] mb-1">{item.label}</h3>
              <p className="text-sm text-[#666] whitespace-pre-wrap">{contextSummary[item.key]}</p>
            </div>
          )) : (
            <p className="text-sm text-[#888B8D]">Ingen oppsummering er tilgjengelig ennå.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#454545]">
            <AlertCircle className="h-5 w-5 text-[#F26334]" />
            Dette mangler fortsatt i kildematerialet
          </CardTitle>
          <CardDescription>
            Her er det systemet ikke fant tydelig nok i kildene og som du kanskje må fylle inn senere.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-[#F26334]/20 bg-[#F26334]/5 p-4">
            <p className="text-sm text-[#666] whitespace-pre-wrap">
              {missingSummary || 'Ingen tydelige mangler ble identifisert i kildematerialet.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#454545]">Kilder brukt</CardTitle>
          <CardDescription>
            Dette er kildene som faktisk ble brukt i oppsummeringen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sources.length > 0 ? (
            <div className="space-y-3">
              {sources.map((source) => {
                const Icon = getSourceIcon(source.sourceType);
                return (
                  <div key={source.id} className="flex items-start gap-3 rounded-lg border border-[#E5E7EB] p-3">
                    <div className="mt-0.5 rounded-md bg-[#F4F4F4] p-2">
                      <Icon className="h-4 w-4 text-[#002C6C]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#454545] break-words">{getSourceLabel(source)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#888B8D]">Ingen kilder tilgjengelig.</p>
          )}

          {failedSources.length > 0 && (
            <div className="rounded-lg border border-[#F26334]/20 bg-[#F26334]/5 p-4">
              <p className="text-sm font-medium text-[#454545] mb-2">Ikke brukt i oppsummeringen</p>
              <div className="space-y-2">
                {failedSources.map((source) => (
                  <p key={source.id} className="text-sm text-[#666] break-words">• {getSourceLabel(source)}</p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Legg til/endre kildemateriale
        </Button>
        <Button onClick={onContinue} className="bg-[#002C6C] hover:bg-[#001a45]">
          Fortsett til modusvalg
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}