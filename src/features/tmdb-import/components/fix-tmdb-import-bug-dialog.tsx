"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import {
  AlertTriangle,
  CheckCircle2,
  Code,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Settings,
  Wrench,
  X
} from "lucide-react"
import { toast } from "@/shared/components/ui/use-toast"

interface FixTMDBImportBugDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function FixTMDBImportBugDialog({ open, onOpenChange }: FixTMDBImportBugDialogProps) {
  const [fixing, setFixing] = useState(false)
  const [fixed, setFixed] = useState(false)
  const [fixResult, setFixResult] = useState<string>("")

  // 修复脚本内容
  const fixScript = `# TMDB-Import 中文字符解析错误修复补丁
# 修复文件: episode.py 第162行附近

import re
import logging

def safe_int_conversion(value, default=0):
    """安全的整数转换函数，处理中文字符和异常情况"""
    if not value:
        return default
    
    # 如果已经是整数，直接返回
    if isinstance(value, int):
        return value
    
    # 转换为字符串并清理
    str_value = str(value).strip()
    
    # 如果是空字符串，返回默认值
    if not str_value:
        return default
    
    # 尝试直接转换
    try:
        return int(str_value)
    except ValueError:
        pass
    
    # 提取数字部分
    numbers = re.findall(r'\\d+', str_value)
    if numbers:
        try:
            return int(numbers[0])
        except ValueError:
            pass
    
    # 如果包含中文字符，可能是描述文本，返回默认值
    if re.search(r'[\\u4e00-\\u9fff]', str_value):
        logging.warning(f"检测到中文字符，可能是描述文本而非集数: {str_value[:50]}...")
        return default
    
    # 最后尝试：移除所有非数字字符
    clean_value = re.sub(r'[^\\d]', '', str_value)
    if clean_value:
        try:
            return int(clean_value)
        except ValueError:
            pass
    
    logging.warning(f"无法转换为整数: {str_value[:50]}...")
    return default

def extract_episode_number_from_text(text):
    """从文本中提取集数编号"""
    if not text:
        return None
    
    # 常见的集数模式
    patterns = [
        r'第(\\d+)集',           # 第X集
        r'第(\\d+)话',           # 第X话
        r'EP(\\d+)',            # EPX
        r'Episode\\s*(\\d+)',    # Episode X
        r'^(\\d+)$',            # 纯数字
        r'E(\\d+)',             # EX
    ]
    
    for pattern in patterns:
        match = re.search(pattern, str(text), re.IGNORECASE)
        if match:
            try:
                return int(match.group(1))
            except (ValueError, IndexError):
                continue
    
    return None

# 修复后的代码片段
def fixed_episode_comparison(episoideID, episoideNumber):
    """修复后的集数比较逻辑"""
    try:
        # 使用安全转换函数
        id_num = safe_int_conversion(episoideID)
        number_num = safe_int_conversion(episoideNumber)
        
        # 如果其中一个转换失败，尝试从文本提取
        if id_num == 0:
            extracted = extract_episode_number_from_text(episoideID)
            if extracted:
                id_num = extracted
        
        if number_num == 0:
            extracted = extract_episode_number_from_text(episoideNumber)
            if extracted:
                number_num = extracted
        
        return id_num != number_num
        
    except Exception as e:
        logging.error(f"集数比较时发生错误: {e}")
        return False
`

  // 执行修复
  const handleFix = async () => {
    setFixing(true)
    setFixResult("")

    try {
      // 模拟修复过程
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 调用修复API
      const response = await fetch('/api/external/fix-tmdb-import-bug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'apply_fix',
          fixType: 'chinese_character_parsing'
        })
      })

      const result = await response.json()

      if (result.success) {
        setFixed(true)
        setFixResult("修复成功！已应用中文字符解析错误修复补丁。")
        toast({
          title: "修复成功",
          description: "TMDB导入中文字符解析错误已修复",
        })
      } else {
        throw new Error(result.error || "修复失败")
      }
    } catch (error: unknown) {

      setFixResult(`修复失败: ${error instanceof Error ? error.message : '未知错误'}`)
      toast({
        title: "修复失败",
        description: error instanceof Error ? error.message : "无法应用修复补丁",
        variant: "destructive"
      })
    } finally {
      setFixing(false)
    }
  }

  // 手动修复指南
  const manualFixSteps = [
    {
      step: 1,
      title: "定位问题文件",
      description: "找到 TMDB-Import-master/tmdb-import/importors/episode.py 文件"
    },
    {
      step: 2,
      title: "备份原文件",
      description: "创建 episode.py 的备份副本，以防修复失败"
    },
    {
      step: 3,
      title: "修改代码",
      description: "在第162行附近找到 int(episoideID) 和 int(episoideNumber) 的比较"
    },
    {
      step: 4,
      title: "应用修复",
      description: "将原始的 int() 转换替换为安全的转换函数"
    },
    {
      step: 5,
      title: "测试修复",
      description: "重新运行TMDB导入任务，验证修复效果"
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5" />
            <span>修复 TMDB 导入中文字符错误</span>
            {fixed && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                已修复
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-hidden">
          {/* 错误描述 */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">检测到 TMDB 导入中文字符解析错误</p>
                <p className="text-sm">
                  错误原因：在解析网页数据时，程序尝试将中文剧情描述转换为集数编号，导致 ValueError 异常。
                </p>
                <p className="text-sm">
                  影响：无法正常导入包含中文描述的剧集数据。
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
            {/* 自动修复 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>自动修复</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  点击下方按钮自动应用修复补丁，修复中文字符解析错误。
                </p>

                <div className="space-y-3">
                  <Button
                    onClick={handleFix}
                    disabled={fixing || fixed}
                    className="w-full"
                  >
                    {fixing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        正在修复...
                      </>
                    ) : fixed ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        已修复
                      </>
                    ) : (
                      <>
                        <Wrench className="h-4 w-4 mr-2" />
                        应用修复补丁
                      </>
                    )}
                  </Button>

                  {fixResult && (
                    <Alert className={fixed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                      <AlertDescription className={fixed ? "text-green-700" : "text-red-700"}>
                        {fixResult}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">修复内容：</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• 添加安全的整数转换函数</li>
                    <li>• 处理中文字符和异常情况</li>
                    <li>• 从文本中智能提取集数编号</li>
                    <li>• 增强错误处理和日志记录</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 手动修复指南 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>手动修复指南</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {manualFixSteps.map((step) => (
                      <div key={step.step} className="flex space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                          {step.step}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">{step.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* 修复代码预览 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <Code className="h-4 w-4" />
                <span>修复代码预览</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                  <code>{fixScript}</code>
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(fixScript)
                toast({
                  title: "已复制",
                  description: "修复代码已复制到剪贴板",
                })
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              复制代码
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-2" />
              关闭
            </Button>
            {!fixed && (
              <Button
                onClick={handleFix}
                disabled={fixing}
              >
                {fixing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wrench className="h-4 w-4 mr-2" />
                )}
                立即修复
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}