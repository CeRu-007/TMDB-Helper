import { StorageBase } from './storage-base';

export class ImportExportManager extends StorageBase {
  /**
   * 导出数据
   */
  static async exportData(): Promise<string> {
    try {
      const items = await this.getItemsWithRetry();

      const exportData = {
        items,
        version: '1.0.0',
        exportDate: new Date().toISOString(),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 验证导入数据格式
   */
  static validateImportData(jsonData: string): {
    isValid: boolean;
    error?: string;
    data?: {
      items: unknown[];
      version?: string;
      exportDate?: string;
    };
    stats?: {
      itemCount: number;
      validItemCount: number;
    };
    isDuplicate?: boolean;
    duplicateInfo?: string;
  } {
    try {
      const parsedData = JSON.parse(jsonData);

      let items: unknown[] = [];
      let version: string | undefined;
      let exportDate: string | undefined;

      // 检查数据格式
      if (Array.isArray(parsedData)) {
        // 旧格式：直接是项目数组
        items = parsedData;
      } else if (parsedData && typeof parsedData === 'object') {
        // 新格式：包含items
        if (parsedData.items && Array.isArray(parsedData.items)) {
          items = parsedData.items;
        } else {
          return {
            isValid: false,
            error: '数据格式错误：缺少items字段或items不是数组',
          };
        }

        version = parsedData.version;
        exportDate = parsedData.exportDate;
      } else {
        return {
          isValid: false,
          error: '数据格式错误：不支持的数据结构',
        };
      }

      // 验证项目数据
      const validItems = items.filter((item) => {
        // 基本结构检查
        if (!item || typeof item !== 'object') {
          return false;
        }

        // 必需字段检查
        const requiredFields = ['id', 'title', 'mediaType', 'tmdbId'];
        for (const field of requiredFields) {
          if (!item[field as keyof unknown]) {
            return false;
          }
        }

        // mediaType值检查
        if (!['movie', 'tv'].includes(item.mediaType)) {
          return false;
        }

        return true;
      });

      return {
        isValid: true,
        data: {
          items: validItems,
          ...(version && { version }),
          ...(exportDate && { exportDate }),
        },
        stats: {
          itemCount: items.length,
          validItemCount: validItems.length,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'JSON解析失败',
      };
    }
  }

  /**
   * 导入数据
   */
  static async importData(jsonData: string): Promise<{
    success: boolean;
    error?: string;
    stats?: {
      itemsImported: number;
      itemsSkipped: number;
    };
  }> {
    if (!this.isClient() || !this.isStorageAvailable()) {
      return {
        success: false,
        error: 'localStorage不可用',
      };
    }

    // 首先验证数据
    const validation = this.validateImportData(jsonData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || '验证失败',
      };
    }

    const { items } = validation.data || { items: [] };
    const stats = validation.stats || {
      itemCount: 0,
      validItemCount: 0,
    };

    try {
      // 导入项目数据
      if (this.USE_FILE_STORAGE) {
        try {
          const serverData = {
            items,
            version: '1.0.0',
            exportDate: new Date().toISOString(),
          };

          const response = await fetch(`${this.API_BASE_URL}/data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(serverData),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API请求失败: ${response.status} - ${errorText}`);
          }
        } catch (error) {
          return {
            success: false,
            error: `导入项目失败: ${error instanceof Error ? error.message : '未知错误'}`,
          };
        }
      } else {
        // 使用localStorage
        this.saveItems(items);
      }

      return {
        success: true,
        stats: {
          itemsImported: stats.validItemCount,
          itemsSkipped: stats.itemCount - stats.validItemCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : '导入过程中发生未知错误',
      };
    }
  }

  /**
   * 调试方法：创建测试数据并尝试导入
   */
  static async debugImport(): Promise<void> {
    const testData = {
      items: [
        {
          id: 'debug-test-1',
          title: '调试测试项目',
          mediaType: 'tv' as const,
          tmdbId: '999999',
          weekday: 1,
          completed: false,
          status: 'ongoing' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      version: '1.0.0',
      exportDate: new Date().toISOString(),
    };

    const jsonData = JSON.stringify(testData, null, 2);

    try {
      const validation = this.validateImportData(jsonData);
      if (!validation.isValid) {
        return;
      }

      const importResult = await this.importData(jsonData);
      if (!importResult.success) {
        return;
      }
    } catch {
      // 忽略调试导入错误
    }
  }
}
