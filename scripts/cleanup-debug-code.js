#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const DEBUG_PATTERNS = [
  /console\.log\([^)]*\);?\s*$/gm,
  /console\.error\([^)]*\);?\s*$/gm,
  /console\.warn\([^)]*\);?\s*$/gm,
  /console\.info\([^)]*\);?\s*$/gm,
  /console\.debug\([^)]*\);?\s*$/gm,
  /alert\([^)]*\);?\s*$/gm,
  /debugger;?\s*$/gm,
  /\/\/ TODO:.*$/gm,
  /\/\/ FIXME:.*$/gm,
  /\/\/ HACK:.*$/gm,
  /\/\/ XXX:.*$/gm,
  /\/\*\s*TODO:[\s\S]*?\*\//gm,
  /\/\*\s*FIXME:[\s\S]*?\*\//gm,
];

const EXCLUDE_DIRS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'TMDB-Import-master',
  '.kiro',
  '.qoder',
  '.codebuddy'
];

const INCLUDE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  if (!INCLUDE_EXTENSIONS.includes(ext)) return false;
  
  return !EXCLUDE_DIRS.some(dir => filePath.includes(dir));
}

function cleanupFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changes = 0;

    DEBUG_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        changes += matches.length;
        content = content.replace(pattern, '');
      }
    });

    // 清理多余的空行
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      
      return changes;
    }
    
    return 0;
  } catch (error) {
    
    return 0;
  }
}

function main() {
  
  const files = glob.sync('**/*.{ts,tsx,js,jsx}', {
    ignore: EXCLUDE_DIRS.map(dir => `${dir}/**`)
  });

  let totalChanges = 0;
  let processedFiles = 0;

  files.forEach(file => {
    if (shouldProcessFile(file)) {
      const changes = cleanupFile(file);
      if (changes > 0) {
        processedFiles++;
        totalChanges += changes;
      }
    }
  });

}

if (require.main === module) {
  main();
}

module.exports = { cleanupFile, DEBUG_PATTERNS };