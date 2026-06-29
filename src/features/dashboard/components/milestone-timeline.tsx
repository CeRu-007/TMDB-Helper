'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { DynamicIcon } from './dynamic-icon';

interface MilestoneTimelineProps {
  milestones: Array<{
    date: string;
    title: string;
    description: string;
    icon: string;
  }>;
}

export function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
  const { t } = useTranslation('dashboard');

  if (milestones.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/50 p-4 md:p-5">
        <h3 className="text-sm font-medium text-foreground mb-3 md:mb-4">
          {t('milestones.title')}
        </h3>
        <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
          {t('noData')}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4 md:p-5">
      <h3 className="text-sm font-medium text-foreground mb-3 md:mb-4">{t('milestones.title')}</h3>
      <div className="relative pl-8 space-y-4 max-h-[360px] overflow-y-auto">
        <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
        {milestones.map((milestone, index) => (
          <div key={index} className="relative">
            <div className="absolute -left-5 top-1 w-6 h-6 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
              <DynamicIcon name={milestone.icon} className="text-primary" size={12} weight="fill" />
            </div>
            <div className="ml-2">
              <p className="text-sm font-medium text-foreground">
                {t(`milestones.${milestone.title}`, milestone.title)}
              </p>
              {milestone.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{milestone.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(milestone.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
