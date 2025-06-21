"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts"
import { TrendingUp, Target, Award, Globe, Zap } from "lucide-react"
import type { TMDBItem } from "@/lib/storage"

interface AnalyticsDashboardProps {
  items: TMDBItem[]
}

export default function AnalyticsDashboard({ items }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month")

  // 计算统计数据
  const stats = calculateStats(items)
  const chartData = generateChartData(items, timeRange)

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总词条数"
          value={stats.totalItems}
          icon={<Globe className="h-4 w-4" />}
          trend={stats.itemsTrend}
          color="blue"
        />
        <StatCard
          title="完成率"
          value={`${stats.completionRate}%`}
          icon={<Target className="h-4 w-4" />}
          trend={stats.completionTrend}
          color="green"
        />
        <StatCard
          title="本月新增"
          value={stats.monthlyAdded}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={stats.addedTrend}
          color="purple"
        />
        <StatCard
          title="维护效率"
          value={`${stats.efficiency}%`}
          icon={<Zap className="h-4 w-4" />}
          trend={stats.efficiencyTrend}
          color="orange"
        />
      </div>

      {/* 详细图表 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="progress">进度分析</TabsTrigger>
          <TabsTrigger value="platforms">平台分布</TabsTrigger>
          <TabsTrigger value="timeline">时间线</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 类型分布饼图 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">内容类型分布</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.typeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.typeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 状态分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">维护状态</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.statusDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          {/* 进度趋势 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">维护进度趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData.progressTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="completed" stackId="1" stroke="#22c55e" fill="#22c55e" />
                  <Area type="monotone" dataKey="ongoing" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          {/* 平台分析 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">平台分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {chartData.platformStats.map((platform, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full bg-${platform.color}-500`} />
                        <span className="text-sm font-medium">{platform.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">{platform.count}</span>
                        <Progress value={platform.percentage} className="w-20 h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">平台完成率</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.platformCompletion} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip formatter={(value) => [`${value}%`, "完成率"]} />
                    <Bar dataKey="completion" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          {/* 活动时间线 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">维护活动时间线</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData.activityTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="additions" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="completions" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="updates" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 个人成就 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center">
            <Award className="h-4 w-4 mr-2" />
            维护成就
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.achievements.map((achievement, index) => (
              <div
                key={index}
                className="text-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg"
              >
                <div className="text-2xl mb-2">{achievement.icon}</div>
                <div className="font-medium text-sm">{achievement.title}</div>
                <div className="text-xs text-gray-500">{achievement.description}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 统计卡片组件
function StatCard({
  title,
  value,
  icon,
  trend,
  color,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  trend: number
  color: string
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <div className="flex items-center mt-1">
              <TrendingUp className={`h-3 w-3 mr-1 ${trend >= 0 ? "text-green-500" : "text-red-500"}`} />
              <span className={`text-xs ${trend >= 0 ? "text-green-500" : "text-red-500"}`}>
                {trend >= 0 ? "+" : ""}
                {trend}%
              </span>
            </div>
          </div>
          <div
            className={`p-3 rounded-full bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} text-white`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 计算统计数据
function calculateStats(items: TMDBItem[]) {
  const totalItems = items.length
  const completedItems = items.filter((item) => item.status === "completed").length
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  // 模拟趋势数据
  return {
    totalItems,
    completionRate,
    monthlyAdded: 12,
    efficiency: 85,
    itemsTrend: 8.2,
    completionTrend: 12.5,
    addedTrend: 15.3,
    efficiencyTrend: 5.1,
    achievements: [
      { icon: "🏆", title: "维护达人", description: "完成100个词条" },
      { icon: "⚡", title: "效率之星", description: "连续7天维护" },
      { icon: "🎯", title: "精准维护", description: "零错误记录" },
      { icon: "🌟", title: "贡献者", description: "上传50张图片" },
    ],
  }
}

// 生成图表数据
function generateChartData(items: TMDBItem[], timeRange: string) {
  return {
    typeDistribution: [
      { name: "电视剧", value: items.filter((i) => i.mediaType === "tv").length, color: "#3b82f6" },
      { name: "电影", value: items.filter((i) => i.mediaType === "movie").length, color: "#22c55e" },
    ],
    statusDistribution: [
      { name: "连载中", value: items.filter((i) => i.status === "ongoing").length },
      { name: "已完结", value: items.filter((i) => i.status === "completed").length },
    ],
    progressTrend: [
      { date: "1月", completed: 20, ongoing: 15 },
      { date: "2月", completed: 35, ongoing: 18 },
      { date: "3月", completed: 45, ongoing: 22 },
      { date: "4月", completed: 60, ongoing: 25 },
      { date: "5月", completed: 75, ongoing: 20 },
      { date: "6月", completed: 85, ongoing: 18 },
    ],
    platformStats: [
      { name: "Netflix", count: 25, percentage: 40, color: "red" },
      { name: "Disney+", count: 18, percentage: 30, color: "blue" },
      { name: "Prime Video", count: 12, percentage: 20, color: "orange" },
      { name: "其他", count: 6, percentage: 10, color: "gray" },
    ],
    platformCompletion: [
      { name: "Netflix", completion: 85 },
      { name: "Disney+", completion: 72 },
      { name: "Prime Video", completion: 90 },
      { name: "Hulu", completion: 68 },
    ],
    activityTimeline: [
      { date: "周一", additions: 3, completions: 5, updates: 2 },
      { date: "周二", additions: 2, completions: 3, updates: 4 },
      { date: "周三", additions: 4, completions: 6, updates: 1 },
      { date: "周四", additions: 1, completions: 4, updates: 3 },
      { date: "周五", additions: 5, completions: 7, updates: 2 },
      { date: "周六", additions: 2, completions: 2, updates: 1 },
      { date: "周日", additions: 3, completions: 4, updates: 2 },
    ],
  }
}
