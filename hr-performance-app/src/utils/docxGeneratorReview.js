import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  VerticalAlign,
  TableLayoutType,
  Packer
} from 'docx';
import { saveAs } from 'file-saver';
import { calculateWhatScore, calculateHowScore, roundToGridPosition, GOAL_TYPES } from './scoring';

const COLORS = {
  primary: '004A91',
  accent: 'CC0E70',
  text: '333333',
  lightGray: 'F5F5F5',
  red: 'DC3545',
  orange: 'FFA500',
  green: '28A745',
  darkGreen: '1B5E20'
};

function getGridColorHex(whatPos, howPos) {
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
  return colorMap[`${whatPos}-${howPos}`] || 'E5E7EB';
}

function createHeader(review, language) {
  const employee = review.employee || {};
  const titles = {
    en: 'Performance Review Report',
    nl: 'Beoordelingsrapport',
    es: 'Informe de Evaluación'
  };

  return [
    new Paragraph({
      children: [
        new TextRun({
          text: titles[language] || titles.en,
          bold: true,
          size: 48,
          color: COLORS.primary
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee',
          bold: true,
          size: 32
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${employee.functionTitle?.name || ''} | ${review.year || new Date().getFullYear()}`,
          size: 24,
          color: COLORS.text
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  ];
}

function createEmployeeInfoTable(review, language) {
  const employee = review.employee || {};
  const manager = review.manager || {};
  const tovLevel = review.tovLevel || {};

  const labels = {
    en: {
      name: 'Employee Name',
      role: 'Function Title',
      tovLevel: 'IDE-Level',
      year: 'Review Year',
      manager: 'Manager',
      status: 'Status'
    },
    nl: {
      name: 'Naam medewerker',
      role: 'Functietitel',
      tovLevel: 'TOV-Niveau',
      year: 'Beoordelingsjaar',
      manager: 'Manager',
      status: 'Status'
    },
    es: {
      name: 'Nombre del empleado',
      role: 'Título de función',
      tovLevel: 'Nivel IDE',
      year: 'Año de evaluación',
      manager: 'Gerente',
      status: 'Estado'
    }
  };

  const l = labels[language] || labels.en;
  const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
  const managerName = `${manager.firstName || ''} ${manager.lastName || ''}`.trim();

  const rows = [
    [l.name, employeeName || '-'],
    [l.role, employee.functionTitle?.name || '-'],
    [l.tovLevel, tovLevel.code || '-'],
    [l.year, String(review.year || '-')],
    [l.manager, managerName || '-'],
    [l.status, review.status || '-']
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
            width: { size: 30, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: value })] })],
            width: { size: 70, type: WidthType.PERCENTAGE }
          })
        ]
      })
    )
  });
}

function createSectionTitle(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        color: COLORS.primary
      })
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 400, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.primary }
    }
  });
}

function createSummarySection(review, language) {
  const titles = {
    en: 'Executive Summary',
    nl: 'Samenvatting',
    es: 'Resumen Ejecutivo'
  };

  return [
    createSectionTitle(titles[language] || titles.en),
    new Paragraph({
      children: [new TextRun({ text: review.summary || '-' })],
      spacing: { after: 200 }
    })
  ];
}

function createGridVisualization(goals, competencyScores, review, language) {
  // Determine which score field to use
  const isEndYear = review.status === 'END_YEAR_REVIEW' ||
                    review.status === 'PENDING_SIGNATURES' ||
                    review.status === 'COMPLETED';
  const scoreField = isEndYear ? 'scoreEndYear' : 'scoreMidYear';

  // Calculate scores
  const scoringGoals = goals.map(g => ({
    ...g,
    score: g[scoreField],
    weight: String(g.weight || 0)
  }));

  const whatResult = calculateWhatScore(scoringGoals);
  const whatScore = whatResult?.score ?? null;
  const hasScfVeto = whatResult?.hasScfVeto ?? false;

  // Calculate HOW score from competency scores
  const competencyScoreObj = {};
  competencyScores.forEach(cs => {
    const score = cs[scoreField];
    if (score !== null && score !== undefined) {
      competencyScoreObj[cs.competencyLevelId] = score;
    }
  });
  const howScore = calculateHowScore(competencyScoreObj);

  const whatPosition = whatScore ? roundToGridPosition(whatScore) : null;
  const howPosition = howScore ? roundToGridPosition(howScore) : null;

  const titles = {
    en: 'Performance Grid',
    nl: 'Prestatiematrix',
    es: 'Matriz de Desempeño'
  };
  const whatAxisLabels = { en: 'WHAT', nl: 'WAT', es: 'QUÉ' };
  const howAxisLabels = { en: 'HOW', nl: 'HOE', es: 'CÓMO' };

  const whatAxisLabel = whatAxisLabels[language] || whatAxisLabels.en;
  const howAxisLabel = howAxisLabels[language] || howAxisLabels.en;

  const rows = [];

  // Header row with HOW axis label
  rows.push(new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph('')],
        width: { size: 15, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
      }),
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: `${howAxisLabel} →`, bold: true, size: 20 })],
          alignment: AlignmentType.CENTER
        })],
        columnSpan: 3,
        borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
      })
    ]
  }));

  // Build grid rows (from top to bottom: 3, 2, 1)
  for (let what = 3; what >= 1; what--) {
    const cells = [
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: what === 2 ? `${whatAxisLabel} ↑  ${what}` : `        ${what}`, bold: true, size: 20 })],
          alignment: AlignmentType.RIGHT
        })],
        width: { size: 15, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
      })
    ];

    for (let how = 1; how <= 3; how++) {
      const isPosition = whatPosition === what && howPosition === how;
      const color = getGridColorHex(what, how);

      cells.push(
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: isPosition ? '●' : ' ',
              size: 48,
              bold: true,
              color: 'FFFFFF'
            })],
            alignment: AlignmentType.CENTER
          })],
          width: { size: 28, type: WidthType.PERCENTAGE },
          shading: { fill: color, type: ShadingType.SOLID, color: color },
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'FFFFFF' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'FFFFFF' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'FFFFFF' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'FFFFFF' }
          }
        })
      );
    }

    rows.push(new TableRow({
      children: cells,
      height: { value: 600, rule: 'exact' }
    }));
  }

  // Add X-axis labels
  rows.push(new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph('')],
        borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: '1', bold: true, size: 20 })], alignment: AlignmentType.CENTER })],
        borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: '2', bold: true, size: 20 })], alignment: AlignmentType.CENTER })],
        borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: '3', bold: true, size: 20 })], alignment: AlignmentType.CENTER })],
        borders: { top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
      })
    ]
  }));

  const whatLabels = { en: 'WHAT Score', nl: 'WAT Score', es: 'Puntuación QUÉ' };
  const howLabels = { en: 'HOW Score', nl: 'HOE Score', es: 'Puntuación CÓMO' };
  const scfVetoLabels = { en: '[SCF VETO]', nl: '[SCF VETO]', es: '[VETO SCF]' };

  return [
    createSectionTitle(titles[language] || titles.en),
    new Table({
      width: { size: 60, type: WidthType.PERCENTAGE },
      rows,
      layout: TableLayoutType.FIXED
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${whatLabels[language] || whatLabels.en}: ${whatScore ? whatScore.toFixed(2) : '-'}`, bold: true }),
        ...(hasScfVeto ? [new TextRun({ text: ` ${scfVetoLabels[language] || scfVetoLabels.en}`, bold: true, color: COLORS.red })] : []),
        new TextRun({ text: '     |     ' }),
        new TextRun({ text: `${howLabels[language] || howLabels.en}: ${howScore ? howScore.toFixed(2) : '-'}`, bold: true })
      ],
      spacing: { before: 200, after: 200 }
    })
  ];
}

