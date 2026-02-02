# Tab Saver - Chrome Extension

A Chrome extension to save, organize, and restore browser tabs with sync across devices.

## Features

- **Save Tabs**: Save current tab, all tabs in window, or all tabs across all windows
- **Pinned Tabs**: Pin important tabs to prevent accidental closure
- **Daily Tabs**: Mark tabs as "daily" to open them every morning with one click
- **Timed Tabs**: Set a countdown timer on tabs and get notified when time is up
- **Due Soon (Reminders)**: Set date/time reminders organized by Today, Tomorrow, This Week, Overdue, and Later
- **Groups**: Organize saved tabs into custom groups with nesting support
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

### Timed Tabs
Set a countdown timer on any tab:
1. Right-click any saved tab
2. Select "Set Timer"
3. Choose hours and minutes
4. Click "Start Timer"
5. The tab will appear in "Timed Tabs" with a live countdown
6. When the timer ends, you'll receive a notification

### Reminders (Due Soon)
Set date-based reminders for tabs:
1. Right-click any saved tab
2. Select "Set Reminder"
3. Choose a date (time is optional)
4. Click "Save"
5. The tab will appear in "Due Soon" organized by:
   - **Overdue** - Past due reminders
   - **Today** - Due today
   - **Tomorrow** - Due tomorrow
   - **This Week** - Due within 7 days
   - **Later** - Due after this week

### Context Menu
Right-click any saved tab for options:
- Open (in current tab)
- Open in new tab
- Pin Tab / Unpin Tab
- Add to / Remove from Daily Tabs
- Set Reminder / Remove Reminder
- Set Timer / Remove Timer
- Move to Group
- Delete

## Data Storage

All data is stored in Chrome's sync storage, meaning:
- Your saved tabs sync across all Chrome browsers where you're signed in
- Data persists even if you reinstall the extension
- Storage is limited to ~100KB (approximately 500-1000 tabs)

## Keyboard Shortcuts

You can set custom keyboard shortcuts in `chrome://extensions/shortcuts`

## Notifications Setup

For timer notifications to work properly, you need to enable notifications for Chrome:

### macOS
1. Open **System Preferences** (or **System Settings** on macOS Ventura+)
2. Go to **Notifications**
3. Find **Google Chrome** in the list
4. Make sure **Allow Notifications** is enabled
5. Ensure **Do Not Disturb** is turned OFF

### Windows
1. Open **Settings** → **System** → **Notifications**
2. Make sure **Notifications** is turned ON
3. Scroll down to find **Google Chrome**
4. Enable notifications for Chrome
5. Ensure **Focus Assist** / **Do Not Disturb** is turned OFF

### Chrome Settings
1. Go to `chrome://settings/content/notifications`
2. Make sure notifications are not blocked for Chrome extensions

### Troubleshooting
- If notifications don't appear, try clicking the "Test Notif" button in the Timed Tabs section
- Check that Chrome is allowed to send notifications in your system settings
- Make sure Do Not Disturb / Focus mode is disabled
- Chrome alarms have a minimum delay of ~1 minute, so short timers may take longer to fire
