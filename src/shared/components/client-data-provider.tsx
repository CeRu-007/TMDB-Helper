"use client"

import React, { createContext, useContext, ReactNode } from "react"
import { TMDBItem } from "@/lib/data/storage"
import { useDataSync } from "@/shared/hooks/use-data-sync"
import { useDataOperations } from "@/shared/hooks/use-data-operations"

interface DataContextType {
  items: TMDBItem[]
  baseItems: TMDBItem[]
  loading: boolean
  error: string | null
  initialized: boolean
  isConnected: boolean
  pendingOperations: number
  refreshData: () => Promise<void>
  addItem: (item: TMDBItem) => Promise<void>
  updateItem: (item: TMDBItem) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  exportData: () => Promise<void>
  importData: (jsonData: string) => Promise<void>
  clearError: () => void
  getOptimisticStats: () => any
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function useData(): DataContextType {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}

export function DataProvider({ children }: { children: ReactNode }): JSX.Element {
  const { items, error, initialized, isConnected, refreshData, setError } = useDataSync()
  const operations = useDataOperations(items, items => {/* handled by useDataSync */}, setError)

  const value: DataContextType = {
    items,
    baseItems: items,
    loading: operations.loading,
    error,
    initialized,
    isConnected,
    pendingOperations: operations.pendingOperations,
    refreshData,
    addItem: operations.addItem,
    updateItem: operations.updateItem,
    deleteItem: operations.deleteItem,
    exportData: operations.exportData,
    importData: operations.importData,
    clearError: operations.clearError,
    getOptimisticStats: operations.getOptimisticStats
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
} 