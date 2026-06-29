'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/utils/logger';
import { suppressRefWarnings } from '@/lib/utils';
import { ConfigMigration } from '@/lib/utils/config-migration';
import { StorageCleaner } from '@/lib/storage/storage-cleaner';

export function useAppInitialization(): void {
  useEffect(function initializeApp() {
    suppressRefWarnings();
    StorageCleaner.autoCleanup();

    ConfigMigration.autoMigrate().catch(function handleMigrationError(error) {
      logger.warn('[useAppInitialization] 配置迁移失败', error);
    });
    logger.info('[useAppInitialization] 应用初始化完成');
  }, []);
}
