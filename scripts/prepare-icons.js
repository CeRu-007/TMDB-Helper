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
    
    return false;
  }

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

  return iconsDir;
}

function generateIconInfo() {

  console.log('Windows (.ico):');
  iconSizes.windows.forEach(size => {
    
  });
  
  console.log('\nmacOS (.icns):');
  iconSizes.macos.forEach(size => {
    
  });
  
  console.log('\nLinux (.png):');
  iconSizes.linux.forEach(size => {
    
  });

}

function main() {
  
  const hasIcon = checkIconExists();
  createIconDirectories();
  generateIconInfo();
  
  if (!hasIcon) {

    process.exit(1);
  }

}

if (require.main === module) {
  main();
}

module.exports = {
  checkIconExists,
  createIconDirectories,
  generateIconInfo
};
