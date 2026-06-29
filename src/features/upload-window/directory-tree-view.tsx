'use client';

import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUploadStore } from '@/stores/upload-store';
import { ImageThumbnail } from './image-thumbnail';
import { cn } from '@/lib/utils';
import { ChevronRight, FolderOpen, Folder } from 'lucide-react';

export function DirectoryTreeView() {
  const { t } = useTranslation('upload-window');
  const files = useUploadStore((s) => s.files);
  const tree = useUploadStore((s) => s.tree);
  const columnPaths = useUploadStore((s) => s.columnPaths);
  const setColumnPath = useUploadStore((s) => s.setColumnPath);
  const getColumnContents = useUploadStore((s) => s.getColumnContents);

  const columns = useMemo(() => {
    const cols: { dirs: typeof tree; files: typeof files; path: string | null }[] = [];
    for (let i = 0; i < columnPaths.length; i++) {
      const path = columnPaths[i] ?? null;
      const { dirs, files: dirFiles } = getColumnContents(path);
      cols.push({ dirs, files: dirFiles, path });
    }
    return cols;
  }, [columnPaths, getColumnContents]);

  const handleDirClick = useCallback(
    (path: string, colIndex: number) => {
      setColumnPath(colIndex, path);
    },
    [setColumnPath]
  );

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="flex h-full overflow-hidden">
      {columns.map((col, colIdx) => (
        <div
          key={colIdx}
          className={cn(
            'flex-shrink-0 border-r border-border overflow-y-auto',
            colIdx === columns.length - 1 ? 'flex-1' : 'w-44'
          )}
        >
          {col.dirs.length > 0 && (
            <div className="border-b border-border">
              {col.dirs.map((dir) => (
                <button
                  key={dir.path}
                  onClick={() => handleDirClick(dir.path, colIdx)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50',
                    columnPaths[colIdx + 1]?.startsWith(dir.path)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-foreground'
                  )}
                >
                  {columnPaths[colIdx + 1]?.startsWith(dir.path) ? (
                    <FolderOpen className="w-4 h-4 flex-shrink-0 text-blue-500" />
                  ) : (
                    <Folder className="w-4 h-4 flex-shrink-0 text-amber-500" />
                  )}
                  <span className="truncate flex-1">{dir.name}</span>
                  <ChevronRight className="w-3 h-3 flex-shrink-0 text-gray-400" />
                </button>
              ))}
            </div>
          )}
          <div
            className={cn(
              'p-2',
              colIdx === columns.length - 1 ? 'grid grid-cols-2 sm:grid-cols-3 gap-2' : ''
            )}
          >
            {colIdx === columns.length - 1
              ? col.files.length > 0
                ? col.files.map((f) => <ImageThumbnail key={f.id} file={f} showInfo />)
                : col.dirs.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-400 text-sm">
                      {col.path === null ? t('selectFolderHint') : t('noImagesInDir')}
                    </div>
                  )
              : null}
          </div>
        </div>
      ))}
    </div>
  );
}
