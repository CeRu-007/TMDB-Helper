"use client"

import React, { useState } from "react"
import { NewTMDBTable } from "./new-tmdb-table"
import { Button } from "./ui/button"
import { CSVData } from "@/lib/csv-processor"

// 测试数据
const testData: CSVData = {
  headers: ["标题", "年份", "评分", "导演", "演员"],
  rows: [
    ["肖申克的救赎", "1994", "9.7", "弗兰克·德拉邦特", "蒂姆·罗宾斯"],
    ["霸王别姬", "1993", "9.6", "陈凯歌", "张国荣"],
    ["阿甘正传", "1994", "9.5", "罗伯特·泽米吉斯", "汤姆·汉克斯"],
    ["泰坦尼克号", "1997", "9.4", "詹姆斯·卡梅隆", "莱昂纳多·迪卡普里奥"],
    ["这个杀手不太冷", "1994", "9.4", "吕克·贝松", "让·雷诺"]
  ]
}

export function CSVTableTest() {
  const [data, setData] = useState<CSVData>(testData)
  const [isSaving, setIsSaving] = useState(false)

  const handleDataChange = (newData: CSVData) => {
    
    setData(newData)
  }

  const handleSave = async () => {
    setIsSaving(true)
    // 模拟保存延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    
    return true
  }

  const resetData = () => {
    setData(testData)
  }

  return (
    <div className="h-screen flex flex-col p-4">
      <div className="mb-4 flex gap-2">
        <Button onClick={resetData} variant="outline">
          重置数据
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "保存中..." : "保存"}
        </Button>
      </div>
      
      <div className="flex-1 border rounded-lg overflow-hidden">
        <NewTMDBTable
          data={data}
          onChange={handleDataChange}
          onSave={handleSave}
          height="100%"
          isSaving={isSaving}
        />
      </div>
    </div>
  )
}