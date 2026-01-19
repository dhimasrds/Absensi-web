'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2, Save, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface Setting {
  id: string
  key: string
  value: string
  description: string | null
  category: string
  updated_at: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings')
      const json = await response.json()
      if (json.data) {
        setSettings(json.data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
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
              {categorySettings.map((setting) => (
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
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="text-yellow-600">⚠️ Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Face Match Threshold (0.0 - 1.0):</strong> Lower value = more lenient (easier to login), Higher value = stricter (more secure). Recommended: 0.55 - 0.65
          </p>
          <p>
            <strong>Liveness Threshold:</strong> Minimum score to detect if face is real (not photo/video). Recommended: 0.80+
          </p>
          <p>
            <strong>Capture Max Skew:</strong> Maximum age of face capture in seconds. Too low = rejected old captures, Too high = security risk.
          </p>
          <p className="text-muted-foreground mt-4">
            ℹ️ Changes take effect immediately after saving. Cache is cleared automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
