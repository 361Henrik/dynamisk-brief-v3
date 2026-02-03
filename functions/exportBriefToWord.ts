import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'npm:docx@9.0.2';

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

        const finalBrief = brief.finalBrief;
        if (!finalBrief) {
            return Response.json({ error: 'Brief has not been generated yet' }, { status: 400 });
        }

        // Fetch confirmed points
        const confirmedPoints = brief.confirmedPoints || [];

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

                    // Rammer Section
                    new Paragraph({
                        children: [
                            new TextRun({ text: "RAMMER", bold: true, size: 24, color: "1e40af" })
                        ],
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 200, after: 200 }
                    }),

                    new Paragraph({
                        children: [
                            new TextRun({ text: "Målgruppe: ", bold: true }),
                            new TextRun({ text: brief.rammer?.targetAudience || "Ikke spesifisert" })
                        ],
                        spacing: { after: 100 }
                    }),

                    new Paragraph({
                        children: [
                            new TextRun({ text: "Mål: ", bold: true }),
                            new TextRun({ text: brief.rammer?.objectives || "Ikke spesifisert" })
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
                            new TextRun({ text: "Tone: ", bold: true }),
                            new TextRun({ text: brief.rammer?.tone || "Ikke spesifisert" })
                        ],
                        spacing: { after: 100 }
                    }),

                    new Paragraph({
                        children: [
                            new TextRun({ text: "Ønskede leveranser: ", bold: true }),
                            new TextRun({ text: brief.rammer?.deliverables?.join(", ") || "Ikke spesifisert" })
                        ],
                        spacing: { after: 100 }
                    }),

                    ...(brief.rammer?.deadline ? [new Paragraph({
                        children: [
                            new TextRun({ text: "Tidsfrist: ", bold: true }),
                            new TextRun({ text: brief.rammer.deadline })
                        ],
                        spacing: { after: 100 }
                    })] : []),

                    ...(brief.rammer?.activationDate ? [new Paragraph({
                        children: [
                            new TextRun({ text: "Aktiveringstidspunkt: ", bold: true }),
                            new TextRun({ text: brief.rammer.activationDate })
                        ],
                        spacing: { after: 100 }
                    })] : []),

                    // Bakgrunn Section
                    new Paragraph({
                        children: [
                            new TextRun({ text: "BAKGRUNN", bold: true, size: 24, color: "1e40af" })
                        ],
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 }
                    }),

                    ...finalBrief.background.split('\n').filter(p => p.trim()).map(paragraph => 
                        new Paragraph({
                            children: [new TextRun({ text: paragraph })],
                            spacing: { after: 150 }
                        })
                    ),

                    // Nøkkelpunkter Section
                    new Paragraph({
                        children: [
                            new TextRun({ text: "NØKKELPUNKTER", bold: true, size: 24, color: "1e40af" })
                        ],
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 }
                    }),

                    ...finalBrief.keyPoints.split('\n').filter(p => p.trim()).map(point => 
                        new Paragraph({
                            children: [new TextRun({ text: point.replace(/^[-•*]\s*/, '• ') })],
                            spacing: { after: 100 }
                        })
                    ),

                    // Hovedbudskap Section
                    new Paragraph({
                        children: [
                            new TextRun({ text: "HOVEDBUDSKAP", bold: true, size: 24, color: "1e40af" })
                        ],
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 }
                    }),

                    new Paragraph({
                        children: [
                            new TextRun({ text: finalBrief.message, bold: true, size: 24 })
                        ],
                        shading: { fill: "eff6ff" },
                        spacing: { after: 200 }
                    }),

                    // Eksempler Section (if exists)
                    ...(finalBrief.examples ? [
                        new Paragraph({
                            children: [
                                new TextRun({ text: "EKSEMPLER", bold: true, size: 24, color: "1e40af" })
                            ],
                            heading: HeadingLevel.HEADING_1,
                            spacing: { before: 400, after: 200 }
                        }),
                        ...finalBrief.examples.split('\n').filter(p => p.trim()).map(example => 
                            new Paragraph({
                                children: [new TextRun({ text: example })],
                                spacing: { after: 100 }
                            })
                        )
                    ] : []),

                    // Bekreftede punkter Section (if exists)
                    ...(confirmedPoints.length > 0 ? [
                        new Paragraph({
                            children: [
                                new TextRun({ text: "BEKREFTEDE PUNKTER FRA DIALOG", bold: true, size: 24, color: "1e40af" })
                            ],
                            heading: HeadingLevel.HEADING_1,
                            spacing: { before: 400, after: 200 }
                        }),
                        ...confirmedPoints.map(point => 
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `✓ ${point.topic}: `, bold: true }),
                                    new TextRun({ text: point.summary })
                                ],
                                spacing: { after: 100 }
                            })
                        )
                    ] : []),

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
                                text: `Generert: ${new Date(finalBrief.generatedAt).toLocaleDateString('nb-NO')} | GS1 Norway - Dynamisk Brief`,
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
        
        // Convert to Uint8Array for proper binary response
        const uint8Array = new Uint8Array(buffer);

        const filename = `${brief.title.replace(/[^a-zA-Z0-9æøåÆØÅ\s-]/g, '').replace(/\s+/g, '_')}.docx`;

        return new Response(uint8Array, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': uint8Array.byteLength.toString()
            }
        });
    } catch (error) {
        console.error('Export error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});