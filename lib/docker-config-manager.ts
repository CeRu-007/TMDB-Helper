/**
 * Docker环境配置管理器
 * 专门处理Docker环境下的配置持久化问题
 */

import fs from 'fs';
import path from 'path';

interface DockerConfig {
    // TMDB相关配置
    tmdbApiKey?: string;
    tmdbImportPath?: string;

    // 硅基流动API配置
    siliconFlowApiKey?: string;
    siliconFlowThumbnailModel?: string;

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
    private static readonly CONFIG_DIR = '/app/data';
    private static readonly CONFIG_FILE = 'app-config.json';
    private static readonly CONFIG_PATH = path.join(this.CONFIG_DIR, this.CONFIG_FILE);

    /**
     * 确保配置目录存在
     */
    private static ensureConfigDir(): void {
        try {
            if (!fs.existsSync(this.CONFIG_DIR)) {
                fs.mkdirSync(this.CONFIG_DIR, { recursive: true });
            }
        } catch (error) {
            console.error('创建配置目录失败:', error);
        }
    }

    /**
     * 检测是否在Docker环境中
     */
    static isDockerEnvironment(): boolean {
        return process.env.DOCKER_CONTAINER === 'true' ||
            fs.existsSync('/.dockerenv') ||
            process.env.NODE_ENV === 'production';
    }

    /**
     * 读取配置文件
     */
    static getConfig(): DockerConfig {
        try {
            if (!this.isDockerEnvironment()) {
                return {};
            }

            if (!fs.existsSync(this.CONFIG_PATH)) {
                return {};
            }

            const configData = fs.readFileSync(this.CONFIG_PATH, 'utf8');
            return JSON.parse(configData) as DockerConfig;
        } catch (error) {
            console.error('读取Docker配置失败:', error);
            return {};
        }
    }

    /**
     * 保存配置文件
     */
    static saveConfig(config: DockerConfig): void {
        try {
            if (!this.isDockerEnvironment()) {
                return;
            }

            this.ensureConfigDir();

            const configWithTimestamp = {
                ...config,
                lastUpdated: Date.now()
            };

            fs.writeFileSync(this.CONFIG_PATH, JSON.stringify(configWithTimestamp, null, 2));
            console.log('Docker配置已保存到:', this.CONFIG_PATH);
        } catch (error) {
            console.error('保存Docker配置失败:', error);
            throw new Error('配置保存失败');
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
            if (fs.existsSync(this.CONFIG_PATH)) {
                fs.unlinkSync(this.CONFIG_PATH);
                console.log('Docker配置已清除');
            }
        } catch (error) {
            console.error('清除Docker配置失败:', error);
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