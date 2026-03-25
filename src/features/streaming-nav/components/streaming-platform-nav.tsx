'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Search, GripVertical, ArrowUpDown, Heart, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/shared/components/ui/input';
import PlatformLogo from './platform-logo';
import SmartTooltip from './smart-tooltip';
import {
  categories,
  getFilteredPlatforms,
  type CategoryType,
  type Platform,
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const CATEGORY_ALL = 'all';
const CATEGORY_MY_FAVORITES = 'myFavorites';
const CATEGORY_RECENTLY_USED = 'recentlyUsed';
type ExtendedCategoryType = CategoryType | typeof CATEGORY_MY_FAVORITES | typeof CATEGORY_RECENTLY_USED;

interface SortablePlatformCardProps {
  platform: Platform;
  onPlatformClick: (platform: Platform) => void;
  isDragMode: boolean;
  isFavorite: boolean;
  onToggleFavorite: (platformId: string) => void;
  t: (key: string, options?: any) => string;
}

function SortablePlatformCard({
  platform,
  onPlatformClick,
  isDragMode,
  isFavorite,
  onToggleFavorite,
  t,
}: SortablePlatformCardProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: platform.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 dark:border-slate-700/50 transition-all duration-300',
        isDragMode
          ? 'cursor-grab active:cursor-grabbing overflow-hidden'
          : 'cursor-pointer hover:scale-[1.02] hover:-translate-y-1 hover:z-40 overflow-visible',
        isDragging && 'opacity-50 scale-105 shadow-2xl z-50',
        isDragMode && 'border-blue-300 dark:border-blue-600 shadow-blue-100 dark:shadow-blue-900/20'
      )}
      {...(isDragMode ? { ...attributes, ...listeners } : {})}
      onClick={isDragMode ? undefined : () => onPlatformClick(platform)}
    >
      {isDragMode && (
        <div className="absolute top-2 left-2 z-10">
          <GripVertical className="w-4 h-4 text-blue-500 dark:text-blue-400" />
        </div>
      )}

      {!isDragMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(platform.id);
          }}
          className={cn(
            'absolute top-2 right-2 z-20 p-1.5 rounded-full transition-all duration-200',
            isFavorite
              ? 'bg-red-50 dark:bg-red-900/30 text-red-500'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-slate-600'
          )}
          title={isFavorite ? t("removeFromFavorites") : t("addToFavorites")}
        >
          <Heart className={cn('w-3.5 h-3.5', isFavorite && 'fill-current')} />
        </button>
      )}

      {!isDragMode && (
        <div className="absolute top-2 right-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex-shrink-0 transition-transform duration-300', !isDragMode && 'group-hover:scale-105')}>
            {platform.logoUrl ? (
              <PlatformLogo name={platform.name} logoUrl={platform.logoUrl} size="sm" />
            ) : platform.fallbackEmoji ? (
              <PlatformLogo name={platform.name} fallbackEmoji={platform.fallbackEmoji} size="sm" />
            ) : (
              <PlatformLogo name={platform.name} size="sm" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                'font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate transition-colors duration-300',
                !isDragMode && 'group-hover:text-blue-600 dark:group-hover:text-blue-400'
              )}
            >
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

      {!isDragMode && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      )}

      {!isDragMode && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />
      )}
    </div>
  );
}

