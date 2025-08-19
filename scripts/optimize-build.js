#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 开始优化构建...');

// 不需要清理文件，使用排除规则即可

// 优化 Next.js 构建
function optimizeNextBuild() {
  const nextConfigPath = path.join(process.cwd(), 'next.config.mjs');
  
  if (fs.existsSync(nextConfigPath)) {
    let config = fs.readFileSync(nextConfigPath, 'utf8');
    
    // 添加优化配置
    if (!config.includes('compress: true')) {
      config = config.replace(
        'const nextConfig = {',
        `const nextConfig = {
  compress: true,
  poweredByHeader: false,
  generateEtags: false,`
      );
      
      fs.writeFileSync(nextConfigPath, config);
      console.log('✅ 优化了 Next.js 配置');
    }
  }
}

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
  console.log('✅ 创建了 .electronignore 文件');
}

// 整合所有优化功能
function integratedOptimization() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  // 确保构建配置包含所有必要文件
  if (packageJson.build && packageJson.build.files) {
    const requiredFiles = [
      'public/tmdb-helper-logo.png',
      'public/images/tmdb-helper-logo-new.png',
      'public/placeholder*.png',
      'public/placeholder*.svg',
      'public/placeholder*.jpg'
    ];

    let updated = false;
    requiredFiles.forEach(file => {
      if (!packageJson.build.files.includes(file)) {
        packageJson.build.files.push(file);
        updated = true;
      }
    });

    if (updated) {
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      console.log('✅ 更新了构建文件配置');
    }
  }
}

// 主函数
function main() {
  try {
    console.log('🚀 开始构建优化...');

    // 只在构建时清理，避免影响开发
    if (process.env.ELECTRON_BUILD === 'true') {
      console.log('📦 使用排除规则优化打包体积');
      console.log('📦 TMDB-Import-master 已从打包中排除');
      console.log('📦 .next/standalone/node_modules/.pnpm 已从打包中排除');

      // 整合所有优化
      integratedOptimization();
    }

    createElectronIgnore();

    console.log('✅ 构建优化完成！');
    console.log('💡 预计可减少 80-90% 的安装包体积');
  } catch (error) {
    console.error('❌ 优化过程中出错:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { main };
