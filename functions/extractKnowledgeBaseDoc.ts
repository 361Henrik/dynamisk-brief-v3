import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  let base44;
  let docId;
  
  try {
    base44 = createClientFromRequest(req);
    const body = await req.json();
    
    // Handle both direct calls and automation triggers
    docId = body.docId || body.data?.id;
    console.log('extractKnowledgeBaseDoc called with docId:', docId);

    if (!docId) {
      return Response.json({ error: 'Missing docId' }, { status: 400 });
    }

    const doc = await base44.asServiceRole.entities.KnowledgeBaseDoc.get(docId);
    console.log('Fetched doc:', { id: doc?.id, status: doc?.extractionStatus, fileUrl: doc?.fileUrl?.substring(0, 50) });

    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Only process if status is pending
    if (doc.extractionStatus !== 'pending') {
      console.log('Skipping - extraction not pending, current status:', doc.extractionStatus);
      return Response.json({ message: 'Extraction not pending, skipping' }, { status: 200 });
    }

    let extractedText = null;
    let extractionStatus = 'failed';
    let extractionError = null;

    try {
      if (doc.fileUrl) {
        console.log('Starting extraction for file:', doc.fileUrl);
        
        // Determine file type
        const fileUrlLower = doc.fileUrl.toLowerCase();
        const isDocx = fileUrlLower.includes('.docx');
        const isPdf = fileUrlLower.includes('.pdf');
        
        let extractionResult;
        
        if (isDocx || isPdf) {
          // For DOCX and PDF, use InvokeLLM with file_urls (vision model can read documents)
          console.log('Using InvokeLLM for document extraction');
          extractionResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Du mottar et dokument. Din oppgave er å trekke ut ALT tekstinnhold fra dokumentet og returnere det. 

VIKTIG:
- Trekk ut ALL tekst, inkludert overskrifter, avsnitt, lister, tabeller, etc.
- Bevar den originale strukturen så godt som mulig
- IKKE oppsummer eller fortolk - bare trekk ut rå tekst
- Returner teksten i full_text feltet`,
            file_urls: [doc.fileUrl],
            response_json_schema: {
              type: 'object',
              properties: {
                full_text: {
                  type: 'string',
                  description: 'The complete extracted text from the document'
                }
              },
              required: ['full_text']
            }
          });
          
          console.log('InvokeLLM result:', { 
            hasFullText: !!extractionResult?.full_text,
            textLength: extractionResult?.full_text?.length || 0
          });
          
          if (extractionResult?.full_text) {
            extractedText = extractionResult.full_text;
            extractionStatus = 'success';
            console.log('Extraction successful via LLM, text length:', extractedText.length);
          } else {
            extractionError = 'Kunne ikke trekke ut tekst fra dokumentet via AI';
          }
        } else {
          // For other file types, try ExtractDataFromUploadedFile
          console.log('Using ExtractDataFromUploadedFile');
          extractionResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
            file_url: doc.fileUrl,
            json_schema: {
              type: 'object',
              properties: {
                full_text: {
                  type: 'string',
                  description: 'The complete text content of the document'
                }
              },
              required: ['full_text']
            }
          });
          
          if (extractionResult?.status === 'success' && extractionResult?.output?.full_text) {
            extractedText = extractionResult.output.full_text;
            extractionStatus = 'success';
            console.log('Extraction successful, text length:', extractedText.length);
          } else {
            extractionError = extractionResult?.details || 'Kunne ikke trekke ut tekst fra dokumentet';
            console.log('Extraction failed:', extractionError);
          }
        }
      } else {
        extractionError = 'Manglende fil-URL';
        console.log('No file URL provided');
      }
    } catch (extractionErr) {
      console.error(`Error during extraction for KnowledgeBaseDoc ${docId}:`, extractionErr);
      extractionError = extractionErr.message || 'Feil under tekstuttrekk';
      extractionStatus = 'failed';
    }

    // Update the KnowledgeBaseDoc entity - THIS MUST ALWAYS HAPPEN
    console.log('Updating entity with status:', extractionStatus);
    await base44.asServiceRole.entities.KnowledgeBaseDoc.update(
      docId,
      {
        extractedText,
        extractionStatus,
        extractionError,
      }
    );
    console.log('Entity updated successfully');

    return Response.json({ 
      success: true, 
      extractionStatus, 
      extractedTextLength: extractedText?.length || 0,
      extractionError 
    });

  } catch (error) {
    console.error('Unhandled error in extractKnowledgeBaseDoc:', error);
    
    // CRITICAL: Even on unhandled error, try to mark as failed so UI doesn't hang
    if (base44 && docId) {
      try {
        await base44.asServiceRole.entities.KnowledgeBaseDoc.update(docId, {
          extractionStatus: 'failed',
          extractionError: `Systemfeil: ${error.message || 'Ukjent feil'}`
        });
        console.log('Marked doc as failed after unhandled error');
      } catch (updateErr) {
        console.error('Failed to update doc status after error:', updateErr);
      }
    }
    
    return Response.json({ error: error.message }, { status: 500 });
  }
});