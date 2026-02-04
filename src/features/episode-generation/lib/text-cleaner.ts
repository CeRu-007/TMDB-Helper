/**
 * 文本清理工具
 * 统一管理所有文本清理逻辑，包括标点符号、方括号等
 */

/**
 * 清理重复的标点符号
 * @param text 原始文本
 * @returns 清理后的文本
 */
export function cleanDuplicatePunctuation(text: string): string {
  return text
    .replace(/[，]{2,}/g, '，')
    .replace(/[。]{2,}/g, '。')
    .replace(/[！]{2,}/g, '！')
    .replace(/[？]{2,}/g, '？')
    .replace(/[，。！？]+[，。！？]+/g, match => match[0])
}

/**
 * 清理方括号（同时处理半角 [] 和全角 【】）
 * @param text 原始文本
 * @returns 清理后的文本
 */
export function cleanBrackets(text: string): string {
  return text
    .replace(/\[\s*\]/g, '')           // 空的半角方括号
    .replace(/【\s*】/g, '')           // 空的全角方括号
    .replace(/\[(.+?)\]/g, '$1')       // 移除非空的半角方括号（保留内容）
    .replace(/【(.+?)】/g, '$1')       // 移除非空的全角方括号（保留内容）
}

/**
 * 清理标题外层的方括号（同时处理半角 [] 和全角 【】）
 * @param title 标题文本
 * @returns 清理后的标题
 */
export function cleanTitleBrackets(title: string): string {
  return title
    .replace(/^\[(.+)\]$/, '$1')
    .replace(/^【(.+)】$/, '$1')
    .trim()
}

/**
 * 移除多余的空行
 * @param text 原始文本
 * @returns 清理后的文本
 */
export function cleanExtraNewlines(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n')
}

/**
 * 清理"标题："或"简介："等前缀
 * @param text 原始文本
 * @returns 清理后的文本
 */
export function cleanPrefix(text: string): string {
  return text.replace(/^(标题[:：]?\s*|简介[:：]?\s*|描述[:：]?\s*|Description[:：]?\s*|Summary[:：]?\s*)/i, '')
}

/**
 * 综合清理简介文本
 * 清理空行、重复标点、方括号
 * @param text 原始文本
 * @returns 清理后的文本
 */
export function cleanSummaryText(text: string): string {
  let processed = text

  // 1. 移除多余的空行
  processed = cleanExtraNewlines(processed)

  // 2. 清理重复的标点符号
  processed = cleanDuplicatePunctuation(processed)

  // 3. 清理方括号
  processed = cleanBrackets(processed)

  return processed.trim()
}

/**
 * 清理标题文本
 * 清理前缀、引号、标点、方括号、"第X集"
 * @param title 标题文本
 * @returns 清理后的标题
 */
export function cleanTitleText(title: string): string {
  // 1. 移除前缀
  let cleaned = cleanPrefix(title)

  // 2. 移除引号
  cleaned = cleaned.replace(/^["'«」『]|["'»』」]$/g, '')

  // 3. 移除标点符号
  cleaned = cleaned.replace(/[，。、；：]/g, '')

  // 4. 移除"第X集"
  cleaned = cleaned.replace(/第\s*\d+\s*[集话]/g, '')

  // 5. 清理外层方括号
  cleaned = cleanTitleBrackets(cleaned)

  return cleaned.trim()
}

/**
 * 清理"简介："前缀并移除方括号
 * 用于简介内容处理
 * @param text 原始文本
 * @returns 清理后的文本
 */
export function cleanSummaryPrefixAndBrackets(text: string): string {
  return text
    .replace(/^(?:简介[:：]?\s*)?/, '')
    .replace(/\[(.+?)\]/g, '$1')
    .replace(/【(.+?)】/g, '$1')
    .replace(/\[\s*\]/g, '')
    .replace(/【\s*】/g, '')
    .trim()
}