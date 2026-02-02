/**
 * ============================================================================
 * STORAGE.JS
 * ============================================================================
 *
 * Handles all Chrome storage operations for the Tab Saver extension.
 *
 * Chrome Storage API:
 * - Uses chrome.storage.sync for cross-device synchronization
 * - Data persists even after browser restart
 * - Limited to ~100KB total (approximately 500-1000 tabs)
 *
 * Functions:
 * - loadData(): Load all data from storage on startup
 * - saveData(): Persist current state to storage
 * - setupStorageChangeListener(): React to external storage changes
 *
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// LOAD DATA
// -----------------------------------------------------------------------------

/**
 * Loads all saved data from Chrome's sync storage
 *
 * Called during initialization to restore the user's saved tabs,
 * groups, and settings from their previous session.
 *
 * Chrome sync storage automatically synchronizes data across
 * all of the user's Chrome browsers where they're signed in.
 *
 * @async
 * @returns {Promise<void>}
 */
async function loadData() {
  try {
    // Request all our data keys from storage
    const result = await chrome.storage.sync.get([
      STORAGE_KEYS.SAVED_TABS,
      STORAGE_KEYS.GROUPS,
      STORAGE_KEYS.DAILY_TABS,
      STORAGE_KEYS.PINNED_TABS,
      STORAGE_KEYS.TIMED_TABS
    ]);

    // Populate state variables with stored data (or empty arrays as fallback)
    savedTabs = result[STORAGE_KEYS.SAVED_TABS] || [];
    groups = result[STORAGE_KEYS.GROUPS] || [];
    dailyTabs = result[STORAGE_KEYS.DAILY_TABS] || [];
    pinnedTabs = result[STORAGE_KEYS.PINNED_TABS] || [];
    timedTabs = result[STORAGE_KEYS.TIMED_TABS] || [];

    console.log('Data loaded from storage:', {
      savedTabs: savedTabs.length,
      groups: groups.length,
      dailyTabs: dailyTabs.length,
      pinnedTabs: pinnedTabs.length,
      timedTabs: timedTabs.length
    });
  } catch (error) {
    console.error('Failed to load data from storage:', error);
  }
}

// -----------------------------------------------------------------------------
// SAVE DATA
// -----------------------------------------------------------------------------

/**
 * Saves all current state to Chrome's sync storage
 *
 * Called after any state modification (adding/removing tabs, etc.)
 * to ensure data persistence.
 *
 * Note: Chrome sync storage has a quota limit (~100KB).
 * Each write counts against a rate limit (MAX_WRITE_OPERATIONS_PER_MINUTE).
 *
 * @async
 * @returns {Promise<void>}
 */
async function saveData() {
  try {
    await chrome.storage.sync.set({
      [STORAGE_KEYS.SAVED_TABS]: savedTabs,
      [STORAGE_KEYS.GROUPS]: groups,
      [STORAGE_KEYS.DAILY_TABS]: dailyTabs,
      [STORAGE_KEYS.PINNED_TABS]: pinnedTabs,
      [STORAGE_KEYS.TIMED_TABS]: timedTabs
    });

    console.log('Data saved to storage');
  } catch (error) {
    console.error('Failed to save data to storage:', error);

    // Check if it's a quota exceeded error
    if (error.message?.includes('QUOTA')) {
      alert('Storage quota exceeded! Please delete some tabs to free up space.');
    }
  }
}

// -----------------------------------------------------------------------------
// STORAGE CHANGE LISTENER
// -----------------------------------------------------------------------------

/**
 * Sets up a listener for external storage changes
 *
 * This handles cases where data is modified from:
 * - Another Chrome window/tab running the extension
 * - The background script (e.g., when removing a pinned tab)
 * - Another device syncing via Chrome sync
 *
 * When changes are detected, the UI is automatically updated
 * to reflect the new state.
 */
function setupStorageChangeListener() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    // Only react to sync storage changes
    if (areaName !== 'sync') return;

    console.log('Storage changed externally:', Object.keys(changes));

    // Update pinned tabs if changed
    if (changes[STORAGE_KEYS.PINNED_TABS]) {
      pinnedTabs = changes[STORAGE_KEYS.PINNED_TABS].newValue || [];
      renderPinnedTabs();
    }

    // Update saved tabs if changed (triggers full re-render)
    if (changes[STORAGE_KEYS.SAVED_TABS]) {
      savedTabs = changes[STORAGE_KEYS.SAVED_TABS].newValue || [];
      renderAll();
    }

    // Update groups if changed
    if (changes[STORAGE_KEYS.GROUPS]) {
      groups = changes[STORAGE_KEYS.GROUPS].newValue || [];
      renderGroups();
    }

    // Update daily tabs if changed
    if (changes[STORAGE_KEYS.DAILY_TABS]) {
      dailyTabs = changes[STORAGE_KEYS.DAILY_TABS].newValue || [];
      renderDailyTabs();
    }

    // Update timed tabs if changed
    if (changes[STORAGE_KEYS.TIMED_TABS]) {
      timedTabs = changes[STORAGE_KEYS.TIMED_TABS].newValue || [];
      renderTimedTabs();
    }
  });
}
