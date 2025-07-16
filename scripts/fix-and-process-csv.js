/**
 * 修复并处理损坏的CSV文件
 * 专门处理包含换行符和复杂中文内容的CSV
 */

const fs = require('fs')
const path = require('path')

/**
 * 智能CSV修复器
 * 处理包含换行符的CSV文件
 */
function repairAndParseCSV(csvContent) {
  console.log('开始修复CSV文件...')
  
  // 首先尝试识别正确的行结构
  const lines = csvContent.split('\n')
  const headers = parseCSVLineRobust(lines[0])
  console.log('标题行:', headers)
  console.log('期望字段数:', headers.length)
  
  const repairedRows = []
  let currentRow = ''
  let fieldCount = 0
  let inQuotes = false
  let lineIndex = 1
  
  // 逐行处理，合并被错误分割的行
  while (lineIndex < lines.length) {
    const line = lines[lineIndex].trim()
    
    if (line === '') {
      lineIndex++
      continue
    }
    
    // 如果当前行为空，开始新行
    if (currentRow === '') {
      currentRow = line
    } else {
      // 合并到当前行
      currentRow += ' ' + line
    }
    
    // 检查当前行是否完整
    const testFields = parseCSVLineRobust(currentRow)
    
    if (testFields.length === headers.length) {
      // 行完整，添加到结果
      repairedRows.push(testFields)
      console.log(`修复第${repairedRows.length}行: ${testFields[0]} - ${testFields[1]}`)
      currentRow = ''
    } else if (testFields.length > headers.length) {
      // 字段过多，可能是下一行的开始
      // 尝试分割
      const possibleNextLineStart = findNextLineStart(currentRow, headers.length)
      if (possibleNextLineStart) {
        const currentRowPart = possibleNextLineStart.currentRow
        const nextRowPart = possibleNextLineStart.nextRow
        
        const currentFields = parseCSVLineRobust(currentRowPart)
        if (currentFields.length === headers.length) {
          repairedRows.push(currentFields)
          console.log(`修复第${repairedRows.length}行: ${currentFields[0]} - ${currentFields[1]}`)
          currentRow = nextRowPart
        } else {
          currentRow = ''
        }
      } else {
        currentRow = ''
      }
    }
    
    lineIndex++
  }
  
  // 处理最后一行
  if (currentRow !== '') {
    const finalFields = parseCSVLineRobust(currentRow)
    if (finalFields.length === headers.length) {
      repairedRows.push(finalFields)
      console.log(`修复第${repairedRows.length}行: ${finalFields[0]} - ${finalFields[1]}`)
    }
  }
  
  console.log(`修复完成: ${repairedRows.length}行数据`)
  return { headers, rows: repairedRows }
}

/**
 * 尝试找到下一行的开始位置
 */
function findNextLineStart(line, expectedFields) {
  // 简单策略：寻找数字开头的模式（剧集编号）
  const matches = line.match(/^(.*?)(\d+,[^,]+,\d{4}-\d{2}-\d{2},.*)$/)
  if (matches) {
    return {
      currentRow: matches[1].trim().replace(/,$/, ''),
      nextRow: matches[2]
    }
  }
  return null
}

/**
 * 强化的CSV行解析器
 */
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
        if (nextChar === '"') {
          currentField += '"'
          i += 2
          continue
        } else {
          inQuotes = false
        }
      } else {
        inQuotes = true
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField.trim())
      currentField = ''
    } else {
      currentField += char
    }
    
    i++
  }
  
  fields.push(currentField.trim())
  return fields
}

/**
 * 生成CSV内容
 */
function generateCSV(data) {
  const lines = []
  lines.push(data.headers.map(escapeCSVField).join(','))
  data.rows.forEach(row => {
    lines.push(row.map(escapeCSVField).join(','))
  })
  return lines.join('\n')
}

/**
 * 转义CSV字段
 */
function escapeCSVField(field) {
  if (field === null || field === undefined) {
    return ''
  }
  
  const fieldStr = String(field)
  const needsQuotes = fieldStr.includes(',') || 
                     fieldStr.includes('"') || 
                     fieldStr.includes('\n') || 
                     fieldStr.includes('\r') ||
                     fieldStr.startsWith(' ') ||
                     fieldStr.endsWith(' ')
  
  if (needsQuotes) {
    return '"' + fieldStr.replace(/"/g, '""') + '"'
  }
  
  return fieldStr
}

/**
 * 删除指定剧集
 */
function deleteEpisodes(data, episodesToDelete) {
  console.log('删除剧集:', episodesToDelete)
  
  const episodeColumnIndex = data.headers.findIndex(header => 
    header.toLowerCase().includes('episode') || header.includes('剧集')
  )
  
  if (episodeColumnIndex === -1) {
    console.error('未找到剧集编号列')
    return data
  }
  
  const episodesToDeleteSet = new Set(episodesToDelete.map(ep => String(ep)))
  
  const filteredRows = data.rows.filter((row, index) => {
    const episodeNumber = row[episodeColumnIndex]?.trim()
    const shouldDelete = episodesToDeleteSet.has(episodeNumber)
    
    if (shouldDelete) {
      console.log(`删除: 第${episodeNumber}集 - ${row[1]}`)
    }
    
    return !shouldDelete
  })
  
  console.log(`删除完成: 原${data.rows.length}行，现${filteredRows.length}行`)
  
  return {
    headers: [...data.headers],
    rows: filteredRows
  }
}

/**
 * 主处理函数
 */
async function main() {
  try {
    console.log('=== 开始修复和处理CSV文件 ===\n')
    
    // 读取原始文件
    const backupPath = path.join(__dirname, '../TMDB-Import-master/import_backup_1752629372534.csv')
    const originalContent = fs.readFileSync(backupPath, 'utf-8')
    
    console.log('1. 修复CSV结构...')
    const repairedData = repairAndParseCSV(originalContent)
    
    console.log('\n2. 保存修复后的完整文件...')
    const repairedCSV = generateCSV(repairedData)
    const repairedPath = path.join(__dirname, '../TMDB-Import-master/import_repaired.csv')
    fs.writeFileSync(repairedPath, repairedCSV, 'utf-8')
    console.log(`修复后的完整文件已保存: ${repairedPath}`)
    
    console.log('\n3. 删除指定剧集...')
    const episodesToDelete = [1, 2, 3, 4, 5, 6, 7, 8]
    const filteredData = deleteEpisodes(repairedData, episodesToDelete)
    
    console.log('\n4. 生成最终文件...')
    const finalCSV = generateCSV(filteredData)
    const finalPath = path.join(__dirname, '../TMDB-Import-master/import_final.csv')
    fs.writeFileSync(finalPath, finalCSV, 'utf-8')
    
    console.log(`\n✅ 处理完成！`)
    console.log(`修复后完整文件: ${repairedPath}`)
    console.log(`删除剧集后文件: ${finalPath}`)
    console.log(`\n统计信息:`)
    console.log(`- 原始行数: ${repairedData.rows.length}`)
    console.log(`- 删除剧集: ${episodesToDelete.join(', ')}`)
    console.log(`- 剩余行数: ${filteredData.rows.length}`)
    console.log(`- 剩余剧集: ${filteredData.rows.map(row => row[0]).join(', ')}`)
    
  } catch (error) {
    console.error('处理失败:', error)
  }
}

// 运行主函数
main()