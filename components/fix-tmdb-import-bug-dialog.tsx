"use client"

import React from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bug, Code, FileCode, Check, Copy } from "lucide-react"

interface FixTMDBImportBugDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCopyFix: () => void
}

export default function FixTMDBImportBugDialog({
  open,
  onOpenChange,
  onCopyFix
}: FixTMDBImportBugDialogProps) {
  const [activeTab, setActiveTab] = React.useState("problem")
  
  const handleCopyFix = () => {
    navigator.clipboard.writeText(`# 在 common.py 的 filter_by_name 函数中修改第83行:
# 原代码: if word and word in episode.name:
# 修改为: if word and episode.name and word in episode.name:`)
    onCopyFix()
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Bug className="mr-2 h-5 w-5 text-red-500" />
            修复TMDB-Import工具Bug
          </DialogTitle>
          <DialogDescription>
            解决"TypeError: argument of type 'NoneType' is not iterable"错误
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="problem">问题描述</TabsTrigger>
            <TabsTrigger value="solution">解决方案</TabsTrigger>
            <TabsTrigger value="code">代码修复</TabsTrigger>
          </TabsList>
          
          <TabsContent value="problem" className="mt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">问题原因</h3>
              <p>TMDB-Import工具在处理没有名称(name为None)的剧集时会出现类型错误。</p>
              <p>错误信息: <code className="bg-muted px-1 rounded">TypeError: argument of type 'NoneType' is not iterable</code></p>
              <p>这是因为代码假设episode.name总是一个字符串，但实际上有时它可能是None。</p>
            </div>
          </TabsContent>
          
          <TabsContent value="solution" className="mt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">解决方案</h3>
              <p>在使用episode.name之前，需要先检查它是否为None。</p>
              <p>这是一个简单的防御性编程修复，只需要在条件判断中添加一个额外的检查。</p>
              <p>修复后，即使遇到没有名称的剧集，程序也能正常运行。</p>
            </div>
          </TabsContent>
          
          <TabsContent value="code" className="mt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">代码修复</h3>
              <p>在common.py文件中找到filter_by_name函数，大约在第83行:</p>
              
              <div className="bg-muted p-3 rounded-md">
                <div className="text-red-500 line-through">if word and word in episode.name:</div>
                <div className="text-green-500">if word and episode.name and word in episode.name:</div>
              </div>
              
              <p>这个修复添加了对episode.name是否存在的检查，防止对None值进行字符串操作。</p>
              
              <Button className="mt-2" onClick={handleCopyFix}>
                <Copy className="mr-2 h-4 w-4" />
                复制修复代码
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
