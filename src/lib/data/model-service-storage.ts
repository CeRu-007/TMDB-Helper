import {
  ModelServiceConfig,
  ModelProvider,
  ModelConfig,
  UsageScenario,
} from '@/types/model-service';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '@/lib/utils/logger';

// 本地数据存储路径
const DATA_DIR = path.join(process.cwd(), 'data');
const MODEL_SERVICE_CONFIG_PATH = path.join(DATA_DIR, 'model-service.json');

// 确保data目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// 默认配置
const DEFAULT_CONFIG: ModelServiceConfig = {
  providers: [
    {
      id: 'siliconflow-builtin',
      name: '硅基流动',
      type: 'siliconflow',
      apiKey: '',
      apiBaseUrl: 'https://api.siliconflow.cn/v1',
      enabled: true,
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'modelscope-builtin',
      name: '魔搭社区',
      type: 'modelscope',
      apiKey: '',
      apiBaseUrl: 'https://api-inference.modelscope.cn/v1',
      enabled: true,
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ],
  models: [],
  scenarios: [
    {
      type: 'thumbnail_filter',
      label: '视频缩略图智能筛选',
      description:
        '用于"视频缩略图提取"页面的AI智能筛选功能，自动识别包含人物且无字幕的优质帧',
      requiredCapabilities: ['vision'],
      selectedModelIds: [],
      primaryModelId: '',
    },
    {
      type: 'image_analysis',
      label: '影视图像识别分析',
      description:
        '用于"影视识别"页面的图像分析功能，识别影视作品海报、剧照并进行内容分析',
      requiredCapabilities: ['vision'],
      selectedModelIds: [],
      primaryModelId: '',
    },
    {
      type: 'speech_to_text',
      label: '视频语音识别转文字',
      description:
        '用于"分集简介-AI生成"页面的音频转写功能，将视频中的语音转换为文字用于生成简介',
      requiredCapabilities: ['audio'],
      selectedModelIds: [],
      primaryModelId: '',
    },
    {
      type: 'episode_generation',
      label: '分集简介AI生成',
      description:
        '用于"分集简介-AI生成"页面，基于视频内容或字幕生成精彩的分集简介',
      requiredCapabilities: ['chat'],
      selectedModelIds: [],
      primaryModelId: '',
    },
    {
      type: 'ai_chat',
      label: 'AI智能对话助手',
      description: '用于"AI聊天"页面，提供智能对话、问答和内容创作服务',
      requiredCapabilities: ['chat'],
      selectedModelIds: [],
      primaryModelId: '',
    },
    {
      type: 'subtitle_ocr',
      label: '硬字幕OCR识别',
      description:
        '用于"硬字幕提取"页面，通过多模态视觉模型识别视频帧中的硬字幕文本',
      requiredCapabilities: ['vision'],
      selectedModelIds: [],
      primaryModelId: '',
    },
  ],
  version: '1.0.0',
  lastUpdated: Date.now(),
};

export class ModelServiceStorage {
  // 读取配置
  static async getConfig(): Promise<ModelServiceConfig> {
    await ensureDataDir();

    try {
      const data = await fs.readFile(MODEL_SERVICE_CONFIG_PATH, 'utf-8');

      // 检查文件是否为空或只包含空白字符
      if (!data || data.trim() === '') {
        logger.warn('模型服务配置文件为空，创建默认配置');
        await this.createDefaultConfig();
        return DEFAULT_CONFIG;
      }

      const config = JSON.parse(data);

      // 确保配置有所有必需的字段
      const result = {
        providers: config.providers || [],
        models: config.models || [],
        scenarios: config.scenarios || [],
        version: config.version || '1.0.0',
        lastUpdated: config.lastUpdated || Date.now(),
      }

      // 检查并补充缺失的默认场景
      const existingTypes = new Set(result.scenarios.map(s => s.type))
      let needsSave = false

      for (const defaultScenario of DEFAULT_CONFIG.scenarios) {
        if (!existingTypes.has(defaultScenario.type)) {
          result.scenarios.push(defaultScenario)
          needsSave = true
        }
      }

      // 如果有新增场景，保存配置
      if (needsSave) {
        await this.saveConfig(result)
      }

      return result
    } catch (error) {
      logger.warn('读取模型服务配置失败，创建默认配置:', error);

      // 如果是JSON解析错误，备份损坏的文件并重新创建
      if (error instanceof SyntaxError) {
        try {
          const backupPath = `${MODEL_SERVICE_CONFIG_PATH}.backup.${Date.now()}`;
          await fs.copyFile(MODEL_SERVICE_CONFIG_PATH, backupPath);
          logger.warn(`已备份损坏的配置文件到: ${backupPath}`);
        } catch (backupError) {
          logger.warn('备份损坏文件失败:', backupError);
        }
      }

      // 创建默认配置文件
      await this.createDefaultConfig();
      return DEFAULT_CONFIG;
    }
  }

  // 保存配置
  static async saveConfig(config: ModelServiceConfig): Promise<void> {
    await ensureDataDir();

    const configToSave = {
      ...config,
      lastUpdated: Date.now(),
    };

    // 使用临时文件进行原子写入，防止并发写入导致文件损坏
    const tempFilePath = `${MODEL_SERVICE_CONFIG_PATH}.tmp.${Date.now()}`;

    try {
      // 先写入临时文件
      await fs.writeFile(
        tempFilePath,
        JSON.stringify(configToSave, null, 2),
        'utf-8',
      );

      // 验证临时文件的JSON格式
      const tempData = await fs.readFile(tempFilePath, 'utf-8');
      JSON.parse(tempData); // 这会抛出异常如果JSON格式错误

      // 原子性重命名到目标文件
      await fs.rename(tempFilePath, MODEL_SERVICE_CONFIG_PATH);

      logger.info('模型服务配置已保存到本地文件');
    } catch (error) {
      // 清理临时文件
      try {
        await fs.unlink(tempFilePath);
      } catch {
        // 忽略删除临时文件的错误
      }
      throw error;
    }
  }

  // 添加提供商
  static async addProvider(provider: ModelProvider): Promise<void> {
    const config = await this.getConfig();

    // 检查是否已存在
    const existingIndex = config.providers.findIndex(
      (p) => p.id === provider.id,
    );
    if (existingIndex !== -1) {
      config.providers[existingIndex] = { ...provider, updatedAt: Date.now() };
    } else {
      config.providers.push(provider);
    }

    await this.saveConfig(config);
  }

  // 更新提供商
  static async updateProvider(provider: ModelProvider): Promise<void> {
    const config = await this.getConfig();
    const index = config.providers.findIndex((p) => p.id === provider.id);

    if (index !== -1) {
      // 合并现有提供商配置和新配置，确保保留所有必要字段
      config.providers[index] = {
        ...config.providers[index], // 保留现有字段
        ...provider, // 覆盖传入的字段
        updatedAt: Date.now(),
      };
      await this.saveConfig(config);
    } else {
      throw new Error('提供商不存在');
    }
  }

  // 删除提供商
  static async deleteProvider(providerId: string): Promise<void> {
    const config = await this.getConfig();
    config.providers = config.providers.filter((p) => p.id !== providerId);

    // 同时删除该提供商的所有模型
    config.models = config.models.filter((m) => m.providerId !== providerId);

    await this.saveConfig(config);
  }

  // 添加模型
  static async addModel(model: ModelConfig): Promise<void> {
    const config = await this.getConfig();

    // 检查是否已存在
    const existingIndex = config.models.findIndex((m) => m.id === model.id);
    if (existingIndex !== -1) {
      config.models[existingIndex] = model;
    } else {
      config.models.push(model);
    }

    await this.saveConfig(config);
  }

  // 更新模型
  static async updateModel(model: ModelConfig): Promise<void> {
    const config = await this.getConfig();
    const index = config.models.findIndex((m) => m.id === model.id);

    if (index !== -1) {
      config.models[index] = model;
      await this.saveConfig(config);
    } else {
      throw new Error('模型不存在');
    }
  }

  // 删除模型
  static async deleteModel(modelId: string): Promise<void> {
    const config = await this.getConfig();
    config.models = config.models.filter((m) => m.id !== modelId);
    await this.saveConfig(config);
  }

  // 更新场景配置 - 合并场景而不是替换
  static async updateScenarios(scenarios: UsageScenario[]): Promise<void> {
    const config = await this.getConfig()
    const existingTypes = new Set(config.scenarios.map(s => s.type))
    
    // 合并场景：保留原有场景，更新传入的场景，添加新场景
    const updatedScenarios = [...config.scenarios]
    
    for (const scenario of scenarios) {
      const existingIndex = updatedScenarios.findIndex(s => s.type === scenario.type)
      if (existingIndex >= 0) {
        // 更新现有场景
        updatedScenarios[existingIndex] = {
          ...updatedScenarios[existingIndex],
          ...scenario,
          // 保留原有场景中可能存在的额外字段
          selectedModelIds: scenario.selectedModelIds ?? updatedScenarios[existingIndex].selectedModelIds,
          primaryModelId: scenario.primaryModelId ?? updatedScenarios[existingIndex].primaryModelId,
          parameters: scenario.parameters ?? updatedScenarios[existingIndex].parameters
        }
      } else {
        // 添加新场景
        updatedScenarios.push(scenario)
      }
    }
    
    config.scenarios = updatedScenarios
    await this.saveConfig(config)
  }

  // 创建默认配置（不进行任何迁移）
  static async createDefaultConfig(): Promise<void> {
    try {
      // 检查是否已经存在配置
      await fs.access(MODEL_SERVICE_CONFIG_PATH);
      logger.info('模型服务配置已存在，跳过创建');
      return;
    } catch {
      // 配置不存在，创建默认配置
      logger.info('模型服务配置文件不存在，创建默认配置...');
      await this.saveConfig(DEFAULT_CONFIG);
      logger.info('🎉 模型服务默认配置创建完成');
    }
  }

  // 获取配置文件路径（用于调试）
  static getConfigPath(): string {
    return MODEL_SERVICE_CONFIG_PATH;
  }
}
