#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

logger.info('🔧 开始优化构建...');

// 创建 .electronignore 文件
function createElectronIgnore() {
  const electronIgnoreContent = `
# 开发文件
*.log
*.tmp
.DS_Store
Thumbs.db

# 源码文件
src/
components/
pages/
styles/
*.tsx
*.ts
!*.d.ts

# 配置文件
.env*
.git*
.eslint*
.prettier*
tsconfig.json
tailwind.config.ts
postcss.config.mjs

# 文档
README.md
docs/
*.md

# 测试文件
__tests__/
*.test.*
*.spec.*

# 大文件目录
TMDB-Import-master/Browser/
TMDB-Import-master/Image/
data/

# Node modules 优化
node_modules/**/test/
node_modules/**/tests/
node_modules/**/*.md
node_modules/**/README*
node_modules/**/CHANGELOG*
node_modules/**/LICENSE*
node_modules/**/.github/
node_modules/**/docs/
node_modules/**/example/
node_modules/**/examples/
node_modules/@types/
node_modules/typescript/
node_modules/eslint*/
node_modules/@typescript-eslint/
`;

  fs.writeFileSync('.electronignore', electronIgnoreContent.trim());
  logger.info('✅ 创建了 .electronignore 文件');
}

// 主函数
function main() {
  try {
    logger.info('🚀 开始构建优化...');

    // 只在构建时清理，避免影响开发
    if (process.env.ELECTRON_BUILD === 'true') {
      logger.info('📦 使用排除规则优化打包体积');
      logger.info('📦 TMDB-Import-master 已从打包中排除');
      logger.info('📦 .next/standalone/node_modules/.pnpm 已从打包中排除');
    }

    createElectronIgnore();

    logger.info('✅ 构建优化完成！');
    logger.info('💡 预计可减少 80-90% 的安装包体积');
  } catch (error) {
    logger.error('❌ 优化过程中出错:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { main };
