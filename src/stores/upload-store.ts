import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface FileEntry {
  id: string
  name: string
  relativePath: string
  size: number
  type: string
  isDirectory: boolean
  thumbnailUrl?: string
  fileObj?: File
}

interface ColumnNode {
  name: string
  path: string
  isDirectory: boolean
  children?: ColumnNode[]
}

interface UploadState {
  isOpen: boolean
  isPinned: boolean
  layout: 'tree' | 'list'
  position: { x: number; y: number }
  size: { width: number; height: number }
  lastDirectoryName: string | null
  files: FileEntry[]
  tree: ColumnNode[]
  columnPaths: (string | null)[]
  uploadedPaths: string[]
  pendingUploadFileId: string | null
}

interface UploadActions {
  toggleOpen: () => void
  setOpen: (open: boolean) => void
  togglePin: () => void
  setLayout: (layout: 'tree' | 'list') => void
  setPosition: (pos: { x: number; y: number }) => void
  setSize: (size: { width: number; height: number }) => void
  loadFiles: (files: FileEntry[], dirName: string) => void
  clearFiles: () => void
  markAsUploaded: (path: string) => void
  setPendingUpload: (fileId: string | null) => void
  setColumnPath: (index: number, path: string | null) => void
  resetColumns: () => void
  goToLevel: (level: number) => void
  getColumnContents: (path: string | null) => { dirs: ColumnNode[]; files: FileEntry[] }
}

const initialState: UploadState = {
  isOpen: false,
  isPinned: false,
  layout: 'tree',
  position: { x: 100, y: 80 },
  size: { width: 720, height: 520 },
  lastDirectoryName: null,
  files: [],
  tree: [],
  columnPaths: [null],
  uploadedPaths: [],
  pendingUploadFileId: null,
}

export const useUploadStore = create<UploadState & UploadActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        toggleOpen: () => set((s) => ({ isOpen: !s.isOpen }), false, 'uploadToggleOpen'),
        setOpen: (open) => set({ isOpen: open }, false, 'uploadSetOpen'),
        togglePin: () => set((s) => ({ isPinned: !s.isPinned }), false, 'uploadTogglePin'),
        setLayout: (layout) => set({ layout }, false, 'uploadSetLayout'),
        setPosition: (position) => set({ position }, false, 'uploadSetPosition'),
        setSize: (size) => set({ size }, false, 'uploadSetSize'),

        loadFiles: (files, dirName) => {
          const tree = buildTree(files)
          set({
            files,
            tree,
            lastDirectoryName: dirName,
            columnPaths: [null],
            uploadedPaths: [],
          }, false, 'uploadLoadFiles')
        },

        clearFiles: () => set({
          files: [],
          tree: [],
          columnPaths: [null],
          uploadedPaths: [],
        }, false, 'uploadClearFiles'),

        markAsUploaded: (path) => set((s) => ({
          uploadedPaths: s.uploadedPaths.includes(path) ? s.uploadedPaths : [...s.uploadedPaths, path],
        }), false, 'uploadMarkAsUploaded'),

        setPendingUpload: (fileId) => set({ pendingUploadFileId: fileId }, false, 'uploadSetPendingUpload'),

        setColumnPath: (index, path) => set((s) => {
          const cols = [...s.columnPaths]
          cols[index] = path
          cols.splice(index + 1)
          return { columnPaths: cols }
        }, false, 'uploadSetColumnPath'),

        resetColumns: () => set({ columnPaths: [null] }, false, 'uploadResetColumns'),

        goToLevel: (level) => set((s) => {
          const cols = s.columnPaths.slice(0, level + 1)
          return { columnPaths: cols }
        }, false, 'uploadGoToLevel'),

        getColumnContents: (colPath) => {
          const state = get()
          if (colPath === null) {
            const dirs = state.tree
            const rootFiles = state.files.filter((f) => {
              const parts = f.relativePath.replace(/\\/g, '/').split('/')
              return parts.length === 1
            })
            return { dirs, files: rootFiles }
          }
          const dirs = getSubDirs(state.tree, colPath)
          const files = state.files.filter((f) => {
            const parts = f.relativePath.replace(/\\/g, '/').split('/')
            const dirPath = parts.slice(0, -1).join('/')
            return dirPath === colPath
          })
          return { dirs, files }
        },
      }),
      {
        name: 'upload-store',
        partialize: (state) => ({
          isPinned: state.isPinned,
          layout: state.layout,
          position: state.position,
          size: state.size,
          lastDirectoryName: state.lastDirectoryName,
          uploadedPaths: state.uploadedPaths,
          cachedFiles: state.files.length > 0
            ? state.files.map((f) => ({
                id: f.id, name: f.name, relativePath: f.relativePath,
                size: f.size, type: f.type, isDirectory: f.isDirectory,
              }))
            : undefined,
        }),
        merge: (persisted, current) => {
          const p = persisted as Record<string, unknown>
          const merged = { ...current, ...persisted }
          if (p.cachedFiles && Array.isArray(p.cachedFiles) && p.cachedFiles.length > 0) {
            const restored = p.cachedFiles as FileEntry[]
            merged.files = restored
            merged.tree = buildTree(restored)
            merged.columnPaths = [null]
          }
          return merged
        },
      }
    ),
    { name: 'UploadStore' }
  )
)

function buildTree(files: FileEntry[]): ColumnNode[] {
  const root = new Map<string, any>()
  for (const file of files) {
    const parts = file.relativePath.replace(/\\/g, '/').split('/')
    let current: Map<string, any> = root
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!
      if (!current.has(part)) {
        current.set(part, new Map())
      }
      current = current.get(part)!
    }
  }
  function mapToNodes(map: Map<string, any>, parentPath = ''): ColumnNode[] {
    const nodes: ColumnNode[] = []
    for (const [name, children] of map) {
      const path = parentPath ? `${parentPath}/${name}` : name
      nodes.push({
        name,
        path,
        isDirectory: true,
        children: mapToNodes(children, path),
      })
    }
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    return nodes
  }
  return mapToNodes(root)
}

function getSubDirs(nodes: ColumnNode[], targetPath: string): ColumnNode[] {
  for (const node of nodes) {
    if (node.path === targetPath) {
      return node.children || []
    }
    if (node.children) {
      const found = getSubDirs(node.children, targetPath)
      if (found.length > 0 || node.children.some((c) => c.path === targetPath)) return found
    }
  }
  return []
}
