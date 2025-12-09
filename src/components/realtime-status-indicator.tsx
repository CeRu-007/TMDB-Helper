"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Wifi,
    WifiOff,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Clock,
    Zap
} from "lucide-react"

interface RealtimeStatusIndicatorProps {
    isConnected: boolean
    pendingOperations: number
    onRefresh?: () => void
    className?: string
}

export function RealtimeStatusIndicator({
    isConnected,
    pendingOperations,
    onRefresh,
    className = ""
}: RealtimeStatusIndicatorProps) {

    // 获取连接状态信息
    const getConnectionStatus = () => {
        if (isConnected) {
            return {
                icon: <Wifi className="h-3 w-3" />,
                color: "bg-green-500",
                text: "实时同步已连接",
                description: "数据变更将实时同步"
            }
        } else {
            return {
                icon: <WifiOff className="h-3 w-3" />,
                color: "bg-red-500",
                text: "实时同步已断开",
                description: "数据变更可能不会实时同步"
            }
        }
    }

    // 获取操作状态信息
    const getOperationStatus = () => {
        if (pendingOperations > 0) {
            return {
                icon: <Loader2 className="h-3 w-3 animate-spin" />,
                color: "bg-blue-500",
                text: `${pendingOperations} 个操作处理中`,
                description: "正在处理数据操作，请稍候"
            }
        } else {
            return {
                icon: <CheckCircle2 className="h-3 w-3" />,
                color: "bg-gray-500",
                text: "所有操作已完成",
                description: "没有待处理的操作"
            }
        }
    }

    const connectionStatus = getConnectionStatus()
    const operationStatus = getOperationStatus()

    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <TooltipProvider>
                {/* 连接状态指示器 */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge
                            variant="secondary"
                            className={`${connectionStatus.color} text-white text-xs px-2 py-1 flex items-center space-x-1`}
                        >
                            {connectionStatus.icon}
                            <span>实时同步</span>
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="text-center">
                            <div className="font-medium">{connectionStatus.text}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {connectionStatus.description}
                            </div>
                        </div>
                    </TooltipContent>
                </Tooltip>

                {/* 操作状态指示器 */}
                {pendingOperations > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge
                                variant="secondary"
                                className={`${operationStatus.color} text-white text-xs px-2 py-1 flex items-center space-x-1`}
                            >
                                {operationStatus.icon}
                                <span>{pendingOperations}</span>
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="text-center">
                                <div className="font-medium">{operationStatus.text}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {operationStatus.description}
                                </div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* 刷新按钮 */}
                {onRefresh && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={onRefresh}
                            >
                                <Zap className="h-3 w-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="text-center">
                                <div className="font-medium">手动刷新</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    立即同步最新数据
                                </div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                )}
            </TooltipProvider>
        </div>
    )
}

// 简化版状态指示器
export function SimpleRealtimeStatusIndicator({
    isConnected,
    pendingOperations,
    className = ""
}: {
    isConnected: boolean
    pendingOperations: number
    className?: string
}) {
    return (
        <div className={`flex items-center space-x-1 ${className}`}>
            {/* 连接状态 */}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />

            {/* 操作状态 */}
            {pendingOperations > 0 && (
                <div className="flex items-center space-x-1">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                    <span className="text-xs text-blue-500">{pendingOperations}</span>
                </div>
            )}
        </div>
    )
}

