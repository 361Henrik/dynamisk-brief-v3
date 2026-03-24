import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { category, message, submittedEmail, severity, pageContext, stepContext, briefId } = body;

  if (!category || !message) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // A) Always store the feedback row first
  const payload = {
    category,
    message,
    pageContext: pageContext || '',
    stepContext: stepContext || '',
  };
  if (submittedEmail) payload.submittedEmail = submittedEmail;
  if (severity) payload.severity = severity;
  if (briefId) payload.briefId = briefId;

  const feedback = await base44.entities.Feedback.create(payload);
  const feedbackId = feedback.id;

  // B) Read FEEDBACK_INBOX env var
  const inboxRaw = Deno.env.get('FEEDBACK_INBOX') || '';
  const recipients = inboxRaw
    .split(/[;,]/)
    .map(e => e.trim())
    .filter(e => e.length > 0);

  if (recipients.length === 0) {
    console.log(`[submitFeedback] feedbackId=${feedbackId} emailed=false reason=not_configured`);
    return Response.json({ stored: true, emailed: false, reason: 'not_configured', feedbackId });
  }

  // C) Build email
  const timestamp = new Date().toISOString();
  const categoryLabels = { bug: '🐛 Feil / bug', improvement: '💡 Forbedring', idea: '✨ Idé' };
  const severityLabels = { stopper_meg: 'Stopper meg', irriterende: 'Irriterende', mindre: 'Mindre viktig' };

  const subject = `Ny tilbakemelding: ${category} (GS1 Dynamisk Brief)`;
  const body_text = `
Ny tilbakemelding mottatt i GS1 Dynamisk Brief

Kategori: ${categoryLabels[category] || category}
${severity ? `Alvorlighetsgrad: ${severityLabels[severity] || severity}` : ''}
Melding: ${message}
${submittedEmail ? `Fra bruker: ${submittedEmail}` : `Innlogget bruker: ${user.email}`}

Kontekst
Side: ${pageContext || '–'}
Steg: ${stepContext || '–'}
${briefId ? `Brief-ID: ${briefId}` : ''}

Metadata
Tidspunkt: ${timestamp}
Feedback-ID: ${feedbackId}

Finn tilbakemeldingen i Admin → Data → Feedback (filter på ID: ${feedbackId})
  `.trim();

  // D) Attempt to send to each recipient
  let emailed = false;
  let errorReason = null;

  for (const recipient of recipients) {
    try {
      await base44.integrations.Core.SendEmail({
        to: recipient,
        subject,
        body: body_text,
        from_name: 'GS1 Dynamisk Brief',
      });
      emailed = true;
    } catch (err) {
      errorReason = err.message || 'unknown_error';
      console.error(`[submitFeedback] feedbackId=${feedbackId} recipient=${recipient} emailed=false error=${errorReason}`);
    }
  }

  console.log(`[submitFeedback] feedbackId=${feedbackId} recipients=${recipients.join(',')} emailed=${emailed} reason=${errorReason || 'ok'}`);

  return Response.json({
    stored: true,
    emailed,
    reason: emailed ? null : (errorReason || 'send_failed'),
    feedbackId,
  });
});