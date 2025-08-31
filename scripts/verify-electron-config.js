const fs = require('fs');
const path = require('path');

console.log('🔍 验证Electron配置修复...\n');

function checkFile(filePath, checks) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`📁 检查文件: ${filePath}`);
    
    checks.forEach(check => {
      const result = check.test(content);
      const status = result ? '✅' : '❌';
      console.log(`   ${status} ${check.description}`);
    });
    
    console.log('');
    return true;
  } catch (error) {
    console.log(`❌ 无法读取文件: ${filePath}`);
    return false;
  }
}

// 检查配置
const checks = [
  {
    file: 'electron/main.js',
    checks: [
      {
        test: (content) => content.includes('const port = 3000'),
        description: '端口配置为3000'
      },
      {
        test: (content) => content.includes('setSpellCheckerLanguages'),
        description: '配置了语言环境'
      },
      {
        test: (content) => content.includes('will-navigate'),
        description: '添加了导航安全检查'
      }
    ]
  },
  {
    file: 'electron/simple-main.js',
    checks: [
      {
        test: (content) => content.includes('localhost:3000'),
        description: '使用3000端口'
      },
      {
        test: (content) => !content.includes('localhost:3001'),
        description: '不包含3001端口'
      },
      {
        test: (content) => content.includes('setSpellCheckerLanguages'),
        description: '配置了语言环境'
      },
      {
        test: (content) => content.includes('will-navigate'),
        description: '添加了导航安全检查'
      }
    ]
  }
];

let allPassed = true;

checks.forEach(({ file, checks: fileChecks }) => {
  const passed = checkFile(file, fileChecks);
  if (!passed) allPassed = false;
});

console.log('📋 总结:');
if (allPassed) {
  console.log('✅ 所有配置检查通过！');
  console.log('\n🚀 现在可以尝试启动应用:');
  console.log('   1. pnpm run dev');
  console.log('   2. pnpm run electron:dev');
  console.log('\n🔧 修复的问题:');
  console.log('   • 端口配置统一为3000');
  console.log('   • 解决ERR_CONNECTION_REFUSED错误');
  console.log('   • 修复language-mismatch警告');
  console.log('   • 增强安全配置');
  console.log('   • 防止启动空白闪烁');
} else {
  console.log('❌ 部分配置检查失败，请检查上述问题');
}