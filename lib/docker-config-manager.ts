/**
 * 环境配置管理器
 * 支持开发环境和Docker环境的配置管理
 */

// 动态导入Node.js模块，只在服务器端使用
let fs: any = null;
let path: any = null;

// 在服务器端初始化模块
if (typeof window === 'undefined') {
  try {
    fs = require('fs');
    path = require('path');
    console.log('✅ DockerConfigManager: Node.js模块加载成功');
  } catch (error) {
    console.error('❌ DockerConfigManager: 无法加载Node.js模块:', error);
  }
}

// 环境类型枚举
export enum EnvironmentType {
    CLIENT = 'client',           // 浏览器环境
    DEVELOPMENT = 'development', // 开发服务器环境
    DOCKER = 'docker'           // Docker容器环境
}

interface DockerConfig {
    // TMDB相关配置
    tmdbApiKey?: string;
    tmdbImportPath?: string;

    // 硅基流动API配置
    siliconFlowApiKey?: string;
    siliconFlowThumbnailModel?: string;

    // 魔搭社区API配置
    modelScopeApiKey?: string;
    modelScopeEpisodeModel?: string;

    // 用户配置
    userSettings?: {
        displayName?: string;
        avatarUrl?: string;
        preferences?: any;
    };

    // 应用配置
    appConfig?: {
        theme?: string;
        language?: string;
        autoSave?: boolean;
        [key: string]: any;
    };

    // 任务调度器配置
    taskSchedulerConfig?: any;

    // 视频缩略图设置
    videoThumbnailSettings?: any;

    // 通用设置
    generalSettings?: any;
    appearanceSettings?: any;

    lastUpdated?: number;
}

export class DockerConfigManager {
    private static readonly DOCKER_CONFIG_DIR = '/app/data';
    private static readonly CONFIG_FILE = 'app-config.json';

    /**
     * 获取开发环境配置目录
     */
    private static getDevConfigDir(): string {
        if (path) {
            return path.join(process.cwd(), 'data');
        } else {
            // 回退方案：使用字符串拼接
            const cwd = process.cwd();
            return `${cwd}/data`.replace(/\\/g, '/'); // 统一使用正斜杠
        }
    }

    /**
     * 获取环境类型
     */
    static getEnvironmentType(): EnvironmentType {
        if (typeof window !== 'undefined') {
            return EnvironmentType.CLIENT; // 浏览器环境
        }

        // 检测Docker环境
        if (process.env.DOCKER_CONTAINER === 'true' ||
            (fs && fs.existsSync('/.dockerenv'))) {
            return EnvironmentType.DOCKER;
        }

        return EnvironmentType.DEVELOPMENT; // 开发服务器环境
    }

    /**
     * 获取配置目录路径
     */
    private static getConfigDir(): string {
        const envType = this.getEnvironmentType();
        return envType === EnvironmentType.DOCKER ? this.DOCKER_CONFIG_DIR : this.getDevConfigDir();
    }

    /**
     * 获取配置文件路径
     */
    private static getConfigPath(): string {
        const configDir = this.getConfigDir();
        return path ? path.join(configDir, this.CONFIG_FILE) : `${configDir}/${this.CONFIG_FILE}`;
    }

