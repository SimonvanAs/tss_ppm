import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';
import { PERFORMANCE_TIERS } from '../../utils/analyticsUtils';

/**
 * Horizontal bar chart showing distribution across performance tiers
 */
export function DistributionChart({
  distribution,
  totalScored,
  height = 200,
}) {
  const { t } = useLanguage();

  const chartData = useMemo(() => {
    if (!distribution) return [];

    return [
      {
        tier: t('pages.analytics.grid.topTalent') || 'Top Talent',
        count: distribution.topTalent || 0,
        percentage: totalScored > 0 ? ((distribution.topTalent || 0) / totalScored * 100).toFixed(1) : 0,
        color: PERFORMANCE_TIERS.topTalent.color,
      },
      {
        tier: t('pages.analytics.grid.solidPerformer') || 'Solid Performer',
        count: distribution.solidPerformer || 0,
        percentage: totalScored > 0 ? ((distribution.solidPerformer || 0) / totalScored * 100).toFixed(1) : 0,
        color: PERFORMANCE_TIERS.solidPerformer.color,
      },
      {
        tier: t('pages.analytics.grid.needsAttention') || 'Needs Attention',
        count: distribution.needsAttention || 0,
        percentage: totalScored > 0 ? ((distribution.needsAttention || 0) / totalScored * 100).toFixed(1) : 0,
        color: PERFORMANCE_TIERS.needsAttention.color,
      },
      {
        tier: t('pages.analytics.grid.concern') || 'Concern',
        count: distribution.concern || 0,
        percentage: totalScored > 0 ? ((distribution.concern || 0) / totalScored * 100).toFixed(1) : 0,
        color: PERFORMANCE_TIERS.concern.color,
      },
    ];
  }, [distribution, totalScored, t]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '10px 14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>{data.tier}</div>
          <div style={{ fontSize: '13px', color: '#666' }}>
            {data.count} {t('pages.analytics.employees') || 'employees'} ({data.percentage}%)
          </div>
        </div>
      );
    }
    return null;
  };

  if (!distribution || totalScored === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: '14px',
        }}
      >
        {t('pages.analytics.noData') || 'No data available'}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `${value}`}
        />
        <YAxis
          type="category"
          dataKey="tier"
          tick={{ fontSize: 12 }}
          width={95}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Simple horizontal progress bars (alternative visualization)
 */
export function DistributionBars({ distribution, totalScored }) {
  const { t } = useLanguage();

  const tiers = [
    {
      key: 'topTalent',
      label: t('pages.analytics.grid.topTalent') || 'Top Talent',
      count: distribution?.topTalent || 0,
      color: PERFORMANCE_TIERS.topTalent.color,
    },
    {
      key: 'solidPerformer',
      label: t('pages.analytics.grid.solidPerformer') || 'Solid Performer',
      count: distribution?.solidPerformer || 0,
      color: PERFORMANCE_TIERS.solidPerformer.color,
    },
    {
      key: 'needsAttention',
      label: t('pages.analytics.grid.needsAttention') || 'Needs Attention',
      count: distribution?.needsAttention || 0,
      color: PERFORMANCE_TIERS.needsAttention.color,
    },
    {
      key: 'concern',
      label: t('pages.analytics.grid.concern') || 'Concern',
      count: distribution?.concern || 0,
      color: PERFORMANCE_TIERS.concern.color,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {tiers.map(tier => {
        const percentage = totalScored > 0 ? (tier.count / totalScored * 100) : 0;

        return (
          <div key={tier.key}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px',
                fontSize: '13px',
              }}
            >
              <span style={{ fontWeight: '500' }}>{tier.label}</span>
              <span style={{ color: '#666' }}>
                {tier.count} ({percentage.toFixed(1)}%)
              </span>
            </div>
            <div
              style={{
                height: '8px',
                background: '#f0f0f0',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${percentage}%`,
                  background: tier.color,
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
