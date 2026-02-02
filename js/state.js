/**
 * ============================================================================
 * STATE.JS
 * ============================================================================
 *
 * This file manages the application state. All data that persists during
 * the session is stored here. The state is synchronized with Chrome's
 * storage for persistence across sessions and devices.
 *
 * State Structure:
 * - savedTabs: Array of saved tab objects
 * - groups: Array of group objects for organizing tabs
 * - dailyTabs: Array of tabs marked for daily opening
 * - pinnedTabs: Array of pinned/protected tabs
 * - timedTabs: Array of tabs with active timers
 *
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// APPLICATION STATE
// -----------------------------------------------------------------------------

/**
 * Array of all saved tabs
 * Each tab object contains: id, title, url, favicon, savedAt, groupId, reminder?, hasTime?
 */
let savedTabs = [];

/**
 * Array of tab groups for organization
 * Each group contains: id, name, expanded, parentId
 */
let groups = [];

/**
 * Array of tabs marked as "daily" - tabs to open every morning
 * These are copies of savedTabs that user wants quick access to
 */
let dailyTabs = [];

/**
 * Array of pinned tabs that are protected from accidental closure
 * The background script monitors these and re-opens them if closed
 */
let pinnedTabs = [];

/**
 * Array of tabs with active countdown timers
 * Each contains the base tab info plus: timerEnd, timerDuration, notified?
 */
let timedTabs = [];

/**
 * Currently selected tab for context menu operations
 * Set when user right-clicks a tab, cleared when menu closes
 */
let selectedTab = null;

/**
 * Object tracking active timer intervals for countdown display
 * Key: tabId, Value: setInterval ID
 * Used to clear intervals when timers are removed
 */
let timerIntervals = {};

// -----------------------------------------------------------------------------
// DOM ELEMENT REFERENCES
// -----------------------------------------------------------------------------

/**
 * These variables hold references to DOM elements.
 * They are initialized in the init() function after DOM is ready.
 * Caching these prevents repeated DOM queries and improves performance.
 */

// Header elements
let searchInput;

// Action buttons
let saveCurrentTabBtn, pickFromWindowBtn, pickFromAllWindowsBtn;
let openDailyTabsBtn, openPinnedTabsBtn;

// Tab picker modal elements
let tabPickerModal, tabPickerList;
let selectAllTabsBtn, deselectAllTabsBtn, saveSelectedTabsBtn, cancelPickerBtn;

// Group modal elements
let createGroupBtn, groupModal, modalTitle, groupNameInput;
let saveGroupBtn, cancelGroupBtn;

// List containers
let pinnedTabsList, dailyTabsList, timedTabsList;
let groupsList, savedTabsList, currentTabsList;

// Due Soon containers
let dueSoonContainer, overdueList, todayList;
let tomorrowList, thisWeekList, laterList;

// Reminder modal elements
let reminderModal, reminderDateInput, reminderTimeInput;
let saveReminderBtn, cancelReminderBtn;

// Timer modal elements
let timerModal, timerHoursInput, timerMinutesInput;
let saveTimerBtn, cancelTimerBtn;

// Context menu
let contextMenu;
