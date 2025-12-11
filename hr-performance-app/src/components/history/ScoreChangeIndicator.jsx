/**
 * Visual indicator showing score change direction (up/down/stable)
 */
export function ScoreChangeIndicator({
  direction,
  delta,
  percentage,
  size = 'medium',
  showValue = true,
}) {
  const colors = {
    up: '#28A745',
    down: '#DC3545',
    stable: '#6c757d',
  };

  const color = colors[direction] || colors.stable;

  const sizes = {
    small: { icon: 12, font: 10, padding: '2px 4px' },
    medium: { icon: 16, font: 12, padding: '4px 8px' },
    large: { icon: 20, font: 14, padding: '6px 12px' },
  };

  const sizeConfig = sizes[size] || sizes.medium;

  const ArrowIcon = () => {
    if (direction === 'up') {
      return (
        <svg
          width={sizeConfig.icon}
          height={sizeConfig.icon}
          viewBox="0 0 24 24"
          fill={color}
        >
          <path d="M7 14l5-5 5 5H7z" />
        </svg>
      );
    }
    if (direction === 'down') {
      return (
        <svg
          width={sizeConfig.icon}
          height={sizeConfig.icon}
          viewBox="0 0 24 24"
          fill={color}
        >
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      );
    }
    // Stable - horizontal line
    return (
      <svg
        width={sizeConfig.icon}
        height={sizeConfig.icon}
        viewBox="0 0 24 24"
        fill={color}
      >
        <path d="M6 12h12" stroke={color} strokeWidth="2" fill="none" />
      </svg>
    );
  };

  const formatDelta = (d) => {
    if (d == null) return '';
    const sign = d > 0 ? '+' : '';
    return `${sign}${d.toFixed(2)}`;
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding: sizeConfig.padding,
        borderRadius: '4px',
        background: `${color}15`,
        color: color,
        fontSize: sizeConfig.font,
        fontWeight: '600',
      }}
      title={percentage != null ? `${percentage.toFixed(1)}%` : undefined}
    >
      <ArrowIcon />
      {showValue && delta != null && (
        <span>{formatDelta(delta)}</span>
      )}
    </span>
  );
}

/**
 * Large trend indicator for stats display
 */
export function TrendIndicator({ trend, label }) {
  const config = {
    up: {
      icon: '↑',
      color: '#28A745',
      bg: '#d4edda',
      text: 'Improving',
    },
    down: {
      icon: '↓',
      color: '#DC3545',
      bg: '#f8d7da',
      text: 'Declining',
    },
    stable: {
      icon: '→',
      color: '#6c757d',
      bg: '#e2e3e5',
      text: 'Stable',
    },
  };

  const c = config[trend] || config.stable;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '8px',
        background: c.bg,
        color: c.color,
      }}
    >
      <span style={{ fontSize: '20px' }}>{c.icon}</span>
      <span style={{ fontWeight: '600' }}>{label || c.text}</span>
    </div>
  );
}
