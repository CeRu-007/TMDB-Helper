/**
 * 统一的时间格式化工具
 * 确保所有时间显示格式完全一致
 */

/**
 * 统一的时间格式化函数
 * 返回格式：YYYY年MM月DD日 HH:mm:ss
 */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  
  // 检查日期是否有效
  if (isNaN(d.getTime())) {
    return '无效日期'
  }
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`
}

/**
 * 备用格式化函数 - 使用 toLocaleString 但指定统一选项
 */
export function formatDateTimeLocale(date: string | Date): string {
  const d = new Date(date)
  
  if (isNaN(d.getTime())) {
    return '无效日期'
  }
  
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}