// Historical data export utilities (Excel and PDF)

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import {
  transformReviewsToTrendData,
  calculateHistoryStats,
  buildYearOverYearComparison,
  getPerformanceLabel,
} from './historyUtils';

/**
 * Export historical data to Excel
 * @param {Array} reviews - Array of review cycle objects
 * @param {string} employeeName - Employee name for filename
 * @param {Object} options - Export options
 */
export async function exportToExcel(reviews, employeeName, options = {}) {
  const { includeDetails = true } = options;

  // Create workbook
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TSS PPM';
  wb.created = new Date();

  // Summary sheet
  const stats = calculateHistoryStats(reviews);
  const summarySheet = wb.addWorksheet('Summary');
  const summaryData = [
    ['Performance History Summary'],
    [''],
    ['Employee', employeeName],
    ['Generated', new Date().toLocaleDateString()],
    [''],
    ['Statistics'],
    ['Total Reviews', stats.totalReviews],
    ['Years Span', `${stats.firstYear} - ${stats.lastYear}`],
    ['Average WHAT Score', stats.avgWhatScore || 'N/A'],
    ['Average HOW Score', stats.avgHowScore || 'N/A'],
    ['Latest WHAT Score', stats.latestWhatScore || 'N/A'],
    ['Latest HOW Score', stats.latestHowScore || 'N/A'],
    ['Latest Grid Position', stats.latestGridPosition || 'N/A'],
    ['Overall Trend', stats.trend.toUpperCase()],
  ];
  summarySheet.addRows(summaryData);

  // Style the summary sheet
  summarySheet.getRow(1).font = { bold: true, size: 14 };
  summarySheet.getColumn(1).width = 25;
  summarySheet.getColumn(2).width = 20;

  // Scores by Year sheet
  const trendData = transformReviewsToTrendData(reviews);
  const scoresSheet = wb.addWorksheet('Scores by Year');
  const scoresData = [
    ['Year', 'WHAT (Mid)', 'WHAT (End)', 'HOW (Mid)', 'HOW (End)', 'Grid Position', 'Performance Level', 'Status'],
    ...trendData.map(d => [
      d.year,
      d.whatScoreMidYear?.toFixed(2) || '',
      d.whatScoreEndYear?.toFixed(2) || '',
      d.howScoreMidYear?.toFixed(2) || '',
      d.howScoreEndYear?.toFixed(2) || '',
      d.whatPosition && d.howPosition
        ? `${getGridLetter(d.howPosition)}${d.whatPosition}`
        : '',
      getPerformanceLabel(d.whatPosition, d.howPosition),
      d.status,
    ]),
  ];
  scoresSheet.addRows(scoresData);

  // Style the scores sheet
  scoresSheet.getRow(1).font = { bold: true };
  scoresSheet.columns.forEach(col => { col.width = 15; });

  // Year-over-Year Changes sheet
  const comparison = buildYearOverYearComparison(reviews);
  if (comparison.years.length > 1) {
    const changesSheet = wb.addWorksheet('Year-over-Year');
    const changesData = [
      ['Year', 'WHAT Score', 'WHAT Change', 'HOW Score', 'HOW Change'],
      ...comparison.years.map((year, i) => {
        const whatScore = comparison.metrics.whatScoreEndYear[year];
        const howScore = comparison.metrics.howScoreEndYear[year];
        const change = comparison.changes[year];

        return [
          year,
          whatScore?.toFixed(2) || '',
          change ? `${change.whatChange.delta > 0 ? '+' : ''}${change.whatChange.delta || 0}` : '-',
          howScore?.toFixed(2) || '',
          change ? `${change.howChange.delta > 0 ? '+' : ''}${change.howChange.delta || 0}` : '-',
        ];
      }),
    ];
    changesSheet.addRows(changesData);

    // Style the changes sheet
    changesSheet.getRow(1).font = { bold: true };
    changesSheet.columns.forEach(col => { col.width = 15; });
  }

  // Goals History sheet (if details included)
  if (includeDetails) {
    const goalsData = [['Year', 'Goal Title', 'Weight %', 'Mid-Year Score', 'End-Year Score']];
    reviews.forEach(review => {
      if (review.goals && review.goals.length > 0) {
        review.goals.forEach(goal => {
          goalsData.push([
            review.year,
            goal.title || '',
            goal.weight || '',
            goal.scoreMidYear || '',
            goal.scoreEndYear || '',
          ]);
        });
      }
    });
    if (goalsData.length > 1) {
      const goalsSheet = wb.addWorksheet('Goals History');
      goalsSheet.addRows(goalsData);

      // Style the goals sheet
      goalsSheet.getRow(1).font = { bold: true };
      goalsSheet.columns.forEach(col => { col.width = 18; });
    }
  }

  // Generate filename and download
  const filename = `${employeeName.replace(/\s+/g, '_')}_Performance_History_${new Date().toISOString().split('T')[0]}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}

/**
 * Get grid letter from position
 */
function getGridLetter(position) {
  const letters = { 1: 'C', 2: 'B', 3: 'A' };
  return letters[position] || '?';
}

/**
 * Export historical data to PDF
 * @param {Array} reviews - Array of review cycle objects
 * @param {string} employeeName - Employee name for filename
 * @param {Object} options - Export options
 */
export function exportToPDF(reviews, employeeName, options = {}) {
  const { language = 'en' } = options;

  // Create PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Performance History Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Employee name
  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  doc.text(employeeName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Generation date
  doc.setFontSize(10);
  doc.setTextColor(128);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  doc.setTextColor(0);
  yPosition += 15;

  // Statistics Section
  const stats = calculateHistoryStats(reviews);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Summary Statistics', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const statsLines = [
    `Total Reviews: ${stats.totalReviews}`,
    `Period: ${stats.firstYear || 'N/A'} - ${stats.lastYear || 'N/A'}`,
    `Average WHAT Score: ${stats.avgWhatScore?.toFixed(2) || 'N/A'}`,
    `Average HOW Score: ${stats.avgHowScore?.toFixed(2) || 'N/A'}`,
    `Latest Grid Position: ${stats.latestGridPosition || 'N/A'}`,
    `Overall Trend: ${stats.trend.toUpperCase()}`,
  ];

  statsLines.forEach(line => {
    doc.text(line, 25, yPosition);
    yPosition += 6;
  });
  yPosition += 10;

  // Score History Table
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Score History', 20, yPosition);
  yPosition += 8;

  // Table headers
  const headers = ['Year', 'WHAT', 'HOW', 'Position', 'Status'];
  const colWidths = [25, 30, 30, 35, 50];
  let xPos = 20;

  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPosition);
    xPos += colWidths[i];
  });
  yPosition += 2;

  // Draw header line
  doc.setDrawColor(200);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 5;

  // Table rows
  doc.setFont(undefined, 'normal');
  const trendData = transformReviewsToTrendData(reviews);

  trendData.forEach(data => {
    // Check if we need a new page
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    xPos = 20;
    const row = [
      data.year.toString(),
      data.whatScoreEndYear?.toFixed(2) || data.whatScoreMidYear?.toFixed(2) || '-',
      data.howScoreEndYear?.toFixed(2) || data.howScoreMidYear?.toFixed(2) || '-',
      data.whatPosition && data.howPosition
        ? `${getGridLetter(data.howPosition)}${data.whatPosition}`
        : '-',
      formatStatus(data.status),
    ];

    row.forEach((cell, i) => {
      doc.text(cell, xPos, yPosition);
      xPos += colWidths[i];
    });
    yPosition += 6;
  });

  // Year-over-Year Changes
  const comparison = buildYearOverYearComparison(reviews);
  if (comparison.years.length > 1) {
    yPosition += 10;

    // Check for new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Year-over-Year Changes', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');

    comparison.years.forEach((year, i) => {
      if (i === 0) return; // Skip first year (no previous to compare)

      const change = comparison.changes[year];
      if (!change) return;

      const whatChange = change.whatChange;
      const howChange = change.howChange;

      const whatArrow = whatChange.direction === 'up' ? '+' : whatChange.direction === 'down' ? '-' : '=';
      const howArrow = howChange.direction === 'up' ? '+' : howChange.direction === 'down' ? '-' : '=';

      doc.text(
        `${comparison.years[i - 1]} → ${year}: WHAT ${whatArrow}${Math.abs(whatChange.delta || 0).toFixed(2)}, HOW ${howArrow}${Math.abs(howChange.delta || 0).toFixed(2)}`,
        25,
        yPosition
      );
      yPosition += 6;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text('Generated by TSS PPM Performance Management System', pageWidth / 2, 285, { align: 'center' });

  // Generate filename and download
  const filename = `${employeeName.replace(/\s+/g, '_')}_Performance_History_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Format status for display
 */
function formatStatus(status) {
  const statusMap = {
    DRAFT: 'Draft',
    GOAL_SETTING: 'Goal Setting',
    GOAL_SETTING_COMPLETE: 'Goals Set',
    MID_YEAR_REVIEW: 'Mid-Year',
    MID_YEAR_COMPLETE: 'Mid-Year Done',
    END_YEAR_REVIEW: 'End-Year',
    COMPLETED: 'Completed',
    ARCHIVED: 'Archived',
  };
  return statusMap[status] || status || '-';
}
