// Background service worker for Padlock extension

interface FocusSession {
  isActive: boolean
  focusTabUrl: string
  duration: number
  startTime: number
  remainingTime: number
}

let currentSession: FocusSession | null = null
let keepAliveInterval: number | null = null

// Restore session state when service worker starts/wakes up
restoreSessionState()

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'startFocus') {
    startFocusMode(message.data)
    sendResponse({ success: true })
  } else if (message.action === 'endFocus') {
    endFocusMode()
    sendResponse({ success: true })
  } else if (message.action === 'testNotification') {
    // Test notification function
    console.log('Testing notification...')
    sendNotificationToContentScript('Test notification from Padlock!', 'info')
    sendResponse({ success: true })
  }
})

// Listen for tab updates (navigation attempts)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
  // Ensure session is loaded before checking
  ensureSessionLoaded(() => {
    if (currentSession?.isActive && changeInfo.url) {
      handleNavigationAttempt(tabId, changeInfo.url)
    }
  })
})

// Listen for new tabs being created
chrome.tabs.onCreated.addListener((tab) => {
  // Ensure session is loaded before checking
  ensureSessionLoaded(() => {
    if (currentSession?.isActive && tab.url && tab.url !== 'chrome://newtab/') {
      handleNavigationAttempt(tab.id!, tab.url)
    }
  })
})


// Listen for tab activation (improved gentle enforcement)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // Ensure session is loaded before checking
  ensureSessionLoaded(async () => {
    if (!currentSession?.isActive) return
    
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId)
      checkAndEnforceFocus(tab.url || '', 'Focus mode active! Returning to focus tab...')
    } catch (error) {
      console.error('Error handling tab activation:', error)
    }
  })
})

function startFocusMode(session: FocusSession) {
  currentSession = session
  
  // Save to storage immediately for persistence across service worker restarts
  chrome.storage.local.set({ focusSession: session })
  
  // Start keep-alive mechanism to prevent service worker from sleeping
  startKeepAlive()
  
  // Set up timer to end session automatically
  setTimeout(() => {
    if (currentSession?.isActive) {
      endFocusMode()
      // Show completion notification
      showCompletionNotification()
    }
  }, session.duration * 60 * 1000)
}

function endFocusMode() {
  currentSession = null
  chrome.storage.local.remove(['focusSession'])
  
  // Stop keep-alive mechanism
  stopKeepAlive()
}

// Keep the service worker alive during active focus sessions
function startKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
  }
  
  // Ping every 20 seconds to keep service worker active
  keepAliveInterval = setInterval(() => {
    if (currentSession?.isActive) {
      console.log('Service worker keep-alive ping - session active')
      // Update session in storage with current timestamp
      chrome.storage.local.set({ 
        focusSession: currentSession,
        lastPing: Date.now()
      })
    } else {
      stopKeepAlive()
    }
  }, 20000)
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
    keepAliveInterval = null
  }
}

// Restore session state when service worker wakes up
function restoreSessionState() {
  chrome.storage.local.get(['focusSession'], (result) => {
    if (result.focusSession && result.focusSession.isActive) {
      const session = result.focusSession
      const now = Date.now()
      const elapsedSeconds = Math.floor((now - session.startTime) / 1000)
      const totalDurationSeconds = session.duration * 60
      
      if (elapsedSeconds >= totalDurationSeconds) {
        // Session should have ended
        console.log('Restored session has expired, ending it')
        endFocusMode()
      } else {
        // Session is still valid, restore it
        console.log('Restoring active focus session from storage')
        currentSession = session
        
        // Restart keep-alive
        startKeepAlive()
        
        // Set up remaining timer
        const remainingTime = (totalDurationSeconds - elapsedSeconds) * 1000
        setTimeout(() => {
          if (currentSession?.isActive) {
            endFocusMode()
            showCompletionNotification()
          }
        }, remainingTime)
      }
    }
  })
}

function showCompletionNotification() {
  const message = '🎉 Focus session completed! Great job staying focused!'
  
  // Only show custom on-screen notification (no Chrome desktop notification)
  sendNotificationToContentScript(message, 'success')
}

