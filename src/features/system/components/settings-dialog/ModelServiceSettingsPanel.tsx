/**
 * Model Service Settings Panel
 */

"use client"

import React, { useState, useEffect } from "react"
import { logger } from '@/lib/utils/logger'
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/components/ui/dialog"
import { Badge } from "@/shared/components/ui/badge"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Slider } from "@/shared/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Database, Plus, Trash2, Edit, Eye, EyeOff, ExternalLink, CheckCircle2, AlertCircle, RefreshCw, ChevronUp, ChevronDown, Film } from "lucide-react"
import type {
  ModelServiceTabState,
  ApiSettings,
  ModelProvider,
  ModelConfig,
  ProviderForm,
  ConnectionTestResult,
  ModelForm,
  ScenarioSettings
} from "./types"
import { useTranslation } from "react-i18next"

interface ModelServiceSettingsPanelProps {
  modelServiceTab: ModelServiceTabState['activeTab']
  setModelServiceTab: (tab: ModelServiceTabState['activeTab']) => void
  apiSettings: ApiSettings
  setApiSettings: (settings: ApiSettings) => void
  customProviders: ModelProvider[]
  setCustomProviders: (providers: ModelProvider[]) => void
  configuredModels: ModelConfig[]
  setConfiguredModels: (models: ModelConfig[]) => void
  scenarioSettings: ScenarioSettings
  setScenarioSettings: (settings: ScenarioSettings) => void
  showProviderDialog: boolean
  setShowProviderDialog: (show: boolean) => void
  showModelDialog: boolean
  setShowModelDialog: (show: boolean) => void
  showAvailableModelsDialog: boolean
  setShowAvailableModelsDialog: (show: boolean) => void
  editingProvider: ModelProvider | null
  setEditingProvider: (provider: ModelProvider | null) => void
  providerForm: ProviderForm
  setProviderForm: (form: ProviderForm) => void
  modelForm: ModelForm
  setModelForm: (form: ModelForm) => void
  connectionTestResult: ConnectionTestResult | null
  setConnectionTestResult: (result: ConnectionTestResult | null) => void
  testingConnection: boolean
  setTestingConnection: (testing: boolean) => void
  loadingModels: boolean
  setLoadingModels: (loading: boolean) => void
  availableModels: unknown[]
  setAvailableModels: (models: unknown[]) => void
  selectedProviderId: string
  setSelectedProviderId: (id: string) => void
  expandedScenario: string | null
  setExpandedScenario: (id: string | null) => void
  showSiliconFlowApiKey: boolean
  setShowSiliconFlowApiKey: (show: boolean) => void
  showModelScopeApiKey: boolean
  setShowModelScopeApiKey: (show: boolean) => void
  showZhipuApiKey: boolean
  setShowZhipuApiKey: (show: boolean) => void
}

