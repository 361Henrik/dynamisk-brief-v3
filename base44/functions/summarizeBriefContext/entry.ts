import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function joinSourceText(sources) {
  return sources
    .filter((source) => source.extractionStatus === 'success' && source.extractedText)
    .map((source, index) => {
      const label = source.sourceType === 'file'
        ? `PDF: ${source.fileName || `Dokument ${index + 1}`}`
        : source.sourceType === 'url'
        ? `URL: ${source.fileUrl || `Kilde ${index + 1}`}`
        : `Tekstnotat ${index + 1}`;

      return `### ${label}\n${source.extractedText}`;
    })
    .join('\n\n');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { briefId } = await req.json();

    if (!briefId) {
      return Response.json({ error: 'Missing briefId' }, { status: 400 });
    }

    const brief = await base44.entities.Brief.get(briefId);
    if (!brief) {
      return Response.json({ error: 'Brief not found' }, { status: 404 });
    }

    const sources = await base44.entities.BriefSourceMaterial.filter({ briefId });
    const successfulSources = sources.filter((source) => source.extractionStatus === 'success' && source.extractedText);

    if (successfulSources.length === 0) {
      return Response.json({ error: 'No processed source material found' }, { status: 400 });
    }

    const sourceText = joinSourceText(successfulSources);

    const contextSummary = await base44.integrations.Core.InvokeLLM({
      prompt: `Du skal lage et kort, pålitelig og nøkternt sammendrag på norsk av kildemateriale for en kommunikasjonsbrief.

Regler:
- Bruk bare informasjon som faktisk finnes i kildene.
- Ikke finn opp detaljer.
- Hvis noe er uklart eller mangler, skriv det kort i missingInformationSummary.
- Hold hvert felt kort, konkret og redigerbart.

Returner JSON med disse feltene:
- backgroundSummary
- targetAudienceSummary
- objectivesSummary
- keyMessagesSummary
- toneSummary
- missingInformationSummary

KILDEMATERIALE:
${sourceText.substring(0, 40000)}`,
      response_json_schema: {
        type: 'object',
        properties: {
          backgroundSummary: { type: 'string' },
          targetAudienceSummary: { type: 'string' },
          objectivesSummary: { type: 'string' },
          keyMessagesSummary: { type: 'string' },
          toneSummary: { type: 'string' },
          missingInformationSummary: { type: 'string' }
        },
        required: [
          'backgroundSummary',
          'targetAudienceSummary',
          'objectivesSummary',
          'keyMessagesSummary',
          'toneSummary',
          'missingInformationSummary'
        ]
      }
    });

    await base44.entities.Brief.update(briefId, {
      contextSummary
    });

    return Response.json({ success: true, contextSummary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});