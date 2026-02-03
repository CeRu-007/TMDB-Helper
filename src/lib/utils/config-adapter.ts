/**
 * 配置适配器
 * 为现有的配置管理器提供Docker环境适配
 */

export class ConfigAdapter {
  /**
   * 获取配置项
   * 现在统一从服务端配置系统读取
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      const response = await fetch(`/api/system/config?key=${encodeURIComponent(key)}`);
      if (response.ok) {
        const data = await response.json();
        return data.success ? data.value : null;
      }
    } catch (error) {
      // 静默处理错误
    }
    return null;
  }

  /**
   * 设置配置项
   * 现在统一保存到服务端配置系统
   */
  static async setItem(key: string, value: string): Promise<boolean> {
    try {
      const response = await fetch('/api/system/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'set',
          key,
          value
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.success;
      }
    } catch (error) {
      // 静默处理错误
    }
    return false;
  }

  /**
   * 删除配置项
   */
  static removeItem(key: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  }

  /**
   * 检查是否支持存储
   */
  static isStorageAvailable(): boolean {
    return true; // 服务端存储总是可用
  }

  /**
   * 迁移现有localStorage数据到服务端配置
   */
  static async migrateExistingData(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const localStorageData: { [key: string]: string } = {};
      
      // 收集所有localStorage数据
      const keysToMigrate = [
        'tmdb_api_key',
        'tmdb_import_path',
        'siliconflow_api_key',
        'siliconflow_api_settings',
        'general_settings',
        'appearance_settings',
        'video_thumbnail_settings',
        'task_scheduler_config'
      ];

      keysToMigrate.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          localStorageData[key] = value;
        }
      });

      if (Object.keys(localStorageData).length > 0) {
        // 调用API进行迁移
        const response = await fetch('/api/system/docker-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'migrate',
            localStorageData
          })
        });

        if (response.ok) {
          // 清除已迁移的localStorage数据
          keysToMigrate.forEach(key => {
            if (localStorageData[key]) {
              localStorage.removeItem(key);
            }
          });
        }
      }
    } catch (error) {
      // 静默处理错误
    }
  }
}
