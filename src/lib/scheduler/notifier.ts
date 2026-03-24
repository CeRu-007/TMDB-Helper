/**
 * 定时任务通知器
 */

import { logger } from '@/lib/utils/logger';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
}

class Notifier {
  private permission: NotificationPermission = 'default';

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      logger.warn('[Notifier] 浏览器不支持 Notification API');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission === 'denied') {
      this.permission = 'denied';
      logger.warn('[Notifier] 通知权限被拒绝');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result === 'granted';
    } catch (error) {
      logger.error('[Notifier] 请求通知权限失败:', error);
      return false;
    }
  }

  async sendSuccessNotification(itemTitle: string, episodeCount: number): Promise<void> {
    const options: NotificationOptions = {
      title: '定时任务执行成功',
      body: `「${itemTitle}」定时任务执行成功，已更新至第${episodeCount}集`,
    };

    return this.send(options);
  }

  async sendErrorNotification(itemTitle: string, errorMessage: string): Promise<void> {
    const options: NotificationOptions = {
      title: '定时任务执行失败',
      body: `「${itemTitle}」定时任务失败: ${errorMessage}`,
    };

    return this.send(options);
  }

  private async send(options: NotificationOptions): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        logger.debug('[Notifier] 通知权限未授权，跳过发送');
        return;
      }
    }

    try {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/placeholder-logo.png',
        badge: '/placeholder-logo.png',
      });
      logger.debug('[Notifier] 通知已发送:', options.title);
    } catch (error) {
      logger.error('[Notifier] 发送通知失败:', error);
    }
  }
}

export const notifier = new Notifier();
