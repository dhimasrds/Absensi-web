'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, RefreshCw, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { toast } from 'sonner'

interface Setting {
  id: string
  key: string
  value: string
  description: string | null
  category: string
  updated_at: string
}

// Configuration for threshold settings with slider
const THRESHOLD_SETTINGS: Record<string, {
  min: number
  max: number
  step: number
  labels: { value: number; label: string; color: string }[]
  recommendation: string
}> = {
  face_match_threshold: {
    min: 0.3,
    max: 0.9,
    step: 0.01,
    labels: [
      { value: 0.4, label: 'Very Lenient', color: 'destructive' },
      { value: 0.5, label: 'Lenient', color: 'warning' },
      { value: 0.6, label: 'Balanced', color: 'success' },
      { value: 0.7, label: 'Strict', color: 'warning' },
      { value: 0.8, label: 'Very Strict', color: 'destructive' },
    ],
    recommendation: '0.55 - 0.65 untuk keseimbangan akurasi dan kenyamanan',
  },
  face_liveness_threshold: {
    min: 0.5,
    max: 1.0,
    step: 0.01,
    labels: [
      { value: 0.6, label: 'Low', color: 'destructive' },
      { value: 0.7, label: 'Medium', color: 'warning' },
      { value: 0.8, label: 'High', color: 'success' },
      { value: 0.9, label: 'Very High', color: 'success' },
    ],
    recommendation: '0.75 - 0.85 untuk deteksi anti-spoofing yang baik',
  },
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings')
      const json = await response.json()
      if (json.data) {
        // If no settings found, try to initialize
        if (json.data.length === 0) {
          console.log('No settings found, initializing...')
          await initializeSettings()
          return
        }
        setSettings(json.data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const initializeSettings = async () => {
    try {
      setInitializing(true)
      const response = await fetch('/api/settings/init', { method: 'POST' })
      const json = await response.json()
      
      if (response.ok && json.data?.settings) {
        setSettings(json.data.settings)
        toast.success('Settings initialized successfully')
      } else {
        toast.error('Failed to initialize settings')
      }
    } catch (error) {
      console.error('Error initializing settings:', error)
      toast.error('Failed to initialize settings')
    } finally {
      setInitializing(false)
      setLoading(false)
    }
  }

  const updateSetting = async (key: string, value: string) => {
    try {
      setSaving(key)
      const response = await fetch(`/api/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })

      const json = await response.json()

      if (!response.ok) {
        toast.error(json.error?.message || 'Failed to update setting')
        return
      }

      toast.success(`Setting "${key}" updated successfully`)
      await fetchSettings() // Refresh settings
    } catch (error) {
      console.error('Error updating setting:', error)
      toast.error('Failed to update setting')
    } finally {
      setSaving(null)
    }
  }

  const handleSubmit = (key: string) => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const value = formData.get(key) as string
    updateSetting(key, value)
  }

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = []
    }
    acc[setting.category].push(setting)
    return acc
  }, {} as Record<string, Setting[]>)

  const getCategoryTitle = (category: string) => {
    const titles: Record<string, string> = {
      face_recognition: '🔍 Face Recognition',
      attendance: '📍 Attendance',
      general: '⚙️ General',
    }
    return titles[category] || category
  }

  const getCategoryDescription = (category: string) => {
    const descriptions: Record<string, string> = {
      face_recognition: 'Configure face recognition accuracy and validation',
      attendance: 'Manage attendance tracking and geofencing settings',
      general: 'General application settings',
    }
    return descriptions[category] || ''
  }

  if (loading || initializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-muted-foreground">
          {initializing ? 'Initializing settings...' : 'Loading settings...'}
        </p>
      </div>
    )
  }

  // Show empty state with initialize button if no settings
  if (settings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">No Settings Found</h2>
          <p className="text-muted-foreground">
            Settings have not been initialized yet. Click the button below to set up default settings.
          </p>
          <Button onClick={initializeSettings} disabled={initializing}>
            {initializing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Initializing...
              </>
            ) : (
              'Initialize Settings'
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure system-wide settings for all users
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSettings}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedSettings).map(([category, categorySettings]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{getCategoryTitle(category)}</CardTitle>
              <CardDescription>{getCategoryDescription(category)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {categorySettings.map((setting) => {
                const isThreshold = setting.key in THRESHOLD_SETTINGS
                const thresholdConfig = THRESHOLD_SETTINGS[setting.key]
                const currentValue = parseFloat(setting.value)
                
                // Get current level label for threshold
                const getCurrentLevel = () => {
                  if (!thresholdConfig) return null
                  const sorted = [...thresholdConfig.labels].sort((a, b) => b.value - a.value)
                  for (const level of sorted) {
                    if (currentValue >= level.value) {
                      return level
                    }
                  }
                  return sorted[sorted.length - 1]
                }
                const currentLevel = getCurrentLevel()

                if (isThreshold && thresholdConfig) {
                  return (
                    <ThresholdSetting
                      key={setting.key}
                      setting={setting}
                      config={thresholdConfig}
                      currentValue={currentValue}
                      currentLevel={currentLevel}
                      saving={saving}
                      onSave={updateSetting}
                    />
                  )
                }

                // Regular input for non-threshold settings
                return (
                  <form key={setting.key} onSubmit={handleSubmit(setting.key)} className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={setting.key} className="font-medium">
                          {setting.key.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </Label>
                        {setting.description && (
                          <p className="text-sm text-muted-foreground">
                            {setting.description}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Input
                            id={setting.key}
                            name={setting.key}
                            defaultValue={setting.value}
                            className="max-w-xs"
                            disabled={saving === setting.key}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={saving === setting.key}
                          >
                            {saving === setting.key ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Current: <code className="bg-muted px-1 py-0.5 rounded">{setting.value}</code>
                          {' • '}
                          Last updated: {new Date(setting.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </form>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-blue-500/50 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="text-blue-600 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Fine-Tuning Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-background border">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span className="text-lg">🎯</span> Face Match Threshold
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>0.50-0.55:</strong> Sangat lenient, mudah login</li>
                <li>• <strong>0.55-0.65:</strong> Balanced (Recommended)</li>
                <li>• <strong>0.65-0.75:</strong> Strict, lebih aman</li>
                <li>• <strong>&gt;0.75:</strong> Very strict, mungkin sering gagal</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-background border">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span className="text-lg">🛡️</span> Liveness Threshold
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>0.60-0.70:</strong> Basic anti-spoofing</li>
                <li>• <strong>0.75-0.85:</strong> Good protection (Recommended)</li>
                <li>• <strong>&gt;0.85:</strong> High security</li>
              </ul>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <p className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <span>
                <strong>Tips:</strong> Jika banyak user gagal login, turunkan threshold sedikit demi sedikit (0.02-0.05). 
                Perubahan langsung aktif tanpa perlu deploy ulang.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Separate component for threshold settings with slider
function ThresholdSetting({
  setting,
  config,
  currentValue,
  currentLevel,
  saving,
  onSave,
}: {
  setting: Setting
  config: typeof THRESHOLD_SETTINGS[string]
  currentValue: number
  currentLevel: { value: number; label: string; color: string } | null
  saving: string | null
  onSave: (key: string, value: string) => Promise<void>
}) {
  const [sliderValue, setSliderValue] = useState(currentValue)
  const [hasChanges, setHasChanges] = useState(false)

  // Reset slider when setting changes (e.g., after save)
  useEffect(() => {
    setSliderValue(currentValue)
    setHasChanges(false)
  }, [currentValue])

  const handleSliderChange = (values: number[]) => {
    const newValue = values[0]
    setSliderValue(newValue)
    setHasChanges(Math.abs(newValue - currentValue) > 0.001)
  }

  const handleSave = () => {
    onSave(setting.key, sliderValue.toFixed(2))
  }

  const handleReset = () => {
    setSliderValue(currentValue)
    setHasChanges(false)
  }

  // Determine badge variant based on color
  const getBadgeVariant = (color: string) => {
    switch (color) {
      case 'success': return 'default'
      case 'warning': return 'secondary'
      case 'destructive': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-card">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Label className="text-base font-semibold">
              {setting.key.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ')}
            </Label>
            {currentLevel && (
              <Badge variant={getBadgeVariant(currentLevel.color)}>
                {currentLevel.label}
              </Badge>
            )}
          </div>
          {setting.description && (
            <p className="text-sm text-muted-foreground">
              {setting.description}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono">
            {sliderValue.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            Current: {currentValue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Slider */}
      <div className="space-y-3">
        <Slider
          value={[sliderValue]}
          min={config.min}
          max={config.max}
          step={config.step}
          onValueChange={handleSliderChange}
          disabled={saving === setting.key}
          className="w-full"
        />
        
        {/* Scale labels */}
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>{config.min.toFixed(2)}</span>
          <span className="text-center">{((config.min + config.max) / 2).toFixed(2)}</span>
          <span>{config.max.toFixed(2)}</span>
        </div>
      </div>

      {/* Recommendation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-green-500" />
        <span>Recommended: {config.recommendation}</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving === setting.key}
          size="sm"
          className="flex-1"
        >
          {saving === setting.key ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
        {hasChanges && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={saving === setting.key}
          >
            Reset
          </Button>
        )}
      </div>

      {/* Last updated */}
      <p className="text-xs text-muted-foreground">
        Last updated: {new Date(setting.updated_at).toLocaleString()}
      </p>
    </div>
  )
}