export default function ModelServiceSettingsPanel({
  modelServiceTab,
  setModelServiceTab,
  apiSettings,
  setApiSettings,
  customProviders,
  setCustomProviders,
  configuredModels,
  setConfiguredModels,
  scenarioSettings,
  setScenarioSettings,
  showProviderDialog,
  setShowProviderDialog,
  showModelDialog,
  setShowModelDialog,
  showAvailableModelsDialog,
  setShowAvailableModelsDialog,
  editingProvider,
  setEditingProvider,
  providerForm,
  setProviderForm,
  modelForm,
  setModelForm,
  connectionTestResult,
  setConnectionTestResult,
  testingConnection,
  setTestingConnection,
  loadingModels,
  setLoadingModels,
  availableModels,
  setAvailableModels,
  selectedProviderId,
  setSelectedProviderId,
  expandedScenario,
  setExpandedScenario,
  showSiliconFlowApiKey,
  setShowSiliconFlowApiKey,
  showModelScopeApiKey,
  setShowModelScopeApiKey,
  showZhipuApiKey,
  setShowZhipuApiKey,
}: ModelServiceSettingsPanelProps) {
  const { t } = useTranslation("settings")

  const handleAddProvider = () => {
    setEditingProvider(null)
    setProviderForm({ name: "", apiKey: "", apiBaseUrl: "" })
    setConnectionTestResult(null)
    setShowProviderDialog(true)
  }

  const handleEditProvider = (provider: ModelProvider) => {
    setEditingProvider(provider)
    setProviderForm({
      name: provider.name,
      apiKey: provider.apiKey,
      apiBaseUrl: provider.apiBaseUrl
    })
    setConnectionTestResult(null)
    setShowProviderDialog(true)
  }

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm(t("modelServicePanel.confirmDeleteProvider"))) return

    try {
      await fetch('/api/model-service', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-provider',
          data: { id: providerId }
        })
      })

      const newProviders = customProviders.filter(p => p.id !== providerId)
      setCustomProviders(newProviders)
      
      window.dispatchEvent(new CustomEvent('model-service-config-updated'))
    } catch (error) {
      logger.error('删除提供商失败:', error)
    }
  }

  const handleSaveProvider = async () => {
    if (!providerForm.name || !providerForm.apiKey || !providerForm.apiBaseUrl) {
      return
    }

    try {
      let provider: ModelProvider

      if (editingProvider) {
        provider = {
          ...editingProvider,
          ...providerForm,
          updatedAt: Date.now()
        }
        await fetch('/api/model-service', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update-provider',
            data: provider
          })
        })
        setCustomProviders(customProviders.map(p => p.id === editingProvider.id ? provider : p))
      } else {
        provider = {
          id: `custom-${Date.now()}`,
          ...providerForm,
          type: 'custom',
          enabled: true,
          isBuiltIn: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        await fetch('/api/model-service', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add-provider',
            data: provider
          })
        })
        setCustomProviders([...customProviders, provider])
      }
      
      window.dispatchEvent(new CustomEvent('model-service-config-updated'))
      setShowProviderDialog(false)
    } catch (error) {
      logger.error('保存提供商失败:', error)
    }
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setConnectionTestResult(null)
    
    try {
      const response = await fetch('/api/model-service/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: providerForm.apiKey,
          apiBaseUrl: providerForm.apiBaseUrl
        })
      })
      
      const result = await response.json()
      setConnectionTestResult(result)
    } catch (error) {
      logger.error('获取模型列表失败:', error)
      setConnectionTestResult({ success: false, message: t("common.connectionFailed") })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleFetchModels = async (providerId: string) => {
    setLoadingModels(true)
    try {
      let apiKey = ""
      let apiBaseUrl = ""
      
      if (providerId === "siliconflow-builtin") {
        apiKey = apiSettings.siliconFlow?.apiKey || ""
        apiBaseUrl = "https://api.siliconflow.cn/v1"
      } else if (providerId === "modelscope-builtin") {
        apiKey = apiSettings.modelScope?.apiKey || ""
        apiBaseUrl = "https://api-inference.modelscope.cn/v1"
      } else if (providerId === "zhipu-builtin") {
        apiKey = apiSettings.zhipu?.apiKey || ""
        apiBaseUrl = "https://open.bigmodel.cn/api/paas/v4"
      } else {
        const provider = customProviders.find(p => p.id === providerId)
        if (provider) {
          apiKey = provider.apiKey
          apiBaseUrl = provider.apiBaseUrl
        }
      }
      
      if (!apiKey) {
        setLoadingModels(false)
        return
      }
      
      const response = await fetch('/api/model-service/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiBaseUrl })
      })

      const result = await response.json()
      if (result.success && result.models) {
        const normalizedModels = result.models.map((model: Record<string, unknown>) => ({
          id: model.id || model.model,
          object: model.object || 'model',
          created: model.created || Date.now(),
          owned_by: providerId
        }))
        setAvailableModels(normalizedModels)
        setShowAvailableModelsDialog(true)
      }
    } catch (error) {
      logger.error('获取模型列表失败:', error)
    } finally {
      setLoadingModels(false)
    }
  }

  const handleAddModel = () => {
    setModelForm({ modelId: "", displayName: "", capabilities: [] })
    setShowModelDialog(true)
  }

  const handleSaveModel = async () => {
    if (!modelForm.modelId || !selectedProviderId) {
      return
    }

    const newModel: ModelConfig = {
      id: `model-${Date.now()}`,
      providerId: selectedProviderId,
      modelId: modelForm.modelId,
      displayName: modelForm.displayName || modelForm.modelId,
      capabilities: modelForm.capabilities,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    try {
      const response = await fetch('/api/model-service', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-model',
          data: newModel
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setConfiguredModels([...configuredModels, newModel])
          setShowModelDialog(false)
          setModelForm({ modelId: "", displayName: "", capabilities: [] })
          window.dispatchEvent(new CustomEvent('model-service-config-updated'))
        }
      }
    } catch (error) {
      logger.error('保存模型失败:', error)
    }
  }

  const handleDeleteModel = async (modelId: string) => {
    try {
      const response = await fetch('/api/model-service', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-model',
          data: { id: modelId }
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setConfiguredModels(configuredModels.filter(m => m.id !== modelId))
        window.dispatchEvent(new CustomEvent('model-service-config-updated'))
      } else {
        alert(result.error || t("modelServicePanel.deleteModelFailed"))
      }
    } catch (error) {
      logger.error('删除模型失败:', error)
    }
  }

  const handleSaveBuiltinProvider = async (providerId: string, apiKey: string) => {
    const builtinProviders = {
      'siliconflow-builtin': {
        type: 'siliconflow' as const,
        name: '硅基流动',
        apiBaseUrl: 'https://api.siliconflow.cn/v1'
      },
      'modelscope-builtin': {
        type: 'modelscope' as const,
        name: '魔搭社区',
        apiBaseUrl: 'https://api-inference.modelscope.cn/v1'
      },
      'zhipu-builtin': {
        type: 'zhipu' as const,
        name: '智谱AI',
        apiBaseUrl: 'https://open.bigmodel.cn/api/paas/v4'
      }
    }

    const providerConfig = builtinProviders[providerId as keyof typeof builtinProviders]
    if (!providerConfig) return

    const providerData = {
      id: providerId,
      name: providerConfig.name,
      type: providerConfig.type,
      apiKey,
      apiBaseUrl: providerConfig.apiBaseUrl,
      enabled: true,
      isBuiltIn: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    try {
      const response = await fetch('/api/model-service', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-provider',
          data: providerData
        })
      })

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('model-service-config-updated'))
      } else {
        logger.error('保存内置提供商失败:', response.status)
      }
    } catch (error) {
      logger.error('保存内置提供商失败:', error)
    }
  }

  const allProviders = [
    { id: "siliconflow-builtin", name: t("modelServicePanel.siliconFlow"), type: "builtin" },
    { id: "modelscope-builtin", name: t("modelServicePanel.modelScope"), type: "builtin" },
    { id: "zhipu-builtin", name: t("modelServicePanel.zhipuAI"), type: "builtin" },
    ...customProviders.filter(p => p && p.id && p.name && !["siliconflow-builtin", "modelscope-builtin", "zhipu-builtin"].includes(p.id))
  ]

  const scenarios = [
    {
      type: 'image_analysis',
      label: t("modelServicePanel.scenarioImageAnalysis"),
      description: t("modelServicePanel.scenarioImageAnalysisDesc"),
      requiredCapabilities: ['vision']
    },
    {
      type: 'speech_to_text',
      label: t("modelServicePanel.scenarioSpeechToText"),
      description: t("modelServicePanel.scenarioSpeechToTextDesc"),
      requiredCapabilities: ['audio']
    },
    {
      type: 'episode_generation',
      label: t("modelServicePanel.scenarioEpisodeGeneration"),
      description: t("modelServicePanel.scenarioEpisodeGenerationDesc"),
      requiredCapabilities: ['chat']
    },
    {
      type: 'ai_chat',
      label: t("modelServicePanel.scenarioAiChat"),
      description: t("modelServicePanel.scenarioAiChatDesc"),
      requiredCapabilities: ['chat']
    },
    {
      type: 'subtitle_ocr',
      label: t("modelServicePanel.scenarioSubtitleOcr"),
      description: t("modelServicePanel.scenarioSubtitleOcrDesc"),
      requiredCapabilities: ['vision']
    }
  ]

  const getCompatibleModels = (requiredCapabilities: string[]) => {
    return configuredModels.filter(model =>
      requiredCapabilities.every(cap => model.capabilities?.includes(cap))
    )
  }

  const handleModelToggle = async (scenarioType: string, modelId: string, checked: boolean) => {
    const currentSetting = scenarioSettings[scenarioType]
    const selectedModelIds = currentSetting?.selectedModelIds || []
    const primaryModelId = currentSetting?.primaryModelId || selectedModelIds[0] || ""

    let newSelectedIds: string[]
    if (checked) {
      newSelectedIds = [...selectedModelIds, modelId]
    } else {
      newSelectedIds = selectedModelIds.filter(id => id !== modelId)
    }

    let newPrimaryId = primaryModelId
    if (!checked && primaryModelId === modelId) {
      newPrimaryId = newSelectedIds[0] || ""
    } else if (checked && !primaryModelId) {
      newPrimaryId = modelId
    }

    setScenarioSettings({
      ...scenarioSettings,
      [scenarioType]: {
        ...currentSetting,
        selectedModelIds: newSelectedIds,
        primaryModelId: newPrimaryId,
        parameters: currentSetting?.parameters || {}
      }
    })

    try {
      await fetch('/api/model-service', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-scenario',
          data: {
            type: scenarioType,
            selectedModelIds: newSelectedIds,
            primaryModelId: newPrimaryId
          }
        })
      })
    } catch (error) {
      logger.error('更新场景配置失败:', error)
    }
  }

  const handlePrimaryModelChange = async (scenarioType: string, modelId: string) => {
    const currentSetting = scenarioSettings[scenarioType]
    const selectedModelIds = currentSetting?.selectedModelIds || []

    setScenarioSettings({
      ...scenarioSettings,
      [scenarioType]: {
        ...currentSetting,
        primaryModelId: modelId
      }
    })

    try {
      await fetch('/api/model-service', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-scenario',
          data: {
            type: scenarioType,
            selectedModelIds,
            primaryModelId: modelId
          }
        })
      })
    } catch (error) {
      logger.error('更新场景配置失败:', error)
    }
  }

  const handleParameterChange = (scenarioType: string, parameter: string, value: unknown) => {
    const currentSetting = scenarioSettings[scenarioType]
    const selectedModelIds = currentSetting?.selectedModelIds || []
    const primaryModelId = currentSetting?.primaryModelId || selectedModelIds[0] || ""

    setScenarioSettings({
      ...scenarioSettings,
      [scenarioType]: {
        ...currentSetting,
        selectedModelIds,
        primaryModelId,
        parameters: {
          ...currentSetting?.parameters,
          [parameter]: value
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t("modelServicePanel.title")}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t("modelServicePanel.description")}
        </p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setModelServiceTab("providers")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${modelServiceTab === "providers"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
          >
            {t("modelServicePanel.tabProviders")}
          </button>
          <button
            onClick={() => setModelServiceTab("models")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${modelServiceTab === "models"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
          >
            {t("modelServicePanel.tabModels")}
          </button>
          <button
            onClick={() => setModelServiceTab("scenarios")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${modelServiceTab === "scenarios"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
          >
            {t("modelServicePanel.tabScenarios")}
          </button>
        </nav>
      </div>

      {modelServiceTab === "providers" && (
        <div className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("modelServicePanel.builtInProviders")}</CardTitle>
                <Button onClick={handleAddProvider} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("modelServicePanel.addCustomProvider")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{t("modelServicePanel.siliconFlow")}</h4>
                  <Badge>{t("modelServicePanel.builtIn")}</Badge>
                </div>
                <p className="text-sm text-gray-500 mb-4">{t("modelServicePanel.siliconFlowDesc")}</p>
                <div className="space-y-3">
                  <div>
                    <Label>{t("modelServicePanel.apiKey")}</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showSiliconFlowApiKey ? "text" : "password"}
                        value={apiSettings.siliconFlow?.apiKey || ""}
                        onChange={(e) => {
                          const newApiKey = e.target.value;
                          setApiSettings({
                            ...apiSettings,
                            siliconFlow: {
                              ...(apiSettings.siliconFlow || {}),
                              apiKey: newApiKey
                            }
                          });
                          handleSaveBuiltinProvider("siliconflow-builtin", newApiKey);
                        }}
                        placeholder={t("modelServicePanel.inputSiliconFlowKey")}
                        className="flex-1"
                      />
                      <a
                        href="https://cloud.siliconflow.cn/akManage"
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t("modelServicePanel.jumpToSiliconFlow")}
                      >
                        <Button variant="outline" size="icon" asChild>
                          <span><ExternalLink className="h-4 w-4" /></span>
                        </Button>
                      </a>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowSiliconFlowApiKey(!showSiliconFlowApiKey)}
                      >
                        {showSiliconFlowApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>{t("modelServicePanel.apiAddress")}</Label>
                    <Input
                      value="https://api.siliconflow.cn/v1"
                      disabled
                      className="bg-gray-50 dark:bg-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{t("modelServicePanel.modelScope")}</h4>
                  <Badge>{t("modelServicePanel.builtIn")}</Badge>
                </div>
                <p className="text-sm text-gray-500 mb-4">{t("modelServicePanel.modelScopeDesc")}</p>
                <div className="space-y-3">
                  <div>
                    <Label>{t("modelServicePanel.apiKey")}</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showModelScopeApiKey ? "text" : "password"}
                        value={apiSettings.modelScope?.apiKey || ""}
                        onChange={(e) => {
                          const newApiKey = e.target.value;
                          setApiSettings({
                            ...apiSettings,
                            modelScope: {
                              ...(apiSettings.modelScope || {
                                episodeGenerationModel: "Qwen/Qwen3-32B"
                              }),
                              apiKey: newApiKey
                            }
                          });
                          handleSaveBuiltinProvider("modelscope-builtin", newApiKey);
                        }}
                        placeholder={t("modelServicePanel.inputModelScopeKey")}
                        className="flex-1"
                      />
                      <a
                        href="https://www.modelscope.cn/my/myaccesstoken"
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t("modelServicePanel.jumpToModelScope")}
                      >
                        <Button variant="outline" size="icon" asChild>
                          <span><ExternalLink className="h-4 w-4" /></span>
                        </Button>
                      </a>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowModelScopeApiKey(!showModelScopeApiKey)}
                      >
                        {showModelScopeApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>{t("modelServicePanel.apiAddress")}</Label>
                    <Input
                      value="https://api-inference.modelscope.cn/v1"
                      disabled
                      className="bg-gray-50 dark:bg-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{t("modelServicePanel.zhipuAI")}</h4>
                  <Badge>{t("modelServicePanel.builtIn")}</Badge>
                </div>
                <p className="text-sm text-gray-500 mb-4">{t("modelServicePanel.zhipuAIDesc")}</p>
                <div className="space-y-3">
                  <div>
                    <Label>{t("modelServicePanel.apiKey")}</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showZhipuApiKey ? "text" : "password"}
                        value={apiSettings.zhipu?.apiKey || ""}
                        onChange={(e) => {
                          const newApiKey = e.target.value;
                          setApiSettings({
                            ...apiSettings,
                            zhipu: {
                              ...(apiSettings.zhipu || {
                                chatModel: "glm-4-flash"
                              }),
                              apiKey: newApiKey
                            }
                          });
                          handleSaveBuiltinProvider("zhipu-builtin", newApiKey);
                        }}
                        placeholder={t("modelServicePanel.inputZhipuKey")}
                        className="flex-1"
                      />
                      <a
                        href="https://open.bigmodel.cn/apikey/platform"
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t("modelServicePanel.jumpToZhipu")}
                      >
                        <Button variant="outline" size="icon" asChild>
                          <span><ExternalLink className="h-4 w-4" /></span>
                        </Button>
                      </a>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowZhipuApiKey(!showZhipuApiKey)}
                      >
                        {showZhipuApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>{t("modelServicePanel.apiAddress")}</Label>
                    <Input
                      value="https://open.bigmodel.cn/api/paas/v4"
                      disabled
                      className="bg-gray-50 dark:bg-gray-900"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {customProviders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("modelServicePanel.customProviders")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customProviders
                    .filter(provider => provider && provider.id && provider.name)
                    .map(provider => (
                    <div key={provider.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{provider.name || t("modelServicePanel.unknownProvider")}</h4>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProvider(provider)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProvider(provider.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">{provider.apiBaseUrl || t("modelServicePanel.unknownAddress")}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Dialog open={showProviderDialog} onOpenChange={setShowProviderDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingProvider ? t("modelServicePanel.editProvider") : t("modelServicePanel.addCustomProvider")}</DialogTitle>
                <DialogDescription>
                  {t("modelServicePanel.providerConfigDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="provider-name">{t("modelServicePanel.providerName")} *</Label>
                  <Input
                    id="provider-name"
                    value={providerForm.name}
                    onChange={(e) => setProviderForm({...providerForm, name: e.target.value})}
                    placeholder={t("modelServicePanel.inputProviderName")}
                  />
                </div>
                <div>
                  <Label htmlFor="provider-url">{t("modelServicePanel.providerUrl")} *</Label>
                  <Input
                    id="provider-url"
                    value={providerForm.apiBaseUrl}
                    onChange={(e) => setProviderForm({...providerForm, apiBaseUrl: e.target.value})}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <div>
                  <Label htmlFor="provider-key">{t("modelServicePanel.providerKey")} *</Label>
                  <Input
                    id="provider-key"
                    type="password"
                    value={providerForm.apiKey}
                    onChange={(e) => setProviderForm({...providerForm, apiKey: e.target.value})}
                    placeholder="sk-..."
                  />
                </div>
                
                {connectionTestResult && (
                  <div className={`p-3 rounded-lg ${connectionTestResult.success ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'} border`}>
                    <div className="flex items-start gap-2">
                      {connectionTestResult.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${connectionTestResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                          {connectionTestResult.success ? t("common.connectionSuccess") : t("common.connectionFailed")}
                        </p>
                        <p className={`text-sm ${connectionTestResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                          {connectionTestResult.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testingConnection || !providerForm.apiKey || !providerForm.apiBaseUrl}
                    className="flex-1"
                  >
                    {testingConnection ? t("common.testing") : t("common.testConnection")}
                  </Button>
                  <Button onClick={handleSaveProvider} className="flex-1">
                    {editingProvider ? t("common.update") : t("common.add")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {modelServiceTab === "models" && (
        <div className="space-y-6 mt-6">
          <div className="flex items-center gap-4">
            <Select value={selectedProviderId} onValueChange={(value) => {
              setSelectedProviderId(value)
              setAvailableModels([])
            }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("common.selectProvider")} />
              </SelectTrigger>
              <SelectContent>
                {allProviders.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={() => selectedProviderId && handleFetchModels(selectedProviderId)}
              disabled={!selectedProviderId || loadingModels}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingModels ? 'animate-spin' : ''}`} />
              {loadingModels ? t("modelServicePanel.fetching") : t("modelServicePanel.fetchModels")}
            </Button>

            <Button onClick={handleAddModel} disabled={!selectedProviderId}>
              <Plus className="h-4 w-4 mr-2" />
              {t("modelServicePanel.addModel")}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("modelServicePanel.configuredModels")}</CardTitle>
              <p className="text-sm text-gray-500">{t("modelServicePanel.modelManagement")}</p>
            </CardHeader>
            <CardContent>
              {configuredModels.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Film className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t("modelServicePanel.noConfiguredModels")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {configuredModels.map(model => {
                    const provider = allProviders.find(p => p.id === model.providerId)

                    return (
                      <div key={`${model.id}-${model.providerId}`} className="p-3 border rounded flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{model.displayName}</p>
                          </div>
                          <p className="text-sm text-gray-500">{provider?.name} • {model.modelId}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            {model.capabilities?.map(cap => (
                              <Badge key={cap} variant="outline" className="text-xs">{cap}</Badge>
                            ))}
                          </div>
                          {!model.isBuiltIn && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteModel(model.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {model.isBuiltIn && (
                            <div className="w-8" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={showAvailableModelsDialog} onOpenChange={setShowAvailableModelsDialog}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>{t("modelServicePanel.availableModels")}</DialogTitle>
                <DialogDescription>
                  {t("modelServicePanel.modelsFrom", { provider: allProviders.find(p => p.id === selectedProviderId)?.name })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableModels.map((model, index) => {
                    const isAlreadyConfigured = configuredModels.some(m => m.modelId === model.id)
                    return (
                      <div
                        key={index}
                        className={`p-3 border rounded flex items-center justify-between transition-colors ${
                          isAlreadyConfigured
                            ? 'bg-gray-50 dark:bg-gray-900 opacity-60'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                        }`}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{model.id}</p>
                          {model.object && (
                            <p className="text-xs text-gray-500">{t("modelServicePanel.modelType")}: {model.object}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isAlreadyConfigured ? (
                            <Badge variant="secondary" className="text-xs">{t("modelServicePanel.modelAdded")}</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setModelForm({
                                  modelId: model.id,
                                  displayName: model.id,
                                  capabilities: []
                                })
                                setShowAvailableModelsDialog(false)
                                setShowModelDialog(true)
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {t("common.add")}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAvailableModelsDialog(false)}>
                  {t("common.close")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showModelDialog} onOpenChange={setShowModelDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("modelServicePanel.addModel")}</DialogTitle>
                <DialogDescription>
                  {t("modelServicePanel.addModelFromProvider")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>{t("modelServicePanel.modelId")} *</Label>
                  <Input
                    value={modelForm.modelId}
                    onChange={(e) => setModelForm({...modelForm, modelId: e.target.value})}
                    placeholder={t("modelServicePanel.inputModelId")}
                  />
                </div>
                <div>
                  <Label>{t("modelServicePanel.displayName")}</Label>
                  <Input
                    value={modelForm.displayName}
                    onChange={(e) => setModelForm({...modelForm, displayName: e.target.value})}
                    placeholder={t("modelServicePanel.inputDisplayName")}
                  />
                </div>
                <div>
                  <Label>{t("modelServicePanel.capabilities")}</Label>
                  <div className="flex gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="cap-chat"
                        checked={modelForm.capabilities.includes('chat')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setModelForm({...modelForm, capabilities: [...modelForm.capabilities, 'chat']})
                          } else {
                            setModelForm({...modelForm, capabilities: modelForm.capabilities.filter(c => c !== 'chat')})
                          }
                        }}
                      />
                      <Label htmlFor="cap-chat">{t("modelServicePanel.capChat")}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="cap-vision"
                        checked={modelForm.capabilities.includes('vision')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setModelForm({...modelForm, capabilities: [...modelForm.capabilities, 'vision']})
                          } else {
                            setModelForm({...modelForm, capabilities: modelForm.capabilities.filter(c => c !== 'vision')})
                          }
                        }}
                      />
                      <Label htmlFor="cap-vision">{t("modelServicePanel.capVision")}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="cap-audio"
                        checked={modelForm.capabilities.includes('audio')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setModelForm({...modelForm, capabilities: [...modelForm.capabilities, 'audio']})
                          } else {
                            setModelForm({...modelForm, capabilities: modelForm.capabilities.filter(c => c !== 'audio')})
                          }
                        }}
                      />
                      <Label htmlFor="cap-audio">{t("modelServicePanel.capAudio")}</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowModelDialog(false)}>{t("modelServicePanel.cancel")}</Button>
                  <Button onClick={handleSaveModel}>{t("modelServicePanel.addModel")}</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {modelServiceTab === "scenarios" && (
        <div className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("modelServicePanel.scenarioConfig")}</CardTitle>
              <p className="text-sm text-gray-500">{t("modelServicePanel.scenarioConfigDesc")}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {scenarios.map(scenario => {
                const compatibleModels = getCompatibleModels(scenario.requiredCapabilities)
                const currentSetting = scenarioSettings[scenario.type]
                const isExpanded = expandedScenario === scenario.type
                const rawSelectedModelIds = currentSetting?.selectedModelIds || []
                const primaryModelId = currentSetting?.primaryModelId || rawSelectedModelIds[0] || ""

                const selectedModelIds = rawSelectedModelIds.filter(modelId =>
                  configuredModels.some(model => model.id === modelId)
                )

                return (
                  <div key={scenario.type} className="border rounded-lg">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex-1">
                        <h4 className="font-medium">{scenario.label}</h4>
                        <p className="text-sm text-gray-500">{scenario.description}</p>
                        <div className="flex gap-1 mt-2">
                          {scenario.requiredCapabilities.map(cap => (
                            <Badge key={cap} variant="secondary" className="text-xs">{cap}</Badge>
                          ))}
                        </div>
                        {selectedModelIds.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {t("modelServicePanel.selectedModels", { count: selectedModelIds.length })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedScenario(isExpanded ? null : scenario.type)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="border-t p-4 bg-gray-50 dark:bg-gray-900/50 space-y-6">
                        <div>
                          <h5 className="font-medium text-sm mb-3">{t("modelServicePanel.selectModel")}</h5>
                          {compatibleModels.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg">
                              {t("modelServicePanel.noCompatibleModels")}
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                              {compatibleModels.map(model => {
                                const provider = allProviders.find(p => p.id === model.providerId)
                                const isSelected = selectedModelIds.includes(model.id)
                                const isPrimary = primaryModelId === model.id

                                return (
                                  <div
                                    key={`${model.id}-${scenario.type}`}
                                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                    onClick={() => handleModelToggle(scenario.type, model.id, !isSelected)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => handleModelToggle(scenario.type, model.id, checked as boolean)}
                                      />
                                      <div>
                                        <p className="font-medium text-sm">{model.displayName}</p>
                                        <p className="text-xs text-gray-500">{provider?.name}</p>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant={isPrimary ? "default" : "outline"}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handlePrimaryModelChange(scenario.type, model.id)
                                          }}
                                        >
                                          {isPrimary ? t("modelServicePanel.primaryModel") : t("modelServicePanel.setAsPrimary")}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {selectedModelIds.length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-3">{t("modelServicePanel.modelParams")}</h5>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor={`${scenario.type}-temp`}>{t("modelServicePanel.temperature")}</Label>
                                <div className="flex items-center gap-2">
                                  <Slider
                                    id={`${scenario.type}-temp`}
                                    min={0}
                                    max={2}
                                    step={0.1}
                                    value={[currentSetting?.parameters?.temperature || 0.7]}
                                    onValueChange={([value]) => {
                                      handleParameterChange(scenario.type, 'temperature', value)
                                    }}
                                    className="flex-1"
                                  />
                                  <span className="text-sm w-12 text-right">
                                    {currentSetting?.parameters?.temperature?.toFixed(1) || "0.7"}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <Label htmlFor={`${scenario.type}-tokens`}>{t("modelServicePanel.maxTokens")}</Label>
                                <Input
                                  id={`${scenario.type}-tokens`}
                                  type="number"
                                  value={currentSetting?.parameters?.max_tokens || 2048}
                                  onChange={(e) => {
                                      handleParameterChange(scenario.type, 'max_tokens', parseInt(e.target.value))
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}