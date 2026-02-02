/**
 * ============================================================================
 * BACKGROUND.JS
 * ============================================================================
 *
 * Background Service Worker for the Tab Saver Chrome Extension.
 *
 * This file runs persistently in the background and handles:
 * - Extension icon click to open side panel
 * - Timer alarms and notifications
 * - Duplicate tab prevention
 * - Pinned tab protection (re-opens if accidentally closed)
 *
 * Note: In Manifest V3, background scripts are service workers that can
 * be suspended when idle and restarted when needed.
 *
 * ============================================================================
 */

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Open side panel when extension icon is clicked
 *
 * The action.onClicked event fires when user clicks the extension icon
 * in the browser toolbar.
 */
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

/**
 * Configure side panel to open on action click
 *
 * This enables the side panel to be opened automatically when
 * the user clicks the extension icon.
 */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Log startup for debugging
console.log('Tab Saver background service worker started');

// =============================================================================
// TIMER ALARMS & NOTIFICATIONS
// =============================================================================

/**
 * Handle timer alarm events
 *
 * When a timer alarm fires, we look up the associated tab and
 * create a notification to alert the user their timer is complete.
 *
 * Alarm names follow the pattern: "timer-{tabId}"
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('=== ALARM FIRED ===');
  console.log('Alarm name:', alarm.name);
  console.log('Alarm time:', new Date(alarm.scheduledTime));

  // Check if this is a timer alarm
  if (alarm.name.startsWith('timer-')) {
    // Extract tab ID from alarm name
    const tabId = parseFloat(alarm.name.replace('timer-', ''));

    // Get the timed tab info from storage
    const result = await chrome.storage.sync.get(['timedTabs']);
    const timedTabs = result.timedTabs || [];
    const timedTab = timedTabs.find(t => t.id === tabId);

    console.log('All timed tabs:', timedTabs);
    console.log('Looking for tab ID:', tabId);
    console.log('Timer tab found:', timedTab);

    if (timedTab) {
      console.log('Creating notification for:', timedTab.title);

      // Get extension icon URL for notification
      // Note: Favicon URLs don't work reliably in notifications
      const iconUrl = chrome.runtime.getURL('icons/icon128.png');

      try {
        // Create the notification
        chrome.notifications.create(`timer-notification-${tabId}`, {
          type: 'basic',
          iconUrl: iconUrl,
          title: 'Timer Complete!',
          message: timedTab.title || 'Your timer has finished',
          priority: 2,
          requireInteraction: true  // Keep visible until user interacts
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

/**
 * Handle notification button clicks
 *
 * Note: Notification buttons may not work on all platforms (e.g., macOS).
 * This handler processes button clicks when supported.
 */
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  // Check if this is a timer notification
  if (notificationId.startsWith('timer-notification-') || notificationId.startsWith('timer-sidepanel-')) {
    // Determine which prefix was used
    const prefix = notificationId.startsWith('timer-notification-') ? 'timer-notification-' : 'timer-sidepanel-';
    const tabId = parseFloat(notificationId.replace(prefix, ''));

    if (buttonIndex === 0) {
      // "Open Tab" button was clicked
      const result = await chrome.storage.sync.get(['timedTabs']);
      const timedTabs = result.timedTabs || [];
      const timedTab = timedTabs.find(t => t.id === tabId);

      if (timedTab) {
        // Open the tab URL
        await chrome.tabs.create({ url: timedTab.url });
      }
    }

    // Clear the notification
    chrome.notifications.clear(notificationId);

    // Remove from timed tabs in storage
    const result = await chrome.storage.sync.get(['timedTabs']);
    let timedTabs = result.timedTabs || [];
    timedTabs = timedTabs.filter(t => t.id !== tabId);
    await chrome.storage.sync.set({ timedTabs });
  }
});

/**
 * Handle notification body clicks
 *
 * When user clicks the notification body (not a button),
 * open the associated tab URL.
 */
chrome.notifications.onClicked.addListener(async (notificationId) => {
  // Handle both timer-notification- and timer-sidepanel- prefixes
  if (notificationId.startsWith('timer-notification-') || notificationId.startsWith('timer-sidepanel-')) {
    const prefix = notificationId.startsWith('timer-notification-') ? 'timer-notification-' : 'timer-sidepanel-';
    const tabId = parseFloat(notificationId.replace(prefix, ''));

    // Get the tab info
    const result = await chrome.storage.sync.get(['timedTabs']);
    const timedTabs = result.timedTabs || [];
    const timedTab = timedTabs.find(t => t.id === tabId);

    if (timedTab) {
      // Open the tab URL
      await chrome.tabs.create({ url: timedTab.url });
    }

    // Clear the notification
    chrome.notifications.clear(notificationId);
  }
});

// =============================================================================
// DUPLICATE TAB PREVENTION
// =============================================================================

/**
 * Prevent duplicate tabs when a new tab is created
 *
 * When a new tab is created, we check if another tab with the same
 * normalized URL already exists. If so, we close the new tab and
 * focus the existing one instead.
 */
