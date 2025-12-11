import { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { GRID_POSITIONS, getGridColor, getPerformanceLevel } from '../../utils/analyticsUtils';

/**
 * Interactive 9-Grid visualization with clickable cells
 */
export function Interactive9Grid({
  gridData,
  onCellClick,
  selectedCell = null,
  size = 'medium',
  showPercentages = true,
  showLabels = true,
}) {
  const { t } = useLanguage();

  const sizeConfig = useMemo(() => {
    const configs = {
      small: { cellSize: 60, fontSize: 12, labelSize: 9 },
      medium: { cellSize: 90, fontSize: 16, labelSize: 11 },
      large: { cellSize: 120, fontSize: 20, labelSize: 14 },
    };
    return configs[size] || configs.medium;
  }, [size]);

  // Build grid cells (row by row, top to bottom)
  const gridCells = useMemo(() => {
    const cells = [];
    // HOW axis: 3 (top) to 1 (bottom)
    for (let howPos = 3; howPos >= 1; howPos--) {
      // WHAT axis: 1 (left) to 3 (right)
      for (let whatPos = 1; whatPos <= 3; whatPos++) {
        const key = `${whatPos}-${howPos}`;
        const data = gridData?.[key] || { count: 0, percentage: 0, label: key };
        const color = getGridColor(whatPos, howPos);
        const performanceLevel = getPerformanceLevel(whatPos, howPos);

        cells.push({
          key,
          whatPos,
          howPos,
          ...data,
          color,
          performanceLevel,
        });
      }
    }
    return cells;
  }, [gridData]);

  const handleCellClick = (cell) => {
    if (onCellClick && cell.count > 0) {
      onCellClick(cell);
    }
  };

  return (
    <div className="interactive-9grid">
      {/* Y-axis label */}
      <div
        style={{
          position: 'absolute',
          left: '-30px',
          top: '50%',
          transform: 'translateY(-50%) rotate(-90deg)',
          fontSize: sizeConfig.labelSize,
          fontWeight: '600',
          color: '#004A91',
          whiteSpace: 'nowrap',
        }}
      >
        HOW
      </div>

      {/* Grid container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(3, ${sizeConfig.cellSize}px)`,
          gridTemplateRows: `repeat(3, ${sizeConfig.cellSize}px)`,
          gap: '4px',
          marginLeft: '20px',
        }}
      >
        {gridCells.map(cell => {
          const isSelected = selectedCell === cell.key;
          const isClickable = cell.count > 0 && onCellClick;

          return (
            <div
              key={cell.key}
              onClick={() => handleCellClick(cell)}
              title={`${cell.label}: ${cell.count} (${cell.percentage}%)\n${cell.performanceLevel}`}
              style={{
                width: sizeConfig.cellSize,
                height: sizeConfig.cellSize,
                backgroundColor: cell.color,
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isClickable ? 'pointer' : 'default',
                opacity: cell.count === 0 ? 0.4 : 1,
                border: isSelected ? '3px solid #004A91' : '2px solid rgba(255,255,255,0.3)',
                boxShadow: isSelected ? '0 0 0 2px #004A91' : 'none',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (isClickable) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = isSelected ? '0 0 0 2px #004A91' : 'none';
              }}
            >
              {/* Count */}
              <span
                style={{
                  fontSize: sizeConfig.fontSize * 1.2,
                  fontWeight: '700',
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
              >
                {cell.count}
              </span>

              {/* Percentage */}
              {showPercentages && cell.count > 0 && (
                <span
                  style={{
                    fontSize: sizeConfig.fontSize * 0.7,
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: '500',
                  }}
                >
                  {cell.percentage}%
                </span>
              )}

              {/* Label (corner) */}
              {showLabels && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '6px',
                    fontSize: sizeConfig.labelSize,
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: '600',
                  }}
                >
                  {cell.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* X-axis label */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '8px',
          marginLeft: '20px',
          fontSize: sizeConfig.labelSize,
          fontWeight: '600',
          color: '#CC0E70',
        }}
      >
        WHAT
      </div>

      {/* Axis markers */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginLeft: '20px',
          width: `${sizeConfig.cellSize * 3 + 8}px`,
          fontSize: sizeConfig.labelSize - 1,
          color: '#666',
          marginTop: '4px',
        }}
      >
        <span>1</span>
        <span>2</span>
        <span>3</span>
      </div>
    </div>
  );
}
