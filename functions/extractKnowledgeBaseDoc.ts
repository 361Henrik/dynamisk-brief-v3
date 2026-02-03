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
        console.log('Starting extraction for file:', doc.fileUrl.substring(0, 80));
        
        // Extract text from the uploaded file
        const extractionResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
          file_url: doc.fileUrl,
          json_schema: { 
            type: 'object', 
            properties: { 
              text_content: { 
                type: 'string', 
                description: 'The full extracted text content from the document, preserving structure and headings' 
              } 
            } 
          }
        });

        console.log('Extraction result:', { 
          status: extractionResult?.status, 
          hasOutput: !!extractionResult?.output,
          hasTextContent: !!extractionResult?.output?.text_content,
          textLength: extractionResult?.output?.text_content?.length || 0,
          details: extractionResult?.details
        });

        if (extractionResult?.status === 'success' && extractionResult?.output?.text_content) {
          extractedText = extractionResult.output.text_content;
          extractionStatus = 'success';
          console.log('Extraction successful, text length:', extractedText.length);
        } else {
          extractionError = extractionResult?.details || 'Kunne ikke trekke ut tekst fra dokumentet - tomt resultat';
          console.log('Extraction failed:', extractionError);
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