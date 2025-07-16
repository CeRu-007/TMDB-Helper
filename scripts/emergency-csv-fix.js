/**
 * 紧急CSV修复脚本
 * 直接修复损坏的CSV文件
 */

const fs = require('fs')
const path = require('path')

/**
 * 强化的CSV解析器
 */
function parseCSVRobust(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '')
  
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  // 解析第一行作为标题
  const headers = parseCSVLineRobust(lines[0])
  console.log('解析到的标题:', headers)
  
  // 修复和解析数据行
  const repairedRows = []
  let currentRow = ''
  let lineIndex = 1
  
  while (lineIndex < lines.length) {
    const line = lines[lineIndex].trim()
    
    if (line === '') {
      lineIndex++
      continue
    }
    
    if (currentRow === '') {
      currentRow = line
    } else {
      currentRow += ' ' + line
    }
    
    const testFields = parseCSVLineRobust(currentRow)
    
    if (testFields.length === headers.length) {
      repairedRows.push(testFields)
      console.log(`修复第${repairedRows.length}行: ${testFields[0]} - ${testFields[1]}`)
      currentRow = ''
    } else if (testFields.length > headers.length) {
      // 尝试分割行
      const splitResult = findNextLineStart(currentRow, headers.length)
      if (splitResult) {
        const currentFields = parseCSVLineRobust(splitResult.currentRow)
        if (currentFields.length === headers.length) {
          repairedRows.push(currentFields)
          console.log(`修复第${repairedRows.length}行: ${currentFields[0]} - ${currentFields[1]}`)
          currentRow = splitResult.nextRow
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
 * 解析CSV行
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
 * 寻找下一行的开始
 */
function findNextLineStart(line, expectedFields) {
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
 * 主修复函数
 */
async function emergencyFix() {
  try {
    console.log('=== 紧急CSV修复开始 ===\n')
    
    // 检查当前import.csv的状态
    const importPath = path.join(__dirname, '../TMDB-Import-master/import.csv')
    const backupPath = path.join(__dirname, '../TMDB-Import-master/import_backup_1752635032809.csv')
    
    console.log('检查文件状态...')
    console.log('import.csv路径:', importPath)
    console.log('备份文件路径:', backupPath)
    
    // 检查备份文件是否存在
    if (!fs.existsSync(backupPath)) {
      console.error('❌ 备份文件不存在:', backupPath)
      return
    }
    
    // 读取备份文件（完整数据）
    const backupContent = fs.readFileSync(backupPath, 'utf-8')
    console.log('✅ 成功读取备份文件')
    
    // 使用强化解析器修复CSV结构
    console.log('\n1. 修复CSV结构...')
    const repairedData = parseCSVRobust(backupContent)
    
    // 删除指定剧集（1-8集）
    console.log('\n2. 删除指定剧集...')
    const episodesToDelete = [1, 2, 3, 4, 5, 6, 7, 8]
    const filteredData = deleteEpisodes(repairedData, episodesToDelete)
    
    // 生成最终CSV内容
    console.log('\n3. 生成最终CSV内容...')
    const finalContent = generateCSV(filteredData)
    
    // 创建新的备份（当前损坏的文件）
    const damagedBackupPath = path.join(__dirname, '../TMDB-Import-master/import_damaged_backup.csv')
    if (fs.existsSync(importPath)) {
      const currentContent = fs.readFileSync(importPath, 'utf-8')
      fs.writeFileSync(damagedBackupPath, currentContent, 'utf-8')
      console.log('✅ 已备份当前损坏的文件:', damagedBackupPath)
    }
    
    // 覆盖import.csv
    console.log('\n4. 覆盖import.csv文件...')
    fs.writeFileSync(importPath, finalContent, 'utf-8')
    console.log('✅ 已覆盖import.csv文件')
    
    // 验证修复结果
    console.log('\n5. 验证修复结果...')
    const verifyContent = fs.readFileSync(importPath, 'utf-8')
    const verifyLines = verifyContent.split('\n').filter(line => line.trim() !== '')
    
    console.log('验证结果:')
    console.log('- 总行数:', verifyLines.length)
    console.log('- 数据行数:', verifyLines.length - 1)
    console.log('- 前2行预览:')
    verifyLines.slice(0, 2).forEach((line, index) => {
      console.log(`  第${index + 1}行: ${line.substring(0, 100)}...`)
    })
    
    console.log('\n🎉 紧急修复完成！')
    console.log('统计信息:')
    console.log(`- 原始行数: ${repairedData.rows.length}`)
    console.log(`- 删除剧集: ${episodesToDelete.join(', ')}`)
    console.log(`- 剩余行数: ${filteredData.rows.length}`)
    console.log(`- 剩余剧集: ${filteredData.rows.map(row => row[0]).join(', ')}`)
    
  } catch (error) {
    console.error('❌ 紧急修复失败:', error)
  }
}

// 运行紧急修复
emergencyFix()