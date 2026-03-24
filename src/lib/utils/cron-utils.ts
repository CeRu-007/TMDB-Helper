/**
 * Cron 表达式工具函数
 */

export interface CronParts {
  second?: string;
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

export interface CronRecommendation {
  cron: string;
  label: string;
  description: string;
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

export function parseCronExpression(expression: string): CronParts | null {
  const parts = expression.trim().split(/\s+/);

  if (parts.length === 5) {
    return {
      minute: parts[0],
      hour: parts[1],
      dayOfMonth: parts[2],
      month: parts[3],
      dayOfWeek: parts[4],
    };
  }

  if (parts.length === 6) {
    return {
      second: parts[0],
      minute: parts[1],
      hour: parts[2],
      dayOfMonth: parts[3],
      month: parts[4],
      dayOfWeek: parts[5],
    };
  }

  return null;
}

export function getCronDescription(cronExpression: string): string {
  const parts = parseCronExpression(cronExpression);
  if (!parts) {
    return '无效的 Cron 表达式';
  }

  const { minute, hour, dayOfMonth, month, dayOfWeek } = parts;

  if (dayOfWeek !== '*') {
    return getDayOfWeekDescription(minute, hour, dayOfWeek);
  }

  if (dayOfMonth !== '*' && month !== '*') {
    return getMonthlyDescription(minute, hour, dayOfMonth, month);
  }

  if (dayOfMonth !== '*') {
    return getMonthlyDescription(minute, hour, dayOfMonth, month);
  }

  if (hour === '*' && minute === '*') {
    return '每分钟执行';
  }

  if (hour === '*') {
    return `每小时第 ${minute} 分钟执行`;
  }

  if (minute === '*') {
    return `每小时的每分钟执行`;
  }

  if (hour.includes('/')) {
    const interval = hour.split('/')[1];
    return `每 ${interval} 小时执行`;
  }

  const hourNum = parseInt(hour, 10);
  const minuteNum = parseInt(minute, 10);

  if (!isNaN(hourNum) && !isNaN(minuteNum)) {
    const timeStr = `${hourNum.toString().padStart(2, '0')}:${minuteNum.toString().padStart(2, '0')}`;

    if (dayOfWeek !== '*') {
      return getDayOfWeekDescription(minute, hour, dayOfWeek, timeStr);
    }

    return `每天 ${timeStr} 执行`;
  }

  return `Cron: ${cronExpression}`;
}

function getDayOfWeekDescription(minute: string, hour: string, dayOfWeek: string, timeStr?: string): string {
  if (!timeStr) {
    const hourNum = parseInt(hour, 10);
    const minuteNum = parseInt(minute, 10);
    timeStr = `${hourNum.toString().padStart(2, '0')}:${minuteNum.toString().padStart(2, '0')}`;
  }

  if (dayOfWeek === '*') {
    return `每天 ${timeStr} 执行`;
  }

  if (dayOfWeek.includes(',')) {
    const days = dayOfWeek.split(',').map(d => {
      const dayNum = parseInt(d, 10);
      return isNaN(dayNum) ? d : WEEKDAYS[dayNum];
    });
    return `每周 ${days.join('、')} ${timeStr} 执行`;
  }

  if (dayOfWeek.includes('-')) {
    const [start, end] = dayOfWeek.split('-').map(d => parseInt(d, 10));
    return `每周 ${WEEKDAYS[start]} 至 ${WEEKDAYS[end]} ${timeStr} 执行`;
  }

  const dayNum = parseInt(dayOfWeek, 10);
  if (!isNaN(dayNum)) {
    return `每周 ${WEEKDAYS[dayNum]} ${timeStr} 执行`;
  }

  return `每周 ${dayOfWeek} ${timeStr} 执行`;
}

function getMonthlyDescription(minute: string, hour: string, dayOfMonth: string, month: string): string {
  const hourNum = parseInt(hour, 10);
  const minuteNum = parseInt(minute, 10);
  const timeStr = `${hourNum.toString().padStart(2, '0')}:${minuteNum.toString().padStart(2, '0')}`;

  const monthNum = parseInt(month, 10);
  const monthStr = !isNaN(monthNum) ? MONTHS[monthNum - 1] : month;

  if (dayOfMonth === '*') {
    return `每月 ${monthStr} ${timeStr} 执行`;
  }

  return `每月 ${dayOfMonth} 日 ${monthStr} ${timeStr} 执行`;
}

export function getNextRunTime(cronExpression: string): string {
  const parts = parseCronExpression(cronExpression);
  if (!parts) {
    return '无效的 Cron 表达式';
  }

  const now = new Date();
  const { minute, hour, dayOfMonth, dayOfWeek } = parts;

  const hourNum = parseInt(hour, 10);
  const minuteNum = parseInt(minute, 10);

  if (isNaN(hourNum) || isNaN(minuteNum)) {
    return '无法计算';
  }

  const next = new Date(now);
  next.setHours(hourNum, minuteNum, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  if (dayOfWeek !== '*') {
    const currentDay = now.getDay();
    const targetDays = dayOfWeek.split(',').map(d => parseInt(d, 10)).filter(d => !isNaN(d));

    if (targetDays.length > 0) {
      const sortedDays = targetDays.sort((a, b) => a - b);
      let daysToAdd = 0;

      for (const targetDay of sortedDays) {
        let diff = targetDay - currentDay;
        if (diff <= 0) {
          diff += 7;
        }
        if (daysToAdd === 0 || diff < daysToAdd) {
          daysToAdd = diff;
        }
      }

      next.setDate(next.getDate() + daysToAdd);
    }
  }

  const monthStr = MONTHS[next.getMonth()];
  const dayStr = next.getDate().toString().padStart(2, '0');
  const timeStr = `${next.getHours().toString().padStart(2, '0')}:${next.getMinutes().toString().padStart(2, '0')}`;

  return `${monthStr} ${dayStr}日 ${timeStr}`;
}

export function validateCronExpression(cronExpression: string): boolean {
  const parts = cronExpression.trim().split(/\s+/);

  if (parts.length !== 5 && parts.length !== 6) {
    return false;
  }

  const patterns = [
    /^(\*|([0-5]?\d))(,(\*|[0-5]?\d))*$/,
    /^(\*|([01]?\d|2[0-3]))(,(\*|([01]?\d|2[0-3])))*$/,
    /^(\*|([12]?\d|3[01]))(,(\*|([12]?\d|3[01])))*$/,
    /^(\*|([1-9]|1[0-2]))(,(\*|([1-9]|1[0-2])))*$/,
    /^(\*|[0-7])(,(\*|[0-7]))*$/,
  ];

  const ranges = [
    /^(\*|[0-5]?\d)(-[0-5]?\d)?(\/\d+)?$/,
    /^(\*|[01]?\d|2[0-3])(-[01]?\d|2[0-3])?(\/\d+)?$/,
    /^(\*|[12]?\d|3[01])(-[12]?\d|3[01])?(\/\d+)?$/,
    /^(\*|[1-9]|1[0-2])(-[1-9]|1[0-2])?(\/\d+)?$/,
    /^(\*|[0-7])(-[0-7])?(\/\d+)?$/,
  ];

  const indexOffset = parts.length === 6 ? 1 : 0;

  for (let i = indexOffset; i < parts.length; i++) {
    const part = parts[i];
    if (part === '*') continue;

    if (!patterns[i - indexOffset].test(part) && !ranges[i - indexOffset].test(part)) {
      return false;
    }
  }

  return true;
}

export function getRecommendations(item: {
  weekday?: number;
  secondWeekday?: number;
  airTime?: string;
  isDailyUpdate?: boolean;
}): CronRecommendation[] {
  const recommendations: CronRecommendation[] = [];

  if (item.isDailyUpdate) {
    if (item.airTime) {
      const [hour, minute] = item.airTime.split(':').map(Number);
      if (!isNaN(hour) && !isNaN(minute)) {
        recommendations.push({
          cron: `${minute} ${hour} * * *`,
          label: '每日播出时间',
          description: `每日 ${item.airTime}`,
        });
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        cron: '0 2 * * *',
        label: '每日凌晨',
        description: '每天凌晨 2:00',
      });
    }

    recommendations.push({
      cron: '0 0 * * *',
      label: '每日午夜',
      description: '每天 00:00',
    });
  } else {
    if (typeof item.weekday === 'number') {
      const weekdayLabel = WEEKDAYS[item.weekday];

      if (item.airTime) {
        const [hour, minute] = item.airTime.split(':').map(Number);
        if (!isNaN(hour) && !isNaN(minute)) {
          recommendations.push({
            cron: `${minute} ${hour} * * ${item.weekday}`,
            label: `每周${weekdayLabel}`,
            description: `每周${weekdayLabel} ${item.airTime}`,
          });
        }
      } else {
        recommendations.push({
          cron: `0 22 * * ${item.weekday}`,
          label: `每周${weekdayLabel}晚`,
          description: `每周${weekdayLabel} 22:00`,
        });
      }

      if (typeof item.secondWeekday === 'number') {
        const secondWeekdayLabel = WEEKDAYS[item.secondWeekday];
        recommendations.push({
          cron: `0 22 * * ${item.weekday},${item.secondWeekday}`,
          label: `每周${weekdayLabel}、${secondWeekdayLabel}`,
          description: `每周${weekdayLabel}、${secondWeekdayLabel} 22:00`,
        });
      }
    }
  }

  recommendations.push(
    {
      cron: '0 */6 * * *',
      label: '每6小时',
      description: '每 6 小时执行一次',
    },
    {
      cron: '0 */12 * * *',
      label: '每12小时',
      description: '每 12 小时执行一次',
    },
    {
      cron: '0 2 * * *',
      label: '每天凌晨',
      description: '每天凌晨 2:00',
    }
  );

  return recommendations;
}

export function getTimeFromCron(cronExpression: string): string {
  const parts = parseCronExpression(cronExpression);
  if (!parts) {
    return '';
  }

  const hourNum = parseInt(parts.hour, 10);
  const minuteNum = parseInt(parts.minute, 10);

  if (isNaN(hourNum) || isNaN(minuteNum)) {
    return '';
  }

  return `${hourNum.toString().padStart(2, '0')}:${minuteNum.toString().padStart(2, '0')}`;
}
