/**
 * Simple Logger for Scripts
 * CommonJS compatible logger for scripts directory
 */

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

class Logger {
  constructor(options = {}) {
    this.level = options.level ?? this.getLogLevelFromEnv();
    this.enableTimestamp = options.enableTimestamp ?? true;
    this.enableColors = options.enableColors ?? true;
    this.prefix = options.prefix ?? '';
  }

  getLogLevelFromEnv() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'NONE': return LogLevel.NONE;
      default: return process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;
    }
  }

  formatTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message) {
    const timestamp = this.enableTimestamp ? `[${this.formatTimestamp()}]` : '';
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    return `${timestamp}${prefix} [${level}] ${message}`;
  }

  shouldLog(level) {
    return level >= this.level;
  }

  debug(message, ...args) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formatted = this.formatMessage('DEBUG', message);
      const colored = this.enableColors ? `\x1b[36m${formatted}\x1b[0m` : formatted;
      console.debug(colored, ...args);
    }
  }

  info(message, ...args) {
    if (this.shouldLog(LogLevel.INFO)) {
      const formatted = this.formatMessage('INFO', message);
      const colored = this.enableColors ? `\x1b[32m${formatted}\x1b[0m` : formatted;
      console.info(colored, ...args);
    }
  }

  warn(message, ...args) {
    if (this.shouldLog(LogLevel.WARN)) {
      const formatted = this.formatMessage('WARN', message);
      const colored = this.enableColors ? `\x1b[33m${formatted}\x1b[0m` : formatted;
      console.warn(colored, ...args);
    }
  }

  error(message, error, ...args) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formatted = this.formatMessage('ERROR', message);
      const colored = this.enableColors ? `\x1b[31m${formatted}\x1b[0m` : formatted;
      console.error(colored, error || '', ...args);
    }
  }

  child(prefix) {
    return new Logger({
      level: this.level,
      enableTimestamp: this.enableTimestamp,
      enableColors: this.enableColors,
      prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
    });
  }
}

const logger = new Logger();
const apiLogger = logger.child('API');
const dbLogger = logger.child('DB');
const authLogger = logger.child('Auth');
const taskLogger = logger.child('Task');
const mediaLogger = logger.child('Media');

module.exports = {
  logger,
  apiLogger,
  dbLogger,
  authLogger,
  taskLogger,
  mediaLogger,
  Logger,
  LogLevel,
};