const fs = require('fs');
const path = require('path');

/**
 * 准备桌面应用图标
 * 确保各平台所需的图标文件存在
 */

const iconSizes = {
  // Windows ICO 格式需要的尺寸
  windows: [16, 24, 32, 48, 64, 128, 256],
  // macOS ICNS 格式需要的尺寸
  macos: [16, 32, 64, 128, 256, 512, 1024],
  // Linux PNG 格式需要的尺寸
  linux: [16, 24, 32, 48, 64, 128, 256, 512]
};

function checkIconExists() {
  const iconPath = path.join(process.cwd(), 'public', 'images', 'tmdb-helper-logo-new.png');

  if (!fs.existsSync(iconPath)) {
    console.warn('⚠️ 警告: 未找到应用图标文件 public/images/tmdb-helper-logo-new.png');
    console.log('📝 建议: 请添加一个 512x512 或更大的 PNG 图标文件');
    return false;
  }

  console.log('✅ 找到应用图标文件: public/images/tmdb-helper-logo-new.png');
  return true;
}

function createIconDirectories() {
  const buildDir = path.join(process.cwd(), 'build');
  const iconsDir = path.join(buildDir, 'icons');
  
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  console.log('📁 创建图标目录:', iconsDir);
  return iconsDir;
}

function generateIconInfo() {
  console.log('\n📋 图标要求说明:');
  console.log('');
  console.log('Windows (.ico):');
  iconSizes.windows.forEach(size => {
    console.log(`  - ${size}x${size} 像素`);
  });
  
  console.log('\nmacOS (.icns):');
  iconSizes.macos.forEach(size => {
    console.log(`  - ${size}x${size} 像素`);
  });
  
  console.log('\nLinux (.png):');
  iconSizes.linux.forEach(size => {
    console.log(`  - ${size}x${size} 像素`);
  });
  
  console.log('\n💡 提示:');
  console.log('- 推荐使用 512x512 或 1024x1024 的高质量 PNG 图标');
  console.log('- electron-builder 会自动生成各平台所需的图标格式');
  console.log('- 确保图标背景透明，适合深色和浅色主题');
}

function main() {
  console.log('🎨 准备桌面应用图标...');
  
  const hasIcon = checkIconExists();
  createIconDirectories();
  generateIconInfo();
  
  if (!hasIcon) {
    console.log('\n❌ 图标准备未完成');
    console.log('请添加应用图标后重新运行此脚本');
    process.exit(1);
  }
  
  console.log('\n✅ 图标准备完成');
  console.log('现在可以运行 npm run electron:build 来构建桌面应用');
}

if (require.main === module) {
  main();
}

module.exports = {
  checkIconExists,
  createIconDirectories,
  generateIconInfo
};
