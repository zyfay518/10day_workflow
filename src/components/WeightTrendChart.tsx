import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

type WeightItem = {
  record_date: string;
  weight_kg: number;
};

export default function WeightTrendChart({ weights }: { weights: WeightItem[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={weights}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="record_date"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          domain={['dataMin - 1', 'dataMax + 1']}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #f3f4f6',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
          labelFormatter={(v) => new Date(v as string).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          itemStyle={{ color: '#1f2937', fontWeight: 'bold' }}
        />
        <Line
          type="monotone"
          dataKey="weight_kg"
          stroke="#9DC5EF"
          strokeWidth={3}
          dot={{ r: 4, fill: '#9DC5EF', strokeWidth: 0 }}
          activeDot={{ r: 6, fill: '#FFB3C1', strokeWidth: 0 }}
          name="Weight (kg)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
