import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Lock, Play, Square, Timer } from 'lucide-react'

interface FocusSession {
  isActive: boolean
  focusTabUrl: string
  duration: number // in minutes
  startTime: number
  remainingTime: number // in seconds
}

const Popup: React.FC = () => {
  const [session, setSession] = useState<FocusSession | null>(null)
  const [duration, setDuration] = useState<string>('25')
  const [currentTab, setCurrentTab] = useState<string>('')

  useEffect(() => {
    // Get current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        setCurrentTab(tabs[0].url)
      }
    })

    // Check for existing session and immediately calculate correct remaining time
    chrome.storage.local.get(['focusSession'], (result) => {
      if (result.focusSession && result.focusSession.isActive) {
        const storedSession = result.focusSession
        const now = Date.now()
        const elapsed = Math.floor((now - storedSession.startTime) / 1000) // seconds
        const remainingSeconds = (storedSession.duration * 60) - elapsed // total seconds remaining

        if (remainingSeconds <= 0) {
          // Session should have ended
          endSession()
        } else {
          // Update session with correct remaining time immediately
          const updatedSession = {
            ...storedSession,
            remainingTime: remainingSeconds
          }
          setSession(updatedSession)
        }
      }
    })
  }, [])

  useEffect(() => {
    // Update timer every second
    if (session?.isActive) {
      const interval = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor((now - session.startTime) / 1000) // seconds
        const remainingSeconds = (session.duration * 60) - elapsed // total seconds remaining

        if (remainingSeconds <= 0) {
          endSession()
        } else {
          setSession(prev => prev ? { ...prev, remainingTime: remainingSeconds } : null)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [session])

  const startSession = async () => {
    const durationNum = parseInt(duration)
    if (durationNum <= 0 || !currentTab) return

    const newSession: FocusSession = {
      isActive: true,
      focusTabUrl: currentTab,
      duration: durationNum,
      startTime: Date.now(),
      remainingTime: durationNum * 60 // Store in seconds
    }

    // Save to storage
    await chrome.storage.local.set({ focusSession: newSession })
    
    // Send message to background script to start restrictions
    chrome.runtime.sendMessage({
      action: 'startFocus',
      data: newSession
    })

    setSession(newSession)
  }

  const endSession = async () => {
    // Clear storage
    await chrome.storage.local.remove(['focusSession'])
    
    // Send message to background script to end restrictions
    chrome.runtime.sendMessage({
      action: 'endFocus'
    })

    setSession(null)
  }

  const testNotification = async () => {
    // Test notification function
    console.log('Popup: Testing notification...')
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'testNotification'
      })
      console.log('Popup: Test notification response:', response)
    } catch (error) {
      console.log('Popup: Test notification error:', error)
    }
  }

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getDomainFromUrl = (url: string): string => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  if (session?.isActive) {
    return (
      <div className="w-80 p-4">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-green-600" />
              <CardTitle className="text-lg">Focus Mode Active</CardTitle>
            </div>
            <CardDescription>
              Locked to: {getDomainFromUrl(session.focusTabUrl)}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Timer className="w-8 h-8 text-blue-600" />
              <div className="text-3xl font-bold">
                {formatTime(session.remainingTime)}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Time remaining in your focus session
            </p>
            <Button 
              onClick={endSession}
              variant="destructive"
              className="w-full"
            >
              <Square className="w-4 h-4 mr-2" />
              End Session
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-80 p-4">
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock className="w-5 h-5" />
            <CardTitle className="text-lg">Padlock</CardTitle>
          </div>
          <CardDescription>
            Start a focus session on: {getDomainFromUrl(currentTab)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="duration" className="text-sm font-medium">
              Focus Duration (minutes)
            </label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="480"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="25"
            />
          </div>
          <Button 
            onClick={startSession}
            className="w-full"
            disabled={!duration || parseInt(duration) <= 0}
          >
            <Play className="w-4 h-4 mr-2" />
            Start Focus Session
          </Button>
          <Button 
            onClick={testNotification}
            variant="outline"
            className="w-full"
          >
            Test Notification
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default Popup
