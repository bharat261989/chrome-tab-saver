// Background service worker for Tab Saver extension

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Set side panel to open on the left (if supported)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Log when service worker starts
console.log('Tab Saver background service worker started');

// Handle timer alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('=== ALARM FIRED ===');
  console.log('Alarm name:', alarm.name);
  console.log('Alarm time:', new Date(alarm.scheduledTime));

  if (alarm.name.startsWith('timer-')) {
    const tabId = parseFloat(alarm.name.replace('timer-', ''));

    // Get the timed tab info
    const result = await chrome.storage.sync.get(['timedTabs']);
    const timedTabs = result.timedTabs || [];
    const timedTab = timedTabs.find(t => t.id === tabId);

    console.log('All timed tabs:', timedTabs);
    console.log('Looking for tab ID:', tabId);
    console.log('Timer tab found:', timedTab);

    if (timedTab) {
      console.log('Creating notification for:', timedTab.title);
      // Show notification - use extension icon (favicon URLs don't work reliably)
      const iconUrl = chrome.runtime.getURL('icons/icon128.png');

      try {
        chrome.notifications.create(`timer-notification-${tabId}`, {
          type: 'basic',
          iconUrl: iconUrl,
          title: 'Timer Complete!',
          message: timedTab.title || 'Your timer has finished',
          priority: 2,
          requireInteraction: true
        }, (notificationId) => {
          if (chrome.runtime.lastError) {
            console.error('Notification error:', chrome.runtime.lastError);
          } else {
            console.log('Notification created:', notificationId);
          }
        });
      } catch (e) {
        console.error('Failed to create notification:', e);
      }
    }
  }
});

// Handle notification button clicks (note: buttons may not work on all platforms like macOS)
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId.startsWith('timer-notification-') || notificationId.startsWith('timer-sidepanel-')) {
    const prefix = notificationId.startsWith('timer-notification-') ? 'timer-notification-' : 'timer-sidepanel-';
    const tabId = parseFloat(notificationId.replace(prefix, ''));

    if (buttonIndex === 0) {
      // Open Tab button clicked
      const result = await chrome.storage.sync.get(['timedTabs']);
      const timedTabs = result.timedTabs || [];
      const timedTab = timedTabs.find(t => t.id === tabId);

      if (timedTab) {
        await chrome.tabs.create({ url: timedTab.url });
      }
    }

    // Clear the notification
    chrome.notifications.clear(notificationId);

    // Remove from timed tabs
    const result = await chrome.storage.sync.get(['timedTabs']);
    let timedTabs = result.timedTabs || [];
    timedTabs = timedTabs.filter(t => t.id !== tabId);
    await chrome.storage.sync.set({ timedTabs });
  }
});

// Handle notification click (clicking the notification body)
chrome.notifications.onClicked.addListener(async (notificationId) => {
  // Handle both timer-notification- and timer-sidepanel- prefixes
  if (notificationId.startsWith('timer-notification-') || notificationId.startsWith('timer-sidepanel-')) {
    const prefix = notificationId.startsWith('timer-notification-') ? 'timer-notification-' : 'timer-sidepanel-';
    const tabId = parseFloat(notificationId.replace(prefix, ''));

    const result = await chrome.storage.sync.get(['timedTabs']);
    const timedTabs = result.timedTabs || [];
    const timedTab = timedTabs.find(t => t.id === tabId);

    if (timedTab) {
      await chrome.tabs.create({ url: timedTab.url });
    }

    chrome.notifications.clear(notificationId);
  }
});

// Duplicate tab prevention - when a tab is created, check if same URL exists
chrome.tabs.onCreated.addListener(async (newTab) => {
  // Wait a moment for the tab URL to be set
  setTimeout(async () => {
    try {
      // Get the updated tab info (URL might not be available immediately)
      const tab = await chrome.tabs.get(newTab.id);

      if (!tab.url || tab.url === 'chrome://newtab/' || tab.url.startsWith('chrome://')) {
        return;
      }

      // Find existing tabs with the same URL
      const allTabs = await chrome.tabs.query({});
      const duplicates = allTabs.filter(t =>
        t.id !== tab.id &&
        normalizeUrl(t.url) === normalizeUrl(tab.url)
      );

      if (duplicates.length > 0) {
        // Found a duplicate - close the new tab and focus the existing one
        const existingTab = duplicates[0];
        await chrome.tabs.remove(tab.id);
        await chrome.tabs.update(existingTab.id, { active: true });
        await chrome.windows.update(existingTab.windowId, { focused: true });
      }
    } catch (e) {
      // Tab might have been closed already, ignore errors
    }
  }, 100);
});

