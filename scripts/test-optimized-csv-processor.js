/**
 * 测试优化后的强化CSV处理器
 */

const fs = require('fs')
const path = require('path')

// 模拟优化后的强化CSV处理器
function parseCSVWithStateMachine(csvContent) {
  const result = []
  let currentRow = []
  let currentField = ''
  let inQuotes = false
  let i = 0
  
  while (i < csvContent.length) {
    const char = csvContent[i]
    const nextChar = i + 1 < csvContent.length ? csvContent[i + 1] : null
    
    if (char === '"') {
      if (inQuotes) {
        // 在引号内
        if (nextChar === '"') {
          // 转义的引号 ""
          currentField += '"'
          i += 2
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
      currentRow.push(currentField.trim())
      currentField = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // 行结束（不在引号内）
      if (currentField.trim() !== '' || currentRow.length > 0) {
        currentRow.push(currentField.trim())
        if (currentRow.some(field => field !== '')) {
          result.push(currentRow)
        }
        currentRow = []
        currentField = ''
      }
      
      // 跳过 \r\n 组合
      if (char === '\r' && nextChar === '\n') {
        i++
      }
    } else if (char === '\r' && nextChar === '\n') {
      // 跳过单独的 \r（已在上面处理）
    } else {
      // 普通字符（包括引号内的换行符）
      if (char === '\n' && inQuotes) {
        // 引号内的换行符转换为空格
        currentField += ' '
      } else if (char === '\r' && inQuotes) {
        // 引号内的回车符转换为空格
        currentField += ' '
      } else {
        currentField += char
      }
    }
    
    i++
  }
  
  // 处理最后一个字段和行
  if (currentField.trim() !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.some(field => field !== '')) {
      result.push(currentRow)
    }
  }
  
  console.log(`状态机解析完成，共解析出 ${result.length} 行`)
  return result
}

function parseCSVRobust(csvContent) {
  console.log('开始强化CSV解析，内容长度:', csvContent.length)
  
  // 使用状态机方法解析整个CSV内容
  const result = parseCSVWithStateMachine(csvContent)
  
  if (result.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = result[0]
  const rows = result.slice(1)
  
  console.log('解析到的标题:', headers)
  console.log(`成功解析CSV: ${headers.length}列, ${rows.length}行`)
  
  // 验证和修复行数据
  const validatedRows = []
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    
    if (row.length !== headers.length) {
      console.warn(`第${i+2}行字段数量不匹配: 期望${headers.length}个，实际${row.length}个`)
      
      // 尝试修复：补齐缺失字段或截断多余字段
      const fixedRow = [...row]
      while (fixedRow.length < headers.length) {
        fixedRow.push('')
      }
      if (fixedRow.length > headers.length) {
        fixedRow.splice(headers.length)
      }
      validatedRows.push(fixedRow)
      console.log(`已修复第${i+2}行字段数量`)
    } else {
      validatedRows.push(row)
    }
  }
  
  return { headers, rows: validatedRows }
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

function generateCSV(data) {
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

async function testOptimizedProcessor() {
  try {
    console.log('=== 测试优化后的强化CSV处理器 ===\n')
    
    // 测试1: 使用完整的备份文件
    console.log('测试1: 处理完整的备份文件')
    const backupPath = path.join(__dirname, '../TMDB-Import-master/import_backup_1752635032809.csv')
    const backupContent = fs.readFileSync(backupPath, 'utf-8')
    
    console.log('备份文件大小:', backupContent.length, '字符')
    
    const parsedData = parseCSVRobust(backupContent)
    console.log('解析结果:', `${parsedData.headers.length}列, ${parsedData.rows.length}行`)
    
    // 删除1-8集
    const episodesToDelete = [1, 2, 3, 4, 5, 6, 7, 8]
    const filteredData = deleteEpisodesByNumbers(parsedData, episodesToDelete)
    
    console.log('删除后结果:', `${filteredData.rows.length}行`)
    console.log('剩余剧集:', filteredData.rows.map(row => row[0]).join(', '))
    
    // 生成新的CSV
    const newCSV = generateCSV(filteredData)
    
    // 保存测试结果
    const testOutputPath = path.join(__dirname, '../TMDB-Import-master/import_test_optimized.csv')
    fs.writeFileSync(testOutputPath, newCSV, 'utf-8')
    
    console.log('✅ 测试1完成，结果保存到:', testOutputPath)
    
    // 测试2: 处理当前损坏的文件（如果存在）
    console.log('\n测试2: 处理当前的import.csv文件')
    const currentPath = path.join(__dirname, '../TMDB-Import-master/import.csv')
    
    if (fs.existsSync(currentPath)) {
      const currentContent = fs.readFileSync(currentPath, 'utf-8')
      console.log('当前文件大小:', currentContent.length, '字符')
      
      try {
        const currentParsed = parseCSVRobust(currentContent)
        console.log('当前文件解析结果:', `${currentParsed.headers.length}列, ${currentParsed.rows.length}行`)
        
        // 显示前几行数据
        console.log('前3行数据:')
        currentParsed.rows.slice(0, 3).forEach((row, index) => {
          console.log(`第${index + 1}行: 集数=${row[0]}, 标题=${row[1]?.substring(0, 30)}...`)
        })
        
      } catch (error) {
        console.error('解析当前文件失败:', error.message)
      }
    }
    
    console.log('\n🎉 优化后的处理器测试完成！')
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

// 运行测试
testOptimizedProcessor()