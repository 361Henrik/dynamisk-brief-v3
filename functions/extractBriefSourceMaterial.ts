import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    // Handle both direct calls and automation triggers
    const briefSourceMaterialId = body.briefSourceMaterialId || body.data?.id;

    if (!briefSourceMaterialId) {
      return Response.json({ error: 'Missing briefSourceMaterialId' }, { status: 400 });
    }

    const sourceMaterial = await base44.asServiceRole.entities.BriefSourceMaterial.get(briefSourceMaterialId);

    if (!sourceMaterial) {
      return Response.json({ error: 'Source material not found' }, { status: 404 });
    }

    // Only process if status is pending
    if (sourceMaterial.extractionStatus !== 'pending') {
      return Response.json({ message: 'Extraction not pending, skipping' }, { status: 200 });
    }

    let extractedText = null;
    let extractionStatus = 'failed';
    let extractionError = null;

    try {
      if (sourceMaterial.sourceType === 'file' && sourceMaterial.fileUrl) {
        // For uploaded files, use ExtractDataFromUploadedFile integration
        const extractionResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
          file_url: sourceMaterial.fileUrl,
          json_schema: { 
            type: 'object', 
            properties: { 
              text_content: { type: 'string', description: 'The full extracted text content from the document' } 
            } 
          }
        });

        if (extractionResult.status === 'success' && extractionResult.output?.text_content) {
          extractedText = extractionResult.output.text_content;
          extractionStatus = 'success';
        } else {
          extractionError = extractionResult.details || 'Kunne ikke trekke ut tekst fra filen';
        }
      } else if (sourceMaterial.sourceType === 'url' && sourceMaterial.fileUrl) {
        // For URLs, use InvokeLLM with add_context_from_internet
        const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Hent og ekstraher hovedinnholdet fra denne URL-en: ${sourceMaterial.fileUrl}

Oppgave:
1. Les innholdet på nettsiden
2. Ekstraher den viktigste tekstinformasjonen (artikkelinnhold, hovedtekst, etc.)
3. Ignorer navigasjon, reklame, og annet irrelevant innhold
4. Returner den ekstraherte teksten

Hvis siden ikke kan leses eller ikke har relevant tekstinnhold, sett text_content til en tom streng.`,
          add_context_from_internet: true,
          response_json_schema: { 
            type: 'object', 
            properties: { 
              text_content: { type: 'string', description: 'The extracted text content from the URL' } 
            } 
          }
        });

        if (llmResponse && llmResponse.text_content && llmResponse.text_content.trim().length > 0) {
          extractedText = llmResponse.text_content;
          extractionStatus = 'success';
        } else {
          extractionError = 'Kunne ikke hente innhold fra URL-en';
        }
      } else {
        extractionError = 'Ugyldig kildetype eller manglende URL';
      }
    } catch (extractionErr) {
      console.error(`Error during extraction for BriefSourceMaterial ${briefSourceMaterialId}:`, extractionErr);
      extractionError = extractionErr.message || 'Feil under tekstuttrekk';
      extractionStatus = 'failed';
    }

    // Update the BriefSourceMaterial entity
    await base44.asServiceRole.entities.BriefSourceMaterial.update(
      briefSourceMaterialId,
      {
        extractedText,
        extractionStatus,
        extractionError,
      }
    );

    return Response.json({ success: true, extractionStatus, extractedText: extractedText?.substring(0, 200), extractionError });

  } catch (error) {
    console.error('Unhandled error in extractBriefSourceMaterial:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});