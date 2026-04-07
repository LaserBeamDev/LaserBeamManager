import jsPDF from 'jspdf';

/**
 * Generate a branded LaserBeam PDF report from an AI analysis conversation.
 */
export function downloadAnalyticsReport(question: string, answer: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  // --- Header band ---
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Logo text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('LaserBeam', margin, 18);

  // Subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text('Informe de Análisis Inteligente', margin, 26);

  // Date on the right
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(`${dateStr} — ${timeStr}`, pageWidth - margin, 26, { align: 'right' });

  // Accent line
  doc.setDrawColor(0, 180, 120);
  doc.setLineWidth(0.8);
  doc.line(margin, 38, pageWidth - margin, 38);

  // --- Brief section ---
  let y = 48;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y - 4, contentWidth, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('BRIEF DEL INFORME', margin + 5, y + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const briefLines = doc.splitTextToSize(question, contentWidth - 10);
  doc.text(briefLines.slice(0, 2), margin + 5, y + 11);

  y += 28;

  // --- Separator ---
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // --- Body ---
  // Strip markdown formatting for clean PDF text
  const cleanText = answer
    .replace(/###\s?/g, '')
    .replace(/##\s?/g, '')
    .replace(/#\s?/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1');

  const paragraphs = cleanText.split('\n');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      y += 3;
      continue;
    }

    // Detect headings (lines that were markdown headers — usually short, all caps or bold text)
    const isHeading = para.match(/^[A-ZÁÉÍÓÚÑ⚠️✅📊📈🔍💡🎯📋][^\n]{0,60}$/);
    if (isHeading) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
    }

    const lines = doc.splitTextToSize(trimmed, contentWidth);
    const blockHeight = lines.length * 5;

    // Page break check
    if (y + blockHeight > pageHeight - 25) {
      // Footer on current page
      addFooter(doc, pageWidth, pageHeight, margin);
      doc.addPage();
      y = 20;
    }

    // Bullet indent
    const xOffset = (trimmed.startsWith('- ') || trimmed.startsWith('• ')) ? 4 : 0;
    doc.text(lines, margin + xOffset, y);
    y += blockHeight + 2;

    // Reset after heading
    if (isHeading) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
    }
  }

  // Footer on last page
  addFooter(doc, pageWidth, pageHeight, margin);

  // Download
  const fileName = `LaserBeam_Informe_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

function addFooter(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number) {
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text('LaserBeam — Informe generado por Asistente IA', margin, pageHeight - 10);
  doc.text(`Página ${doc.internal.pages.length - 1}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
}
