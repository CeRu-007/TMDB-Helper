import { NextResponse } from 'next/server';
import packageJson from '@/package.json';

export async function GET() {
  try {
    // 获取版本描述信息
    const getVersionDescription = (version: string) => {
      switch (version) {
        case '0.3.2':
          return {
            title: '分集简介新增通过视频URL进行分析生成字幕',
            description: `主要更新：
• 新增魔搭社区ModelScope API支持
• 新增应用信息API端点，从package.json动态获取版本
• 更新设置对话框，显示实时的应用名称和版本号
• 修复TMDB API密钥无法正常保存的问题
• 修复Docker环境api配置保存问题`,
            releaseDate: '2025-08-07'
          };
        case '0.3.1':
          return {
            title: '修复Docker环境配置保存问题',
            description: `主要更新：
• 新增Docker配置管理器，支持文件系统持久化存储
• 新增配置适配器，统一配置访问接口
• 新增API端点处理所有Docker环境配置
• 更新设置页面，自动检测并适配Docker环境
• 更新启动脚本，确保配置目录和权限正确
• 支持多种配置类型：TMDB API、硅基流动API、用户设置、应用配置等
• 保持向后兼容性，支持非Docker环境
• 提供完整的配置迁移功能
• 修复客户端导入问题和JSON解析错误，确保构建正常
• 修复设置对话框导航问题，确保所有页面可正常访问

修复问题：
• 解决Docker环境中设置页面输入API密钥无法保存的问题
• 修复Module not found: Can't resolve 'fs'构建错误
• 修复SyntaxError: Unexpected token '<' JSON解析错误
• 确保所有配置在Docker容器重启后持久化保存`,
            releaseDate: '2025-07-30'
          };
        case '0.3.0':
          return {
            title: '重大功能更新',
            description: '添加了多项新功能和改进',
            releaseDate: '2025-07-29'
          };
        case '0.2.0':
          return {
            title: '基础功能完善',
            description: '完善了核心功能和用户界面',
            releaseDate: '2025-07-28'
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
        repository: packageJson.repository || '',
        versionInfo: versionInfo
      }
    });
  } catch (error) {
    console.error('获取应用信息失败:', error);
    return NextResponse.json(
      { success: false, error: '获取应用信息失败' },
      { status: 500 }
    );
  }
}