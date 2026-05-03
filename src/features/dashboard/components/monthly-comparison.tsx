"use client"

import React from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

interface MonthlyComparisonProps {
  data: Array<{
    month: string
    newItems: number
    completedItems: number
  }>
}

export function MonthlyComparison({ data }: MonthlyComparisonProps) {
  const { t } = useTranslation('dashboard')

  const chartData = data.map(item => ({
    ...item,
    name: item.month.slice(5),
  }))

  const hasData = chartData.length > 0

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">{t('monthlyComparison.title')}</h3>
      {!hasData ? (
        <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">{t('noData')}</div>
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '12px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Bar dataKey="newItems" name={t('monthlyComparison.newItems')} fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={24} />
              <Bar dataKey="completedItems" name={t('monthlyComparison.completedItems')} fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
