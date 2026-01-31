import { NextResponse } from 'next/server';
import packageJson from '../../../../package.json';

export async function GET() {
  try {
    // 获取版本描述信息
    const getVersionDescription = (version: string) => {
      switch (version) {
        case '0.5.4':
          return {
            title: '平台更新与功能增强',
            description: `主要更新：
1. 流媒体平台优化
• 将西瓜视频平台替换为抖音平台
• 添加平台收藏功能，支持自定义收藏常用平台
• 添加最近使用功能，快速访问最近使用的平台
• 整合 TMDB-Import 支持的所有流媒体平台

2. 流媒体导航功能增强
• 为流媒体导航添加搜索功能，支持按名称快速筛选平台
• 优化流媒体平台导航界面，提升用户体验
• 优化平台类型定义，增强类型安全性

3. 代码架构重构
• 将 shared/lib 模块迁移至 lib 目录并更新所有导入路径
• 优化多个工具类的实现，提升代码质量和可维护性
• 优化剧集进度计算逻辑，提高准确性

4. 词条详情功能
• 修复词条详情页面CSV编辑器批量编辑对话框无法滚动的问题
• 在添加词条的每个搜索结果右侧添加跳转到TMDB页面的链接按钮
• 在搜索结果中显示成人内容标记，支持成人内容搜索

5. TMDB功能优化
• 在TMDB搜索中允许成人内容
• 移除电影类型支持，专注于电视剧维护
• 简化剧集进度管理，从逐集完成状态改为当前进度追踪

6. 代码质量提升
• 大幅简化代码库架构，消除重复并提升可维护性
• 简化批量编辑功能代码，优化逻辑和可维护性
• 添加表格批量编辑功能，支持overview和name列

7. UI/UX优化
• 调整媒体维护详情页的间距和过渡效果
• 将词条详情巨型组件拆分为模块化结构，提升可维护性

技术改进：
• 优化代码结构，减少冗余代码
• 提升类型安全性，增强代码健壮性
• 改进用户体验，增强功能实用性`,
            releaseDate: '2026-01-31'
          };
        case '0.5.2':
          return {
            title: '系统架构重构与功能优化',
            description: `主要更新：
1. 系统架构重构
• 完成大型组件重构，提升代码可维护性
• 重构状态管理系统，实现统一的hooks模式
• 重构日志系统，支持环境变量配置
• 重构存储模式，统一使用StorageService替代localStorage

2. CSV编辑器功能增强
• 新增批量插入行功能，提升编辑效率
• 新增数字范围填充功能，支持快速生成序列数据
• 优化表格滚动性能和编辑体验
• 修复runtime列"统一设置分钟"功能不生效问题
• 简化CSV保存逻辑，移除冗余代码

3. 多语言支持
• 新增多语言选择器组件
• 集成到相关组件，支持国际化切换

4. TMDB功能优化
• 重构TMDB API配置为使用官方API
• 为backdrop列添加URL点击功能
• 优化剧集总集数计算和展示
• 简化TMDB数据刷新按钮的文本

5. 设置对话框改进
• 完成设置对话框模块化重构，从4178行单体文件拆分为多个独立面板组件
• 提升代码可维护性，每个面板独立管理自己的UI和交互
• 保持所有原有功能和UI完全不变
• 添加底部通用保存按钮，统一保存操作
• 从localStorage初始化侧边栏折叠状态

6. 终端和命令功能
• 新增进程终止功能
• 优化命令执行状态处理
• 修复独立维护页面终端读取CSV文件失败问题

7. UI/UX优化
• 优化词条卡片网格间距，提升视觉协调性
• 优化命令显示区域的文本溢出样式
• 修改季操作区域的按钮显示逻辑

8. 开发工具
• 添加自动检测代码变更并重建的逻辑
• 增强日志系统，支持环境变量控制

技术改进：
• 统一存储服务实现，提升数据管理一致性
• 优化组件状态管理，减少不必要的重渲染
• 清理冗余代码和调试日志，提升系统性能`,
            releaseDate: '2026-01-19'
          };
        default:
          return {
            title: 'TMDB Helper',
            description: '专业的TMDB数据管理工具',
            releaseDate: new Date().toISOString().split('T')[0]
          };
      }
    };

    const versionInfo = getVersionDescription(packageJson.version);

    return NextResponse.json({
      success: true,
      data: {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description || 'TMDB数据管理工具',
        author: packageJson.author || 'TMDB Helper Team',
        homepage: packageJson.homepage || '',
        repository: (packageJson as any).repository || '',
        versionInfo: versionInfo
      }
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: '获取应用信息失败' },
      { status: 500 }
    );
  }
}