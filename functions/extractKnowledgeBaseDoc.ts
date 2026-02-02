import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    // Handle both direct calls and automation triggers
    const docId = body.docId || body.data?.id;

    if (!docId) {
      return Response.json({ error: 'Missing docId' }, { status: 400 });
    }

    const doc = await base44.asServiceRole.entities.KnowledgeBaseDoc.get(docId);

    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Only process if status is pending
    if (doc.extractionStatus !== 'pending') {
      return Response.json({ message: 'Extraction not pending, skipping' }, { status: 200 });
    }

    let extractedText = null;
    let extractionStatus = 'failed';
    let extractionError = null;

    try {
      if (doc.fileUrl) {
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

        if (extractionResult.status === 'success' && extractionResult.output?.text_content) {
          extractedText = extractionResult.output.text_content;
          extractionStatus = 'success';
        } else {
          extractionError = extractionResult.details || 'Kunne ikke trekke ut tekst fra dokumentet';
        }
      } else {
        extractionError = 'Manglende fil-URL';
      }
    } catch (extractionErr) {
      console.error(`Error during extraction for KnowledgeBaseDoc ${docId}:`, extractionErr);
      extractionError = extractionErr.message || 'Feil under tekstuttrekk';
      extractionStatus = 'failed';
    }

    // Update the KnowledgeBaseDoc entity
    await base44.asServiceRole.entities.KnowledgeBaseDoc.update(
      docId,
      {
        extractedText,
        extractionStatus,
        extractionError,
      }
    );

    return Response.json({ 
      success: true, 
      extractionStatus, 
      extractedTextLength: extractedText?.length || 0,
      extractionError 
    });

  } catch (error) {
    console.error('Unhandled error in extractKnowledgeBaseDoc:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});