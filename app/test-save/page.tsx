'use client'

import { useState } from 'react'
import { ClientConfigManager } from '@/lib/client-config-manager'

export default function TestSavePage() {
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState('')
  const [result, setResult] = useState('')

  const testSaveDirectly = async () => {
    setStatus('测试直接保存...')
    try {
      const success = await ClientConfigManager.setItem('tmdb_api_key', apiKey)
      if (success) {
        setStatus('✅ 直接保存成功')
        
        // 验证保存结果
        const saved = await ClientConfigManager.getItem('tmdb_api_key')
        setResult(`保存的值: ${saved}`)
      } else {
        setStatus('❌ 直接保存失败')
      }
    } catch (error) {
      setStatus('❌ 直接保存异常: ' + (error instanceof Error ? error.message : error))
    }
  }

  const testFetchDirectly = async () => {
    setStatus('测试直接API调用...')
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set',
          key: 'tmdb_api_key',
          value: apiKey
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setStatus('✅ 直接API调用成功')
        setResult(`服务器响应: ${JSON.stringify(data)}`)
      } else {
        setStatus('❌ 直接API调用失败: ' + data.error)
      }
    } catch (error) {
      setStatus('❌ 直接API调用异常: ' + (error instanceof Error ? error.message : error))
    }
  }

  const testGetCurrent = async () => {
    setStatus('获取当前配置...')
    try {
      const current = await ClientConfigManager.getItem('tmdb_api_key')
      setResult(`当前API密钥: ${current || '未设置'}`)
      setStatus('✅ 获取成功')
    } catch (error) {
      setStatus('❌ 获取异常: ' + (error instanceof Error ? error.message : error))
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">API密钥保存测试</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              测试API密钥:
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入测试API密钥"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={testSaveDirectly}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              使用ClientConfigManager保存
            </button>
            
            <button
              onClick={testFetchDirectly}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              直接调用API保存
            </button>
            
            <button
              onClick={testGetCurrent}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              获取当前配置
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-100 rounded">
            <h3 className="font-medium mb-2">状态:</h3>
            <p className="text-sm">{status}</p>
          </div>

          {result && (
            <div className="mt-4 p-4 bg-blue-50 rounded">
              <h3 className="font-medium mb-2">结果:</h3>
              <p className="text-sm break-all">{result}</p>
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-yellow-50 rounded border border-yellow-200">
          <h3 className="font-medium mb-2">测试说明:</h3>
          <ul className="text-sm space-y-1">
            <li>• 输入API密钥后点击任一保存按钮</li>
            <li>• 检查浏览器开发者工具控制台的详细日志</li>
            <li>• 验证配置是否成功保存到文件</li>
          </ul>
        </div>
      </div>
    </div>
  )
}