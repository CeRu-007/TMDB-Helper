"use client"

import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import remarkBreaks from "remark-breaks"
import "highlight.js/styles/github.css"

interface MarkdownProps {
  children: string
  className?: string
}

export function Markdown({ children, className = "" }: MarkdownProps) {
  // 针对分集简介等AI生成内容的特殊处理
  // 1. 将单个换行符替换为<br>标签以强制换行（更适合AI生成的文本）
  // 2. 保留多个连续换行符作为段落分隔
  const processedContent = children
    .replace(/\n\s*\n/g, '\n\n') // 标准化段落分隔（多个换行符）
    .replace(/([^\n])\n([^\n])/g, '$1\n$2') // 保持单个换行符
  
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 处理标题
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mt-3 mb-2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-3 mb-1.5" {...props} />,
          h4: ({ node, ...props }) => <h4 className="text-base font-semibold mt-2.5 mb-1.5" {...props} />,
          h5: ({ node, ...props }) => <h5 className="text-sm font-semibold mt-2 mb-1" {...props} />,
          h6: ({ node, ...props }) => <h6 className="text-xs font-semibold mt-2 mb-1" {...props} />,
          
          // 处理段落 - 添加更好的行高和间距，特别适合分集简介
          p: ({ node, ...props }) => <p className="leading-relaxed mb-3 last:mb-0 text-gray-800 dark:text-gray-200" {...props} />,
          
          // 处理链接
          a: ({ node, ...props }) => <a className="text-blue-600 hover:underline" {...props} />,
          
          // 处理列表 - 改进间距
          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-3 ml-4 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-3 ml-4 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
          
          // 处理代码块 - 改进样式
          pre: ({ node, ...props }) => <pre className="rounded-lg p-4 mb-3 overflow-x-auto bg-gray-50 dark:bg-gray-800" {...props} />,
          code: ({ node, inline, ...props }) => {
            if (inline) {
              return <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm font-mono" {...props} />
            }
            return <code className="text-sm font-mono" {...props} />
          },
          
          // 处理引用块 - 改进样式
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 dark:text-gray-400 my-3 py-1" {...props} />
          ),
          
          // 处理表格 - 改进样式
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border border-gray-300 dark:border-gray-700 rounded-lg" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-gray-100 dark:bg-gray-800" {...props} />,
          th: ({ node, ...props }) => (
            <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left font-semibold" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-gray-300 dark:border-gray-700 px-4 py-2" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800" {...props} />
          ),
          
          // 处理分隔线
          hr: ({ node, ...props }) => <hr className="my-4 border-gray-300 dark:border-gray-700" {...props} />,
          
          // 处理图片
          img: ({ node, ...props }) => <img className="max-w-full h-auto rounded-lg my-3" {...props} />,
          
          // 处理强调文本
          strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          
          // 处理换行符 - 确保单个换行符被正确渲染
          br: ({ node, ...props }) => <br {...props} />,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}