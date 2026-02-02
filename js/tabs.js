/**
 * ============================================================================
 * TABS.JS
 * ============================================================================
 *
 * Core tab management operations for the Tab Saver extension.
 * Handles saving, deleting, opening, pinning, and daily tab functionality.
 *
 * Tab Object Structure:
 * {
 *   id: number,           // Unique identifier (timestamp + random)
 *   title: string,        // Tab title
 *   url: string,          // Tab URL
 *   favicon: string,      // Favicon URL or empty string
 *   savedAt: string,      // ISO timestamp when saved
 *   groupId: string|null, // Group ID or null if ungrouped
 *   reminder?: string,    // Optional: ISO timestamp for reminder
 *   hasTime?: boolean     // Optional: Whether reminder has specific time
 * }
 *
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// SAVE CURRENT TAB
// -----------------------------------------------------------------------------

/**
 * Saves the currently active tab to the saved tabs list
 *
 * Queries Chrome for the active tab in the current window
 * and adds it to savedTabs if not already saved.
 *
 * @async
 * @returns {Promise<void>}
 */
async function saveCurrentTab() {
  // Query for the active tab in the current window
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab) {
    addTab(tab);
  }
}

/**
 * Adds a Chrome tab object to the saved tabs list
 *
 * Creates a savedTab object from the Chrome tab and adds it
 * to the beginning of the savedTabs array (most recent first).
 * Prevents duplicates by checking if URL already exists.
 *
 * @param {chrome.tabs.Tab} tab - Chrome tab object from tabs API
 */
function addTab(tab) {
  // Check if tab with this URL is already saved
  const exists = savedTabs.some(t => t.url === tab.url);
  if (exists) return;

  // Create saved tab object
  const savedTab = {
    id: generateId(),
    title: tab.title,
    url: tab.url,
    favicon: tab.favIconUrl || '',
    savedAt: new Date().toISOString(),
    groupId: null
  };

  // Add to beginning of array (most recent first)
  savedTabs.unshift(savedTab);
  saveData();
  renderAll();
}

/**
 * Saves a tab from the Current Tabs panel
 *
 * Similar to addTab but takes individual properties instead
 * of a Chrome tab object. Used when saving from the
 * Current Tabs panel where we already extracted the data.
 *
 * @param {string} url - Tab URL
 * @param {string} title - Tab title
 * @param {string} favicon - Favicon URL
 */
function saveTabFromCurrent(url, title, favicon) {
  // Prevent duplicate saves
  if (savedTabs.some(t => t.url === url)) return;

  const savedTab = {
    id: generateId(),
    title: title,
    url: url,
    favicon: favicon,
    savedAt: new Date().toISOString(),
    groupId: null
  };

  savedTabs.unshift(savedTab);
  saveData();
}

// -----------------------------------------------------------------------------
// DELETE TAB
// -----------------------------------------------------------------------------

/**
 * Deletes a tab from all lists (saved, daily, timed)
 *
 * Removes the tab from savedTabs, dailyTabs, and timedTabs arrays.
 * Also clears any associated alarms and timer intervals.
 *
 * @param {number} tabId - ID of the tab to delete
 */
function deleteTab(tabId) {
  // Remove from saved tabs
  savedTabs = savedTabs.filter(t => t.id !== tabId);

  // Remove from daily tabs
  dailyTabs = dailyTabs.filter(t => t.id !== tabId);

  // Remove from timed tabs and clean up alarm/interval
  if (timedTabs.some(t => t.id === tabId)) {
    timedTabs = timedTabs.filter(t => t.id !== tabId);
    chrome.alarms.clear(`timer-${tabId}`);

    if (timerIntervals[tabId]) {
      clearInterval(timerIntervals[tabId]);
      delete timerIntervals[tabId];
    }
  }

  saveData();
  renderAll();
}

// -----------------------------------------------------------------------------
// OPEN TAB
// -----------------------------------------------------------------------------

/**
 * Opens a URL, checking for existing tabs to prevent duplicates
 *
 * Before opening a new tab, this function checks if a tab with
 * the same URL already exists in any window. If found, it focuses
 * that existing tab instead of creating a duplicate.
 *
 * @async
 * @param {string} url - URL to open
 * @param {boolean} [newTab=false] - If true, opens in new tab; if false, uses current tab
 * @returns {Promise<void>}
 */
