'use client';

import React, { useState, useMemo } from 'react';
import { ExternalLink, Filter, TrendingUp, Star, Globe, Play, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PlatformLogo from './platform-logo';
import { 
  platforms, 
  categories, 
  getFilteredPlatforms, 
  type CategoryType, 
  type Platform 
} from '@/lib/platform-data';

const StreamingPlatformNav: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('全部');

  // 筛选逻辑
  const filteredPlatforms = useMemo(() => {
    return getFilteredPlatforms(selectedCategory);
  }, [selectedCategory]);

  // 处理平台卡片点击
  const handlePlatformClick = (platform: Platform) => {
    window.open(platform.url, '_blank', 'noopener,noreferrer');
  };

  // 渲染星级评分
  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-3 h-3 fill-yellow-400/50 text-yellow-400" />);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-3 h-3 text-gray-300 dark:text-gray-600" />);
    }
    
    return stars;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-blue-950/30 dark:to-purple-950/30 relative overflow-hidden">

      {/* 精细网格背景 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(147,197,253,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(147,197,253,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* 头部区域容器 - 统一左对齐 */}
        <div className="max-w-7xl mx-auto">
          {/* 精美的页面标题区域 - 居左显示 */}
          <div className="text-left mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-600 to-purple-600 dark:from-white dark:via-blue-300 dark:to-purple-300 bg-clip-text text-transparent">
                  流媒体宇宙
                </h1>
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
              探索全球顶级流媒体平台，获取丰富的元数据信息
            </p>
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>全球覆盖</span>
              </div>
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>精选推荐</span>
              </div>
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>实时更新</span>
              </div>
            </div>
          </div>

          {/* 分类筛选区域 - 居左显示 */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "transition-all duration-300 rounded-full",
                    selectedCategory === category
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                      : "bg-white dark:bg-slate-800/90 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-purple-400/50 hover:scale-105 hover:shadow-md"
                  )}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* 平台网格 - 横向卡片设计 */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
            {filteredPlatforms.map((platform, index) => (
              <div
                key={platform.id}
                onClick={() => handlePlatformClick(platform)}
                className="group relative bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 dark:border-slate-700/50 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 overflow-hidden"
              >
                {/* 外链图标 */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <ExternalLink className="w-4 h-4 text-gray-400 hover:text-blue-500" />
                </div>

                {/* 卡片内容 */}
                <div className="p-4">
                  {/* Logo和标题区域 */}
                  <div className="flex items-center gap-3">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600 rounded-xl shadow-sm border border-gray-200/50 dark:border-slate-600/50 p-2 group-hover:scale-105 transition-transform duration-300">
                        <PlatformLogo 
                          name={platform.name}
                          logoUrl={platform.logoUrl}
                          size="sm"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                    </div>

                    {/* 标题和描述 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                        {platform.name}
                      </h3>
                      <div className="relative group/tooltip">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-relaxed">
                          {platform.description}
                        </p>
                        {/* 悬停时显示完整描述的tooltip - 智能定位 */}
                        <div className="absolute left-0 bottom-full mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none w-64 whitespace-normal transform -translate-x-1/2 left-1/2" style={{ zIndex: 10000 }}>
                          {platform.description}
                          {/* 小箭头 */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 悬停时的底部装饰条 */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                
                {/* 悬停时的背景光效 */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />
              </div>
            ))}
          </div>
        </div>

        {/* 空状态 - 重新设计 */}
        {filteredPlatforms.length === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="relative mb-8">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center">
                  <Filter className="w-16 h-16 text-blue-400 dark:text-purple-400" />
                </div>
                <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full animate-ping" />
              </div>
              <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4">
                未找到匹配的平台
              </h3>
              <p className="text-gray-500 dark:text-gray-500 mb-6 leading-relaxed">
                尝试选择不同的分类<br />
                我们正在不断添加更多优质平台
              </p>
              <Button
                onClick={() => {
                  setSelectedCategory('全部');
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full hover:scale-105 transition-transform duration-300 shadow-lg shadow-blue-500/25"
              >
                重置筛选条件
              </Button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default StreamingPlatformNav;

// 确保组件有正确的显示名称
StreamingPlatformNav.displayName = 'StreamingPlatformNav';