chrome.tabs.onCreated.addListener(async (newTab) => {
  // Wait a moment for the tab URL to be set
  // (URL might not be available immediately after creation)
  setTimeout(async () => {
    try {
      // Get the updated tab info
      const tab = await chrome.tabs.get(newTab.id);

      // Skip chrome:// URLs and new tab page
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

/**
 * Prevent duplicate tabs when navigating to a new URL
 *
 * Similar to the onCreated handler, but for when an existing
 * tab navigates to a URL that's already open in another tab.
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only check when URL changes
  if (changeInfo.url && !changeInfo.url.startsWith('chrome://')) {
    try {
      // Find existing tabs with the same URL
      const allTabs = await chrome.tabs.query({});
      const duplicates = allTabs.filter(t =>
        t.id !== tabId &&
        normalizeUrl(t.url) === normalizeUrl(changeInfo.url)
      );

      if (duplicates.length > 0) {
        // Found a duplicate - close this tab and focus the existing one
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

/**
 * Normalizes a URL for comparison purposes
 *
 * Removes trailing slashes and fragments (#) while preserving
 * query parameters. This ensures:
 * - example.com and example.com/ are considered the same
 * - example.com/page#section and example.com/page are the same
 * - example.com?q=1 and example.com?q=2 are different
 *
 * @param {string} url - The URL to normalize
 * @returns {string} - Normalized URL
 */
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    // Keep origin + pathname (without trailing slash) + query params
    return parsed.origin + parsed.pathname.replace(/\/$/, '') + parsed.search;
  } catch {
    return url;
  }
}

// =============================================================================
// PINNED TAB PROTECTION
// =============================================================================

/**
 * Map of currently open tabs: tabId -> url
 *
 * Used to track what URL a tab had when it was closed,
 * since the URL is no longer available after removal.
 */
let openTabs = new Map();

/**
 * Set of URLs that user has confirmed they want to close
 *
 * When a user closes a pinned tab and confirms the dialog,
 * we add the URL here so we don't re-open it again.
 */
let confirmedCloses = new Set();

/**
 * Track tab URLs as they update
 *
 * We need to keep track of tab URLs because once a tab is closed,
 * we can't query for its URL anymore.
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Store the URL for non-chrome pages
  if (tab.url && !tab.url.startsWith('chrome://')) {
    openTabs.set(tabId, tab.url);
  }
});

/**
 * Track tab URLs when tabs are created
 */
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.url) {
    openTabs.set(tab.id, tab.url);
  }
});

/**
 * Handle tab closure - protect pinned tabs
 *
 * When a tab is closed, we check if it was in our pinned tabs list.
 * If so, we re-open it and show a confirmation dialog to ensure
 * the user really wants to close it.
 */
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  // Get the URL of the closed tab from our tracking map
  const closedUrl = openTabs.get(tabId);
  openTabs.delete(tabId);

  // Skip if no URL or if it's a chrome:// page
  if (!closedUrl || closedUrl.startsWith('chrome://')) return;

  // Check if this URL is in our pinned tabs
  const result = await chrome.storage.sync.get(['pinnedTabs']);
  const pinnedTabs = result.pinnedTabs || [];
  const pinnedTab = pinnedTabs.find(t => normalizeUrl(t.url) === normalizeUrl(closedUrl));

  if (pinnedTab) {
    // This was a pinned tab!

    // Check if user already confirmed closing this URL
    if (confirmedCloses.has(closedUrl)) {
      confirmedCloses.delete(closedUrl);
      return; // User confirmed, allow it to stay closed
    }

    // Re-open the tab
    const newTab = await chrome.tabs.create({
      url: closedUrl,
      active: true
    });

    // Show confirmation dialog via content script injection
    setTimeout(async () => {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: newTab.id },
          func: showPinnedTabConfirmation,
          args: [pinnedTab.title || closedUrl]
        });
      } catch (e) {
        // If we can't inject (e.g., chrome:// pages), just keep the tab open
        // The user can close it again if they really want to
      }
    }, 500);
  }
});

/**
 * Function to be injected into the page for pinned tab confirmation
 *
 * Shows a confirmation dialog asking if the user really wants
 * to close this pinned tab. If confirmed, sends a message to
 * the background script to allow closing.
 *
 * @param {string} tabTitle - Title of the pinned tab
 */
function showPinnedTabConfirmation(tabTitle) {
  const confirmed = confirm(
    `\u26a0\ufe0f PINNED TAB\n\n` +
    `This tab "${tabTitle}" is pinned.\n\n` +
    `Are you sure you want to close it?`
  );

  if (confirmed) {
    // Send message to background to allow closing
    chrome.runtime.sendMessage({ type: 'confirmClose', url: window.location.href });
  }
}

/**
 * Handle messages from content scripts
 *
 * Listens for 'confirmClose' messages from the injected
 * confirmation dialog script.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'confirmClose') {
    // Add to confirmed closes set so we don't re-open again
    confirmedCloses.add(message.url);

    // Remove from pinned tabs in storage
    removeFromPinnedTabs(message.url);

    // Close the tab
    if (sender.tab) {
      chrome.tabs.remove(sender.tab.id);
    }
  }
});

/**
 * Removes a URL from the pinned tabs storage
 *
 * Called when user confirms they want to close a pinned tab.
 *
 * @async
 * @param {string} url - The URL to remove from pinned tabs
 */
async function removeFromPinnedTabs(url) {
  const result = await chrome.storage.sync.get(['pinnedTabs']);
  let pinnedTabs = result.pinnedTabs || [];

  // Filter out the matching URL
  pinnedTabs = pinnedTabs.filter(t => normalizeUrl(t.url) !== normalizeUrl(url));

  // Save back to storage
  await chrome.storage.sync.set({ pinnedTabs });
}
