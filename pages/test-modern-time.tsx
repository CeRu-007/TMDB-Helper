import { useState } from "react"
import { ModernTimePicker } from "@/components/ui/modern-time-picker"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimePickerDial } from "@/components/ui/time-picker-dial"
import { TimePickerPresets } from "@/components/ui/time-picker-presets"

export default function TestModernTimePage() {
  const [hour, setHour] = useState(12)
  const [minute, setMinute] = useState(30)
  const [use12Hours, setUse12Hours] = useState(false)
  const [minuteStep, setMinuteStep] = useState(1)
  
  const handleTimeChange = (newHour: number, newMinute: number) => {
    console.log(`时间更新为: ${newHour}:${newMinute}`)
    setHour(newHour)
    setMinute(newMinute)
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold text-center mb-8">现代时间选择器测试</h1>
      
      <div className="max-w-3xl mx-auto">
        <Tabs defaultValue="combined">
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="combined">组合式选择器</TabsTrigger>
            <TabsTrigger value="dial">时钟表盘</TabsTrigger>
            <TabsTrigger value="presets">预设时间</TabsTrigger>
          </TabsList>
          
          <TabsContent value="combined">
            <Card>
              <CardHeader>
                <CardTitle>现代时间选择器</CardTitle>
                <CardDescription>集成了多种时间选择方式的现代化组件</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  <div className="flex flex-col gap-4">
                    <Label>时间选择</Label>
                    <ModernTimePicker
                      hour={hour}
                      minute={minute}
                      onTimeChange={handleTimeChange}
                      minuteStep={minuteStep}
                      use12Hours={use12Hours}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="use12Hours"
                        checked={use12Hours}
                        onCheckedChange={setUse12Hours}
                      />
                      <Label htmlFor="use12Hours">使用12小时制</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Label>分钟步进值:</Label>
                      <select 
                        value={minuteStep} 
                        onChange={(e) => setMinuteStep(Number(e.target.value))}
                        className="border rounded p-1"
                      >
                        <option value="1">1分钟</option>
                        <option value="5">5分钟</option>
                        <option value="10">10分钟</option>
                        <option value="15">15分钟</option>
                        <option value="30">30分钟</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-8 p-4 bg-muted/20 rounded-md">
                    <h3 className="text-lg font-medium mb-2">当前选择的时间</h3>
                    <p className="text-2xl font-mono">
                      {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="dial">
            <Card>
              <CardHeader>
                <CardTitle>时钟表盘选择器</CardTitle>
                <CardDescription>可拖动的时钟表盘式时间选择</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="mb-4">
                  <Tabs defaultValue="hour">
                    <TabsList>
                      <TabsTrigger value="hour">选择小时</TabsTrigger>
                      <TabsTrigger value="minute">选择分钟</TabsTrigger>
                    </TabsList>
                    <TabsContent value="hour" className="mt-4">
                      <TimePickerDial
                        hour={hour}
                        minute={minute}
                        onTimeChange={handleTimeChange}
                        mode="hour"
                        use12Hours={use12Hours}
                      />
                    </TabsContent>
                    <TabsContent value="minute" className="mt-4">
                      <TimePickerDial
                        hour={hour}
                        minute={minute}
                        onTimeChange={handleTimeChange}
                        mode="minute"
                        minuteStep={minuteStep}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-2xl font-mono">
                    {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="presets">
            <Card>
              <CardHeader>
                <CardTitle>预设时间选择器</CardTitle>
                <CardDescription>常用时间快捷选择</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  <TimePickerPresets onSelectPreset={handleTimeChange} />
                  
                  <div className="mt-8 p-4 bg-muted/20 rounded-md">
                    <h3 className="text-lg font-medium mb-2">当前选择的时间</h3>
                    <p className="text-2xl font-mono">
                      {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 