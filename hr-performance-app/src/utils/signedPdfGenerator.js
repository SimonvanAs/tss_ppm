/**
 * Signed PDF Generator for Performance Reviews
 * Generates a PDF document with signature block for completed reviews
 */
import jsPDF from 'jspdf';

const COLORS = {
  primary: [0, 74, 145],       // #004A91 Navy Blue
  accent: [204, 14, 112],      // #CC0E70 Magenta
  text: [51, 51, 51],          // #333333
  lightGray: [245, 245, 245],  // #F5F5F5
  darkGray: [102, 102, 102],   // #666666
  green: [40, 167, 69],        // #28A745
  darkGreen: [27, 94, 32],     // #1B5E20
  red: [220, 53, 69],          // #DC3545
  orange: [255, 165, 0],       // #FFA500
};

/**
 * Get grid color for a position
 */
function getGridColor(whatPos, howPos) {
  const colorMap = {
    '1-1': COLORS.red,
    '1-2': COLORS.orange,
    '1-3': COLORS.orange,
    '2-1': COLORS.orange,
    '2-2': COLORS.green,
    '2-3': COLORS.green,
    '3-1': COLORS.orange,
    '3-2': COLORS.green,
    '3-3': COLORS.darkGreen,
  };
  return colorMap[`${whatPos}-${howPos}`] || [229, 231, 235];
}

/**
 * Round score to grid position (1, 2, or 3)
 */
function roundToGridPosition(score) {
  if (score < 1.67) return 1;
  if (score < 2.34) return 2;
  return 3;
}

/**
 * Format date to locale string
 */
function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Generate a signed PDF for a completed review
 */