function createGoalsSection(goals, review, language) {
  const titles = {
    en: 'WHAT-Axis: Goals & Results',
    nl: 'WAT-As: Doelen & Resultaten',
    es: 'Eje QUÉ: Objetivos y Resultados'
  };
  const scoreLabels = {
    en: { 1: 'Below expectations', 2: 'Meets expectations', 3: 'Exceeds expectations' },
    nl: { 1: 'Onder verwachting', 2: 'Voldoet aan verwachting', 3: 'Overtreft verwachting' },
    es: { 1: 'Por debajo', 2: 'Cumple', 3: 'Supera' }
  };

  const isEndYear = review.status === 'END_YEAR_REVIEW' ||
                    review.status === 'PENDING_SIGNATURES' ||
                    review.status === 'COMPLETED';
  const scoreField = isEndYear ? 'scoreEndYear' : 'scoreMidYear';

  const labels = scoreLabels[language] || scoreLabels.en;
  const elements = [createSectionTitle(titles[language] || titles.en)];

  goals.filter(g => g.title?.trim()).forEach((goal, idx) => {
    const score = goal[scoreField];
    const isKar = goal.goalType === GOAL_TYPES.KAR;

    elements.push(
      new Paragraph({
        children: [
          ...(isKar ? [new TextRun({ text: '[KAR] ', bold: true, color: COLORS.accent })] : []),
          new TextRun({ text: `${idx + 1}. ${goal.title}`, bold: true, size: 24 }),
          new TextRun({ text: ` (${goal.weight || 0}%)`, color: COLORS.text })
        ],
        spacing: { before: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: goal.description || '' })],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: score ? `Score: ${score} - ${labels[score] || ''}` : 'Not scored',
            italics: true,
            color: COLORS.accent
          })
        ],
        spacing: { after: 200 }
      })
    );
  });

  return elements;
}

