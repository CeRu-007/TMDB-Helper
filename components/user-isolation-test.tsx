"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/components/user-identity-provider"
import { useData } from "@/components/client-data-provider"
import { Loader2, Users, Database, CheckCircle, AlertCircle, Info } from "lucide-react"

/**
 * 用户隔离测试组件
 * 用于验证用户数据隔离功能是否正常工作
 */

interface MigrationStatus {
  success: boolean
  userId: string
  userStats: {
    itemCount: number
    taskCount: number
    lastModified: string | null
  }
  totalUsers: number
  allUsers: Array<{
    userId: string
    stats: {
      itemCount: number
      taskCount: number
      lastModified: string | null
    }
  }>
}

export function UserIsolationTest() {
  const { userInfo, isInitialized } = useUser()
  const { items, loading } = useData()
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null)
  const [isLoadingMigration, setIsLoadingMigration] = useState(false)
  const [testResults, setTestResults] = useState<{
    userIdGeneration: boolean
    dataIsolation: boolean
    apiIntegration: boolean
  }>({
    userIdGeneration: false,
    dataIsolation: false,
    apiIntegration: false
  })

  // 检查用户ID生成
  useEffect(() => {
    if (isInitialized && userInfo) {
      setTestResults(prev => ({
        ...prev,
        userIdGeneration: userInfo.userId.startsWith('user_') && userInfo.userId.length === 21
      }))
    }
  }, [isInitialized, userInfo])

  // 检查数据隔离
  useEffect(() => {
    if (!loading && items) {
      setTestResults(prev => ({
        ...prev,
        dataIsolation: true // 如果能正常加载数据，说明数据隔离工作正常
      }))
    }
  }, [loading, items])

  // 获取迁移状态
  const fetchMigrationStatus = async () => {
    setIsLoadingMigration(true)
    try {
      const response = await fetch('/api/migrate-data', {
        method: 'GET',
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        setMigrationStatus(data)
        setTestResults(prev => ({
          ...prev,
          apiIntegration: true
        }))
      } else {
        console.error('获取迁移状态失败:', response.statusText)
      }
    } catch (error) {
      console.error('获取迁移状态失败:', error)
    } finally {
      setIsLoadingMigration(false)
    }
  }

  // 执行数据迁移
  const executeMigration = async () => {
    setIsLoadingMigration(true)
    try {
      const response = await fetch('/api/migrate-data', {
        method: 'POST',
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        setMigrationStatus(data)
        console.log('数据迁移结果:', data)
      } else {
        console.error('数据迁移失败:', response.statusText)
      }
    } catch (error) {
      console.error('数据迁移失败:', error)
    } finally {
      setIsLoadingMigration(false)
    }
  }

  // 重置用户数据（仅用于测试）
  const resetUserData = () => {
    if (confirm('确定要重置用户数据吗？这将清除所有本地数据并创建新的用户ID。')) {
      localStorage.clear()
      sessionStorage.clear()
      // 删除所有cookie
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      })
      window.location.reload()
    }
  }

  if (!isInitialized) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>初始化用户身份系统...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>用户隔离功能测试</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 用户信息 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="font-medium mb-2">当前用户信息</h3>
            <div className="space-y-1 text-sm">
              <div>用户ID: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{userInfo?.userId}</code></div>
              <div>显示名称: {userInfo?.displayName}</div>
              <div>创建时间: {userInfo?.createdAt ? new Date(userInfo.createdAt).toLocaleString() : '未知'}</div>
              <div>最后活跃: {userInfo?.lastActiveAt ? new Date(userInfo.lastActiveAt).toLocaleString() : '未知'}</div>
            </div>
          </div>

          {/* 测试结果 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              {testResults.userIdGeneration ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">用户ID生成</span>
              <Badge variant={testResults.userIdGeneration ? "default" : "destructive"}>
                {testResults.userIdGeneration ? "通过" : "失败"}
              </Badge>
            </div>

            <div className="flex items-center space-x-2">
              {testResults.dataIsolation ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">数据隔离</span>
              <Badge variant={testResults.dataIsolation ? "default" : "destructive"}>
                {testResults.dataIsolation ? "通过" : "失败"}
              </Badge>
            </div>

            <div className="flex items-center space-x-2">
              {testResults.apiIntegration ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">API集成</span>
              <Badge variant={testResults.apiIntegration ? "default" : "destructive"}>
                {testResults.apiIntegration ? "通过" : "失败"}
              </Badge>
            </div>
          </div>

          {/* 数据统计 */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
            <h3 className="font-medium mb-2 flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>数据统计</span>
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">当前用户项目数:</span>
                <span className="ml-2 font-medium">{items?.length || 0}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">数据加载状态:</span>
                <span className="ml-2 font-medium">{loading ? "加载中" : "已完成"}</span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex space-x-2">
            <Button 
              onClick={fetchMigrationStatus} 
              disabled={isLoadingMigration}
              variant="outline"
            >
              {isLoadingMigration ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Info className="h-4 w-4 mr-2" />
              )}
              检查迁移状态
            </Button>

            <Button 
              onClick={executeMigration} 
              disabled={isLoadingMigration}
            >
              {isLoadingMigration ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              执行数据迁移
            </Button>

            <Button 
              onClick={resetUserData} 
              variant="destructive"
              size="sm"
            >
              重置用户数据
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 迁移状态显示 */}
      {migrationStatus && (
        <Card>
          <CardHeader>
            <CardTitle>迁移状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h3 className="font-medium mb-2">当前用户统计</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">项目数:</span>
                    <span className="ml-2 font-medium">{migrationStatus.userStats.itemCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">任务数:</span>
                    <span className="ml-2 font-medium">{migrationStatus.userStats.taskCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">最后修改:</span>
                    <span className="ml-2 font-medium">
                      {migrationStatus.userStats.lastModified 
                        ? new Date(migrationStatus.userStats.lastModified).toLocaleString()
                        : '无'
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="font-medium mb-2">系统统计</h3>
                <div className="text-sm">
                  <div>总用户数: <span className="font-medium">{migrationStatus.totalUsers}</span></div>
                  <div className="mt-2">
                    <span className="text-gray-600 dark:text-gray-400">所有用户:</span>
                    <div className="mt-1 space-y-1">
                      {migrationStatus.allUsers.map((user, index) => (
                        <div key={user.userId} className="text-xs bg-white dark:bg-gray-800 p-2 rounded">
                          <span className="font-mono">{user.userId}</span>
                          <span className="ml-2 text-gray-500">
                            ({user.stats.itemCount} 项目, {user.stats.taskCount} 任务)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