function returnToFocusTab() {
  if (!currentSession?.isActive) return
  
  const focusDomain = getDomainFromUrl(currentSession.focusTabUrl)
  
  setTimeout(async () => {
    if (currentSession?.isActive) {
      const tabs = await chrome.tabs.query({ url: `*://${focusDomain}/*` })
      if (tabs.length > 0) {
        await chrome.tabs.update(tabs[0].id!, { active: true })
        showFocusReminderNotification()
      } else {
        // Create new focus tab if original was closed
        chrome.tabs.create({ url: currentSession.focusTabUrl, active: true })
        showFocusReminderNotification()
      }
    }
  }, 500)
}

function checkAndEnforceFocus(url: string, notificationMessage: string) {
  if (!currentSession?.isActive) return

  const focusDomain = getDomainFromUrl(currentSession.focusTabUrl)
  const currentDomain = getDomainFromUrl(url)

  // Allow navigation within the same domain
  if (currentDomain === focusDomain) return

  // Block navigation to different domains
  if (!isAllowedUrl(url)) {
    // Show notification explaining the enforcement
    showNotification(notificationMessage)
    
    // Use shared function to return to focus tab
    returnToFocusTab()
  }
}

function handleNavigationAttempt(_tabId: number, url: string) {
  checkAndEnforceFocus(url, 'Navigation blocked - Focus mode is active! Staying on focus tab.')
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function isAllowedUrl(url: string): boolean {
  // Allow chrome extension pages and new tab
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    return true
  }
  
  // For Phase 1, we only allow the focus domain
  // In Phase 2, we'll add whitelist support
  return false
}

function showNotification(message: string) {
  // Only show custom on-screen notification (no Chrome desktop notification)
  sendNotificationToContentScript(message, 'info')
}

function showFocusReminderNotification() {
  const message = 'Welcome back! Stay focused on your task.'
  console.log("Attempting to show focus reminder notification:", message);
  
  // Only show custom on-screen notification (no Chrome desktop notification)
  sendNotificationToContentScript(message, 'reminder')
}

function sendNotificationToContentScript(message: string, type: 'info' | 'reminder' | 'success') {
  // Send message to content script to show on-screen notification
  console.log('Attempting to send notification:', message, type)
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      console.log('Sending notification to tab:', tabs[0].id, tabs[0].url)
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'showNotification',
        message: message,
        type: type
      }).then((response) => {
        console.log('Notification sent successfully:', response)
      }).catch((error) => {
        console.log('Failed to send notification:', error)
        console.log('This might be because:')
        console.log('1. The page is a chrome:// or extension page (content scripts cannot run)')
        console.log('2. The page is still loading')
        console.log('3. Content Security Policy blocking the script')
        console.log('Try refreshing the page or testing on a different website.')
      })
    } else {
      console.log('No active tab found for notification')
    }
  })
}

// Utility function to ensure session is loaded from storage
function ensureSessionLoaded(callback: () => void) {
  if (currentSession) {
    callback()
  } else {
    // Try to restore session from storage
    chrome.storage.local.get(['focusSession'], (result) => {
      if (result.focusSession && result.focusSession.isActive) {
        const session = result.focusSession
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - session.startTime) / 1000)
        const totalDurationSeconds = session.duration * 60
        
        if (elapsedSeconds < totalDurationSeconds) {
          console.log('Session restored from storage during event handling')
          currentSession = session
          startKeepAlive() // Restart keep-alive
        }
      }
      callback()
    })
  }
}

// Restore session on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['focusSession'], (result) => {
    if (result.focusSession && result.focusSession.isActive) {
      const session = result.focusSession
      const now = Date.now()
      const elapsedSeconds = Math.floor((now - session.startTime) / 1000)
      const totalDurationSeconds = session.duration * 60
      
      if (elapsedSeconds >= totalDurationSeconds) {
        endFocusMode()
      } else {
        currentSession = session
      }
    }
  })
})
