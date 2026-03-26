import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const payload = await req.json();
  const releaseId = payload?.event?.entity_id || payload?.releaseId;

  if (!releaseId) {
    return Response.json({ error: 'Missing releaseId' }, { status: 400 });
  }

  // Fetch the release record using service role
  const release = await base44.asServiceRole.entities.ReleaseNotification.get(releaseId);

  if (!release) {
    return Response.json({ error: 'ReleaseNotification not found' }, { status: 404 });
  }

  // Guard: only proceed if published=true and emailSent=false
  if (!release.published || release.emailSent) {
    return Response.json({ skipped: true, reason: 'Not published or already sent' });
  }

  // Fetch all users
  const allUsers = await base44.asServiceRole.entities.User.list();

  // Eligible: not admin, not inactive
  const eligibleUsers = allUsers.filter(u =>
    u.role !== 'admin' &&
    u.isActive !== false &&
    u.email
  );

  const appLink = release.linkToApp || 'https://app.base44.com';

  const subject = `Nytt i Dynamisk Brief – versjon ${release.version}: ${release.title}`;

  const body = `Hei,

${release.summary}

Dynamisk Brief hjelper deg å lage komplette, kvalitetssikrede kommunikasjonsbriefs raskere og enklere enn før.

Logg inn og prøv de nye funksjonene:
${appLink}

Hilsen
GS1 Norway – Dynamisk Brief`;

  // Send one email per eligible user
  for (const user of eligibleUsers) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject,
      body,
      from_name: 'Dynamisk Brief'
    });
  }

  // Mark emailSent = true to prevent duplicate sends
  await base44.asServiceRole.entities.ReleaseNotification.update(releaseId, { emailSent: true });

  return Response.json({ success: true, emailsSent: eligibleUsers.length });
});