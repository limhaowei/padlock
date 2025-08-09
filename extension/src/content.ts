// Content script for Padlock extension
// This script runs on all pages and can be used for additional restrictions

console.log('Padlock content script loaded on:', window.location.href)

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Content script received message:', message)
  
  if (message.action === 'blockNavigation') {
    // Prevent navigation by showing a warning
    const overlay = createBlockOverlay()
    document.body.appendChild(overlay)
    
    setTimeout(() => {
      overlay.remove()
    }, 3000)
    
    sendResponse({ success: true })
  } else if (message.action === 'showNotification') {
    // Show prominent on-screen notification
    console.log('Showing notification:', message.message, message.type)
    showOnScreenNotification(message.message, message.type)
    sendResponse({ success: true })
  }
  
  // Return true to indicate we will respond asynchronously
  return true
})

function createBlockOverlay(): HTMLElement {
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: Arial, sans-serif;
    font-size: 24px;
    z-index: 10000;
    text-align: center;
  `
  
  overlay.innerHTML = `
    <div>
      <h2>🔒 Focus Mode Active</h2>
      <p>Navigation blocked - Stay focused!</p>
    </div>
  `
  
  return overlay
}

function showOnScreenNotification(message: string, type: 'info' | 'reminder' | 'success') {
  // Create and display the actual on-screen notification UI
  // This function handles the visual rendering of notifications in the page
  console.log('Creating on-screen notification:', message, type)
  
  // Remove any existing notifications first
  const existingNotifications = document.querySelectorAll('.padlock-notification')
  existingNotifications.forEach(notification => notification.remove())
  console.log('Removed', existingNotifications.length, 'existing notifications')
  
  const notification = document.createElement('div')
  notification.className = 'padlock-notification'
  
  // Different styles based on notification type
  let backgroundColor: string
  let borderColor: string
  let icon: string
  
  switch (type) {
    case 'success':
      backgroundColor = 'rgba(34, 197, 94, 0.95)'
      borderColor = '#16a34a'
      icon = '🎉'
      break
    case 'reminder':
      backgroundColor = 'rgba(59, 130, 246, 0.95)'
      borderColor = '#3b82f6'
      icon = '💡'
      break
    default: // info
      backgroundColor = 'rgba(239, 68, 68, 0.95)'
      borderColor = '#dc2626'
      icon = '🔒'
  }
  
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${backgroundColor};
    color: white;
    padding: 24px 32px;
    border-radius: 12px;
    border: 3px solid ${borderColor};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 18px;
    font-weight: 600;
    z-index: 99999;
    text-align: center;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    max-width: 90%;
    min-width: 300px;
    animation: slideIn 0.3s ease-out;
  `
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 24px;">${icon}</span>
        <div>
          <div style="font-weight: bold; margin-bottom: 4px;">Padlock Focus Mode</div>
          <div style="font-weight: normal; opacity: 0.9;">${message}</div>
        </div>
      </div>
      <button 
        class="padlock-close-btn"
        style="
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          color: white;
          cursor: pointer;
          font-size: 18px;
          font-weight: bold;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          margin: 0;
          transition: all 0.2s ease;
          flex-shrink: 0;
          line-height: 1;
        "
        onmouseover="this.style.background='rgba(255,255,255,0.4)'; this.style.transform='scale(1.1)'"
        onmouseout="this.style.background='rgba(255,255,255,0.2)'; this.style.transform='scale(1)'"
        title="Close notification"
      >×</button>
    </div>
  `
  
  // Add animation keyframes if not already added
  if (!document.querySelector('#padlock-animations')) {
    const style = document.createElement('style')
    style.id = 'padlock-animations'
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translate(-50%, -60%);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
      }
    `
    document.head.appendChild(style)
  }
  
  document.body.appendChild(notification)
  
  // Add close button functionality
  const closeBtn = notification.querySelector('.padlock-close-btn')
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      removeNotification(notification)
    })
  }
  
  // Auto-remove after 1.5 seconds (can be cancelled by close button)
  const autoRemoveTimeout = setTimeout(() => {
    removeNotification(notification)
  }, 1500)
  
  // Store timeout ID so we can cancel it if user closes manually
  ;(notification as any).autoRemoveTimeout = autoRemoveTimeout
}

function removeNotification(notification: Element) {
  if (notification.parentNode) {
    // Cancel auto-removal timeout if it exists
    const timeoutId = (notification as any).autoRemoveTimeout
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    // Animate out
    ;(notification as HTMLElement).style.opacity = '0'
    ;(notification as HTMLElement).style.transform = 'translate(-50%, -40%)'
    ;(notification as HTMLElement).style.transition = 'all 0.3s ease-out'
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove()
      }
    }, 300)
  }
}
