/**
 * Docker版本管理配置管理
 */

import fs from 'fs'
import path from 'path'

export interface DockerConfig {
  // 当前用于拉取的镜像源（可为完整URL或预设标识）
  registry: string
  // 历史自定义镜像源列表（便于下拉快捷选择）
  registryHistory?: string[]
  autoUpdate: boolean
  updateSchedule?: string
  backupRetention: number
  notificationEnabled: boolean
  lastUpdateCheck?: string
  preferredRegistry?: string
}

const DEFAULT_CONFIG: DockerConfig = {
  registry: 'https://hub.docker.com',
  autoUpdate: false,
  backupRetention: 3,
  notificationEnabled: true
}

const CONFIG_FILE = path.join(process.cwd(), 'config', 'docker-version-manager.json')

/**
 * 获取配置
 */
export function getDockerConfig(): DockerConfig {
  try {
    // 确保配置目录存在
    const configDir = path.dirname(CONFIG_FILE)
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

    // 读取配置文件
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf8')
      const config = JSON.parse(configData)
      return { ...DEFAULT_CONFIG, ...config }
    }

    // 如果配置文件不存在，创建默认配置
    saveDockerConfig(DEFAULT_CONFIG)
    return DEFAULT_CONFIG
  } catch (error) {
    
    return DEFAULT_CONFIG
  }
}

/**
 * 保存配置
 */
export function saveDockerConfig(config: DockerConfig): void {
  try {
    const configDir = path.dirname(CONFIG_FILE)
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
  } catch (error) {
    
    throw new Error('保存配置失败')
  }
}

/**
 * 更新配置
 */
export function updateDockerConfig(updates: Partial<DockerConfig>): DockerConfig {
  const currentConfig = getDockerConfig()
  const newConfig = { ...currentConfig, ...updates }
  saveDockerConfig(newConfig)
  return newConfig
}

/**
 * 重置配置为默认值
 */
export function resetDockerConfig(): DockerConfig {
  saveDockerConfig(DEFAULT_CONFIG)
  return DEFAULT_CONFIG
}

/**
 * 验证配置
 */
export function validateDockerConfig(config: Partial<DockerConfig>): string[] {
  const errors: string[] = []

  if (config.registry && !isValidUrl(config.registry)) {
    errors.push('镜像源URL格式无效')
  }

  if (config.backupRetention !== undefined && (config.backupRetention < 1 || config.backupRetention > 10)) {
    errors.push('备份保留数量必须在1-10之间')
  }

  if (config.updateSchedule && !isValidCronExpression(config.updateSchedule)) {
    errors.push('更新计划表达式格式无效')
  }

  return errors
}

/**
 * 验证URL格式
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 验证Cron表达式（简单验证）
 */
function isValidCronExpression(expression: string): boolean {
  // 简单的Cron表达式验证
  const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/
  return cronRegex.test(expression)
}