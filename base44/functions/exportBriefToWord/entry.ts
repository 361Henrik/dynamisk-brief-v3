import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'npm:docx@9.0.2';

// Mirror of SECTION_CONFIG from FinalBrief.jsx - single source of truth for structure
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

        // Fetch brief data
        const briefs = await base44.entities.Brief.filter({ id: briefId });
        const brief = briefs[0];

        if (!brief) {
            return Response.json({ error: 'Brief not found' }, { status: 404 });
        }

        // Use approvedSnapshot as single source of truth (same as Step 5)
        const approvedSnapshot = brief.proposedBrief?.approvedSnapshot;
        if (!approvedSnapshot || Object.keys(approvedSnapshot).length === 0) {
            return Response.json({ error: 'No approved brief available. Please approve the proposed brief first.' }, { status: 400 });
        }

        const approvedAt = brief.proposedBrief?.approvedAt;

        // Build section paragraphs from SECTION_CONFIG (same order as Step 5)
        const sectionParagraphs = [];
        
        for (const section of SECTION_CONFIG) {
            const sectionContent = approvedSnapshot[section.key]?.content;
            
            // Section heading
            sectionParagraphs.push(
                new Paragraph({
                    children: [
                        new TextRun({ 
                            text: `${section.number}. ${section.label.toUpperCase()}`, 
                            bold: true, 
                            size: 24, 
                            color: "1e40af" 
                        })
                    ],
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                })
            );

            // Section content or placeholder
            if (sectionContent) {
                const contentLines = sectionContent.split('\n').filter(p => p.trim());
                for (const line of contentLines) {
                    sectionParagraphs.push(
                        new Paragraph({
                            children: [new TextRun({ text: line })],
                            spacing: { after: 150 }
                        })
                    );
                }
            } else {
                // Empty section placeholder (matches Step 5 behavior)
                sectionParagraphs.push(
                    new Paragraph({
                        children: [new TextRun({ text: 'Ingen informasjon lagt til.', italics: true, color: "9ca3af" })],
                        spacing: { after: 150 }
                    })
                );
            }
        }

        // Create Word document
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    // Title
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "KOMMUNIKASJONSBRIEF",
                                bold: true,
                                size: 32,
                                color: "1e40af"
                            })
                        ],
                        heading: HeadingLevel.TITLE,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 }
                    }),

                    // Brief Title
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: brief.title,
                                bold: true,
                                size: 28
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 100 }
                    }),

                    // Theme
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Tema: ${brief.themeName}`,
                                italics: true,
                                size: 24,
                                color: "6b7280"
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 }
                    }),

                    // Divider
                    new Paragraph({
                        border: {
                            bottom: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" }
                        },
                        spacing: { after: 400 }
                    }),

                    // Metadata summary
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Målgruppe: ", bold: true }),
                            new TextRun({ text: brief.rammer?.targetAudience || "Ikke spesifisert" })
                        ],
                        spacing: { after: 100 }
                    }),

                    new Paragraph({
                        children: [
                            new TextRun({ text: "Kanaler: ", bold: true }),
                            new TextRun({ text: brief.rammer?.channels?.join(", ") || "Ikke spesifisert" })
                        ],
                        spacing: { after: 100 }
                    }),

                    new Paragraph({
                        children: [
                            new TextRun({ text: "Frist: ", bold: true }),
                            new TextRun({ text: brief.rammer?.deadline || "Ikke spesifisert" })
                        ],
                        spacing: { after: 100 }
                    }),

                    // Divider before sections
                    new Paragraph({
                        border: {
                            bottom: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" }
                        },
                        spacing: { before: 200, after: 200 }
                    }),

                    // All 9 sections from SECTION_CONFIG
                    ...sectionParagraphs,

                    // Footer
                    new Paragraph({
                        border: {
                            top: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" }
                        },
                        spacing: { before: 400 }
                    }),

                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Godkjent: ${approvedAt ? new Date(approvedAt).toLocaleDateString('nb-NO') : 'Ukjent'} | GS1 Norway - Dynamisk Brief`,
                                size: 18,
                                color: "9ca3af",
                                italics: true
                            })
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200 }
                    })
                ]
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        
        // Convert buffer to base64 for safe JSON transport
        const uint8Array = new Uint8Array(buffer);
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binaryString += String.fromCharCode(uint8Array[i]);
        }
        const base64Data = btoa(binaryString);

        const filename = `${brief.title.replace(/[^a-zA-Z0-9æøåÆØÅ\s-]/g, '').replace(/\s+/g, '_')}.docx`;

        return Response.json({
            filename,
            data: base64Data,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
    } catch (error) {
        console.error('Export error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});