import { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getGridPositionHistory } from '../../utils/historyUtils';
import { getGridColor } from '../../utils/scoring';

/**
 * Small 9-grid visualization showing historical positions over years
 */
export function HistoricalGrid({ reviews, size = 200 }) {
  const { t } = useLanguage();

  const positionHistory = useMemo(() => {
    return getGridPositionHistory(reviews);
  }, [reviews]);

  const cellSize = (size - 40) / 3; // Account for labels

  // Create grid cells
  const cells = [];
  for (let howPos = 3; howPos >= 1; howPos--) {
    for (let whatPos = 1; whatPos <= 3; whatPos++) {
      const color = getGridColor(whatPos, howPos);
      const positionsInCell = positionHistory.filter(
        p => p.whatPosition === whatPos && p.howPosition === howPos
      );

      cells.push({
        key: `${whatPos}-${howPos}`,
        whatPos,
        howPos,
        color,
        positions: positionsInCell,
      });
    }
  }

  if (positionHistory.length === 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8f9fa',
          borderRadius: '8px',
          color: '#999',
          fontSize: '12px',
        }}
      >
        {t('pages.history.noData')}
      </div>
    );
  }

  return (
    <div style={{ width: size, height: size + 30 }}>
      {/* Grid Title */}
      <div style={{
        textAlign: 'center',
        fontSize: '12px',
        fontWeight: '600',
        marginBottom: '8px',
        color: '#666',
      }}>
        {t('pages.history.gridHistory')}
      </div>

      <div style={{ display: 'flex' }}>
        {/* Y-axis label */}
        <div style={{
          width: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            transform: 'rotate(-90deg)',
            fontSize: '10px',
            color: '#666',
            whiteSpace: 'nowrap',
          }}>
            HOW
          </span>
        </div>

        {/* Grid */}
        <div>
          {/* Y-axis values */}
          <div style={{ display: 'flex' }}>
            <div style={{ width: '20px' }} />
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(3, ${cellSize}px)`,
              gridTemplateRows: `repeat(3, ${cellSize}px)`,
              gap: '2px',
            }}>
              {cells.map(cell => (
                <div
                  key={cell.key}
                  style={{
                    background: cell.color,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    opacity: cell.positions.length > 0 ? 1 : 0.3,
                  }}
                  title={cell.positions.length > 0
                    ? cell.positions.map(p => `${p.year}: ${p.gridCode}`).join(', ')
                    : undefined
                  }
                >
                  {cell.positions.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '2px',
                      padding: '4px',
                      justifyContent: 'center',
                    }}>
                      {cell.positions.map((pos, i) => (
                        <YearMarker key={pos.year} year={pos.year} index={i} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* X-axis values */}
          <div style={{
            display: 'flex',
            marginTop: '4px',
            marginLeft: '20px',
          }}>
            {[1, 2, 3].map(val => (
              <div
                key={val}
                style={{
                  width: cellSize,
                  textAlign: 'center',
                  fontSize: '10px',
                  color: '#666',
                }}
              >
                {val}
              </div>
            ))}
          </div>

          {/* X-axis label */}
          <div style={{
            textAlign: 'center',
            fontSize: '10px',
            color: '#666',
            marginTop: '4px',
            marginLeft: '20px',
          }}>
            WHAT
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '8px',
        justifyContent: 'center',
      }}>
        {positionHistory.slice(-5).map(pos => (
          <div
            key={pos.year}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
            }}
          >
            <span style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: pos.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '8px',
              fontWeight: 'bold',
            }}>
              {String(pos.year).slice(-2)}
            </span>
            <span style={{ color: '#666' }}>{pos.gridCode}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function YearMarker({ year, index }) {
  // Use different marker styles for different years
  const colors = ['#fff', '#ffe', '#fef', '#eff', '#efe'];

  return (
    <span
      style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: colors[index % colors.length],
        border: '2px solid rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '8px',
        fontWeight: 'bold',
        color: '#333',
      }}
      title={year}
    >
      {String(year).slice(-2)}
    </span>
  );
}
