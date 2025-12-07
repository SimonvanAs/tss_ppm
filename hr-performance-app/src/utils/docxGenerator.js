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
import { calculateWhatScore, calculateHowScore, roundToGridPosition, mapLevelToGrid, getGridColor } from './scoring';
import { competencies, levelDescriptions } from './competencies';

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

function createHeader(formData, language) {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: language === 'nl' ? 'Beoordelingsrapport' : language === 'es' ? 'Informe de Evaluación' : 'Performance Review Report',
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
          text: formData.employeeName || 'Employee Name',
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
          text: `${formData.role || ''} | ${formData.businessUnit || ''}`,
          size: 24,
          color: COLORS.text
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  ];
}

function createEmployeeInfoTable(formData, language) {
  const labels = {
    en: {
      name: 'Employee Name',
      role: 'Function Title',
      businessUnit: 'Business Unit',
      tovLevel: 'TOV-Level',
      reviewDate: 'Review Date',
      manager: 'Manager'
    },
    nl: {
      name: 'Naam medewerker',
      role: 'Functietitel',
      businessUnit: 'Business Unit',
      tovLevel: 'TOV-Niveau',
      reviewDate: 'Beoordelingsdatum',
      manager: 'Manager'
    },
    es: {
      name: 'Nombre del empleado',
      role: 'Título de función',
      businessUnit: 'Unidad de Negocio',
      tovLevel: 'Nivel TOV',
      reviewDate: 'Fecha de evaluación',
      manager: 'Gerente'
    }
  };

  const l = labels[language] || labels.en;

  const rows = [
    [l.name, formData.employeeName || '-'],
    [l.role, formData.role || '-'],
    [l.businessUnit, formData.businessUnit || '-'],
    [l.tovLevel, formData.tovLevel || '-'],
    [l.reviewDate, formData.reviewDate || '-'],
    [l.manager, formData.managerName || '-']
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

function createSummarySection(formData, language) {
  const title = language === 'nl' ? 'Samenvatting' : language === 'es' ? 'Resumen Ejecutivo' : 'Executive Summary';

  return [
    createSectionTitle(title),
    new Paragraph({
      children: [new TextRun({ text: formData.summary || '-' })],
      spacing: { after: 200 }
    })
  ];
}

function createGridVisualization(formData, language) {
  const whatScore = calculateWhatScore(formData.goals || []);
  const howScore = calculateHowScore(formData.competencyScores || {});
  const whatPosition = whatScore ? roundToGridPosition(whatScore) : null;
  const howPosition = howScore ? roundToGridPosition(howScore) : mapLevelToGrid(formData.tovLevel);

  const title = language === 'nl' ? 'Prestatiematrix' : language === 'es' ? 'Matriz de Desempeño' : 'Performance Grid';
  const whatAxisLabel = language === 'nl' ? 'WAT' : language === 'es' ? 'QUÉ' : 'WHAT';
  const howAxisLabel = language === 'nl' ? 'HOE' : language === 'es' ? 'CÓMO' : 'HOW';

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

  const whatLabel = language === 'nl' ? 'WAT Score' : language === 'es' ? 'Puntuación QUÉ' : 'WHAT Score';
  const howLabel = language === 'nl' ? 'HOE Score' : language === 'es' ? 'Puntuación CÓMO' : 'HOW Score';

  return [
    createSectionTitle(title),
    new Table({
      width: { size: 60, type: WidthType.PERCENTAGE },
      rows,
      layout: TableLayoutType.FIXED
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${whatLabel}: ${whatScore ? whatScore.toFixed(2) : '-'}`, bold: true }),
        new TextRun({ text: '     |     ' }),
        new TextRun({ text: `${howLabel}: ${howScore ? howScore.toFixed(2) : '-'}`, bold: true })
      ],
      spacing: { before: 200, after: 200 }
    })
  ];
}

function createGoalsSection(formData, language) {
  const title = language === 'nl' ? 'WAT-As: Doelen & Resultaten' : language === 'es' ? 'Eje QUÉ: Objetivos y Resultados' : 'WHAT-Axis: Goals & Results';
  const scoreLabels = {
    en: { 1: 'Below expectations', 2: 'Meets expectations', 3: 'Exceeds expectations' },
    nl: { 1: 'Onder verwachting', 2: 'Voldoet aan verwachting', 3: 'Overtreft verwachting' },
    es: { 1: 'Por debajo', 2: 'Cumple', 3: 'Supera' }
  };

  const goals = (formData.goals || []).filter(g => g.title.trim());
  const labels = scoreLabels[language] || scoreLabels.en;

  const elements = [createSectionTitle(title)];

  goals.forEach((goal, index) => {
    elements.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${index + 1}. ${goal.title}`, bold: true, size: 24 }),
          new TextRun({ text: ` (${goal.weight}%)`, color: COLORS.text })
        ],
        spacing: { before: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: goal.description || '' })],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Score: ${goal.score} - ${labels[goal.score] || ''}`, italics: true, color: COLORS.accent })
        ],
        spacing: { after: 200 }
      })
    );
  });

  return elements;
}

function createCompetenciesSection(formData, language) {
  const title = language === 'nl' ? 'HOE-As: Competenties' : language === 'es' ? 'Eje CÓMO: Competencias' : 'HOW-Axis: Competencies';
  const selectedLevel = formData.tovLevel;

  if (!selectedLevel) {
    return [createSectionTitle(title), new Paragraph({ children: [new TextRun({ text: '-' })] })];
  }

  const levelComps = competencies[selectedLevel] || [];
  const scores = formData.competencyScores || {};
  const scoreLabels = {
    en: { 1: 'Below expectations', 2: 'Meets expectations', 3: 'Exceeds expectations' },
    nl: { 1: 'Onder verwachting', 2: 'Voldoet aan verwachting', 3: 'Overtreft verwachting' },
    es: { 1: 'Por debajo', 2: 'Cumple', 3: 'Supera' }
  };
  const labels = scoreLabels[language] || scoreLabels.en;

  const elements = [
    createSectionTitle(title),
    new Paragraph({
      children: [
        new TextRun({ text: `Level ${selectedLevel}: `, bold: true }),
        new TextRun({ text: levelDescriptions[selectedLevel]?.[language] || levelDescriptions[selectedLevel]?.en || '' })
      ],
      spacing: { after: 200 }
    })
  ];

  levelComps.forEach((comp) => {
    const score = scores[comp.id];
    elements.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${comp.category} - ${comp.subcategory}`, bold: true })
        ],
        spacing: { before: 150 }
      }),
      new Paragraph({
        children: [new TextRun({ text: comp.title[language] || comp.title.en, size: 22 })]
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: score ? `Score: ${score} - ${labels[score]}` : 'Not scored',
            italics: true,
            color: score === 1 ? COLORS.red : COLORS.accent
          })
        ],
        spacing: { after: 100 }
      })
    );
  });

  return elements;
}

