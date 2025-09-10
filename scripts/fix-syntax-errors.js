const fs = require('fs');
const path = require('path');

const SYNTAX_FIXES = [
  {
    file: 'components/settings-dialog.tsx',
    fixes: [
      {
        search: /\s+\}\)/g,
        replace: ''
      },
      {
        search: /if \(open && initialSection && typeof initialSection === 'string'\) \{\s*\n\s*\n\s*\}\)\s*\n\s*\/\/ 确保只设置有效的section/g,
        replace: 'if (open && initialSection && typeof initialSection === \'string\') {\n      // 确保只设置有效的section'
      }
    ]
  }
];

function fixSyntaxErrors() {
  console.log('🔧 Fixing syntax errors...\n');
  
  let totalFixes = 0;
  
  SYNTAX_FIXES.forEach(({ file, fixes }) => {
    const filePath = path.join(process.cwd(), file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file}`);
      return;
    }
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let fileFixed = false;
      
      fixes.forEach(({ search, replace }) => {
        if (content.match(search)) {
          content = content.replace(search, replace);
          fileFixed = true;
          totalFixes++;
        }
      });
      
      if (fileFixed) {
        fs.writeFileSync(filePath, content);
        console.log(`✓ Fixed syntax errors in ${file}`);
      }
      
    } catch (error) {
      console.error(`✗ Error fixing ${file}:`, error.message);
    }
  });
  
  console.log(`\n📊 Fix Summary:`);
  console.log(`   Total fixes applied: ${totalFixes}`);
  console.log(`   Status: ${totalFixes > 0 ? '✅ Fixes completed' : '✅ No fixes needed'}`);
}

if (require.main === module) {
  fixSyntaxErrors();
}

module.exports = { fixSyntaxErrors };