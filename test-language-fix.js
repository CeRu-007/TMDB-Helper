const fs = require('fs');

console.log('🔍 检查语言代码修复...\n');

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hasInvalidLanguageCode = content.includes('zh-CN');
    const hasSpellCheckerDisabled = content.includes('setSpellCheckerEnabled(false)');
    
    console.log(`📁 ${filePath}:`);
    console.log(`   ${hasInvalidLanguageCode ? '❌' : '✅'} 包含无效语言代码 zh-CN: ${hasInvalidLanguageCode}`);
    console.log(`   ${hasSpellCheckerDisabled ? '✅' : '❌'} 已禁用拼写检查: ${hasSpellCheckerDisabled}`);
    console.log('');
    
    return !hasInvalidLanguageCode && hasSpellCheckerDisabled;
  } catch (error) {
    console.log(`❌ 无法读取文件: ${filePath}`);
    return false;
  }
}

const files = ['electron/main.js', 'electron/simple-main.js'];
let allFixed = true;

files.forEach(file => {
  const fixed = checkFile(file);
  if (!fixed) allFixed = false;
});

console.log('📋 总结:');
if (allFixed) {
  console.log('✅ 语言代码问题已修复！');
  console.log('💡 现在可以重新启动Electron应用测试');
} else {
  console.log('❌ 仍有问题需要修复');
}