    /**
     * 确保配置目录存在
     */
    private static ensureConfigDir(): void {
        if (!fs) return;

        try {
            const configDir = this.getConfigDir();
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
                console.log(`已创建配置目录: ${configDir}`);
            }
        } catch (error) {
            console.error('创建配置目录失败:', error);
        }
    }

    /**
     * 检测是否在Docker环境中 (保持向后兼容)
     */
    static isDockerEnvironment(): boolean {
        return this.getEnvironmentType() === EnvironmentType.DOCKER;
    }

    /**
     * 检测是否应该使用文件系统存储
     */
    static shouldUseFileSystem(): boolean {
        const envType = this.getEnvironmentType();
        return envType === EnvironmentType.DOCKER || envType === EnvironmentType.DEVELOPMENT;
    }

    /**
     * 读取配置文件
     */
    static getConfig(): DockerConfig {
        try {
            const envType = this.getEnvironmentType();
            const shouldUse = this.shouldUseFileSystem();
            const hasFs = !!fs;

            console.log(`📖 DockerConfigManager.getConfig 调试信息:`, {
                envType,
                shouldUseFileSystem: shouldUse,
                hasFs
            });

            if (!shouldUse || !fs) {
                console.log('❌ 不在服务器环境或fs模块不可用，返回空配置');
                return {};
            }

            const configPath = this.getConfigPath();
            console.log(`📂 检查配置文件: ${configPath}`);

            if (!fs.existsSync(configPath)) {
                console.log('⚠️ 配置文件不存在，返回空配置');
                return {};
            }

            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData) as DockerConfig;
            console.log(`✅ 成功读取配置，包含 ${Object.keys(config).length} 个键`);
            return config;
        } catch (error) {
            console.error('❌ 读取配置失败:', error);
            return {};
        }
    }

    /**
     * 保存配置文件
     */
    static saveConfig(config: DockerConfig): void {
        try {
            const envType = this.getEnvironmentType();
            const shouldUse = this.shouldUseFileSystem();
            const hasFs = !!fs;

            console.log(`🔧 DockerConfigManager.saveConfig 调试信息:`, {
                envType,
                shouldUseFileSystem: shouldUse,
                hasFs,
                configKeys: Object.keys(config)
            });

            if (!shouldUse || !fs) {
                console.log('❌ 不在服务器环境或fs模块不可用，跳过文件保存');
                return;
            }

            this.ensureConfigDir();

            const configWithTimestamp = {
                ...config,
                lastUpdated: Date.now()
            };

            const configPath = this.getConfigPath();
            console.log(`📝 准备保存配置到: ${configPath}`);

            // 增强的错误处理和验证
            try {
                // 先备份现有配置（如果存在）
                if (fs.existsSync(configPath)) {
                    const backupPath = `${configPath}.backup`;
                    fs.copyFileSync(configPath, backupPath);
                    console.log(`📋 已备份现有配置到: ${backupPath}`);
                }

                // 写入新配置
                fs.writeFileSync(configPath, JSON.stringify(configWithTimestamp, null, 2), 'utf8');

                // 验证写入结果
                if (fs.existsSync(configPath)) {
                    const writtenData = fs.readFileSync(configPath, 'utf8');
                    const parsedData = JSON.parse(writtenData);
                    console.log(`✅ ${envType}环境配置已保存并验证成功: ${configPath}`);
                    console.log(`📊 保存的配置包含 ${Object.keys(parsedData).length} 个键`);
                } else {
                    throw new Error('配置文件写入后不存在');
                }
            } catch (writeError) {
                console.error('❌ 配置文件写入失败:', writeError);
                throw new Error(`配置文件写入失败: ${writeError.message}`);
            }
        } catch (error) {
            console.error('❌ 保存配置失败:', error);
            throw new Error(`配置保存失败: ${error.message}`);
        }
    }

    /**
     * 获取TMDB API密钥
     */
    static getTmdbApiKey(): string | null {
        // 优先从环境变量获取
        if (process.env.TMDB_API_KEY) {
            return process.env.TMDB_API_KEY;
        }

        // 其次从配置文件获取
        const config = this.getConfig();
        return config.tmdbApiKey || null;
    }

    /**
     * 设置TMDB API密钥
     */
    static setTmdbApiKey(apiKey: string): void {
        const config = this.getConfig();
        config.tmdbApiKey = apiKey;
        this.saveConfig(config);
    }

    /**
     * 获取TMDB Import路径
     */
    static getTmdbImportPath(): string | null {
        const config = this.getConfig();
        return config.tmdbImportPath || null;
    }

    /**
     * 设置TMDB Import路径
     */
    static setTmdbImportPath(path: string): void {
        const config = this.getConfig();
        config.tmdbImportPath = path;
        this.saveConfig(config);
    }

    /**
     * 获取硅基流动API密钥
     */
    static getSiliconFlowApiKey(): string | null {
        const config = this.getConfig();
        return config.siliconFlowApiKey || null;
    }

    /**
     * 设置硅基流动API密钥
     */
    static setSiliconFlowApiKey(apiKey: string): void {
        const config = this.getConfig();
        config.siliconFlowApiKey = apiKey;
        this.saveConfig(config);
    }

    /**
     * 获取魔搭社区API密钥
     */
    static getModelScopeApiKey(): string | null {
        const config = this.getConfig();
        return config.modelScopeApiKey || null;
    }

    /**
     * 设置魔搭社区API密钥
     */
    static setModelScopeApiKey(apiKey: string): void {
        const config = this.getConfig();
        config.modelScopeApiKey = apiKey;
        this.saveConfig(config);
    }

    /**
     * 获取用户设置
     */
    static getUserSettings(): any {
        const config = this.getConfig();
        return config.userSettings || {};
    }

    /**
     * 设置用户设置
     */
    static setUserSettings(userSettings: any): void {
        const config = this.getConfig();
        config.userSettings = { ...config.userSettings, ...userSettings };
        this.saveConfig(config);
    }

    /**
     * 获取应用配置
     */
    static getAppConfig(): any {
        const config = this.getConfig();
        return config.appConfig || {};
    }

    /**
     * 设置应用配置
     */
    static setAppConfig(appConfig: any): void {
        const config = this.getConfig();
        config.appConfig = { ...config.appConfig, ...appConfig };
        this.saveConfig(config);
    }

    /**
     * 获取任务调度器配置
     */
    static getTaskSchedulerConfig(): any {
        const config = this.getConfig();
        return config.taskSchedulerConfig || {};
    }

    /**
     * 设置任务调度器配置
     */
    static setTaskSchedulerConfig(taskConfig: any): void {
        const config = this.getConfig();
        config.taskSchedulerConfig = taskConfig;
        this.saveConfig(config);
    }

    /**
     * 获取视频缩略图设置
     */
    static getVideoThumbnailSettings(): any {
        const config = this.getConfig();
        return config.videoThumbnailSettings || {};
    }

    /**
     * 设置视频缩略图设置
     */
    static setVideoThumbnailSettings(settings: any): void {
        const config = this.getConfig();
        config.videoThumbnailSettings = settings;
        this.saveConfig(config);
    }

    /**
     * 获取通用设置
     */
    static getGeneralSettings(): any {
        const config = this.getConfig();
        return config.generalSettings || {};
    }

    /**
     * 设置通用设置
     */
    static setGeneralSettings(settings: any): void {
        const config = this.getConfig();
        config.generalSettings = settings;
        this.saveConfig(config);
    }

    /**
     * 获取外观设置
     */
    static getAppearanceSettings(): any {
        const config = this.getConfig();
        return config.appearanceSettings || {};
    }

    /**
     * 设置外观设置
     */
    static setAppearanceSettings(settings: any): void {
        const config = this.getConfig();
        config.appearanceSettings = settings;
        this.saveConfig(config);
    }

    /**
     * 清除所有配置
     */
    static clearConfig(): void {
        try {
            if (!fs) return;

            const configPath = this.getConfigPath();
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
                const envType = this.getEnvironmentType();
                console.log(`${envType}环境配置已清除`);
            }
        } catch (error) {
            console.error('清除配置失败:', error);
        }
    }

    /**
     * 从localStorage迁移配置到文件系统
     */
    static migrateFromLocalStorage(localStorageData: { [key: string]: string }): void {
        try {
            const config: DockerConfig = {};

            // 迁移TMDB配置
            if (localStorageData.tmdb_api_key) {
                config.tmdbApiKey = localStorageData.tmdb_api_key;
            }

            if (localStorageData.tmdb_import_path) {
                config.tmdbImportPath = localStorageData.tmdb_import_path;
            }

            // 迁移硅基流动API配置
            if (localStorageData.siliconflow_api_settings) {
                try {
                    const siliconFlowSettings = JSON.parse(localStorageData.siliconflow_api_settings);
                    if (siliconFlowSettings.apiKey) {
                        config.siliconFlowApiKey = siliconFlowSettings.apiKey;
                    }
                    if (siliconFlowSettings.thumbnailFilterModel) {
                        config.siliconFlowThumbnailModel = siliconFlowSettings.thumbnailFilterModel;
                    }
                } catch (e) {
                    console.warn('解析硅基流动API设置失败:', e);
                }
            }

            // 迁移兼容的旧API密钥
            if (localStorageData.siliconflow_api_key && !config.siliconFlowApiKey) {
                config.siliconFlowApiKey = localStorageData.siliconflow_api_key;
            }

            // 迁移通用设置
            if (localStorageData.general_settings) {
                try {
                    config.generalSettings = JSON.parse(localStorageData.general_settings);
                } catch (e) {
                    console.warn('解析通用设置失败:', e);
                }
            }

            // 迁移外观设置
            if (localStorageData.appearance_settings) {
                try {
                    config.appearanceSettings = JSON.parse(localStorageData.appearance_settings);
                } catch (e) {
                    console.warn('解析外观设置失败:', e);
                }
            }

            // 迁移视频缩略图设置
            if (localStorageData.video_thumbnail_settings) {
                try {
                    config.videoThumbnailSettings = JSON.parse(localStorageData.video_thumbnail_settings);
                } catch (e) {
                    console.warn('解析视频缩略图设置失败:', e);
                }
            }

            // 迁移任务调度器配置
            if (localStorageData.task_scheduler_config) {
                try {
                    config.taskSchedulerConfig = JSON.parse(localStorageData.task_scheduler_config);
                } catch (e) {
                    console.warn('解析任务调度器配置失败:', e);
                }
            }

            // 迁移应用配置
            if (localStorageData.app_config) {
                try {
                    config.appConfig = JSON.parse(localStorageData.app_config);
                } catch (e) {
                    console.warn('解析应用配置失败:', e);
                }
            }

            if (Object.keys(config).length > 0) {
                // 合并现有配置，避免覆盖
                const existingConfig = this.getConfig();
                const mergedConfig = { ...existingConfig, ...config };
                this.saveConfig(mergedConfig);
                console.log('已从localStorage迁移配置到Docker文件系统，迁移项目:', Object.keys(config));
            }
        } catch (error) {
            console.error('迁移配置失败:', error);
        }
    }
}