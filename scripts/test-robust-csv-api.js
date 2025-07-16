/**
 * 测试强化CSV处理API的脚本
 */

const fs = require('fs')
const path = require('path')

async function testRobustCSVAPI() {
  try {
    console.log('=== 测试强化CSV处理API ===\n')
    
    // 使用当前的备份文件路径
    const csvPath = path.resolve(__dirname, '../TMDB-Import-master/import_backup_1752629372534.csv')
    console.log('测试CSV文件:', csvPath)
    
    // 检查文件是否存在
    if (!fs.existsSync(csvPath)) {
      console.error('❌ 测试文件不存在:', csvPath)
      return
    }
    
    console.log('✅ 测试文件存在')
    
    // 准备API请求数据
    const requestData = {
      csvPath: csvPath,
      markedEpisodes: [1, 2, 3, 4, 5, 6, 7, 8],
      platformUrl: 'https://example.com', // 非爱奇艺平台
      itemId: 'test-item-id',
      itemTitle: '测试项目',
      testMode: false,
      enableYoukuSpecialHandling: true, // 启用强化处理
      enableTitleCleaning: true
    }
    
    console.log('请求数据:', {
      csvPath: requestData.csvPath,
      markedEpisodes: requestData.markedEpisodes,
      platformUrl: requestData.platformUrl,
      enableYoukuSpecialHandling: requestData.enableYoukuSpecialHandling
    })
    
    // 发送API请求
    console.log('\n发送API请求...')
    const response = await fetch('http://localhost:3000/api/process-csv-episodes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    })
    
    console.log('响应状态:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API请求失败:', errorText)
      return
    }
    
    const result = await response.json()
    console.log('\n✅ API响应成功:')
    console.log('- 处理方法:', result.processingMethod)
    console.log('- 删除的剧集:', result.removedEpisodes)
    console.log('- 原始行数:', result.originalRowCount)
    console.log('- 处理后行数:', result.processedRowCount)
    console.log('- 备份文件:', result.backupCsvPath)
    console.log('- 处理策略:', result.strategy)
    console.log('- 消息:', result.message)
    
    // 验证处理结果
    if (result.processingMethod === 'robust') {
      console.log('\n🎉 强化CSV处理器正常工作！')
    } else {
      console.log('\n⚠️  使用了传统处理器，可能强化处理器有问题')
    }
    
    // 检查处理后的文件
    if (result.processedCsvPath && fs.existsSync(result.processedCsvPath)) {
      const processedContent = fs.readFileSync(result.processedCsvPath, 'utf-8')
      const lines = processedContent.split('\n').filter(line => line.trim() !== '')
      console.log('\n处理后文件验证:')
      console.log('- 文件存在: ✅')
      console.log('- 总行数:', lines.length)
      console.log('- 数据行数:', lines.length - 1)
      
      if (lines.length > 1) {
        console.log('- 前2行预览:')
        lines.slice(0, 2).forEach((line, index) => {
          console.log(`  第${index + 1}行: ${line.substring(0, 100)}...`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    console.error('详细错误:', error)
  }
}

// 运行测试
testRobustCSVAPI()