function createCompetenciesSection(competencyScores, review, language) {
  const titles = {
    en: 'HOW-Axis: Competencies',
    nl: 'HOE-As: Competenties',
    es: 'Eje CÓMO: Competencias'
  };
  const scoreLabels = {
    en: { 1: 'Below expectations', 2: 'Meets expectations', 3: 'Exceeds expectations' },
    nl: { 1: 'Onder verwachting', 2: 'Voldoet aan verwachting', 3: 'Overtreft verwachting' },
    es: { 1: 'Por debajo', 2: 'Cumple', 3: 'Supera' }
  };
  const notesLabels = { en: 'Notes', nl: 'Toelichting', es: 'Notas' };

  const isEndYear = review.status === 'END_YEAR_REVIEW' ||
                    review.status === 'PENDING_SIGNATURES' ||
                    review.status === 'COMPLETED';
  const scoreField = isEndYear ? 'scoreEndYear' : 'scoreMidYear';
  const notesField = isEndYear ? 'notesEndYear' : 'notesMidYear';

  const tovLevel = review.tovLevel || {};
  const labels = scoreLabels[language] || scoreLabels.en;

  const elements = [
    createSectionTitle(titles[language] || titles.en),
    new Paragraph({
      children: [
        new TextRun({ text: `Level ${tovLevel.code || ''}: `, bold: true }),
        new TextRun({ text: tovLevel.name || tovLevel.description || '' })
      ],
      spacing: { after: 200 }
    })
  ];

  competencyScores.forEach((cs) => {
    const competencyLevel = cs.competencyLevel || {};
    const competency = competencyLevel.competency || {};
    const score = cs[scoreField];
    const notes = cs[notesField];

    const title = competency.title?.[language] || competency.title?.en || competency.name || 'Competency';

    elements.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${competency.category || ''} - ${competency.subcategory || ''}`, bold: true })
        ],
        spacing: { before: 150 }
      }),
      new Paragraph({
        children: [new TextRun({ text: title, size: 22 })]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: score ? `Score: ${score} - ${labels[score]}` : 'Not scored',
            italics: true,
            color: score === 1 ? COLORS.red : COLORS.accent
          })
        ],
        spacing: { after: notes ? 50 : 100 }
      })
    );

    if (notes?.trim()) {
      elements.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${notesLabels[language] || notesLabels.en}: `, bold: true, size: 20 }),
            new TextRun({ text: notes, size: 20, color: '666666' })
          ],
          spacing: { after: 100 }
        })
      );
    }
  });

  return elements;
}

function createAssessmentSection(review, language) {
  const isEndYear = review.status === 'END_YEAR_REVIEW' ||
                    review.status === 'PENDING_SIGNATURES' ||
                    review.status === 'COMPLETED';

  const employeeSummary = isEndYear ? review.employeeSummaryEndYear : review.employeeSummaryMidYear;
  const managerSummary = isEndYear ? review.managerSummaryEndYear : review.managerSummaryMidYear;

  const employeeTitles = {
    en: 'Employee Self-Assessment',
    nl: 'Zelfevaluatie medewerker',
    es: 'Autoevaluación del Empleado'
  };
  const managerTitles = {
    en: 'Manager Comments',
    nl: 'Opmerkingen manager',
    es: 'Comentarios del Gerente'
  };

  const elements = [];

  if (employeeSummary) {
    elements.push(
      createSectionTitle(employeeTitles[language] || employeeTitles.en),
      new Paragraph({
        children: [new TextRun({ text: employeeSummary || '-' })],
        spacing: { after: 200 }
      })
    );
  }

  if (managerSummary) {
    elements.push(
      createSectionTitle(managerTitles[language] || managerTitles.en),
      new Paragraph({
        children: [new TextRun({ text: managerSummary || '-' })],
        spacing: { after: 200 }
      })
    );
  }

  return elements;
}

function createFooter(review, language) {
  const generatedLabels = { en: 'Generated on', nl: 'Gegenereerd op', es: 'Generado el' };
  const reviewLabels = { en: 'Review ID', nl: 'Review ID', es: 'ID de Revisión' };

  return [
    new Paragraph({
      children: [
        new TextRun({
          text: `${generatedLabels[language] || generatedLabels.en}: ${new Date().toLocaleDateString()} | ${reviewLabels[language] || reviewLabels.en}: ${review.id?.substring(0, 8) || '-'}`,
          size: 18,
          color: '999999'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 }
    })
  ];
}

/**
 * Generate DOCX report from API-backed review data
 */
export async function generateReportFromReview(review, goals, competencyScores, language = 'en', isDraft = false) {
  const employee = review.employee || {};

  const doc = new Document({
    creator: 'TSS PPM',
    title: `Performance Review - ${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
    description: 'Performance Review Report',
    styles: {
      default: {
        document: {
          run: {
            font: 'Verdana',
            size: 18
          }
        }
      }
    },
    sections: [{
      properties: {},
      children: [
        ...createHeader(review, language),
        createEmployeeInfoTable(review, language),
        ...createSummarySection(review, language),
        ...createGridVisualization(goals, competencyScores, review, language),
        ...createGoalsSection(goals, review, language),
        ...createCompetenciesSection(competencyScores, review, language),
        ...createAssessmentSection(review, language),
        ...createFooter(review, language)
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  const year = review.year || new Date().getFullYear();
  const employeeName = `${employee.firstName || ''}_${employee.lastName || ''}`.replace(/[^a-zA-Z0-9_]/g, '').replace(/_+/g, '_');
  const draftSuffix = isDraft ? '_DRAFT' : '';
  const fileName = `Performance_Review_${employeeName}_${year}${draftSuffix}.docx`;

  saveAs(blob, fileName);
}
