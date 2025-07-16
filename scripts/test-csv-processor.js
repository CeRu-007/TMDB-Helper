/**
 * 测试强化CSV处理器的脚本
 */

const fs = require('fs')
const path = require('path')

// 模拟TypeScript的导入（在Node.js环境中）
function parseCSVRobust(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '')
  
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  // 解析第一行作为标题
  const headers = parseCSVLineRobust(lines[0])
  console.log('解析到的标题:', headers)
  
  // 解析数据行
  const rows = []
  
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLineRobust(lines[i])
    
    // 验证行的字段数量
    if (row.length !== headers.length) {
      console.warn(`第${i+1}行字段数量不匹配: 期望${headers.length}个，实际${row.length}个`)
      console.warn('行内容:', lines[i])
      console.warn('解析结果:', row)
      
      // 尝试修复：补齐缺失字段或截断多余字段
      while (row.length < headers.length) {
        row.push('')
      }
      if (row.length > headers.length) {
        row.splice(headers.length)
      }
    }
    
    rows.push(row)
  }
  
  console.log(`成功解析CSV: ${headers.length}列, ${rows.length}行`)
  return { headers, rows }
}

function parseCSVLineRobust(line) {
  const fields = []
  let currentField = ''
  let inQuotes = false
  let i = 0
  
  while (i < line.length) {
    const char = line[i]
    const nextChar = i + 1 < line.length ? line[i + 1] : null
    
    if (char === '"') {
      if (inQuotes) {
        // 在引号内
        if (nextChar === '"') {
          // 转义的引号 ""
          currentField += '"'
          i += 2 // 跳过两个引号
          continue
        } else {
          // 引号结束
          inQuotes = false
        }
      } else {
        // 引号开始
        inQuotes = true
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符（不在引号内）
      fields.push(currentField.trim())
      currentField = ''
    } else {
      // 普通字符
      currentField += char
    }
    
    i++
  }
  
  // 添加最后一个字段
  fields.push(currentField.trim())
  
  return fields
}

function generateCSVRobust(data) {
  const lines = []
  
  // 添加标题行
  lines.push(data.headers.map(escapeCSVField).join(','))
  
  // 添加数据行
  data.rows.forEach(row => {
    lines.push(row.map(escapeCSVField).join(','))
  })
  
  return lines.join('\n')
}

function escapeCSVField(field) {
  if (field === null || field === undefined) {
    return ''
  }
  
  const fieldStr = String(field)
  
  // 检查是否需要引号包围
  const needsQuotes = fieldStr.includes(',') || 
                     fieldStr.includes('"') || 
                     fieldStr.includes('\n') || 
                     fieldStr.includes('\r') ||
                     fieldStr.startsWith(' ') ||
                     fieldStr.endsWith(' ')
  
  if (needsQuotes) {
    // 转义内部引号并用引号包围
    return '"' + fieldStr.replace(/"/g, '""') + '"'
  }
  
  return fieldStr
}

function deleteEpisodesByNumbers(data, episodesToDelete) {
  console.log('开始删除剧集:', episodesToDelete)
  console.log('原始数据行数:', data.rows.length)
  
  // 找到episode_number列的索引
  const episodeColumnIndex = data.headers.findIndex(header => 
    header.toLowerCase().includes('episode') || header.includes('剧集')
  )
  
  if (episodeColumnIndex === -1) {
    console.error('未找到剧集编号列')
    return data
  }
  
  console.log('剧集编号列索引:', episodeColumnIndex)
  
  // 创建要删除的剧集编号集合
  const episodesToDeleteSet = new Set(episodesToDelete.map(ep => String(ep)))
  
  // 过滤行
  const filteredRows = data.rows.filter((row, index) => {
    const episodeNumber = row[episodeColumnIndex]?.trim()
    const shouldDelete = episodesToDeleteSet.has(episodeNumber)
    
    if (shouldDelete) {
      console.log(`删除第${index + 1}行，剧集编号: ${episodeNumber}`)
    }
    
    return !shouldDelete
  })
  
  console.log('删除后剩余行数:', filteredRows.length)
  console.log('实际删除行数:', data.rows.length - filteredRows.length)
  
  return {
    headers: [...data.headers],
    rows: filteredRows
  }
}

// 主测试函数
async function testCSVProcessor() {
  try {
    console.log('=== 开始测试强化CSV处理器 ===\n')
    
    // 读取原始备份文件
    const backupPath = path.join(__dirname, '../TMDB-Import-master/import_backup_1752627320941.csv')
    const originalContent = fs.readFileSync(backupPath, 'utf-8')
    
    console.log('1. 解析原始CSV文件...')
    const originalData = parseCSVRobust(originalContent)
    
    console.log('\n2. 原始数据统计:')
    console.log(`- 标题: ${originalData.headers.join(', ')}`)
    console.log(`- 行数: ${originalData.rows.length}`)
    console.log(`- 列数: ${originalData.headers.length}`)
    
    // 显示前几行数据
    console.log('\n3. 前3行数据预览:')
    originalData.rows.slice(0, 3).forEach((row, index) => {
      console.log(`第${index + 1}行:`)
      row.forEach((cell, cellIndex) => {
        console.log(`  ${originalData.headers[cellIndex]}: ${cell.substring(0, 50)}${cell.length > 50 ? '...' : ''}`)
      })
      console.log('')
    })
    
    console.log('\n4. 测试删除剧集 1, 2, 3, 4, 5, 6, 7, 8...')
    const episodesToDelete = [1, 2, 3, 4, 5, 6, 7, 8]
    const filteredData = deleteEpisodesByNumbers(originalData, episodesToDelete)
    
    console.log('\n5. 删除后数据统计:')
    console.log(`- 剩余行数: ${filteredData.rows.length}`)
    console.log('- 剩余剧集编号:', filteredData.rows.map(row => row[0]).join(', '))
    
    console.log('\n6. 生成新的CSV内容...')
    const newCSVContent = generateCSVRobust(filteredData)
    
    console.log('\n7. 保存测试结果...')
    const outputPath = path.join(__dirname, '../TMDB-Import-master/import_test_result.csv')
    fs.writeFileSync(outputPath, newCSVContent, 'utf-8')
    
    console.log(`\n✅ 测试完成！结果已保存到: ${outputPath}`)
    console.log('\n=== 测试总结 ===')
    console.log(`原始行数: ${originalData.rows.length}`)
    console.log(`删除行数: ${episodesToDelete.length}`)
    console.log(`剩余行数: ${filteredData.rows.length}`)
    console.log(`预期剩余: ${originalData.rows.length - episodesToDelete.length}`)
    console.log(`结果正确: ${filteredData.rows.length === (originalData.rows.length - episodesToDelete.length) ? '✅' : '❌'}`)
    
  } catch (error) {
    console.error('测试失败:', error)
  }
}

// 运行测试
testCSVProcessor()