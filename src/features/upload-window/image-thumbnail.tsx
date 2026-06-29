'use client';

import React, { useCallback, useState, useRef } from 'react';
import { useUploadStore, type FileEntry } from '@/stores/upload-store';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface ImageThumbnailProps {
  file: FileEntry;
  size?: 'sm' | 'md' | 'lg';
  showInfo?: boolean;
  onDragStart?: (e: React.DragEvent, file: FileEntry) => void;
}

function isElectronApp(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return !!(window as any).electronAPI || !!(window as any).isElectronApp;
}

export function ImageThumbnail({
  file,
  size = 'md',
  showInfo = false,
  onDragStart,
}: ImageThumbnailProps) {
  const uploadedPaths = useUploadStore((s) => s.uploadedPaths);
  const markAsUploaded = useUploadStore((s) => s.markAsUploaded);

  const isUploaded = uploadedPaths.includes(file.relativePath);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const filePathCache = useRef<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const widthClass = {
    sm: 'w-12',
    md: 'w-full',
    lg: 'w-40',
  }[size];

  const handleDragStartInternal = useCallback(
    (e: React.DragEvent) => {
      if (isUploaded) {
        return;
      }

      const electron = isElectronApp();
      const fileObj = file.fileObj;

      if (electron && fileObj) {
        // Electron: blob: URLs are scoped per-webContents and cannot be
        // resolved externally. Use the real file path as a file:// URL.
        let filePath = filePathCache.current || (fileObj as any).path;
        if (!filePath) {
          try {
            filePath = (window as any).electronAPI?.getFilePath?.(fileObj);
          } catch (_) {
            /* ignore */
          }
        }
        if (filePath) {
          filePathCache.current = filePath;
          const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
          e.dataTransfer.setData('text/uri-list', fileUrl);
        } else {
          // No real file path available, fall back to blob URL
          e.dataTransfer.setData('text/uri-list', file.thumbnailUrl || '');
        }
      } else {
        // Browser: use standard HTML5 drag with blob URL
        e.dataTransfer.setData('text/uri-list', file.thumbnailUrl || '');
      }

      e.dataTransfer.setData('text/plain', file.name);
      e.dataTransfer.effectAllowed = 'copy';
      if (fileObj) {
        e.dataTransfer.items.add(fileObj);
      }

      // Drag preview: render thumbnail into a canvas for a clean look
      const img = imgRef.current;
      if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
        const maxSize = 180;
        const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
        const cw = Math.round(img.naturalWidth * scale);
        const ch = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.globalAlpha = 0.85;
          ctx.drawImage(img, 0, 0, cw, ch);
        }
        e.dataTransfer.setDragImage(canvas, cw / 2, ch / 2);
      }

      markAsUploaded(file.relativePath);
      onDragStart?.(e, file);
    },
    [file, isUploaded, markAsUploaded, onDragStart]
  );

  return (
    <div
      draggable={!isUploaded}
      onDragStart={handleDragStartInternal}
      className={cn(
        'relative group rounded-lg overflow-hidden border-2 transition-all duration-200 select-none',
        isUploaded
          ? 'border-border opacity-50 grayscale cursor-default'
          : 'border-transparent hover:border-blue-400 cursor-grab active:cursor-grabbing hover:shadow-lg hover:shadow-blue-500/10'
      )}
    >
      <div className={cn(widthClass, 'flex items-center justify-center bg-muted')}>
        {file.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={file.thumbnailUrl}
            alt={file.name}
            className="w-full h-auto object-contain max-h-48"
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            }}
          />
        ) : (
          <div className="text-gray-400 text-xs py-4">
            {file.name.split('.').pop()?.toUpperCase()}
          </div>
        )}
      </div>

      {isUploaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <CheckCircle2 className="w-8 h-8 text-green-500 drop-shadow-lg" />
        </div>
      )}

      {showInfo && (
        <div className="px-1 py-0.5 text-[10px] text-muted-foreground bg-background/80 leading-tight">
          <div className="truncate">{file.name}</div>
          {dimensions && (
            <div className="text-[9px] text-muted-foreground">
              {dimensions.width} × {dimensions.height}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
