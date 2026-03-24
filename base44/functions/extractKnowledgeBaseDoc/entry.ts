/**
 * DEPRECATED: This function is replaced by extractDocumentContent.js
 * Kept for backwards compatibility - redirects to the unified function.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    // Redirect to unified extraction function
    const entityId = body.docId || body.data?.id;
    
    const result = await base44.asServiceRole.functions.invoke('extractDocumentContent', {
      entityName: 'KnowledgeBaseDoc',
      entityId: entityId
    });
    
    return Response.json(result.data || { redirected: true });
  } catch (error) {
    console.error('Error in extractKnowledgeBaseDoc redirect:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});