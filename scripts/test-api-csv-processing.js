/**
 * 测试API CSV处理功能
 */

const fs = require('fs')
const path = require('path')

async function testAPICSVProcessing() {
  try {
    console.log('=== 测试API CSV处理功能 ===\n')
    
    // 检查测试文件
    const testCsvPath = path.resolve(__dirname, '../TMDB-Import-master/import_backup_1752629372534.csv')
    
    if (!fs.existsSync(testCsvPath)) {
      console.error('❌ 测试文件不存在:', testCsvPath)
      return
    }
    
    console.log('✅ 测试文件存在:', testCsvPath)
    
    // 准备测试数据
    const requestData = {
      csvPath: testCsvPath,
      markedEpisodes: [1, 2, 3, 4, 5, 6, 7, 8],
      platformUrl: 'https://example.com', // 非爱奇艺平台
      itemId: 'test-item-id',
      itemTitle: '测试项目',
      testMode: false, // 实际处理
      enableYoukuSpecialHandling: true, // 启用强化处理
      enableTitleCleaning: true
    }
    
    console.log('请求参数:')
    console.log('- CSV路径:', requestData.csvPath)
    console.log('- 删除集数:', requestData.markedEpisodes)
    console.log('- 强化处理:', requestData.enableYoukuSpecialHandling)
    console.log('- 平台URL:', requestData.platformUrl)
    
    // 发送API请求
    console.log('\n🚀 发送API请求...')
    
    const response = await fetch('http://localhost:3000/api/process-csv-episodes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    })
    
    console.log('响应状态:', response.status, response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API请求失败:')
      console.error(errorText)
      return
    }
    
    const result = await response.json()
    
    console.log('\n✅ API响应成功!')
    console.log('响应数据:')
    console.log('- 处理成功:', result.success)
    console.log('- 处理方法:', result.processingMethod)
    console.log('- 删除的集数:', result.removedEpisodes)
    console.log('- 原始行数:', result.originalRowCount)
    console.log('- 处理后行数:', result.processedRowCount)
    console.log('- 处理策略:', result.strategy)
    console.log('- 备份文件:', result.backupCsvPath)
    console.log('- 消息:', result.message)
    
    // 验证处理结果
    if (result.success) {
      console.log('\n🎉 CSV处理成功!')
      
      if (result.processingMethod === 'robust') {
        console.log('✅ 使用了强化处理器')
      } else {
        console.log('⚠️  使用了传统处理器')
      }
      
      // 检查处理后的文件
      if (result.processedCsvPath && fs.existsSync(result.processedCsvPath)) {
        const processedContent = fs.readFileSync(result.processedCsvPath, 'utf-8')
        const lines = processedContent.split('\n').filter(line => line.trim() !== '')
        
        console.log('\n📄 处理后文件验证:')
        console.log('- 文件存在: ✅')
        console.log('- 总行数:', lines.length)
        console.log('- 数据行数:', lines.length - 1)
        
        if (lines.length > 1) {
          console.log('- 剩余集数预览:')
          lines.slice(1, 3).forEach((line, index) => {
            const columns = line.split(',')
            const episodeNum = columns[0]
            const episodeName = columns[1]
            console.log(`  第${episodeNum}集: ${episodeName}`)
          })
        }
        
        // 验证是否正确删除了指定集数
        const remainingEpisodes = lines.slice(1).map(line => {
          const columns = line.split(',')
          return parseInt(columns[0])
        }).filter(num => !isNaN(num))
        
        console.log('- 剩余集数:', remainingEpisodes.join(', '))
        
        const deletedEpisodes = requestData.markedEpisodes
        const hasDeletedEpisodes = deletedEpisodes.some(ep => remainingEpisodes.includes(ep))
        
        if (!hasDeletedEpisodes) {
          console.log('✅ 指定集数已正确删除')
        } else {
          console.log('❌ 部分指定集数未被删除')
        }
      }
    } else {
      console.log('❌ CSV处理失败:', result.error)
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    if (error.code === 'ECONNREFUSED') {
      console.error('提示: 请确保开发服务器正在运行 (npm run dev)')
    }
  }
}

// 运行测试
testAPICSVProcessing()