// Also check when a tab URL changes (navigation)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && !changeInfo.url.startsWith('chrome://')) {
    try {
      const allTabs = await chrome.tabs.query({});
      const duplicates = allTabs.filter(t =>
        t.id !== tabId &&
        normalizeUrl(t.url) === normalizeUrl(changeInfo.url)
      );

      if (duplicates.length > 0) {
        const existingTab = duplicates[0];
        await chrome.tabs.remove(tabId);
        await chrome.tabs.update(existingTab.id, { active: true });
        await chrome.windows.update(existingTab.windowId, { focused: true });
      }
    } catch (e) {
      // Ignore errors
    }
  }
});

// Normalize URL for comparison (remove trailing slashes and fragments only)
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    // Keep the full URL but remove fragment (#) and trailing slash
    // This preserves query params so different YouTube videos, search results, etc. are unique
    return parsed.origin + parsed.pathname.replace(/\/$/, '') + parsed.search;
  } catch {
    return url;
  }
}

// Pinned tab protection - track open tabs and re-open if pinned tab is closed
let openTabs = new Map(); // tabId -> url
let confirmedCloses = new Set(); // URLs that user confirmed to close

// Track all open tabs
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.url && !tab.url.startsWith('chrome://')) {
    openTabs.set(tabId, tab.url);
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.url) {
    openTabs.set(tab.id, tab.url);
  }
});

// When a tab is closed, check if it was pinned
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const closedUrl = openTabs.get(tabId);
  openTabs.delete(tabId);

  if (!closedUrl || closedUrl.startsWith('chrome://')) return;

  // Check if this URL is in our pinned tabs
  const result = await chrome.storage.sync.get(['pinnedTabs']);
  const pinnedTabs = result.pinnedTabs || [];
  const pinnedTab = pinnedTabs.find(t => normalizeUrl(t.url) === normalizeUrl(closedUrl));

  if (pinnedTab) {
    // Check if user already confirmed closing this URL
    if (confirmedCloses.has(closedUrl)) {
      confirmedCloses.delete(closedUrl);
      return; // User confirmed, let it close
    }

    // Re-open the tab and show confirmation
    const newTab = await chrome.tabs.create({
      url: closedUrl,
      active: true
    });

    // Show confirmation dialog via a simple prompt page
    // We'll inject a content script to show the dialog
    setTimeout(async () => {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: newTab.id },
          func: showPinnedTabConfirmation,
          args: [pinnedTab.title || closedUrl]
        });
      } catch (e) {
        // If we can't inject (e.g., chrome:// pages), just keep the tab open
      }
    }, 500);
  }
});

// Function to be injected into the page
function showPinnedTabConfirmation(tabTitle) {
  const confirmed = confirm(`⚠️ PINNED TAB\n\nThis tab "${tabTitle}" is pinned.\n\nAre you sure you want to close it?`);

  if (confirmed) {
    // Send message to background to allow closing
    chrome.runtime.sendMessage({ type: 'confirmClose', url: window.location.href });
  }
}

// Listen for close confirmation
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'confirmClose') {
    confirmedCloses.add(message.url);
    // Remove from pinned tabs in storage
    removeFromPinnedTabs(message.url);
    // Close the tab
    if (sender.tab) {
      chrome.tabs.remove(sender.tab.id);
    }
  }
});

// Remove URL from pinned tabs storage
async function removeFromPinnedTabs(url) {
  const result = await chrome.storage.sync.get(['pinnedTabs']);
  let pinnedTabs = result.pinnedTabs || [];
  pinnedTabs = pinnedTabs.filter(t => normalizeUrl(t.url) !== normalizeUrl(url));
  await chrome.storage.sync.set({ pinnedTabs });
}
