import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle, AlignmentType, Header, Footer, PageNumber } from 'npm:docx@9.5.0';

const SECTION_CONFIG = [
  { key: 'prosjektinformasjon', label: 'Prosjektinformasjon', number: 1 },
  { key: 'bakgrunn', label: 'Bakgrunn og situasjonsbeskrivelse', number: 2 },
  { key: 'maal', label: 'Mål og suksesskriterier', number: 3 },
  { key: 'maalgrupper', label: 'Målgrupper', number: 4 },
  { key: 'verdiforslag', label: 'GS1-tilbudet og verdiforslag', number: 5 },
  { key: 'budskap', label: 'Budskap, tone og stil', number: 6 },
  { key: 'leveranser', label: 'Leveranser og kanaler', number: 7 },
  { key: 'rammer', label: 'Praktiske rammer og godkjenning', number: 8 },
  { key: 'kildemateriale', label: 'Kildemateriale', number: 9 }
];

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function buildDocxDocument(brief, sections) {
  const now = new Date().toISOString();

  const metaParagraphs = [
    new Paragraph({
      children: [new TextRun({ text: 'KOMMUNIKASJONSBRIEF', bold: true, size: 36, color: '002C6C', font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [new TextRun({ text: brief.title || 'Uten tittel', bold: true, size: 28, color: '454545', font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Tema: ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: brief.themeName || 'Ikke spesifisert', size: 20, font: 'Calibri' })
      ],
      spacing: { after: 80 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Målgruppe: ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: brief.rammer?.targetAudience || 'Ikke spesifisert', size: 20, font: 'Calibri' })
      ],
      spacing: { after: 80 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Kanaler: ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: brief.rammer?.channels?.join(', ') || 'Ikke spesifisert', size: 20, font: 'Calibri' })
      ],
      spacing: { after: 80 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Frist: ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: brief.rammer?.deadline || 'Ikke spesifisert', size: 20, font: 'Calibri' })
      ],
      spacing: { after: 80 }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Dato: ', bold: true, size: 20, font: 'Calibri' }),
        new TextRun({ text: formatDate(now), size: 20, font: 'Calibri' })
      ],
      spacing: { after: 400 }
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '002C6C' } },
      spacing: { after: 400 }
    })
  ];

  const sectionParagraphs = [];
  for (const sectionDef of SECTION_CONFIG) {
    const content = sections[sectionDef.key]?.content || 'Ingen informasjon lagt til.';

    sectionParagraphs.push(new Paragraph({
      children: [new TextRun({ text: `${sectionDef.number}. ${sectionDef.label}`, bold: true, size: 24, color: '002C6C', font: 'Calibri' })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 150 }
    }));

    const lines = content.split('\n');
    for (const line of lines) {
      sectionParagraphs.push(new Paragraph({
        children: [new TextRun({ text: line, size: 20, font: 'Calibri', color: '454545' })],
        spacing: { after: 80 }
      }));
    }

    sectionParagraphs.push(new Paragraph({ spacing: { after: 200 } }));
  }

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ text: 'GS1 Norway – Kommunikasjonsbrief', size: 16, color: '888B8D', font: 'Calibri', italics: true })],
            alignment: AlignmentType.RIGHT
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: 'Side ', size: 16, color: '888B8D', font: 'Calibri' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '888B8D', font: 'Calibri' })
            ],
            alignment: AlignmentType.CENTER
          })]
        })
      },
      children: [...metaParagraphs, ...sectionParagraphs]
    }]
  });
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
      return Response.json({ error: 'briefId is required' }, { status: 400 });
    }

    // Step 1: Fetch brief
    const brief = await base44.entities.Brief.get(briefId);
    if (!brief) {
      return Response.json({ error: 'Brief not found' }, { status: 404 });
    }

    // Step 2: Validate status === "utkast"
    if (brief.status !== 'utkast') {
      return Response.json({ error: 'Brief must be in utkast status to approve' }, { status: 400 });
    }

    // Step 3: Generate DOCX from proposedBrief.sections
    const sections = brief.proposedBrief?.sections || {};
    if (Object.keys(sections).length === 0) {
      return Response.json({ error: 'No brief sections to generate document from' }, { status: 400 });
    }

    const doc = buildDocxDocument(brief, sections);
    const buffer = await Packer.toBuffer(doc);

    // Step 4: Upload DOCX using UploadPrivateFile
    const fileName = `brief_${brief.id}_${Date.now()}.docx`;
    const file = new File([buffer], fileName, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file });

    // Step 5: Receive file_uri
    const fileUri = uploadResult.file_uri;
    if (!fileUri) {
      return Response.json({ error: 'File upload failed – no file_uri returned' }, { status: 500 });
    }

    // Step 6: ONE SINGLE Brief.update – atomic status transition
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.Brief.update(briefId, {
      status: 'godkjent',
      approvedAt: now,
      generatedDocumentUrl: fileUri,
      proposedBrief: {
        ...brief.proposedBrief,
        status: 'approved',
        approvedAt: now,
        approvedSnapshot: sections,
        editedAfterApproval: false
      }
    });

    return Response.json({ success: true, generatedDocumentUrl: fileUri, approvedAt: now });
  } catch (error) {
    console.error('approveBrief error:', error);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
});