# Padlock Browser Extension

A browser extension that helps you focus by restricting browsing to a single tab for a specified duration.

## Features (Phase 1)

- 🔒 **Focus Mode**: Lock browsing to the current tab for a set duration
- ⏱️ **Timer**: Set focus sessions from 1 minute to 8 hours
- 🚫 **Tab Restrictions**: Prevents navigation to other domains during focus sessions
- 🎯 **Simple UI**: Clean, accessible interface using shadcn/ui components

## Installation (Development)

1. Clone the repository and navigate to the extension folder:
   ```bash
   cd extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the `dist` folder from the extension directory

## Usage

1. **Start Focus Session**:
   - Click the Padlock extension icon in your browser toolbar
   - Set your desired focus duration (in minutes)
   - Click "Start Focus Session"

2. **During Focus Session**:
   - You'll be restricted to the current domain
   - Attempts to navigate to other sites will be blocked
   - The popup shows remaining time

3. **End Session**:
   - Sessions end automatically when the timer expires
   - You can manually end a session by clicking "End Session"
   - You'll receive a notification when the session completes

## Tech Stack

- **Framework**: Vite + CRXJS Plugin
- **Language**: TypeScript
- **UI**: React + shadcn/ui
- **Styling**: Tailwind CSS
- **Manifest**: Chrome Extension Manifest V3

## Development

### Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Project Structure

```
src/
├── components/
│   ├── Popup.tsx         # Main popup component
│   └── ui/              # shadcn/ui components
├── background.ts        # Background service worker
├── content.ts          # Content script
├── popup.html          # Popup HTML template
├── popup.tsx          # Popup entry point
├── manifest.json      # Extension manifest
└── styles/
    └── globals.css    # Tailwind CSS styles
```

## Planned updates
- Whitelist implementation that uses local storage (maybe with dexie)
- User accounts, cloud sync, web dashboard
- Focus history, AI-powered suggestions
