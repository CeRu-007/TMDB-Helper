/**
 * Simplified state management utilities
 */

import { useState, useCallback } from 'react'

/**
 * Creates a state manager with grouped state and actions
 */
export function useStateManager<T extends Record<string, unknown>>(initialState: T) {
  const [state, setState] = useState(initialState)

  const updateState = useCallback(<K extends keyof T>(
    key: K,
    value: T[K]
  ) => {
    setState(prev => ({ ...prev, [key]: value }))
  }, [])

  const updateMultipleStates = useCallback((updates: Partial<T>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const resetState = useCallback(() => {
    setState(initialState)
  }, [initialState])

  return {
    state,
    setState,
    updateState,
    updateMultipleStates,
    resetState
  }
}

/**
 * Creates a dialog state manager
 */
export function useDialogState(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(prev => !prev), [])

  return {
    isOpen,
    setIsOpen,
    open,
    close,
    toggle
  }
}

/**
 * Creates a list state manager with common operations
 */
export function useListState<T>(initialItems: T[] = []) {
  const [items, setItems] = useState<T[]>(initialItems)

  const addItem = useCallback((item: T) => {
    setItems(prev => [...prev, item])
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateItem = useCallback((index: number, item: T) => {
    setItems(prev => prev.map((_, i) => i === index ? item : prev[i]))
  }, [])

  const clearItems = useCallback(() => {
    setItems([])
  }, [])

  return {
    items,
    setItems,
    addItem,
    removeItem,
    updateItem,
    clearItems
  }
}

/**
 * Creates a form state manager with validation
 */
export function useFormState<T extends Record<string, unknown>>(
  initialState: T,
  validate?: (values: T) => Record<string, string>
) {
  const [values, setValues] = useState<T>(initialState)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setTouched(prev => ({ ...prev, [field]: true }))
  }, [])

  const setError = useCallback((field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const validateForm = useCallback(() => {
    if (!validate) return true

    const newErrors = validate(values)
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [values, validate])

  const resetForm = useCallback(() => {
    setValues(initialState)
    setErrors({})
    setTouched({})
  }, [initialState])

  return {
    values,
    errors,
    touched,
    setValue,
    setError,
    clearErrors,
    validateForm,
    resetForm,
    setValues,
    setTouched
  }
}