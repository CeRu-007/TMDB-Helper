declare module "@tanstack/react-virtual" {
  import * as React from 'react'

  interface VirtualizerOptions<T> {
    count: number;
    getScrollElement: () => Element | null;
    estimateSize: (index: number) => number;
    overscan?: number;
  }

  interface Virtualizer<T> {
    getVirtualItems: () => Array<{
      index: number;
      size: number;
      start: number;
      end: number;
    }>;
    getTotalSize: () => number;
    scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' }) => void;
  }

  export function useVirtualizer<T>(options: VirtualizerOptions<T>): Virtualizer<T>;
} 