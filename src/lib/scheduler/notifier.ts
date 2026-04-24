import { logger } from '@/lib/utils/logger';

class Notifier {
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }

  async sendSuccessNotification(itemTitle: string, episodeCount: number): Promise<void> {
    const message = `「${itemTitle}」定时任务执行成功，已更新至第${episodeCount}集`;
    logger.info(`[Notifier] ${message}`);
    this.sendBrowserNotification('定时任务执行成功', message);
  }

  async sendErrorNotification(itemTitle: string, errorMessage: string): Promise<void> {
    const message = `「${itemTitle}」定时任务失败: ${errorMessage}`;
    logger.error(`[Notifier] ${message}`);
    this.sendBrowserNotification('定时任务执行失败', message);
  }

  private sendBrowserNotification(title: string, body: string): void {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      this.requestPermission();
      return;
    }

    try {
      new Notification(title, {
        body,
        icon: '/placeholder-logo.png',
      });
    } catch (error) {
      logger.error('[Notifier] 发送浏览器通知失败:', error);
    }
  }
}

export const notifier = new Notifier();