function loadStringArrayFromStorage(key: string): string[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const saved = localStorage.getItem(key);
  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function loadPlatformOrder(): Platform[] {
  if (typeof window === 'undefined') {
    return getFilteredPlatforms('all');
  }
  const savedOrder = localStorage.getItem('platformOrder');
  if (!savedOrder) {
    return getFilteredPlatforms('all');
  }

  try {
    const order = JSON.parse(savedOrder);
    const allPlatforms = getFilteredPlatforms('all');
    return allPlatforms.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  } catch {
    return getFilteredPlatforms('all');
  }
}

function StreamingPlatformNav(): JSX.Element {
  const { t } = useTranslation('nav.platforms')
  const [selectedCategory, setSelectedCategory] = useState<ExtendedCategoryType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isDragMode, setIsDragMode] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setFavorites(loadStringArrayFromStorage('platformFavorites'));
    setRecentlyUsed(loadStringArrayFromStorage('platformRecentlyUsed'));
    setPlatforms(loadPlatformOrder());
    setIsHydrated(true);
  }, []);

  const tMyFavorites = 'myFavorites';
  const tRecentlyUsed = 'recentlyUsed';
  const tAll = 'all';

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

  function toggleFavorite(platformId: string): void {
    setFavorites((prev) => {
      const newFavorites = prev.includes(platformId) ? prev.filter((id) => id !== platformId) : [...prev, platformId];
      localStorage.setItem('platformFavorites', JSON.stringify(newFavorites));
      return newFavorites;
    });
  }

  function addToRecentlyUsed(platformId: string): void {
    setRecentlyUsed((prev) => {
      const newRecent = [platformId, ...prev.filter((id) => id !== platformId)].slice(0, 10);
      localStorage.setItem('platformRecentlyUsed', JSON.stringify(newRecent));
      return newRecent;
    });
  }

  const filteredPlatforms = useMemo(() => {
    let result = platforms;

    if (selectedCategory === tMyFavorites) {
      result = result.filter((platform) => favorites.includes(platform.id));
    } else if (selectedCategory === tRecentlyUsed) {
      const recentPlatforms = recentlyUsed
        .map((id) => platforms.find((p) => p.id === id))
        .filter((p): p is Platform => p !== undefined);
      return recentPlatforms;
    } else if (selectedCategory !== tAll) {
      result = result.filter((platform) => platform.region === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (platform) =>
          platform.name.toLowerCase().includes(query) || platform.description.toLowerCase().includes(query)
      );
    }

    return result;
  }, [selectedCategory, platforms, searchQuery, favorites, recentlyUsed, tMyFavorites, tRecentlyUsed, tAll]);

  function handleCategoryChange(category: ExtendedCategoryType): void {
    setSelectedCategory(category);
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setPlatforms((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);

      const newOrder = newItems.map((item) => item.id);
      localStorage.setItem('platformOrder', JSON.stringify(newOrder));

      return newItems;
    });
  }

  function handlePlatformClick(platform: Platform): void {
    addToRecentlyUsed(platform.id);
    window.open(platform.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8881_1px,transparent_1px),linear-gradient(to_bottom,#8881_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto mb-8">
          <div className="relative mb-6">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
              <Search className="w-5 h-5" />
            </div>
            <Input
              type="text"
              placeholder={t("searchPlatforms")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 text-base bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-slate-900/50 focus-visible:ring-2 focus-visible:ring-blue-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                disabled={isDragMode}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-full transition-all duration-200',
                  selectedCategory === category
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800',
                  isDragMode && 'opacity-50 cursor-not-allowed'
                )}
              >
                {category === 'all' ? t('all') : t(category, { ns: 'nav.platforms' })}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(selectedCategory === tMyFavorites || selectedCategory === tRecentlyUsed) && (
              <button
                onClick={() => handleCategoryChange(tAll)}
                className="flex items-center gap-1 px-2 py-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("back")}
              </button>
            )}
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {searchQuery
                  ? t("searchResultsFor", { query: searchQuery })
                  : selectedCategory === tAll
                    ? t("allPlatforms")
                    : selectedCategory === 'all' ? t('all') : t(selectedCategory, { ns: 'nav.platforms' })}
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">({filteredPlatforms.length})</span>
            </div>
          </div>

          <button
            onClick={() => setIsDragMode(!isDragMode)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all duration-200',
              isDragMode
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            )}
          >
            <ArrowUpDown className="w-4 h-4" />
            {isDragMode ? t("completeSort") : t("sort")}
          </button>
        </div>

        {selectedCategory !== tMyFavorites && selectedCategory !== tRecentlyUsed && !searchQuery && (
          <div className="max-w-7xl mx-auto mb-6">
            <div className="inline-flex items-center bg-gray-100 dark:bg-slate-800 rounded-full p-1">
              <button
                onClick={() => handleCategoryChange(tMyFavorites)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                  favorites.length > 0
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                )}
              >
                <Heart className={cn('w-3.5 h-3.5', favorites.length > 0 && 'fill-current')} />
                <span>{t("myFavorites")}</span>
                {favorites.length > 0 && (
                  <span className="ml-0.5 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">{favorites.length}</span>
                )}
              </button>

              <button
                onClick={() => recentlyUsed.length > 0 && handleCategoryChange(tRecentlyUsed)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                  recentlyUsed.length > 0
                    ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    : 'text-gray-400 dark:text-gray-500 cursor-default'
                )}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{t("recentlyUsed")}</span>
                {recentlyUsed.length > 0 && (
                  <span className="ml-0.5 text-xs bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full">
                    {recentlyUsed.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {isDragMode && (
          <div className="max-w-7xl mx-auto mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <GripVertical className="w-4 h-4" />
            {t("dragCardsToReorder")}
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredPlatforms.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {filteredPlatforms.map((platform) => (
                  <SortablePlatformCard
                    key={platform.id}
                    platform={platform}
                    onPlatformClick={handlePlatformClick}
                    isDragMode={isDragMode}
                    isFavorite={favorites.includes(platform.id)}
                    onToggleFavorite={toggleFavorite}
                    t={t}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {filteredPlatforms.length === 0 && (
          <div className="max-w-7xl mx-auto text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 mb-4">{t("noMatchingPlatforms")}</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t("clearFilters")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

StreamingPlatformNav.displayName = 'StreamingPlatformNav';

export default StreamingPlatformNav;