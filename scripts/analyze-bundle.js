#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundleSize() {
  const distPath = path.join(process.cwd(), 'dist');
  
  if (!fs.existsSync(distPath)) {
    colorLog('red', '❌ 构建目录不存在，请先运行 npm run build');
    return;
  }

  colorLog('cyan', '📊 分析Bundle大小...');
  
  const jsFiles = [];
  const cssFiles = [];
  const assetFiles = [];
  
  function scanDirectory(dir, relativePath = '') {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      const relativeFilePath = path.join(relativePath, file);
      
      if (stat.isDirectory()) {
        scanDirectory(filePath, relativeFilePath);
      } else {
        const ext = path.extname(file).toLowerCase();
        const size = stat.size;
        
        const fileInfo = {
          name: file,
          path: relativeFilePath,
          size,
          sizeFormatted: formatBytes(size),
        };
        
        if (ext === '.js') {
          jsFiles.push(fileInfo);
        } else if (ext === '.css') {
          cssFiles.push(fileInfo);
        } else {
          assetFiles.push(fileInfo);
        }
      }
    });
  }
  
  scanDirectory(distPath);
  
  // 排序
  jsFiles.sort((a, b) => b.size - a.size);
  cssFiles.sort((a, b) => b.size - a.size);
  assetFiles.sort((a, b) => b.size - a.size);
  
  // 计算总大小
  const totalJsSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
  const totalCssSize = cssFiles.reduce((sum, file) => sum + file.size, 0);
  const totalAssetSize = assetFiles.reduce((sum, file) => sum + file.size, 0);
  const totalSize = totalJsSize + totalCssSize + totalAssetSize;
  
  // 输出结果
  colorLog('bright', '\n📈 Bundle 分析结果');
  colorLog('bright', '='.repeat(50));
  
  colorLog('yellow', `\n📦 总大小: ${formatBytes(totalSize)}`);
  colorLog('blue', `🟦 JavaScript: ${formatBytes(totalJsSize)} (${((totalJsSize / totalSize) * 100).toFixed(1)}%)`);
  colorLog('green', `🟩 CSS: ${formatBytes(totalCssSize)} (${((totalCssSize / totalSize) * 100).toFixed(1)}%)`);
  colorLog('magenta', `🟪 Assets: ${formatBytes(totalAssetSize)} (${((totalAssetSize / totalSize) * 100).toFixed(1)}%)`);
  
  // JavaScript 文件详情
  if (jsFiles.length > 0) {
    colorLog('blue', '\n🟦 JavaScript 文件:');
    jsFiles.forEach((file, index) => {
      const icon = index === 0 ? '🔥' : index < 3 ? '📄' : '📃';
      console.log(`  ${icon} ${file.name.padEnd(30)} ${file.sizeFormatted.padStart(10)}`);
    });
  }
  
  // CSS 文件详情
  if (cssFiles.length > 0) {
    colorLog('green', '\n🟩 CSS 文件:');
    cssFiles.forEach((file, index) => {
      const icon = index === 0 ? '🔥' : '🎨';
      console.log(`  ${icon} ${file.name.padEnd(30)} ${file.sizeFormatted.padStart(10)}`);
    });
  }
  
  // 大文件警告
  const largeFiles = [...jsFiles, ...cssFiles].filter(file => file.size > 500 * 1024); // 500KB
  if (largeFiles.length > 0) {
    colorLog('red', '\n⚠️  大文件警告 (>500KB):');
    largeFiles.forEach(file => {
      console.log(`  🚨 ${file.name} - ${file.sizeFormatted}`);
    });
  }
  
  // 性能建议
  colorLog('cyan', '\n💡 性能优化建议:');
  
  if (totalJsSize > 1024 * 1024) { // 1MB
    console.log('  📦 考虑进一步拆分JavaScript包');
  }
  
  if (jsFiles.length > 10) {
    console.log('  🔄 JavaScript文件过多，考虑合并小文件');
  }
  
  if (totalSize > 5 * 1024 * 1024) { // 5MB
    console.log('  ⚡ 总包大小较大，建议启用Gzip压缩');
  }
  
  const vendorFiles = jsFiles.filter(file => file.name.includes('vendor'));
  if (vendorFiles.length === 0) {
    console.log('  📚 建议将第三方库单独打包为vendor chunk');
  }
  
  console.log('');
}

function runBundleAnalyzer() {
  try {
    colorLog('cyan', '🚀 启动Bundle分析器...');
    
    // 设置环境变量启用分析器
    process.env.ANALYZE = 'true';
    
    // 运行构建命令
    execSync('npm run build', { 
      stdio: 'inherit',
      env: { ...process.env, ANALYZE: 'true' }
    });
    
    colorLog('green', '✅ Bundle分析器已启动，查看浏览器中的分析报告');
  } catch (error) {
    colorLog('red', '❌ Bundle分析器启动失败:');
    console.error(error.message);
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'size':
    case 's':
      analyzeBundleSize();
      break;
    case 'analyze':
    case 'a':
      runBundleAnalyzer();
      break;
    case 'help':
    case 'h':
    default:
      colorLog('bright', '📊 Bundle 分析工具');
      colorLog('bright', '='.repeat(30));
      console.log('');
      console.log('使用方法:');
      console.log('  node scripts/analyze-bundle.js <command>');
      console.log('');
      console.log('命令:');
      console.log('  size, s      分析构建后的文件大小');
      console.log('  analyze, a   启动可视化Bundle分析器');
      console.log('  help, h      显示帮助信息');
      console.log('');
      console.log('示例:');
      console.log('  npm run analyze:size     # 分析文件大小');
      console.log('  npm run analyze:bundle   # 启动可视化分析器');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeBundleSize,
  runBundleAnalyzer,
};