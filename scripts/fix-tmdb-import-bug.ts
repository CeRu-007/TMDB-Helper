/**
 * 自动修复TMDB-Import中的episode.name为None的类型错误
 *
 * 这个脚本会自动查找并修复common.py文件中的filter_by_name函数
 * 将 "if word and word in episode.name:" 修改为 "if word and episode.name and word in episode.name:"
 */

import fs from "fs"
import path from "path"

export async function fixTMDBImportBug(tmdbImportPath: string): Promise<{
  success: boolean
  message: string
  originalLine?: string
  fixedLine?: string
  filePath?: string
}> {
  try {
    // 检查路径是否存在
    if (!fs.existsSync(tmdbImportPath)) {
      return {
        success: false,
        message: `路径不存在: ${tmdbImportPath}`,
      }
    }

    // 查找common.py文件
    let commonPyPath = ""

    // 检查直接路径
    const directPath = path.join(tmdbImportPath, "common.py")
    if (fs.existsSync(directPath)) {
      commonPyPath = directPath
    }

    // 检查tmdb-import子目录
    const subDirPath = path.join(tmdbImportPath, "tmdb-import", "common.py")
    if (!commonPyPath && fs.existsSync(subDirPath)) {
      commonPyPath = subDirPath
    }

    // 如果找不到文件
    if (!commonPyPath) {
      return {
        success: false,
        message: "无法找到common.py文件，请确认TMDB-Import路径正确",
      }
    }

    // 读取文件内容
    const fileContent = fs.readFileSync(commonPyPath, "utf8")
    const lines = fileContent.split("\n")

    // 查找需要修改的行
    let targetLineIndex = -1
    let targetLine = ""

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("if word and word in episode.name:")) {
        targetLineIndex = i
        targetLine = lines[i]
        break
      }
    }

    if (targetLineIndex === -1) {
      // 检查是否已经修复
      let alreadyFixed = false
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("if word and episode.name and word in episode.name:")) {
          alreadyFixed = true
          break
        }
      }

      if (alreadyFixed) {
        return {
          success: true,
          message: "Bug已经修复，无需再次修改",
        }
      }

      return {
        success: false,
        message: "无法找到需要修改的代码行，请手动检查common.py文件",
      }
    }

    // 修改目标行
    const indentation = targetLine.match(/^\s*/)?.[0] || ""
    const fixedLine = `${indentation}if word and episode.name and word in episode.name:`
    lines[targetLineIndex] = fixedLine

    // 创建备份
    const backupPath = `${commonPyPath}.bak`
    fs.writeFileSync(backupPath, fileContent)

    // 写入修改后的内容
    fs.writeFileSync(commonPyPath, lines.join("\n"))

    return {
      success: true,
      message: `成功修复bug！原文件已备份为 ${backupPath}`,
      originalLine: targetLine.trim(),
      fixedLine: fixedLine.trim(),
      filePath: commonPyPath,
    }
  } catch (error) {
    return {
      success: false,
      message: `修复过程中出错: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