async function openTab(url, newTab = false) {
  // Query all tabs across all windows
  const allTabs = await chrome.tabs.query({});

  // Check if tab with this URL already exists (normalize URLs for comparison)
  const existingTab = allTabs.find(t => normalizeUrl(t.url) === normalizeUrl(url));

  if (existingTab) {
    // Focus existing tab instead of creating duplicate
    await chrome.tabs.update(existingTab.id, { active: true });
    await chrome.windows.update(existingTab.windowId, { focused: true });
  } else if (newTab) {
    // Create new tab
    await chrome.tabs.create({ url });
  } else {
    // Replace current tab's URL
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.update(currentTab.id, { url });
  }
}

// -----------------------------------------------------------------------------
// PINNED TABS
// -----------------------------------------------------------------------------

/**
 * Adds a saved tab to the pinned tabs list
 *
 * Pinned tabs are "protected" tabs that the background script
 * monitors and re-opens if accidentally closed.
 *
 * @param {number} tabId - ID of the saved tab to pin
 */
function addToPinnedTabs(tabId) {
  const tab = savedTabs.find(t => t.id === tabId);
  if (!tab) return;

  // Prevent duplicate pinning
  if (!pinnedTabs.some(t => t.id === tabId)) {
    // Create a copy of the tab for the pinned list
    pinnedTabs.push({ ...tab });
    saveData();
    renderAll();
  }
}

/**
 * Removes a tab from the pinned tabs list
 *
 * The tab remains in savedTabs; it's just no longer protected.
 *
 * @param {number} tabId - ID of the tab to unpin
 */
function removeFromPinnedTabs(tabId) {
  pinnedTabs = pinnedTabs.filter(t => t.id !== tabId);
  saveData();
  renderAll();
}

/**
 * Opens all pinned tabs in new tabs
 *
 * Iterates through pinnedTabs and opens each one.
 * Uses the openTab function which prevents duplicates.
 *
 * @async
 * @returns {Promise<void>}
 */
async function openAllPinnedTabs() {
  for (const tab of pinnedTabs) {
    await openTab(tab.url, true);
  }
}

// -----------------------------------------------------------------------------
// DAILY TABS
// -----------------------------------------------------------------------------

/**
 * Adds a saved tab to the daily tabs list
 *
 * Daily tabs are tabs the user wants quick access to every day.
 * They can be opened all at once with the "Open All" button.
 *
 * @param {number} tabId - ID of the saved tab to add as daily
 */
function addToDailyTabs(tabId) {
  const tab = savedTabs.find(t => t.id === tabId);
  if (!tab) return;

  // Prevent duplicate addition
  if (!dailyTabs.some(t => t.id === tabId)) {
    // Create a copy for the daily list
    dailyTabs.push({ ...tab });
    saveData();
    renderAll();
  }
}

/**
 * Removes a tab from the daily tabs list
 *
 * The tab remains in savedTabs; it's just no longer marked as daily.
 *
 * @param {number} tabId - ID of the tab to remove from daily
 */
function removeFromDailyTabs(tabId) {
  dailyTabs = dailyTabs.filter(t => t.id !== tabId);
  saveData();
  renderAll();
}

/**
 * Opens all daily tabs in new tabs
 *
 * Called when user clicks "Open All" in the Daily Tabs section.
 * Opens each daily tab in a new tab.
 *
 * @async
 * @returns {Promise<void>}
 */
async function openAllDailyTabs() {
  for (const tab of dailyTabs) {
    await openTab(tab.url, true);
  }
}

// -----------------------------------------------------------------------------
// MOVE TO GROUP
// -----------------------------------------------------------------------------

/**
 * Moves a tab to a different group
 *
 * Updates the tab's groupId property and re-renders the UI.
 * Used by drag-and-drop and the context menu "Move to Group" option.
 *
 * @param {number} tabId - ID of the tab to move
 * @param {string|null} groupId - Target group ID, or null for ungrouped
 */
function moveToGroup(tabId, groupId) {
  const tab = savedTabs.find(t => t.id === tabId);
  if (tab) {
    tab.groupId = groupId;
    saveData();
    renderAll();
  }
}

/**
 * Shows a prompt to move a tab to a group
 *
 * Simple implementation using browser prompt.
 * Could be enhanced with a proper dropdown/submenu UI.
 *
 * @param {number} tabId - ID of the tab to move
 */
function showMoveToGroupMenu(tabId) {
  // Build list of available group names
  const groupNames = groups.map(g => g.name).join(', ');
  const groupName = prompt(`Move to group (available: ${groupNames || 'none - create a group first'}):`);

  if (groupName) {
    // Find group by name (case-insensitive)
    const group = groups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
    if (group) {
      moveToGroup(tabId, group.id);
    } else {
      alert('Group not found');
    }
  }
}
