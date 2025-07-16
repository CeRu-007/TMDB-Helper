"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import {
    FileText,
    Download,
    Upload,
    Trash2,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    FileCheck
} from "lucide-react"

interface CSVData {
    headers: string[]
    rows: string[][]
}

interface ProcessingResult {
    success: boolean
    message: string
    originalRows: number
    processedRows: number
    deletedEpisodes: number[]
}

export default function RobustCSVProcessor() {
    const [csvContent, setCsvContent] = useState('')
    const [episodesToDelete, setEpisodesToDelete] = useState('1,2,3,4,5,6,7,8')
    const [processedData, setProcessedData] = useState<CSVData | null>(null)
    const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    /**
     * 强化的CSV解析器
     */
    const parseCSVRobust = (content: string): CSVData => {
        const lines = content.split('\n').filter(line => line.trim() !== '')

        if (lines.length === 0) {
            return { headers: [], rows: [] }
        }

        // 解析标题行
        const headers = parseCSVLineRobust(lines[0])

        // 修复和解析数据行
        const repairedRows: string[][] = []
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
                currentRow = ''
            } else if (testFields.length > headers.length) {
                // 尝试分割行
                const splitResult = findNextLineStart(currentRow, headers.length)
                if (splitResult) {
                    const currentFields = parseCSVLineRobust(splitResult.currentRow)
                    if (currentFields.length === headers.length) {
                        repairedRows.push(currentFields)
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
            }
        }

        return { headers, rows: repairedRows }
    }

    /**
     * 解析CSV行
     */
    const parseCSVLineRobust = (line: string): string[] => {
        const fields: string[] = []
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
    const findNextLineStart = (line: string, expectedFields: number) => {
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
    const generateCSV = (data: CSVData): string => {
        const lines: string[] = []
        lines.push(data.headers.map(escapeCSVField).join(','))
        data.rows.forEach(row => {
            lines.push(row.map(escapeCSVField).join(','))
        })
        return lines.join('\n')
    }

    /**
     * 转义CSV字段
     */
    const escapeCSVField = (field: string): string => {
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
    const deleteEpisodes = (data: CSVData, episodesToDelete: number[]): CSVData => {
        const episodeColumnIndex = data.headers.findIndex(header =>
            header.toLowerCase().includes('episode') || header.includes('剧集')
        )

        if (episodeColumnIndex === -1) {
            throw new Error('未找到剧集编号列')
        }

        const episodesToDeleteSet = new Set(episodesToDelete.map(ep => String(ep)))

        const filteredRows = data.rows.filter(row => {
            const episodeNumber = row[episodeColumnIndex]?.trim()
            return !episodesToDeleteSet.has(episodeNumber)
        })

        return {
            headers: [...data.headers],
            rows: filteredRows
        }
    }

    /**
     * 处理CSV文件
     */
    const handleProcessCSV = async () => {
        if (!csvContent.trim()) {
            toast({
                title: "错误",
                description: "请先输入CSV内容",
                variant: "destructive"
            })
            return
        }

        setIsProcessing(true)

        try {
            // 解析要删除的剧集编号
            const episodeNumbers = episodesToDelete
                .split(',')
                .map(num => parseInt(num.trim()))
                .filter(num => !isNaN(num))

            if (episodeNumbers.length === 0) {
                throw new Error('请输入有效的剧集编号')
            }

            // 解析CSV
            const parsedData = parseCSVRobust(csvContent)

            if (parsedData.rows.length === 0) {
                throw new Error('CSV文件中没有数据行')
            }

            // 删除指定剧集
            const filteredData = deleteEpisodes(parsedData, episodeNumbers)

            setProcessedData(filteredData)
            setProcessingResult({
                success: true,
                message: '处理成功',
                originalRows: parsedData.rows.length,
                processedRows: filteredData.rows.length,
                deletedEpisodes: episodeNumbers
            })

            toast({
                title: "处理成功",
                description: `已删除 ${episodeNumbers.length} 个剧集，剩余 ${filteredData.rows.length} 行数据`
            })

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '处理失败'
            setProcessingResult({
                success: false,
                message: errorMessage,
                originalRows: 0,
                processedRows: 0,
                deletedEpisodes: []
            })

            toast({
                title: "处理失败",
                description: errorMessage,
                variant: "destructive"
            })
        } finally {
            setIsProcessing(false)
        }
    }

    /**
     * 下载处理后的CSV
     */
    const handleDownload = () => {
        if (!processedData) return

        const csvContent = generateCSV(processedData)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'processed_import.csv'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast({
            title: "下载成功",
            description: "处理后的CSV文件已下载"
        })
    }

    /**
     * 从文件加载CSV
     */
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result as string
            setCsvContent(content)
            toast({
                title: "文件加载成功",
                description: `已加载文件: ${file.name}`
            })
        }
        reader.readAsText(file, 'utf-8')
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5" />
                        强化CSV处理器
                    </CardTitle>
                    <CardDescription>
                        专门处理包含复杂中文内容的CSV文件，支持自动修复和剧集删除
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* 文件上传 */}
                    <div className="space-y-2">
                        <Label htmlFor="file-upload">上传CSV文件</Label>
                        <Input
                            id="file-upload"
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="cursor-pointer"
                        />
                    </div>

                    <Separator />

                    {/* CSV内容输入 */}
                    <div className="space-y-2">
                        <Label htmlFor="csv-content">CSV内容</Label>
                        <Textarea
                            id="csv-content"
                            placeholder="粘贴CSV内容或通过上方上传文件..."
                            value={csvContent}
                            onChange={(e) => setCsvContent(e.target.value)}
                            rows={10}
                            className="font-mono text-sm"
                        />
                    </div>

                    {/* 删除设置 */}
                    <div className="space-y-2">
                        <Label htmlFor="episodes-to-delete">要删除的剧集编号</Label>
                        <Input
                            id="episodes-to-delete"
                            placeholder="例如: 1,2,3,4,5,6,7,8"
                            value={episodesToDelete}
                            onChange={(e) => setEpisodesToDelete(e.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">
                            用逗号分隔多个剧集编号
                        </p>
                    </div>

                    {/* 处理按钮 */}
                    <Button
                        onClick={handleProcessCSV}
                        disabled={isProcessing || !csvContent.trim()}
                        className="w-full"
                    >
                        {isProcessing ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                处理中...
                            </>
                        ) : (
                            <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                处理CSV
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* 处理结果 */}
            {processingResult && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {processingResult.success ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                            处理结果
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant={processingResult.success ? "default" : "destructive"}>
                            <AlertDescription>
                                {processingResult.message}
                            </AlertDescription>
                        </Alert>

                        {processingResult.success && (
                            <div className="mt-4 space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline">
                                        原始行数: {processingResult.originalRows}
                                    </Badge>
                                    <Badge variant="outline">
                                        处理后行数: {processingResult.processedRows}
                                    </Badge>
                                    <Badge variant="outline">
                                        删除行数: {processingResult.originalRows - processingResult.processedRows}
                                    </Badge>
                                </div>

                                <div className="flex flex-wrap gap-1">
                                    <span className="text-sm text-muted-foreground">删除的剧集:</span>
                                    {processingResult.deletedEpisodes.map(ep => (
                                        <Badge key={ep} variant="secondary" className="text-xs">
                                            第{ep}集
                                        </Badge>
                                    ))}
                                </div>

                                <Button onClick={handleDownload} className="mt-4">
                                    <Download className="mr-2 h-4 w-4" />
                                    下载处理后的CSV
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* 数据预览 */}
            {processedData && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            数据预览
                        </CardTitle>
                        <CardDescription>
                            显示处理后的前5行数据
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-50">
                                        {processedData.headers.map((header, index) => (
                                            <th key={index} className="border border-gray-300 px-2 py-1 text-left text-sm font-medium">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedData.rows.slice(0, 5).map((row, rowIndex) => (
                                        <tr key={rowIndex} className="hover:bg-gray-50">
                                            {row.map((cell, cellIndex) => (
                                                <td key={cellIndex} className="border border-gray-300 px-2 py-1 text-sm max-w-xs truncate">
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {processedData.rows.length > 5 && (
                            <p className="mt-2 text-sm text-muted-foreground">
                                显示前5行，共{processedData.rows.length}行数据
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}