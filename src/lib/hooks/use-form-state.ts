/**
 * 表单状态管理 Hook
 *
 * 简化表单状态管理，提供验证、重置和提交功能
 */

import { useState, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'

export interface FormFieldConfig<T = unknown> {
  value: T
  required?: boolean
  validator?: (value: T) => string | null
}

export interface FormState<T> {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isValid: boolean
  isDirty: boolean
}

export interface UseFormStateOptions<T> {
  initialValues: T
  validators?: Partial<Record<keyof T, (value: unknown) => string | null>>
  onSubmit?: (values: T) => Promise<void> | void
  onValidate?: (values: T) => Partial<Record<keyof T, string>>
}

export function useFormState<T extends Record<string, unknown>>({
  initialValues,
  validators = {},
  onSubmit,
  onValidate
}: UseFormStateOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // 验证单个字段
  const validateField = useCallback((field: keyof T, value: unknown): string | null => {
    const validator = validators[field]
    if (validator) {
      return validator(value)
    }
    return null
  }, [validators])

  // 验证所有字段
  const validateAll = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {}
    let isValid = true

    Object.keys(validators).forEach((key) => {
      const field = key as keyof T
      const error = validateField(field, values[field])
      if (error) {
        newErrors[field] = error
        isValid = false
      }
    })

    if (onValidate) {
      const customErrors = onValidate(values)
      Object.assign(newErrors, customErrors)
      if (Object.keys(customErrors).length > 0) {
        isValid = false
      }
    }

    setErrors(newErrors)
    return isValid
  }, [values, validators, validateField, onValidate])

  // 更新字段值
  const setFieldValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)

    // 如果字段已经被触摸过，实时验证
    if (touched[field]) {
      const error = validateField(field, value)
      setErrors(prev => ({ ...prev, [field]: error || undefined }))
    }
  }, [touched, validateField])

  // 标记字段为已触摸
  const setFieldTouched = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }, [])

  // 重置表单
  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setIsDirty(false)
  }, [initialValues])

  // 提交表单
  const handleSubmit = useCallback(async (event?: React.FormEvent) => {
    event?.preventDefault()

    // 标记所有字段为已触摸
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key as keyof T] = true
      return acc
    }, {} as Partial<Record<keyof T, boolean>>)
    setTouched(allTouched)

    // 验证所有字段
    const isValid = validateAll()
    if (!isValid) {
      return false
    }

    setIsSubmitting(true)
    try {
      if (onSubmit) {
        await onSubmit(values)
      }
      return true
    } catch (error) {
      logger.error('Form submission error:', error)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [values, onSubmit, validateAll])

  // 计算表单状态
  const formState: FormState<T> = {
    values,
    errors,
    touched,
    isValid: Object.keys(errors).length === 0,
    isDirty
  }

  return {
    formState,
    setFieldValue,
    setFieldTouched,
    reset,
    handleSubmit,
    isSubmitting,
    validateField,
    validateAll
  }
}