function createSelfAssessmentSection(formData, language) {
  const title = language === 'nl' ? 'Zelfevaluatie medewerker' : language === 'es' ? 'Autoevaluación del Empleado' : 'Employee Self-Assessment';

  return [
    createSectionTitle(title),
    new Paragraph({
      children: [new TextRun({ text: formData.selfAssessment || '-' })],
      spacing: { after: 200 }
    })
  ];
}

function createCommentsSection(formData, language) {
  const title = language === 'nl' ? 'Aanvullende opmerkingen' : language === 'es' ? 'Comentarios Adicionales' : 'Additional Comments';

  return [
    createSectionTitle(title),
    new Paragraph({
      children: [new TextRun({ text: formData.comments || '-' })],
      spacing: { after: 200 }
    })
  ];
}

function createFooter(sessionCode, language) {
  const generated = language === 'nl' ? 'Gegenereerd op' : language === 'es' ? 'Generado el' : 'Generated on';
  const session = language === 'nl' ? 'Sessiecode' : language === 'es' ? 'Código de sesión' : 'Session Code';

  return [
    new Paragraph({
      children: [
        new TextRun({
          text: `${generated}: ${new Date().toLocaleDateString()} | ${session}: ${sessionCode}`,
          size: 18,
          color: '999999'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 }
    })
  ];
}

export async function generateReport(formData, sessionCode, isDraft = false) {
  const language = formData.language || 'en';

  const doc = new Document({
    creator: 'HR Performance App',
    title: `Performance Review - ${formData.employeeName || 'Employee'}`,
    description: 'Performance Review Report',
    styles: {
      default: {
        document: {
          run: {
            font: 'Verdana',
            size: 18 // 9pt = 18 half-points
          }
        }
      }
    },
    sections: [{
      properties: {},
      children: [
        ...createHeader(formData, language),
        createEmployeeInfoTable(formData, language),
        ...createSummarySection(formData, language),
        ...createGridVisualization(formData, language),
        ...createGoalsSection(formData, language),
        ...createCompetenciesSection(formData, language),
        ...createSelfAssessmentSection(formData, language),
        ...createCommentsSection(formData, language),
        ...createFooter(sessionCode, language)
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  const year = new Date().getFullYear();
  const employeeName = (formData.employeeName || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
  const draftSuffix = isDraft ? '_DRAFT' : '';
  const fileName = `Performance_Review_${employeeName}_${year}${draftSuffix}.docx`;

  saveAs(blob, fileName);
}
