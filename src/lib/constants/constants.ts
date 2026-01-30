export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const DAYS_PER_WEEK = 7;

export const MS_PER_DAY = MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;
export const MS_PER_WEEK = MS_PER_DAY * DAYS_PER_WEEK;
export const MS_PER_HOUR = MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
export const MS_PER_MINUTE = MS_PER_SECOND * SECONDS_PER_MINUTE;

// ==================== 动画时间常量 ====================

export const ANIMATION_DURATION_FAST = 150;
export const ANIMATION_DURATION_NORMAL = 300;
export const ANIMATION_DURATION_SLOW = 500;
export const CLICK_RESET_DELAY = 80;
export const LOADING_PULSE_INTERVAL = 2000;

// ==================== 超时时间常量 ====================

export const TIMEOUT_5S = 5000;
export const TIMEOUT_10S = 10000;
export const TIMEOUT_30S = 30000;
export const TIMEOUT_60S = 60000;
export const TIMEOUT_3M = 3 * 60 * 1000; // 3分钟
export const TIMEOUT_15S = 15000;

// ==================== 间隔时间常量 ====================

export const INTERVAL_100MS = 100;
export const INTERVAL_500MS = 500;
export const INTERVAL_1S = 1000;
export const INTERVAL_2S = 2000;
export const INTERVAL_5S = 5000;
export const INTERVAL_10S = 10000;
export const INTERVAL_15S = 15000;
export const INTERVAL_5MIN = 5 * 60 * 1000; // 5分钟
export const INTERVAL_5MIN_CACHE = 5 * MS_PER_MINUTE; // 5分钟 - 缓存清理
export const INTERVAL_1H = 60 * 60 * 1000; // 1小时

// ==================== 延迟时间常量 ====================

export const DELAY_80MS = 80;
export const DELAY_150MS = 150;
export const DELAY_200MS = 200;
export const DELAY_300MS = 300;
export const DELAY_500MS = 500;
export const DELAY_800MS = 800;
export const DELAY_1000MS = 1000;
export const DELAY_1500MS = 1500;
export const DELAY_2000MS = 2000;
export const DELAY_3000MS = 3000;

// 别名（为了向后兼容）
export const DELAY_1S = 1000;
export const DELAY_2S = 2000;

export const DEFAULT_REQUEST_TIMEOUT = 30000;
export const API_RETRY_COUNT = 3;
export const API_RETRY_DELAY = 1000;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const MAX_IMAGE_WIDTH = 1920;
export const MAX_IMAGE_HEIGHT = 1080;

// 文件大小常量（字节）
export const FILE_SIZE_1MB = 1 * 1024 * 1024;
export const FILE_SIZE_5MB = 5 * 1024 * 1024;
export const FILE_SIZE_10MB = 10 * 1024 * 1024;
export const FILE_SIZE_25MB = 25 * 1024 * 1024;
export const FILE_SIZE_50MB = 50 * 1024 * 1024;
export const FILE_SIZE_100MB = 100 * 1024 * 1024;
export const FILE_SIZE_200MB = 200 * 1024 * 1024;
export const FILE_SIZE_500MB = 500 * 1024 * 1024;
export const FILE_SIZE_1GB = 1024 * 1024 * 1024;

export const MAX_FILE_SIZE = FILE_SIZE_100MB;
export const IMAGE_QUALITY = 0.9;

// 验证相关常量
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 128;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 50;

// 会话相关常量
export const DEFAULT_SESSION_EXPIRY_DAYS = 15;
export const REMEMBER_ME_MULTIPLIER = 2;
export const DEFAULT_TOKEN_EXPIRY_DAYS = 7;

// 认证相关常量
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_DURATION = 15 * MS_PER_MINUTE;

// UI 相关常量
export const DEFAULT_GRID_COLUMNS = 6;
export const POSTER_ASPECT_RATIO = 2 / 3;
export const BACKDROP_ASPECT_RATIO = 16 / 9;
export const THUMBNAIL_WIDTH = 300;
export const THUMBNAIL_HEIGHT = 450;

// 媒体相关常量
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
export const TMDB_POSTER_SIZE = 'w500';
export const TMDB_BACKDROP_SIZE = 'w780';
export const TMDB_ORIGINAL_SIZE = 'original';
export const MEDIA_NEWS_DAYS = 30;

// 任务相关常量
export const TASK_CHECK_INTERVAL = 5 * MS_PER_MINUTE;
export const TASK_EXECUTION_TIMEOUT = 60 * MS_PER_MINUTE;
export const TASK_LOG_RETENTION_DAYS = 30;

// 数据库相关常量
export const DB_CONNECTION_TIMEOUT = 10000;
export const DB_QUERY_TIMEOUT = 30000;

// 存储相关常量
export const STORAGE_KEY_PREFIX = 'tmdb_helper_';
export const STORAGE_KEY_USER_DATA = `${STORAGE_KEY_PREFIX}user_data`;
export const STORAGE_KEY_LAYOUT_PREFERENCES = `${STORAGE_KEY_PREFIX}layout_preferences`;
export const STORAGE_KEY_THEME = `${STORAGE_KEY_PREFIX}theme`;

// 错误消息常量
export const ERROR_MESSAGES = {
  UNAUTHORIZED: '未授权访问',
  INVALID_CREDENTIALS: '用户名或密码错误',
  TOKEN_EXPIRED: '会话已过期，请重新登录',
  TOKEN_INVALID: '无效的会话',
  VALIDATION_ERROR: '输入数据无效',
  MISSING_REQUIRED_FIELD: '缺少必填字段',
  NOT_FOUND: '请求的资源不存在',
  ALREADY_EXISTS: '资源已存在',
  INTERNAL_ERROR: '服务器内部错误，请稍后重试',
  RATE_LIMIT_EXCEEDED: '请求过于频繁，请稍后再试',
  EXTERNAL_SERVICE_ERROR: '外部服务暂时不可用',
  DATABASE_ERROR: '数据库操作失败，请稍后重试',
} as const;

// 成功消息常量
export const SUCCESS_MESSAGES = {
  LOGIN: '登录成功',
  LOGOUT: '登出成功',
  SAVE: '保存成功',
  DELETE: '删除成功',
  UPDATE: '更新成功',
  CREATE: '创建成功',
  UPLOAD: '上传成功',
  DOWNLOAD: '下载成功',
} as const;

// 区域常量
export const REGIONS = [
  { id: 'CN', name: '中国大陆', icon: '🇨🇳' },
  { id: 'HK', name: '香港', icon: '🇭🇰' },
  { id: 'TW', name: '台湾', icon: '🇹🇼' },
  { id: 'JP', name: '日本', icon: '🇯🇵' },
  { id: 'KR', name: '韩国', icon: '🇰🇷' },
  { id: 'US', name: '美国', icon: '🇺🇸' },
  { id: 'GB', name: '英国', icon: '🇬🇧' },
] as const;

export const REGION_GROUPS = [
  { name: '亚洲', regions: ['CN', 'HK', 'TW', 'JP', 'KR'] },
  { name: '欧美', regions: ['US', 'GB'] },
] as const;

// 星期常量
export const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

// 分类常量
export const MEDIA_CATEGORIES = [
  'all',
  'anime',
  'tv',
  'kids',
  'variety',
  'short',
] as const;

export const MEDIA_STATUS = {
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
} as const;

// 平台常量
export const STREAMING_PLATFORMS = {
  NETFLIX: 'netflix',
  AMAZON: 'amazon',
  DISNEY: 'disney',
  HULU: 'hulu',
  HBO: 'hbo',
  APPLE: 'apple',
  YOUTUBE: 'youtube',
} as const;