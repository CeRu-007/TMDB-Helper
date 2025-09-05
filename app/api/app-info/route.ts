import { NextResponse } from 'next/server';
import packageJson from '@/package.json';

export async function GET() {
  try {
    // 获取版本描述信息
    const getVersionDescription = (version: string) => {
      switch (version) {
        case '0.4.0':
          return {
            title: 'feat: 新增独立维护功能与 AI 分集简介 + 多维度系统优化',
            description: `一、新增核心功能
1. 独立维护功能（连载影视专项）
• 提供独立维护工作台：专门适配 "已完结但未跟踪" 的连载影视维护场景
• 支持批量操作：可批量选择、编辑内容及更新状态，大幅提升维护效率
• 优化工作流程：针对维护场景重构操作逻辑与界面布局，降低操作成本

2. AI 分集简介 "模仿" 风格
• 智能风格学习：AI 可分析用户提供的样本内容，精准模仿其写作风格与表达方式
• 多版本生成：支持生成多个差异化简介版本，提供更多选择空间
• 风格一致性保障：生成内容既与样本风格统一，又确保原创性不重复

二、重大优化
1. 性能提升
• CSV 编辑器：优化表格编辑与渲染性能，支持大数据量高效处理
• 图片加载：实现智能预加载 + 缓存机制，显著改善图片加载体验

2. 桌面端专项优化
• 性能精简：移除移动端响应式适配代码，聚焦桌面端性能提升
• 布局简化：完全移除标签页布局，统一采用侧边栏布局，降低界面复杂度
• 状态管理：改进组件状态管理逻辑，减少界面闪烁与异常场景
• API 稳定性：修复多个 API 端点异常问题，提升系统整体稳定性

3. 用户体验改进
• 界面优化：词条详情页优化编辑模式切换逻辑，改善 "保存按钮" 交互反馈
• 图片显示：优化加载策略，同步支持智能缓存与预加载
• 通知系统：修复全局通知对话框显示异常，提升反馈及时性
• 功能完善：修复数据导入/导出的路径异常与重复检测问题
• 时间格式：统一全局时间显示格式，提升界面一致性
• 平台导航：修复流媒体平台导航页面显示异常问题`,
        case '0.3.7':
=======
        case '0.3.7':
=======
        case '0.3.7':
          return {
            title: '优化系统性能和用户体验',
            description: `主要更新：
• 延长会话有效期并优化监控频率，提升系统稳定性
• 移除浏览器限制实现定时任务后台执行，大幅减少API调用
• 重构头像加载机制，提供流畅的加载体验和丰富的选择选项

技术改进：
• 优化系统性能，提升响应速度
• 增强用户体验，减少操作延迟
• 改进后台任务处理机制`,
            releaseDate: '2025-08-14'
          };
        case '0.3.6':
          return {
            title: '修复Docker环境中无法从服务端读取数据的问题',
            description: `主要更新：
• 修复Docker环境中无法从服务端读取数据的问题
• 优化词条详情页面图片加载逻辑，避免二次加载

技术改进：
• 增强Docker环境下的数据读取稳定性
• 优化图片加载性能，减少不必要的网络请求
• 提升用户体验，减少页面加载时间`,
            releaseDate: '2025-08-14'
          };
        case '0.3.5':
          return {
            title: '将存储系统从localStorage迁移到服务端存储',
            description: `重构：
• 重构设置对话框初始化逻辑，简化配置加载流程
• 重构定时任务存储系统，从localStorage迁移到服务端API并优化JSON存储格式
• 重构帮助与支持页面，采用标签式布局并整合帮助文档到关于应用
• 重构TMDB导入路径配置，从硬编码迁移到服务端配置管理
• 重构ModelScope API处理逻辑，支持思考模型流式响应并优化模型选择
• 重构TMDB图片加载逻辑，新增服务端代理API并优化缓存策略
• 重构用户头像组件，新增智能头像组件并实现图片代理功能

新增和改进：
• 新增Kimi K2模型和deepseek R1模型
• 调整TMDB搜索逻辑，从客户端直连迁移到服务端代理
• 当TMDB没有背景图时，词条详情页面会自动使用已经加载的海报作为背景图
• 增强硅基流动API错误处理，新增余额不足检测与提示功能
• 分集简介新增语法纠错功能和划词改写功能
• 增强布局模式偏好管理，支持本地缓存同步以消除首屏闪烁
• 优化定时任务API的Node.js运行时支持并清理冗余代码
• 词条详情页背景效果支持调节并优化图片加载性能
• 增强Toast通知组件，支持多种状态样式并优化视觉层级
• 将侧边栏布局的顶部栏右侧容器对齐并将执行日志按钮移到左侧
• 增强Docker镜像管理功能，支持多镜像源拉取与自定义注册表配置`,
            releaseDate: '2025-08-09'
          };
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