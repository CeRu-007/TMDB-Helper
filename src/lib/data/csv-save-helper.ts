import axios from 'axios'
import path from 'path'
import { CSVData, parseCsvContent } from './csv-processor-client'
import { processOverviewColumn } from './csv-processor-client'

/**
 * 处理整个CSV数据中的overview列
 */
export function processOverviewData(data: CSVData): CSVData {
  if (!data || !data.headers || !data.rows) {
    return data
  }

  const overviewIndex = data.headers.findIndex((header: string) =>
    header.toLowerCase().includes('overview') ||
    header.toLowerCase().includes('描述') ||
    header.toLowerCase().includes('简介')
  )

  if (overviewIndex === -1) {
    return data
  }

  // 处理每一行的overview列
  const processedRows = data.rows.map((row: string[]) => {
    const newRow = [...row]
    if (newRow[overviewIndex]) {
      newRow[overviewIndex] = processOverviewColumn(newRow[overviewIndex])
    }
    return newRow
  })

  return {
    ...data,
    rows: processedRows
  }
}

/**
 * 处理保存错误
 */
export function handleSaveError(error: any, appendTerminalOutput: (text: string, type: any) => void, toast: any) {
  // 提供更友好的错误消息
  let errorMessage = error.message || '未知错误'
  let errorTitle = "保存失败"

  // 处理特定类型的错误
  if (errorMessage.includes('无法验证文件是否写入')) {
    errorMessage = '无法确认文件是否成功保存。请检查文件权限和磁盘空间。'
    errorTitle = "验证失败"
  } else if (errorMessage.includes('EACCES')) {
    errorMessage = '没有足够的权限写入文件。请检查文件权限设置。'
    errorTitle = "权限错误"
  } else if (errorMessage.includes('ENOSPC')) {
    errorMessage = '磁盘空间不足，无法保存文件。'
    errorTitle = "存储错误"
  }

  appendTerminalOutput(`保存CSV文件失败: ${errorMessage}`, "error")
  toast({
    title: errorTitle,
    description: errorMessage,
    variant: "destructive",
    duration: 5000,
  })
}

/**
 * 统一的CSV保存函数
 */
export async function saveCSV(options: {
  csvData: CSVData | null
  csvContent?: string
  editorMode?: "table" | "text"
  tmdbImportPath: string | null
  appendTerminalOutput: (text: string, type: any) => void
  toast: any
  onSuccess?: (message: string) => void
  showSuccessNotification?: boolean
  skipDataParsing?: boolean
}): Promise<boolean> {
  try {
    if (!options.csvData) {
      console.log('No CSV data available')
      options.toast({
        title: "错误",
        description: "没有CSV数据可保存",
        variant: "destructive",
      })
      return false
    }

    const saveMessage = options.editorMode === "table" ? "正在保存CSV文件..." : "正在保存文本内容..."
    options.appendTerminalOutput(saveMessage, "info")

    // 获取TMDB-Import工具路径
    const tmdbImportPath = options.tmdbImportPath
    if (!tmdbImportPath) {
      throw new Error("请先在设置中配置TMDB-Import工具路径")
    }

    const importCsvPath = path.join(tmdbImportPath, 'import.csv')

    // 处理数据准备
    let dataToSave = options.csvData
    if (options.editorMode === "text" && options.csvContent) {
      // 文本模式总是优先使用当前文本内容
      if (!options.skipDataParsing && options.csvContent !== undefined) {
        try {
          // 解析文本内容为CSV数据
          dataToSave = parseCsvContent(options.csvContent)
          options.appendTerminalOutput("成功解析文本内容为CSV数据", "success")
        } catch (error: any) {
          throw new Error(`CSV文本格式有误，无法解析: ${error instanceof Error ? error.message : '未知错误'}`)
        }
      } else if (options.csvContent === undefined || options.csvContent.trim() === '') {
        // 如果文本内容为空，使用原始数据
        options.appendTerminalOutput("文本内容为空，使用现有CSV数据", "warning")
      }
    }

    // 处理overview列，确保格式正确
    const processedData = processOverviewData(dataToSave)

    // 使用API路由保存CSV文件
    const response = await axios.post('/api/csv/save', {
      filePath: importCsvPath,
      data: processedData
    })

    console.log('Save response:', response.data)

    if (!response.data.success) {
      console.error('Save failed:', response.data)
      throw new Error(response.data.error || '保存CSV文件失败')
    }

    // 确保文件确实被写入
    const verifyResponse = await axios.post('/api/csv/verify', {
      filePath: importCsvPath
    })

    if (!verifyResponse.data.success || !verifyResponse.data.exists) {
      console.error('Verify failed:', verifyResponse.data)
      throw new Error('文件保存失败：无法验证文件是否写入')
    }

    options.appendTerminalOutput(`CSV文件已成功保存到 ${importCsvPath}`, "success")

    // 成功处理
    if (options.showSuccessNotification !== false) {
      options.toast({
        title: "保存成功",
        description: `CSV文件已保存到 ${importCsvPath}`,
      })
    }

    // 调用成功回调
    if (options.onSuccess) {
      options.onSuccess(`CSV文件已成功保存到 ${importCsvPath}`)
    }

    return true
  } catch (error: any) {
    console.error('Save error:', error)
    handleSaveError(error, options.appendTerminalOutput, options.toast)
    console.log('Returning false')
    return false
  }
}