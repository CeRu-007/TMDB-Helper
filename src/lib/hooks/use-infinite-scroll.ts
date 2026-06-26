"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export function useInfiniteScroll<T>(items: T[], pageSize = 20) {
  const [displayCount, setDisplayCount] = useState(pageSize)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const visibleItems = items.slice(0, displayCount)
  const hasMore = displayCount < items.length

  const reset = useCallback(() => {
    setDisplayCount(pageSize)
  }, [pageSize])

  useEffect(() => {
    if (items.length > 0 && displayCount > items.length) {
      setDisplayCount(items.length)
    }
  }, [items.length, displayCount])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setDisplayCount(prev => Math.min(prev + pageSize, items.length))
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, pageSize, items.length])

  return { visibleItems, sentinelRef, hasMore, reset }
}
