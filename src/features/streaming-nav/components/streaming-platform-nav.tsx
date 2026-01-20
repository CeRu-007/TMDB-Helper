'use client';

import React, { useState, useMemo } from 'react';
import { ExternalLink, Filter, TrendingUp, Star, Globe, Play, Sparkles, GripVertical, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import PlatformLogo from './platform-logo';
import SmartTooltip from './smart-tooltip';
import { 
  categories, 
  getFilteredPlatforms, 
  type CategoryType, 
  type Platform 
} from '@/lib/media/platform-data';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 可排序的平台卡片组件
const SortablePlatformCard: React.FC<{
  platform: Platform;
  onPlatformClick: (platform: Platform) => void;
  isDragMode: boolean;
}> = ({ platform, onPlatformClick, isDragMode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: platform.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 dark:border-slate-700/50 transition-all duration-300",
        isDragMode 
          ? "cursor-grab active:cursor-grabbing overflow-hidden" 
          : "cursor-pointer hover:scale-[1.02] hover:-translate-y-1 hover:z-40 overflow-visible",
        isDragging && "opacity-50 scale-105 shadow-2xl z-50",
        isDragMode && "border-blue-300 dark:border-blue-600 shadow-blue-100 dark:shadow-blue-900/20"
      )}
      {...(isDragMode ? { ...attributes, ...listeners } : {})}
      onClick={isDragMode ? undefined : () => onPlatformClick(platform)}
    >
      {/* 拖拽模式指示器 */}
      {isDragMode && (
        <div className="absolute top-2 left-2 z-10">
          <GripVertical className="w-4 h-4 text-blue-500 dark:text-blue-400" />
        </div>
      )}

      {/* 外链图标 */}
      {!isDragMode && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <ExternalLink className="w-4 h-4 text-gray-400 hover:text-blue-500" />
        </div>
      )}

      {/* 卡片内容 */}
      <div className="p-4">
        {/* Logo和标题区域 */}
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className={cn(
            "flex-shrink-0 transition-transform duration-300",
            !isDragMode && "group-hover:scale-105"
          )}>
            <PlatformLogo 
              name={platform.name}
              logoUrl={platform.logoUrl}
              size="sm"
            />
          </div>

          {/* 标题和描述 */}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate transition-colors duration-300",
              !isDragMode && "group-hover:text-blue-600 dark:group-hover:text-blue-400"
            )}>
              {platform.name}
            </h3>
            <SmartTooltip platform={platform} disabled={isDragMode}>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-relaxed cursor-help">
                {platform.description}
              </p>
            </SmartTooltip>
          </div>
        </div>
      </div>

      {/* 悬停时的底部装饰条 */}
      {!isDragMode && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      )}
      
      {/* 悬停时的背景光效 */}
      {!isDragMode && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />
      )}
    </div>
  );
};

const StreamingPlatformNav: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('全部');
  const [platforms, setPlatforms] = useState<Platform[]>(() => {
    // 从本地存储加载自定义排序
    const savedOrder = localStorage.getItem('platformOrder');
    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        const allPlatforms = getFilteredPlatforms('全部');
        // 根据保存的顺序重新排序平台
        return allPlatforms.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      } catch (e) {
        
        return getFilteredPlatforms('全部');
      }
    }
    return getFilteredPlatforms('全部');
  });
  const [isDragMode, setIsDragMode] = useState(false);

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 筛选逻辑
  const filteredPlatforms = useMemo(() => {
    if (selectedCategory === '全部') {
      return platforms;
    }
    return platforms.filter(platform => platform.category === selectedCategory);
  }, [selectedCategory, platforms]);

  // 处理分类切换
  const handleCategoryChange = (category: CategoryType) => {
    setSelectedCategory(category);
    if (category === '全部') {
      setPlatforms(getFilteredPlatforms('全部'));
    } else {
      setPlatforms(getFilteredPlatforms(category));
    }
  };

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPlatforms((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // 保存新的排序到本地存储
        const newOrder = newItems.map(item => item.id);
        localStorage.setItem('platformOrder', JSON.stringify(newOrder));
        
        return newItems;
      });
    }
  };

  // 处理平台卡片点击
  const handlePlatformClick = (platform: Platform) => {
    window.open(platform.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-blue-950/30 dark:to-purple-950/30 relative overflow-hidden">

      {/* 精细网格背景 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(147,197,253,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(147,197,253,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="relative z-10 w-full px-4 sm:px-6 py-8">
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
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-600 to-purple-600 dark:from-white dark:via-blue-300 dark:to-purple-300 bg-clip-text text-transparent">
                  流媒体平台导航
                </h1>
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
              探索全球顶级流媒体平台，获取丰富的元数据信息
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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

          {/* 分类筛选和排序控制区域 */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* 分类筛选 */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCategoryChange(category)}
                    disabled={isDragMode}
                    className={cn(
                      "transition-all duration-300 rounded-full text-xs sm:text-sm",
                      selectedCategory === category
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-105"
                        : "bg-white dark:bg-slate-800/90 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-purple-400/50 hover:scale-105 hover:shadow-md",
                      isDragMode && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {category}
                  </Button>
                ))}
              </div>

              {/* 排序控制按钮 */}
              <Button
                variant={isDragMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsDragMode(!isDragMode)}
                className={cn(
                  "transition-all duration-300 rounded-full flex items-center gap-2 text-xs sm:text-sm",
                  isDragMode
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30"
                    : "bg-white dark:bg-slate-800/90 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-orange-300 dark:hover:border-orange-400/50 hover:scale-105 hover:shadow-md"
                )}
              >
                <ArrowUpDown className="w-4 h-4" />
                {isDragMode ? '完成排序' : '自定义排序'}
              </Button>
            </div>

            {/* 拖拽模式提示 */}
            {isDragMode && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <GripVertical className="w-4 h-4" />
                  拖拽模式已启用：直接拖拽卡片来重新排序，点击"完成排序"退出
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 平台网格 - 可拖拽排序 */}
        <div className="max-w-7xl mx-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredPlatforms.map(p => p.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 mb-8 py-6">
                {filteredPlatforms.map((platform) => (
                  <SortablePlatformCard
                    key={platform.id}
                    platform={platform}
                    onPlatformClick={handlePlatformClick}
                    isDragMode={isDragMode}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
                onClick={() => handleCategoryChange('全部')}
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