"use client"

import React from "react"
import MarkdownPreview from '@uiw/react-markdown-preview'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

interface MarkdownProps {
  children: string
  className?: string
}

export const Markdown = React.memo(function Markdown({ children, className = "" }: MarkdownProps) {
  // 针对分集简介等AI生成内容的特殊处理
  // 1. 将单个换行符替换为<br>标签以强制换行（更适合AI生成的文本）
  // 2. 保留多个连续换行符作为段落分隔
  const processedContent = React.useMemo(() => 
    children
      .replace(/\n\s*\n/g, '\n\n') // 标准化段落分隔（多个换行符）
      .replace(/([^\n])\n([^\n])/g, '$1\n$2'), // 保持单个换行符
    [children]
  );
  
  return (
    <>
      {/* 自定义样式来覆盖默认的间距 */}
      <style jsx>{`
        :global(.wmde-markdown) {
          --base-size-16: 1rem;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: #333;
          border: none !important;
        }
        :global(.wmde-markdown *) {
          border: none !important;
        }
        :global(.wmde-markdown p) {
          margin-top: 0.75rem !important;
          margin-bottom: 0.75rem !important;
          line-height: 1.6;
          font-weight: 400;
          color: inherit;
        }
        :global(.wmde-markdown strong) {
          font-weight: 600;
          color: inherit;
        }
        :global(.wmde-markdown em) {
          font-style: italic;
          color: inherit;
        }
        :global(.wmde-markdown code) {
          font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
          font-size: 0.9em;
          background-color: rgba(175, 184, 193, 0.2);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          color: inherit;
        }
        :global(.wmde-markdown pre) {
          font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
          background-color: #f6f8fa;
          border-radius: 0.375rem;
          padding: 1rem;
          overflow-x: auto;
          margin-top: 0.75rem !important;
          margin-bottom: 0.75rem !important;
        }
        :global(.wmde-markdown pre code) {
          background-color: transparent;
          padding: 0;
        }
        :global(.wmde-markdown h1) {
          margin-top: 1.25rem !important;
          margin-bottom: 0.75rem !important;
          font-weight: 600;
          font-size: 1.75rem;
          line-height: 1.25;
          color: inherit;
        }
        :global(.wmde-markdown h2) {
          margin-top: 1rem !important;
          margin-bottom: 0.75rem !important;
          font-weight: 600;
          font-size: 1.5rem;
          line-height: 1.25;
          color: inherit;
        }
        :global(.wmde-markdown h3) {
          margin-top: 0.875rem !important;
          margin-bottom: 0.5rem !important;
          font-weight: 600;
          font-size: 1.25rem;
          line-height: 1.25;
          color: inherit;
        }
        :global(.wmde-markdown ul) {
          margin-top: 0.75rem !important;
          margin-bottom: 0.75rem !important;
          padding-left: 1.5rem;
          color: inherit;
        }
        :global(.wmde-markdown ol) {
          margin-top: 0.75rem !important;
          margin-bottom: 0.75rem !important;
          padding-left: 1.5rem;
          color: inherit;
        }
        :global(.wmde-markdown li) {
          margin-top: 0.25rem !important;
          margin-bottom: 0.25rem !important;
          color: inherit;
        }
        :global(.wmde-markdown li > p) {
          margin-top: 0.25rem !important;
          margin-bottom: 0.25rem !important;
          color: inherit;
        }
        :global(.wmde-markdown blockquote) {
          margin-top: 0.75rem !important;
          margin-bottom: 0.75rem !important;
          padding-left: 1rem;
          border-left: 0.25rem solid #d1d5db;
          color: #6b7280;
          font-style: italic;
        }
        :global(.wmde-markdown table) {
          margin-top: 0.75rem !important;
          margin-bottom: 0.75rem !important;
          border-collapse: collapse;
          width: 100%;
        }
        :global(.wmde-markdown hr) {
          display: none !important;
        }
        :global(.wmde-markdown .anchor) {
          display: none !important;
        }
        :global(.wmde-markdown h1 .anchor),
        :global(.wmde-markdown h2 .anchor),
        :global(.wmde-markdown h3 .anchor),
        :global(.wmde-markdown h4 .anchor),
        :global(.wmde-markdown h5 .anchor),
        :global(.wmde-markdown h6 .anchor) {
          display: none !important;
        }
        :global(.wmde-markdown h1 a[href^="#"]),
        :global(.wmde-markdown h2 a[href^="#"]),
        :global(.wmde-markdown h3 a[href^="#"]),
        :global(.wmde-markdown h4 a[href^="#"]),
        :global(.wmde-markdown h5 a[href^="#"]),
        :global(.wmde-markdown h6 a[href^="#"]) {
          display: none !important;
        }
        
        /* 暗色模式样式 */
        :global(.dark .wmde-markdown) {
          color: #e5e7eb;
        }
        :global(.dark .wmde-markdown code) {
          background-color: rgba(55, 65, 81, 0.5);
        }
        :global(.dark .wmde-markdown pre) {
          background-color: #1f2937;
        }
        :global(.dark .wmde-markdown blockquote) {
          border-left-color: #4b5563;
          color: #9ca3af;
        }
      `}</style>
      <div className={`markdown-content ${className}`}>
        <MarkdownPreview
          source={processedContent}
          className="wmde-markdown"
          wrapperElement={{
            "data-color-mode": undefined
          }}
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypeRewrite={(node: unknown) => {
            if (node.type === 'element' && node.tagName === 'a') {
              node.properties = { ...node.properties, target: '_blank', rel: 'noopener noreferrer' };
            }
          }}
          skipHtml={false}
          disableCopy={false}
        />
      </div>
    </>
  )
}, (prevProps, nextProps) => {
  return prevProps.children === nextProps.children && prevProps.className === nextProps.className;
});