import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Unified document extraction function for both KnowledgeBaseDoc and BriefSourceMaterial.
 * 
 * V1 Strategy:
 * - PDF: Full text extraction using ExtractDataFromUploadedFile
 * - URL: Content extraction using InvokeLLM with internet context
 * - DOCX/other formats: Immediately marked as failed (not supported in V1)
 * 
 * Guarantees:
 * - Every document will end in either 'success' or 'failed' state
 * - No document can remain stuck in 'pending'
 */

Deno.serve(async (req) => {
  let base44;
  let entityName;
  let entityId;
  
  try {
    base44 = createClientFromRequest(req);
    const body = await req.json();
    
    // Support both direct calls and automation triggers
    // Automation payload: { event: { type, entity_name, entity_id }, data: {...} }
    entityName = body.entityName || body.event?.entity_name || 'KnowledgeBaseDoc';
    entityId = body.entityId || body.event?.entity_id || body.docId || body.briefSourceMaterialId || body.data?.id;
    
    console.log(`extractDocumentContent called: entity=${entityName}, id=${entityId}`);

    if (!entityId) {
      return Response.json({ error: 'Missing entityId' }, { status: 400 });
    }

    // Get the document entity
    const doc = await base44.asServiceRole.entities[entityName].get(entityId);
    console.log('Fetched doc:', { id: doc?.id, status: doc?.extractionStatus, fileUrl: doc?.fileUrl?.substring(0, 80) });

    if (!doc) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }

    // Only process if status is pending - this is a safety check
    // The automation should already filter for pending, but we double-check here
    if (doc.extractionStatus !== 'pending') {
      console.log('Skipping - extraction not pending, current status:', doc.extractionStatus);
      // Return success without changing anything - document already processed
      return Response.json({ 
        message: 'Extraction not pending, skipping',
        entityName,
        entityId,
        currentStatus: doc.extractionStatus
      }, { status: 200 });
    }

    let extractedText = null;
    let extractionStatus = 'failed';
    let extractionError = null;

    try {
      const fileUrl = doc.fileUrl;
      const sourceType = doc.sourceType; // Only for BriefSourceMaterial
      
      if (!fileUrl) {
        extractionError = 'Manglende fil-URL';
        console.log('No file URL provided');
      } else if (sourceType === 'url') {
        // URL source - use InvokeLLM with internet context
        console.log('Processing URL source:', fileUrl);
        
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Hent og oppsummer innholdet fra denne URL-en: ${fileUrl}
          
Returner alt relevant tekstinnhold fra siden.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              full_text: {
                type: 'string',
                description: 'The complete extracted text content from the URL'
              }
            },
            required: ['full_text']
          }
        });
        
        if (result?.full_text) {
          extractedText = result.full_text;
          extractionStatus = 'success';
          console.log('URL extraction successful, text length:', extractedText.length);
        } else {
          extractionError = 'Kunne ikke hente innhold fra URL-en';
        }
      } else {
        // File source - check file type
        const fileUrlLower = fileUrl.toLowerCase();
        const isPdf = fileUrlLower.includes('.pdf');
        const isDocx = fileUrlLower.includes('.docx');
        const isPptx = fileUrlLower.includes('.pptx');
        const isXlsx = fileUrlLower.includes('.xlsx') || fileUrlLower.includes('.xls');
        
        if (isPdf) {
          // PDF - use ExtractDataFromUploadedFile
          console.log('Processing PDF file:', fileUrl);
          
          const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
            file_url: fileUrl,
            json_schema: {
              type: 'object',
              properties: {
                full_text: {
                  type: 'string',
                  description: 'The complete text content of the PDF document'
                }
              },
              required: ['full_text']
            }
          });
          
          console.log('ExtractDataFromUploadedFile result status:', result?.status);
          
          if (result?.status === 'success' && result?.output?.full_text) {
            extractedText = result.output.full_text;
            extractionStatus = 'success';
            console.log('PDF extraction successful, text length:', extractedText.length);
          } else {
            extractionError = result?.details || 'Kunne ikke trekke ut tekst fra PDF-filen';
            console.log('PDF extraction failed:', extractionError);
          }
        } else if (isDocx || isPptx || isXlsx) {
          // Office formats - NOT supported in V1
          extractionError = 'Denne filtypen støttes ikke i versjon 1. Last opp PDF, bruk URL, eller lim inn tekst.';
          extractionStatus = 'failed';
          console.log('Unsupported format');
        } else {
          // Unknown format
          extractionError = 'Denne filtypen støttes ikke i versjon 1. Last opp PDF, bruk URL, eller lim inn tekst.';
          extractionStatus = 'failed';
          console.log('Unknown file format');
        }
      }
    } catch (extractionErr) {
      console.error(`Error during extraction for ${entityName} ${entityId}:`, extractionErr);
      extractionError = extractionErr.message || 'Feil under tekstuttrekk';
      extractionStatus = 'failed';
    }

    // ALWAYS update the entity - this is critical to prevent stuck states
    console.log('Updating entity with status:', extractionStatus);
    await base44.asServiceRole.entities[entityName].update(entityId, {
      extractedText,
      extractionStatus,
      extractionError,
    });
    console.log('Entity updated successfully');

    return Response.json({ 
      success: true, 
      entityName,
      entityId,
      extractionStatus, 
      extractedTextLength: extractedText?.length || 0,
      extractionError 
    });

  } catch (error) {
    console.error('Unhandled error in extractDocumentContent:', error);
    
    // CRITICAL: Even on unhandled error, try to mark as failed so nothing gets stuck
    if (base44 && entityName && entityId) {
      try {
        await base44.asServiceRole.entities[entityName].update(entityId, {
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