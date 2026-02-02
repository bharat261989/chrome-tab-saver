/**
 * ============================================================================
 * THEME.JS
 * ============================================================================
 *
 * Manages the visual theme of the Tab Saver extension.
 * Supports light mode, dark mode, and automatic system theme detection.
 *
 * Theme Options:
 * - 'light': Forces light theme regardless of system preference
 * - 'dark': Forces dark theme regardless of system preference
 * - 'system': Automatically matches the user's OS theme preference
 *
 * The theme is applied via data-theme attribute on the <html> element,
 * which triggers CSS custom property changes defined in sidepanel.css.
 *
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// IMMEDIATE THEME APPLICATION
// -----------------------------------------------------------------------------

/**
 * Apply theme immediately on script load (before DOM ready)
 *
 * This IIFE (Immediately Invoked Function Expression) runs as soon as
 * the script loads, before DOMContentLoaded fires. This prevents the
 * "flash of unstyled content" where the user might briefly see the
 * wrong theme before it's applied.
 */
(function() {
  chrome.storage.sync.get([STORAGE_KEYS.THEME], (result) => {
    applyTheme(result[STORAGE_KEYS.THEME] || THEMES.SYSTEM);
  });
})();

// -----------------------------------------------------------------------------
// THEME APPLICATION
// -----------------------------------------------------------------------------

/**
 * Applies the specified theme to the document
 *
 * Sets the data-theme attribute on the root element, which triggers
 * CSS variable changes. For 'system' theme, it checks the user's
 * OS preference using the prefers-color-scheme media query.
 *
 * @param {string} theme - Theme to apply ('light', 'dark', or 'system')
 *
 * @example
 * applyTheme('dark');     // Forces dark theme
 * applyTheme('system');   // Uses OS preference
 */
function applyTheme(theme) {
  const root = document.documentElement;

  if (theme === THEMES.SYSTEM) {
    // Check system preference using media query
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? THEMES.DARK : THEMES.LIGHT);
  } else {
    root.setAttribute('data-theme', theme);
  }
}

// -----------------------------------------------------------------------------
// SETTINGS MODAL
// -----------------------------------------------------------------------------

/**
 * Shows the settings modal dialog
 *
 * The settings modal contains theme options and other user preferences.
 * Called when user clicks the settings button in the header.
 */
function showSettingsModal() {
  document.getElementById('settingsModal').classList.remove('hidden');
}

/**
 * Hides the settings modal dialog
 *
 * Called when:
 * - User clicks the close button
 * - User clicks outside the modal
 * - User presses Escape (if implemented)
 */
function hideSettingsModal() {
  document.getElementById('settingsModal').classList.add('hidden');
}

// -----------------------------------------------------------------------------
// THEME SETTINGS PERSISTENCE
// -----------------------------------------------------------------------------

/**
 * Loads the saved theme setting and updates the UI
 *
 * Reads the theme preference from Chrome storage and checks
 * the appropriate radio button in the settings modal.
 * Defaults to 'system' if no preference is saved.
 */
function loadThemeSetting() {
  chrome.storage.sync.get([STORAGE_KEYS.THEME], (result) => {
    const theme = result[STORAGE_KEYS.THEME] || THEMES.SYSTEM;
    const radio = document.querySelector(`input[name="theme"][value="${theme}"]`);
    if (radio) radio.checked = true;
  });
}

// -----------------------------------------------------------------------------
// SYSTEM THEME CHANGE LISTENER
// -----------------------------------------------------------------------------

/**
 * Listen for system theme changes
 *
 * When the OS theme changes (e.g., user switches to dark mode in
 * System Preferences), this listener updates the extension theme
 * automatically if the user has selected 'system' theme.
 *
 * This allows the extension to stay in sync with the OS without
 * requiring the user to manually refresh or toggle settings.
 */
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  chrome.storage.sync.get([STORAGE_KEYS.THEME], (result) => {
    // Only auto-update if using system theme
    if (result[STORAGE_KEYS.THEME] === THEMES.SYSTEM || !result[STORAGE_KEYS.THEME]) {
      applyTheme(THEMES.SYSTEM);
    }
  });
});
