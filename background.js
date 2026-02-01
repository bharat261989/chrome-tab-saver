// Background service worker for Tab Saver extension

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Set side panel to open on the left (if supported)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

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
