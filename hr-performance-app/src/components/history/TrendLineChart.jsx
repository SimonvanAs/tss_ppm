import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';
import { transformReviewsToTrendData } from '../../utils/historyUtils';

/**
 * Trend line chart showing WHAT and HOW scores over years
 */
export function TrendLineChart({ reviews, height = 300, showMidYear = false }) {
  const { t } = useLanguage();

  const chartData = useMemo(() => {
    const data = transformReviewsToTrendData(reviews);
    return data.map(d => ({
      year: d.year,
      what: showMidYear ? d.whatScoreMidYear : (d.whatScoreEndYear || d.whatScoreMidYear),
      how: showMidYear ? d.howScoreMidYear : (d.howScoreEndYear || d.howScoreMidYear),
      whatMid: d.whatScoreMidYear,
      whatEnd: d.whatScoreEndYear,
      howMid: d.howScoreMidYear,
      howEnd: d.howScoreEndYear,
    }));
  }, [reviews, showMidYear]);

  if (!chartData || chartData.length === 0) {
    return (
      <div style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        background: '#f8f9fa',
        borderRadius: '8px',
      }}>
        {t('pages.history.noData')}
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div style={{
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{label}</div>
        {payload.map((entry, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
            }}
          >
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: entry.color,
            }} />
            <span>{entry.name}: </span>
            <strong>{entry.value?.toFixed(2) || 'N/A'}</strong>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            domain={[1, 3]}
            ticks={[1, 1.5, 2, 2.5, 3]}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
          />
          {/* Reference lines for grid positions */}
          <ReferenceLine y={1.5} stroke="#eee" strokeDasharray="3 3" />
          <ReferenceLine y={2.5} stroke="#eee" strokeDasharray="3 3" />
          {/* WHAT Score Line - Magenta */}
          <Line
            type="monotone"
            dataKey="what"
            name={t('pages.history.whatScore')}
            stroke="#CC0E70"
            strokeWidth={3}
            dot={{ r: 6, fill: '#CC0E70', strokeWidth: 2, stroke: 'white' }}
            activeDot={{ r: 8 }}
            connectNulls
          />
          {/* HOW Score Line - Navy */}
          <Line
            type="monotone"
            dataKey="how"
            name={t('pages.history.howScore')}
            stroke="#004A91"
            strokeWidth={3}
            dot={{ r: 6, fill: '#004A91', strokeWidth: 2, stroke: 'white' }}
            activeDot={{ r: 8 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
