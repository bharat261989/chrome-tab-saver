# Tab Saver - Chrome Extension

A Chrome extension to save, organize, and restore browser tabs with sync across devices.

## Features

- **Save Tabs**: Save current tab, all tabs in window, or all tabs across all windows
- **Daily Tabs**: Mark tabs as "daily" to open them every morning with one click
- **Groups**: Organize saved tabs into custom groups
- **Search**: Quickly find saved tabs by title or URL
- **Sync**: All data syncs across your Chrome browsers via Chrome Sync
- **Side Panel**: Access your saved tabs from a convenient side panel

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-tab-saver` folder

## Usage

### Opening the Side Panel
- Click the Tab Saver extension icon in your toolbar
- The side panel will open on the left side of your browser

### Saving Tabs
- **Current Tab**: Click "+ Current Tab" to save the active tab
- **All Tabs**: Click "++ All Tabs" to save all tabs in the current window
- **All Windows**: Click "+++ All Windows" to save tabs from all open windows

### Daily Tabs
Daily tabs are tabs you want to open every morning:
1. Right-click any saved tab
2. Select "Add to Daily Tabs"
3. Click "Open All" in the Daily Tabs section to open them all at once

### Groups
Organize your tabs into groups:
1. Click "+ Group" to create a new group
2. Right-click any tab and select "Move to Group"
3. Click a group header to expand/collapse it
4. Use the group actions to open all tabs, edit, or delete the group

### Context Menu
Right-click any saved tab for options:
- Open (in current tab)
- Open in new tab
- Add to / Remove from Daily Tabs
- Move to Group
- Delete

## Data Storage

All data is stored in Chrome's sync storage, meaning:
- Your saved tabs sync across all Chrome browsers where you're signed in
- Data persists even if you reinstall the extension
- Storage is limited to ~100KB (approximately 500-1000 tabs)

## Keyboard Shortcuts

You can set custom keyboard shortcuts in `chrome://extensions/shortcuts`
