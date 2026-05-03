"use client"

import React from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface WeekdayChartProps {
  data: Array<{ weekday: number; count: number }>
}

export function WeekdayChart({ data }: WeekdayChartProps) {
  const { t } = useTranslation('dashboard')

  const weekdayNames = [
    t('weekdays.sun'), t('weekdays.mon'), t('weekdays.tue'), t('weekdays.wed'),
    t('weekdays.thu'), t('weekdays.fri'), t('weekdays.sat'),
  ]

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const found = data.find((d) => d.weekday === i)
    return { name: weekdayNames[i], count: found?.count || 0 }
  })

  const maxCount = Math.max(...chartData.map((d) => d.count), 1)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
        {t('weekdayDistribution')}
      </h3>
      {maxCount === 0 ? (
        <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">{t('noData')}</div>
      ) : (
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                formatter={(value: number) => [value, t('itemsCount')]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
