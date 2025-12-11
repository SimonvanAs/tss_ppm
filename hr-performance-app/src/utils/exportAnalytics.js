// Analytics export utilities (Excel and PDF)

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { GRID_POSITIONS, PERFORMANCE_TIERS, getGridColor, getPerformanceLevel } from './analyticsUtils';

/**
 * Export analytics data to Excel
 * @param {Object} analyticsData - Analytics data from API
 * @param {Object} options - Export options
 */
export async function exportAnalyticsToExcel(analyticsData, options = {}) {
  const {
    scopeName = 'Organization',
    year = new Date().getFullYear(),
    stage = 'endYear',
    includeEmployees = false,
    employees = [],
  } = options;

  // Create workbook
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TSS PPM';
  wb.created = new Date();

  // Summary sheet
  const summary = analyticsData.summary || {};
  const summarySheet = wb.addWorksheet('Summary');
  const summaryData = [
    ['Performance Analytics Report'],
    [''],
    ['Scope', scopeName],
    ['Year', year],
    ['Stage', stage === 'endYear' ? 'End Year' : 'Mid Year'],
    ['Generated', new Date().toLocaleDateString()],
    [''],
    ['Summary Statistics'],
    ['Total Employees', summary.totalEmployees || 0],
    ['Scored Employees', summary.scoredEmployees || 0],
    ['Completion Rate', `${summary.completionRate || 0}%`],
    ['Average WHAT Score', summary.avgWhatScore?.toFixed(2) || 'N/A'],
    ['Average HOW Score', summary.avgHowScore?.toFixed(2) || 'N/A'],
    [''],
    ['Distribution'],
    ['Top Talent', analyticsData.distribution?.topTalent || 0],
    ['Solid Performers', analyticsData.distribution?.solidPerformer || 0],
    ['Needs Attention', analyticsData.distribution?.needsAttention || 0],
    ['Concern', analyticsData.distribution?.concern || 0],
  ];
  summarySheet.addRows(summaryData);

  // Style the title row
  summarySheet.getRow(1).font = { bold: true, size: 14 };
  summarySheet.getColumn(1).width = 25;
  summarySheet.getColumn(2).width = 20;

  // 9-Grid Distribution sheet
  const gridSheet = wb.addWorksheet('9-Grid Distribution');
  const gridData = [
    ['9-Grid Distribution'],
    [''],
    ['Position', 'Label', 'Count', 'Percentage', 'Performance Level'],
  ];

  // Add each grid position
  Object.entries(GRID_POSITIONS).forEach(([key, config]) => {
    const cellData = analyticsData.grid?.[key] || { count: 0, percentage: 0 };
    gridData.push([
      key,
      config.label,
      cellData.count || 0,
      `${(cellData.percentage || 0).toFixed(1)}%`,
      getPerformanceLevel(config.whatPos, config.howPos),
    ]);
  });
  gridSheet.addRows(gridData);

  // Style the grid sheet
  gridSheet.getRow(1).font = { bold: true, size: 14 };
  gridSheet.getRow(3).font = { bold: true };
  gridSheet.columns.forEach(col => { col.width = 18; });

  // Employee List sheet (if included)
  if (includeEmployees && employees.length > 0) {
    const employeeSheet = wb.addWorksheet('Employee List');
    const employeeData = [
      ['Employee List'],
      [''],
      ['Name', 'Email', 'Function Title', 'Business Unit', 'WHAT Score', 'HOW Score', 'Grid Position', 'Performance Level'],
      ...employees.map(emp => {
        const gridPos = getGridPosition(emp.whatScore, emp.howScore);
        return [
          `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
          emp.email || '',
          emp.functionTitle || '',
          emp.businessUnit || '',
          emp.whatScore?.toFixed(2) || '',
          emp.howScore?.toFixed(2) || '',
          gridPos.label,
          gridPos.level,
        ];
      }),
    ];
    employeeSheet.addRows(employeeData);

    // Style the employee sheet
    employeeSheet.getRow(1).font = { bold: true, size: 14 };
    employeeSheet.getRow(3).font = { bold: true };
    employeeSheet.columns.forEach(col => { col.width = 18; });
  }

  // Generate filename and download
  const sanitizedScope = scopeName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Analytics_${sanitizedScope}_${year}_${new Date().toISOString().split('T')[0]}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}

/**
 * Export analytics data to PDF
 * @param {Object} analyticsData - Analytics data from API
 * @param {Object} options - Export options
 */
export function exportAnalyticsToPDF(analyticsData, options = {}) {
  const {
    scopeName = 'Organization',
    year = new Date().getFullYear(),
    stage = 'endYear',
  } = options;

  // Create PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Performance Analytics Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Scope
  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  doc.text(scopeName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Year and Stage
  doc.setFontSize(11);
  doc.text(`${year} - ${stage === 'endYear' ? 'End Year' : 'Mid Year'}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Generation date
  doc.setFontSize(10);
  doc.setTextColor(128);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  doc.setTextColor(0);
  yPosition += 15;

  // Summary Statistics Section
  const summary = analyticsData.summary || {};
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Summary Statistics', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');

  // Stats in two columns
  const leftStats = [
    `Total Employees: ${summary.totalEmployees || 0}`,
    `Scored Employees: ${summary.scoredEmployees || 0}`,
    `Completion Rate: ${summary.completionRate || 0}%`,
  ];
  const rightStats = [
    `Avg WHAT Score: ${summary.avgWhatScore?.toFixed(2) || 'N/A'}`,
    `Avg HOW Score: ${summary.avgHowScore?.toFixed(2) || 'N/A'}`,
  ];

  leftStats.forEach((line, i) => {
    doc.text(line, 25, yPosition);
    if (rightStats[i]) {
      doc.text(rightStats[i], 110, yPosition);
    }
    yPosition += 6;
  });
  yPosition += 10;

  // 9-Grid Visualization
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('9-Grid Distribution', 20, yPosition);
  yPosition += 10;

  // Draw 9-grid
  const gridSize = 40;
  const gridStartX = (pageWidth - gridSize * 3) / 2;
  const gridStartY = yPosition;

  // Draw grid cells
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const whatPos = 3 - row; // Top row is 3, bottom is 1
      const howPos = col + 1;  // Left col is 1, right is 3
      const key = `${whatPos}-${howPos}`;
      const cellData = analyticsData.grid?.[key] || { count: 0, percentage: 0 };
      const config = GRID_POSITIONS[key];

      const x = gridStartX + col * gridSize;
      const y = gridStartY + row * gridSize;

      // Fill color based on performance tier
      const color = getGridColorRGB(whatPos, howPos);
      doc.setFillColor(color.r, color.g, color.b);
      doc.rect(x, y, gridSize, gridSize, 'F');

      // Border
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1);
      doc.rect(x, y, gridSize, gridSize, 'S');

      // Label
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(config?.label || '', x + gridSize / 2, y + 15, { align: 'center' });

      // Count
      doc.setFontSize(16);
      doc.text(String(cellData.count || 0), x + gridSize / 2, y + 28, { align: 'center' });

      // Percentage
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`${(cellData.percentage || 0).toFixed(0)}%`, x + gridSize / 2, y + 36, { align: 'center' });
    }
  }

  // Reset text color
  doc.setTextColor(0);
  yPosition = gridStartY + gridSize * 3 + 15;

  // Axis labels
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(128);

  // WHAT axis label (vertical)
  doc.text('WHAT', gridStartX - 10, gridStartY + gridSize * 1.5, { angle: 90 });

  // HOW axis label (horizontal)
  doc.text('HOW', gridStartX + gridSize * 1.5, gridStartY + gridSize * 3 + 8, { align: 'center' });

  doc.setTextColor(0);
  yPosition += 5;

  // Distribution Summary
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Performance Distribution', 20, yPosition);
  yPosition += 8;

  const distribution = analyticsData.distribution || {};
  const distData = [
    { label: 'Top Talent', count: distribution.topTalent || 0, color: { r: 27, g: 94, b: 32 } },
    { label: 'Solid Performer', count: distribution.solidPerformer || 0, color: { r: 40, g: 167, b: 69 } },
    { label: 'Needs Attention', count: distribution.needsAttention || 0, color: { r: 255, g: 165, b: 0 } },
    { label: 'Concern', count: distribution.concern || 0, color: { r: 220, g: 53, b: 69 } },
  ];

  const totalScored = summary.scoredEmployees || 1;
  const barMaxWidth = 100;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');

  distData.forEach(item => {
    // Label
    doc.text(item.label, 25, yPosition);

    // Bar
    const barWidth = (item.count / totalScored) * barMaxWidth;
    doc.setFillColor(item.color.r, item.color.g, item.color.b);
    doc.rect(80, yPosition - 4, barWidth, 5, 'F');

    // Count
    doc.text(`${item.count} (${((item.count / totalScored) * 100).toFixed(0)}%)`, 185, yPosition);

    yPosition += 8;
  });

  // Legend
  yPosition += 10;
  doc.setFontSize(9);
  doc.setTextColor(128);
  doc.text('Grid Legend:', 20, yPosition);
  yPosition += 5;
  doc.text('Top Talent: A3, B3, A2  |  Solid Performer: B2, C3, A1  |  Needs Attention: C2, B1  |  Concern: C1', 20, yPosition);

  // Footer
  doc.setFontSize(8);
  doc.text('Generated by TSS PPM Performance Management System', pageWidth / 2, 285, { align: 'center' });

  // Generate filename and download
  const sanitizedScope = scopeName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Analytics_${sanitizedScope}_${year}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Get grid position from scores
 */
function getGridPosition(whatScore, howScore) {
  if (!whatScore || !howScore) {
    return { label: '-', level: 'Not Scored' };
  }

  // Convert scores to positions (1, 2, or 3)
  const whatPos = whatScore < 1.67 ? 1 : whatScore < 2.34 ? 2 : 3;
  const howPos = howScore < 1.67 ? 1 : howScore < 2.34 ? 2 : 3;

  const labels = { 1: 'C', 2: 'B', 3: 'A' };
  const label = `${labels[whatPos]}${howPos}`;
  const level = getPerformanceLevel(whatPos, howPos);

  return { label, level };
}

/**
 * Get RGB color for grid cell
 */
function getGridColorRGB(whatPos, howPos) {
  const key = `${whatPos}-${howPos}`;

  // Top Talent (A3, B3, A2)
  if (['3-3', '2-3', '3-2'].includes(key)) {
    return { r: 27, g: 94, b: 32 }; // Dark green
  }

  // Solid Performer (B2, C3, A1)
  if (['2-2', '1-3', '3-1'].includes(key)) {
    return { r: 40, g: 167, b: 69 }; // Green
  }

  // Needs Attention (C2, B1)
  if (['1-2', '2-1'].includes(key)) {
    return { r: 255, g: 165, b: 0 }; // Orange
  }

  // Concern (C1)
  if (key === '1-1') {
    return { r: 220, g: 53, b: 69 }; // Red
  }

  return { r: 128, g: 128, b: 128 }; // Gray fallback
}
