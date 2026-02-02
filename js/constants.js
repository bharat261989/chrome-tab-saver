/**
 * ============================================================================
 * CONSTANTS.JS
 * ============================================================================
 *
 * This file contains all constant values used throughout the Tab Saver
 * extension. Centralizing constants makes it easier to modify values
 * and ensures consistency across the application.
 *
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// DEFAULT VALUES
// -----------------------------------------------------------------------------

/**
 * Default favicon placeholder image
 * Used when a tab's favicon fails to load or is not available
 * This is a simple gray rounded rectangle SVG encoded as a data URL
 */
const DEFAULT_FAVICON = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23ddd%22 width=%2216%22 height=%2216%22 rx=%222%22/></svg>';

/**
 * Special value used in the group dropdown to indicate
 * that a new group should be created
 */
const NEW_GROUP_VALUE = '__new__';

// -----------------------------------------------------------------------------
// STORAGE KEYS
// -----------------------------------------------------------------------------

/**
 * Chrome storage keys for persisting data
 * Using consistent keys prevents data loss from typos
 */
const STORAGE_KEYS = {
  SAVED_TABS: 'savedTabs',
  GROUPS: 'groups',
  DAILY_TABS: 'dailyTabs',
  PINNED_TABS: 'pinnedTabs',
  TIMED_TABS: 'timedTabs',
  THEME: 'theme'
};

// -----------------------------------------------------------------------------
// THEME VALUES
// -----------------------------------------------------------------------------

/**
 * Available theme options
 */
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

// -----------------------------------------------------------------------------
// TIME CONSTANTS
// -----------------------------------------------------------------------------

/**
 * Milliseconds in common time units
 * Used for timer calculations
 */
const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000
};
