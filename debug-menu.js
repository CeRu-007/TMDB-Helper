const fs = require('fs');

console.log('🔍 调试菜单配置...\n');

try {
  const content = fs.readFileSync('electron/main.js', 'utf8');
  
  // 检查菜单相关配置
  const hasCreateMenu = content.includes('createMenu()');
  const hasDevMenu = content.includes("label: '开发'");
  const hasMenuCondition = content.includes('if (isDev)') && content.includes('createMenu()');
  const alwaysCreateMenu = content.includes('始终创建菜单');
  
  console.log('📋 菜单配置检查:');
  console.log(`   ${hasCreateMenu ? '✅' : '❌'} 调用createMenu(): ${hasCreateMenu}`);
  console.log(`   ${hasDevMenu ? '✅' : '❌'} 包含开发菜单: ${hasDevMenu}`);
  console.log(`   ${hasMenuCondition ? '⚠️' : '✅'} 菜单仅在开发环境显示: ${hasMenuCondition}`);
  console.log(`   ${alwaysCreateMenu ? '✅' : '❌'} 始终创建菜单: ${alwaysCreateMenu}`);
  
  // 检查环境变量设置
  const envCheck = content.includes("process.env.NODE_ENV === 'development'");
  console.log(`   ${envCheck ? '✅' : '❌'} 环境变量检查: ${envCheck}`);
  
  console.log('\n🔧 建议:');
  if (hasMenuCondition && !alwaysCreateMenu) {
    console.log('⚠️  菜单可能只在开发环境显示，需要修改为始终显示');
  } else if (alwaysCreateMenu) {
    console.log('✅ 菜单配置正确，应该始终显示');
  }
  
  console.log('\n💡 请确保以开发模式启动: NODE_ENV=development pnpm run electron:dev');
  
} catch (error) {
  console.error('❌ 读取文件失败:', error.message);
}