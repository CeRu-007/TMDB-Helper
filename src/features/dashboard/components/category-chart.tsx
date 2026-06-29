'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface CategoryChartProps {
  data: Array<{ category: string; count: number }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  anime: '#8b5cf6',
  tv: '#3b82f6',
  kids: '#10b981',
  variety: '#f59e0b',
  short: '#ef4444',
  uncategorized: '#6b7280',
};

export function CategoryChart({ data }: CategoryChartProps) {
  const { t } = useTranslation('dashboard');

  const chartData = data.map((item) => ({
    name: t(`categories.${item.category}`, item.category),
    value: item.count,
    category: item.category,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-xl border border-border bg-muted/50 p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">{t('categoryDistribution')}</h3>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
          {t('noData')}
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-1/2 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[entry.category] || '#6b7280'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={((value: number, name: string) => [value, name]) as any}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/2 space-y-2">
            {chartData.map((item) => (
              <div key={item.category} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[item.category] || '#6b7280' }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{item.value}</span>
                  <span className="text-xs text-muted-foreground">
                    {total > 0 ? `${Math.round((item.value / total) * 100)}%` : '0%'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
