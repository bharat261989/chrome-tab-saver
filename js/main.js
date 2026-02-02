/**
 * ============================================================================
 * MAIN.JS
 * ============================================================================
 *
 * Main initialization file for the Tab Saver extension sidepanel.
 * This file bootstraps the application when the DOM is ready.
 *
 * Initialization Order:
 * 1. Wait for DOMContentLoaded
 * 2. Cache DOM element references
 * 3. Load data from Chrome storage
 * 4. Render all UI sections
 * 5. Setup event listeners
 * 6. Setup Chrome event listeners
 *
 * Note: Theme is applied earlier in theme.js via IIFE to prevent flash.
 *
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// DOM READY HANDLER
// -----------------------------------------------------------------------------

/**
 * Initialize the application when DOM is ready
 *
 * Uses DOMContentLoaded to ensure all HTML elements exist
 * before attempting to cache references or attach listeners.
 */
document.addEventListener('DOMContentLoaded', init);

// -----------------------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------------------

/**
 * Main initialization function
 *
 * Orchestrates the startup sequence:
 * 1. Caches DOM references for performance
 * 2. Loads persisted data from Chrome storage
 * 3. Renders the initial UI state
 * 4. Sets up all event listeners
 *
 * @async
 */
async function init() {
  // Cache all DOM element references
  initDOMElements();

  // Load data from Chrome storage
  await loadData();

  // Render initial UI
  renderAll();

  // Setup UI event listeners
  setupEventListeners();

  // Setup drag-and-drop zones
  setupGroupDropZones();

  // Setup Chrome tab change listeners
  setupTabChangeListeners();

  // Setup storage change listener for cross-device/window sync
  setupStorageChangeListener();
}

// -----------------------------------------------------------------------------
// DOM ELEMENT INITIALIZATION
// -----------------------------------------------------------------------------

/**
 * Caches references to all DOM elements used by the application
 *
 * Storing these references avoids repeated DOM queries throughout
 * the application lifecycle, improving performance.
 */
function initDOMElements() {
  // ----- Header Elements -----
  searchInput = document.getElementById('searchInput');

  // ----- Action Buttons -----
  saveCurrentTabBtn = document.getElementById('saveCurrentTab');
  pickFromWindowBtn = document.getElementById('pickFromWindow');
  pickFromAllWindowsBtn = document.getElementById('pickFromAllWindows');
  openDailyTabsBtn = document.getElementById('openDailyTabs');
  openPinnedTabsBtn = document.getElementById('openPinnedTabs');

  // ----- Tab Picker Modal -----
  tabPickerModal = document.getElementById('tabPickerModal');
  tabPickerList = document.getElementById('tabPickerList');
  selectAllTabsBtn = document.getElementById('selectAllTabs');
  deselectAllTabsBtn = document.getElementById('deselectAllTabs');
  saveSelectedTabsBtn = document.getElementById('saveSelectedTabs');
  cancelPickerBtn = document.getElementById('cancelPicker');

  // ----- Group Modal -----
  createGroupBtn = document.getElementById('createGroup');
  groupModal = document.getElementById('groupModal');
  modalTitle = document.getElementById('modalTitle');
  groupNameInput = document.getElementById('groupNameInput');
  saveGroupBtn = document.getElementById('saveGroup');
  cancelGroupBtn = document.getElementById('cancelGroup');

  // ----- List Containers -----
  pinnedTabsList = document.getElementById('pinnedTabsList');
  dailyTabsList = document.getElementById('dailyTabsList');
  groupsList = document.getElementById('groupsList');
  savedTabsList = document.getElementById('savedTabsList');
  currentTabsList = document.getElementById('currentTabsList');

  // ----- Reminder Modal -----
  reminderModal = document.getElementById('reminderModal');
  reminderDateInput = document.getElementById('reminderDateInput');
  reminderTimeInput = document.getElementById('reminderTimeInput');
  saveReminderBtn = document.getElementById('saveReminder');
  cancelReminderBtn = document.getElementById('cancelReminder');

  // ----- Timed Tabs -----
  timedTabsList = document.getElementById('timedTabsList');
  timerModal = document.getElementById('timerModal');
  timerHoursInput = document.getElementById('timerHours');
  timerMinutesInput = document.getElementById('timerMinutes');
  saveTimerBtn = document.getElementById('saveTimer');
  cancelTimerBtn = document.getElementById('cancelTimer');

  // ----- Due Soon Section -----
  dueSoonContainer = document.getElementById('dueSoonList');
  overdueList = document.getElementById('overdueList');
  todayList = document.getElementById('todayList');
  tomorrowList = document.getElementById('tomorrowList');
  thisWeekList = document.getElementById('thisWeekList');
  laterList = document.getElementById('laterList');

  // ----- Context Menu -----
  contextMenu = document.getElementById('contextMenu');
}
