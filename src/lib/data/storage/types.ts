export interface ImportDataValidationResult {
  isValid: boolean;
  error?: string;
  data?: {
    items: unknown[];
    version?: string;
    exportDate?: string;
  };
  stats?: {
    validItemCount: number;
  };
  isDuplicate?: boolean;
  duplicateInfo?: string;
}

export interface StorageStatus {
  hasItems: boolean;
  itemCount: number;
  storageType: 'fileStorage';
  isClientEnvironment: boolean;
  isStorageAvailable: boolean;
  lastError?: string;
}
