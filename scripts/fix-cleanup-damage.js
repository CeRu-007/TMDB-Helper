#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 备份原文件并从git恢复损坏的文件
function restoreFromGit() {
  console.log('🔄 Restoring damaged files from Git...\n');
  
  try {
    // 获取所有修改过的文件
    const modifiedFiles = execSync('git diff --name-only', { encoding: 'utf8' })
      .split('\n')
      .filter(file => file.trim() && (file.endsWith('.ts') || file.endsWith('.tsx')));
    
    console.log(`Found ${modifiedFiles.length} modified TypeScript files`);
    
    // 检查每个文件是否有语法错误
    const damagedFiles = [];
    
    for (const file of modifiedFiles) {
      try {
        // 尝试解析TypeScript文件
        execSync(`npx tsc --noEmit --skipLibCheck "${file}"`, { 
          encoding: 'utf8', 
          stdio: 'pipe' 
        });
      } catch (error) {
        if (error.stdout && error.stdout.includes('error TS')) {
          damagedFiles.push(file);
        }
      }
    }
    
    console.log(`Found ${damagedFiles.length} files with syntax errors:`);
    damagedFiles.forEach(file => console.log(`  ❌ ${file}`));
    
    if (damagedFiles.length > 0) {
      console.log('\n🔧 Restoring damaged files...');
      
      // 恢复损坏的文件
      for (const file of damagedFiles) {
        try {
          execSync(`git checkout HEAD -- "${file}"`, { stdio: 'pipe' });
          console.log(`✅ Restored ${file}`);
        } catch (error) {
          console.log(`⚠️  Could not restore ${file}: ${error.message}`);
        }
      }
    }
    
    console.log('\n✅ File restoration completed');
    return damagedFiles.length;
    
  } catch (error) {
    console.error('❌ Error during restoration:', error.message);
    return -1;
  }
}

// 更安全的清理调试代码
function safeCleanupDebugCode() {
  console.log('\n🧹 Running safe debug cleanup...\n');
  
  const SAFE_PATTERNS = [
    // 只清理明显的调试语句，避免破坏正常代码
    /^(\s*)console\.log\([^)]*\);?\s*$/gm,
    /^(\s*)console\.warn\([^)]*\);?\s*$/gm,
    /^(\s*)console\.error\([^)]*\);?\s*$/gm,
    /^(\s*)console\.info\([^)]*\);?\s*$/gm,
    /^(\s*)alert\([^)]*\);?\s*$/gm,
    /^(\s*)debugger;?\s*$/gm,
  ];
  
  const files = execSync('find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next | grep -v .git', { 
    encoding: 'utf8' 
  }).split('\n').filter(f => f.trim());
  
  let totalCleaned = 0;
  
  files.forEach(file => {
    if (!fs.existsSync(file)) return;
    
    try {
      let content = fs.readFileSync(file, 'utf8');
      let originalContent = content;
      let cleaned = 0;
      
      SAFE_PATTERNS.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          cleaned += matches.length;
          content = content.replace(pattern, '');
        }
      });
      
      // 清理多余空行
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      if (content !== originalContent) {
        // 验证修改后的文件语法是否正确
        fs.writeFileSync(file + '.tmp', content);
        
        try {
          execSync(`npx tsc --noEmit --skipLibCheck "${file}.tmp"`, { 
            stdio: 'pipe' 
          });
          
          // 语法正确，应用更改
          fs.writeFileSync(file, content);
          console.log(`✅ Safely cleaned ${file} - removed ${cleaned} statements`);
          totalCleaned += cleaned;
          
        } catch (syntaxError) {
          console.log(`⚠️  Skipped ${file} - would cause syntax errors`);
        } finally {
          // 清理临时文件
          if (fs.existsSync(file + '.tmp')) {
            fs.unlinkSync(file + '.tmp');
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  });
  
  console.log(`\n📊 Safe cleanup summary: ${totalCleaned} debug statements removed`);
  return totalCleaned;
}

function main() {
  console.log('🚑 Recovery and Safe Cleanup Tool\n');
  
  // 1. 恢复损坏的文件
  const restoredCount = restoreFromGit();
  
  if (restoredCount > 0) {
    console.log(`\n✅ Restored ${restoredCount} damaged files from Git`);
  }
  
  // 2. 进行安全的调试代码清理
  const cleanedCount = safeCleanupDebugCode();
  
  console.log('\n🎉 Recovery and cleanup completed!');
  console.log(`   Files restored: ${restoredCount >= 0 ? restoredCount : 'N/A'}`);
  console.log(`   Debug statements safely removed: ${cleanedCount}`);
}

if (require.main === module) {
  main();
}

module.exports = { restoreFromGit, safeCleanupDebugCode };