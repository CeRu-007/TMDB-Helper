#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function getDirectorySize(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return 0;
  }
  
  let totalSize = 0;
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      totalSize += getDirectorySize(itemPath);
    } else {
      totalSize += stats.size;
    }
  }
  
  return totalSize;
}

function formatSize(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

function analyzeDirectory(name, dirPath) {
  const size = getDirectorySize(dirPath);
  const exists = fs.existsSync(dirPath);
  
  console.log(`${exists ? '📁' : '❌'} ${name.padEnd(25)} ${exists ? formatSize(size) : '不存在'}`);
  return size;
}

// 分析主要目录
const directories = [
  ['.next', '.next'],
  ['TMDB-Import-master', 'TMDB-Import-master'],
  ['node_modules', 'node_modules'],
  ['public', 'public'],
  ['electron', 'electron'],
  ['components', 'components'],
  ['app', 'app'],
  ['lib', 'lib'],
  ['scripts', 'scripts'],
  ['data', 'data']
];

let totalSize = 0;

directories.forEach(([name, dirPath]) => {
  const size = analyzeDirectory(name, dirPath);
  totalSize += size;
});

console.log('\n' + '='.repeat(50));
console.log(`📊 总计大小: ${formatSize(totalSize)}`);

// 分析 .next 子目录
if (fs.existsSync('.next')) {
  
  const nextSubDirs = [
    ['standalone', '.next/standalone'],
    ['static', '.next/static'],
    ['server', '.next/server'],
    ['cache', '.next/cache'],
    ['trace', '.next/trace']
  ];
  
  nextSubDirs.forEach(([name, dirPath]) => {
    analyzeDirectory(`  ${name}`, dirPath);
  });
}

// 分析 TMDB-Import-master 子目录
if (fs.existsSync('TMDB-Import-master')) {
  
  const tmdbSubDirs = [
    ['tmdb-import', 'TMDB-Import-master/tmdb-import'],
    ['Browser', 'TMDB-Import-master/Browser'],
    ['Image', 'TMDB-Import-master/Image']
  ];
  
  tmdbSubDirs.forEach(([name, dirPath]) => {
    analyzeDirectory(`  ${name}`, dirPath);
  });
}

// 预估打包后大小

const nextSize = getDirectorySize('.next/standalone') + getDirectorySize('.next/static');
const electronSize = getDirectorySize('electron');
const publicSize = fs.existsSync('public/images/tmdb-helper-logo-new.png') ?
                   fs.statSync('public/images/tmdb-helper-logo-new.png').size : 0;

const estimatedSize = nextSize + electronSize + publicSize;

console.log(`📦 预估安装包大小: ${formatSize(estimatedSize)}`);

if (estimatedSize > 200 * 1024 * 1024) { // 200MB
  
} else if (estimatedSize > 100 * 1024 * 1024) { // 100MB
  
} else {
  
}