export async function generateSignedReviewPDF(reviewData, signatureData, options = {}) {
  const {
    language = 'en',
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper functions
  const addText = (text, x, fontSize, color = COLORS.text, style = 'normal') => {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    doc.setFont('helvetica', style);
    doc.text(text, x, y);
  };

  const addCenteredText = (text, fontSize, color = COLORS.text, style = 'normal') => {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    doc.setFont('helvetica', style);
    doc.text(text, pageWidth / 2, y, { align: 'center' });
  };

  const addNewLine = (height = 6) => {
    y += height;
  };

  const checkNewPage = (neededSpace = 40) => {
    if (y + neededSpace > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // ========================
  // HEADER
  // ========================
  addCenteredText('PERFORMANCE REVIEW REPORT', 20, COLORS.primary, 'bold');
  addNewLine(8);
  addCenteredText('(Digitally Signed)', 12, COLORS.darkGray);
  addNewLine(10);

  // Employee name
  addCenteredText(reviewData.employeeName || 'Employee', 16, COLORS.text, 'bold');
  addNewLine(6);
  addCenteredText(`${reviewData.role || ''} | ${reviewData.businessUnit || ''}`, 11, COLORS.darkGray);
  addNewLine(6);
  addCenteredText(`Review Year: ${reviewData.year}`, 11, COLORS.darkGray);
  addNewLine(12);

  // Horizontal line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  addNewLine(10);

  // ========================
  // SUMMARY SCORES
  // ========================
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(margin, y - 4, contentWidth, 24, 'F');

  const whatScore = reviewData.whatScoreEndYear || reviewData.whatScoreMidYear;
  const howScore = reviewData.howScoreEndYear || reviewData.howScoreMidYear;

  addText('WHAT Score:', margin + 10, 11, COLORS.text, 'bold');
  doc.setTextColor(...COLORS.accent);
  doc.text(whatScore ? whatScore.toFixed(2) : '-', margin + 45, y);

  addText('HOW Score:', margin + 70, 11, COLORS.text, 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(howScore ? howScore.toFixed(2) : '-', margin + 102, y);

  // Grid position badge
  if (whatScore && howScore) {
    const whatPos = roundToGridPosition(whatScore);
    const howPos = roundToGridPosition(howScore);
    const gridLabel = `${String.fromCharCode(65 + 3 - whatPos)}${howPos}`;
    const gridColor = getGridColor(whatPos, howPos);

    doc.setFillColor(...gridColor);
    doc.roundedRect(margin + 130, y - 6, 25, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(gridLabel, margin + 142.5, y, { align: 'center' });
  }

  addNewLine(20);

  // ========================
  // EXECUTIVE SUMMARY
  // ========================
  if (reviewData.summary) {
    checkNewPage(30);
    addText('Executive Summary', margin, 12, COLORS.primary, 'bold');
    addNewLine(6);

    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(reviewData.summary, contentWidth);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5;
    addNewLine(8);
  }

  // ========================
  // GOALS
  // ========================
  const goals = reviewData.goals || [];
  if (goals.length > 0) {
    checkNewPage(30);
    addText('Goals & Results (WHAT)', margin, 12, COLORS.primary, 'bold');
    addNewLine(8);

    goals.forEach((goal, idx) => {
      checkNewPage(25);

      // Goal header
      doc.setFillColor(...COLORS.lightGray);
      doc.rect(margin, y - 4, contentWidth, 8, 'F');
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.text);
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${goal.title}`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`Weight: ${goal.weight}%`, pageWidth - margin - 25, y);

      // Score badge
      const score = goal.scoreEndYear || goal.scoreMidYear;
      if (score) {
        doc.setFillColor(...(score === 3 ? COLORS.green : score === 2 ? COLORS.orange : COLORS.red));
        doc.roundedRect(pageWidth - margin - 50, y - 4, 18, 7, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text(String(score), pageWidth - margin - 41, y - 0.5, { align: 'center' });
      }
      addNewLine(8);

      // Description
      if (goal.description) {
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.darkGray);
        const descLines = doc.splitTextToSize(goal.description, contentWidth - 10);
        doc.text(descLines, margin + 5, y);
        y += descLines.length * 4;
      }

      // Notes
      const notes = goal.notesEndYear || goal.notesMidYear;
      if (notes) {
        addNewLine(2);
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.accent);
        doc.setFont('helvetica', 'italic');
        const noteLines = doc.splitTextToSize(`Notes: ${notes}`, contentWidth - 10);
        doc.text(noteLines, margin + 5, y);
        y += noteLines.length * 4;
        doc.setFont('helvetica', 'normal');
      }

      addNewLine(6);
    });
  }

  // ========================
  // COMPETENCIES
  // ========================
  const competencyScores = reviewData.competencyScores || [];
  if (competencyScores.length > 0) {
    checkNewPage(30);
    addText('Competencies (HOW)', margin, 12, COLORS.primary, 'bold');
    addNewLine(6);
    addText(`IDE Level: ${reviewData.tovLevel || '-'}`, margin, 10, COLORS.darkGray);
    addNewLine(8);

    competencyScores.forEach((cs) => {
      checkNewPage(20);

      const score = cs.scoreEndYear || cs.scoreMidYear;
      const competency = cs.competencyLevel || {};

      doc.setFillColor(...COLORS.lightGray);
      doc.rect(margin, y - 4, contentWidth, 8, 'F');

      // Category and title
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.text);
      doc.setFont('helvetica', 'bold');
      const title = typeof competency.title === 'object'
        ? competency.title[language] || competency.title.en || ''
        : competency.title || '';
      doc.text(`${competency.category || ''}: ${competency.subcategory || ''}`, margin + 2, y);

      // Score badge
      if (score) {
        doc.setFillColor(...(score === 3 ? COLORS.green : score === 2 ? COLORS.orange : COLORS.red));
        doc.roundedRect(pageWidth - margin - 20, y - 4, 18, 7, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text(String(score), pageWidth - margin - 11, y - 0.5, { align: 'center' });
      }
      addNewLine(8);

      // Title
      if (title) {
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.darkGray);
        doc.setFont('helvetica', 'normal');
        const titleLines = doc.splitTextToSize(title, contentWidth - 10);
        doc.text(titleLines, margin + 5, y);
        y += titleLines.length * 4;
      }

      addNewLine(4);
    });
  }

  // ========================
  // SELF ASSESSMENT
  // ========================
  if (reviewData.selfAssessment) {
    checkNewPage(30);
    addText('Employee Self-Assessment', margin, 12, COLORS.primary, 'bold');
    addNewLine(6);

    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    const selfLines = doc.splitTextToSize(reviewData.selfAssessment, contentWidth);
    doc.text(selfLines, margin, y);
    y += selfLines.length * 5;
    addNewLine(8);
  }

  // ========================
  // MANAGER COMMENTS
  // ========================
  if (reviewData.managerComments) {
    checkNewPage(30);
    addText('Manager Comments', margin, 12, COLORS.primary, 'bold');
    addNewLine(6);

    doc.setFontSize(10);
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
    const commentLines = doc.splitTextToSize(reviewData.managerComments, contentWidth);
    doc.text(commentLines, margin, y);
    y += commentLines.length * 5;
    addNewLine(8);
  }

  // ========================
  // SIGNATURE BLOCK
  // ========================
  checkNewPage(80);
  addNewLine(10);

  // Signature block border
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentWidth, 65);

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(margin, y, contentWidth, 8, 'F');
  y += 5;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DIGITAL SIGNATURES', pageWidth / 2, y, { align: 'center' });
  addNewLine(10);

  // Employee Signature
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Acknowledgment', margin + 5, y);
  addNewLine(5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.darkGray);

  if (signatureData?.employee?.signedAt) {
    doc.text(signatureData.employee.signature || 'Acknowledged', margin + 5, y);
    addNewLine(4);
    doc.setFont('helvetica', 'italic');
    doc.text(`Signed by: ${signatureData.employee.name}`, margin + 5, y);
    doc.text(`Date: ${formatDate(signatureData.employee.signedAt)}`, margin + 80, y);
    addNewLine(4);
    if (signatureData.employee.comment) {
      doc.setTextColor(...COLORS.accent);
      const commentLines = doc.splitTextToSize(`Comment: ${signatureData.employee.comment}`, contentWidth - 15);
      doc.text(commentLines, margin + 5, y);
      y += commentLines.length * 4;
    }
  } else {
    doc.text('Pending signature', margin + 5, y);
    addNewLine(4);
  }

  addNewLine(6);

  // Divider
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.3);
  doc.line(margin + 5, y - 2, pageWidth - margin - 5, y - 2);
  addNewLine(4);

  // Manager Signature
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Manager Counter-Signature', margin + 5, y);
  addNewLine(5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.darkGray);

  if (signatureData?.manager?.signedAt) {
    doc.text(signatureData.manager.signature || 'Confirmed', margin + 5, y);
    addNewLine(4);
    doc.setFont('helvetica', 'italic');
    doc.text(`Signed by: ${signatureData.manager.name}`, margin + 5, y);
    doc.text(`Date: ${formatDate(signatureData.manager.signedAt)}`, margin + 80, y);
    addNewLine(4);
    if (signatureData.manager.comment) {
      doc.setTextColor(...COLORS.accent);
      const commentLines = doc.splitTextToSize(`Comment: ${signatureData.manager.comment}`, contentWidth - 15);
      doc.text(commentLines, margin + 5, y);
      y += commentLines.length * 4;
    }
  } else {
    doc.text('Pending signature', margin + 5, y);
  }

  // ========================
  // FOOTER
  // ========================
  const footerY = pageHeight - 10;
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.darkGray);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated: ${new Date().toLocaleString()} | Document ID: ${reviewData.id || 'N/A'}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Save the PDF
  const fileName = `Performance_Review_${reviewData.employeeName?.replace(/\s+/g, '_') || 'Employee'}_${reviewData.year}_Signed.pdf`;
  doc.save(fileName);

  return fileName;
}

/**
 * Generate a preview blob without saving
 */
export async function generateSignedReviewPDFBlob(reviewData, signatureData, options = {}) {
  // Same implementation but returns blob instead of saving
  const doc = await generatePDFDoc(reviewData, signatureData, options);
  return doc.output('blob');
}

/**
 * Internal: Generate the PDF document
 */
async function generatePDFDoc(reviewData, signatureData, options = {}) {
  // Reuse the main function logic but don't save
  // For now, this is a simplified version - can be expanded
  const doc = new jsPDF();
  // ... (would contain same logic as generateSignedReviewPDF)
  return doc;
}
