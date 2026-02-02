/**
 * ============================================================================
 * EVENTS.JS
 * ============================================================================
 *
 * Event listener setup for the Tab Saver extension.
 * Centralizes all event binding to keep the main initialization clean.
 *
 * Event Categories:
 * - UI Controls: Buttons, modals, search
 * - Chrome Events: Tab changes, storage changes
 * - Theme: Radio buttons, system preference changes
 *
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// MAIN EVENT SETUP
// -----------------------------------------------------------------------------

/**
 * Sets up all event listeners for the application
 *
 * Called during initialization after DOM is ready.
 * Delegates to specific setup functions for each category.
 */
function setupEventListeners() {
  // Search functionality
  setupSearchListeners();

  // Button actions
  setupButtonListeners();

  // Tab picker modal
  setupPickerListeners();

  // Group modal
  setupGroupModalListeners();

  // Reminder modal
  setupReminderModalListeners();

  // Timer modal
  setupTimerModalListeners();

  // Context menu
  setupContextMenuListeners();

  // Settings modal and theme
  setupSettingsListeners();

  // Due Soon category toggles
  setupCategoryToggleListeners();
}

// -----------------------------------------------------------------------------
// SEARCH
// -----------------------------------------------------------------------------

/**
 * Sets up search input listener
 */
function setupSearchListeners() {
  searchInput.addEventListener('input', handleSearch);
}

/**
 * Handles search input changes
 *
 * Triggers re-render of all sections with the search query.
 */
function handleSearch() {
  const query = searchInput.value.toLowerCase();
  renderAll(query);
}

// -----------------------------------------------------------------------------
// BUTTON LISTENERS
// -----------------------------------------------------------------------------

/**
 * Sets up listeners for all action buttons
 */
function setupButtonListeners() {
  // Save current tab button
  saveCurrentTabBtn.addEventListener('click', saveCurrentTab);

  // Tab picker buttons
  pickFromWindowBtn.addEventListener('click', () => showTabPicker(false));
  pickFromAllWindowsBtn.addEventListener('click', () => showTabPicker(true));

  // Pinned tabs - open all
  openPinnedTabsBtn.addEventListener('click', openAllPinnedTabs);

  // Daily tabs - open all
  openDailyTabsBtn.addEventListener('click', openAllDailyTabs);

  // Create group button
  createGroupBtn.addEventListener('click', () => showGroupModal());

  // Test buttons (for debugging notifications)
  document.getElementById('testNotification').addEventListener('click', testNotification);
  document.getElementById('testAlarm').addEventListener('click', testAlarm);
}

// -----------------------------------------------------------------------------
// TAB PICKER MODAL
// -----------------------------------------------------------------------------

/**
 * Sets up listeners for the tab picker modal
 */
function setupPickerListeners() {
  // Selection buttons
  selectAllTabsBtn.addEventListener('click', selectAllPickerTabs);
  deselectAllTabsBtn.addEventListener('click', deselectAllPickerTabs);

  // Save and cancel
  saveSelectedTabsBtn.addEventListener('click', saveSelectedTabs);
  cancelPickerBtn.addEventListener('click', hideTabPicker);

  // Close on backdrop click
  tabPickerModal.addEventListener('click', (e) => {
    if (e.target === tabPickerModal) hideTabPicker();
  });

  // Group selection dropdown
  document.getElementById('pickerGroupSelect').addEventListener('change', handlePickerGroupChange);
}

// -----------------------------------------------------------------------------
// GROUP MODAL
// -----------------------------------------------------------------------------

/**
 * Sets up listeners for the group create/edit modal
 */
function setupGroupModalListeners() {
  // Save and cancel buttons
  saveGroupBtn.addEventListener('click', handleSaveGroup);
  cancelGroupBtn.addEventListener('click', hideGroupModal);

  // Close on backdrop click
  groupModal.addEventListener('click', (e) => {
    if (e.target === groupModal) hideGroupModal();
  });
}

// -----------------------------------------------------------------------------
// REMINDER MODAL
// -----------------------------------------------------------------------------

/**
 * Sets up listeners for the reminder modal
 */
function setupReminderModalListeners() {
  // Save and cancel buttons
  saveReminderBtn.addEventListener('click', handleSaveReminder);
  cancelReminderBtn.addEventListener('click', hideReminderModal);

  // Close on backdrop click
  reminderModal.addEventListener('click', (e) => {
    if (e.target === reminderModal) hideReminderModal();
  });
}

// -----------------------------------------------------------------------------
// TIMER MODAL
// -----------------------------------------------------------------------------

/**
 * Sets up listeners for the timer modal
 */
function setupTimerModalListeners() {
  // Save and cancel buttons
  saveTimerBtn.addEventListener('click', handleSaveTimer);
  cancelTimerBtn.addEventListener('click', hideTimerModal);

  // Close on backdrop click
  timerModal.addEventListener('click', (e) => {
    if (e.target === timerModal) hideTimerModal();
  });
}

// -----------------------------------------------------------------------------
// CONTEXT MENU
// -----------------------------------------------------------------------------

/**
 * Sets up listeners for the right-click context menu
 */
function setupContextMenuListeners() {
  // Hide menu when clicking anywhere
  document.addEventListener('click', hideContextMenu);

  // Handle menu item clicks
  contextMenu.addEventListener('click', handleContextMenuAction);
}

// -----------------------------------------------------------------------------
// SETTINGS MODAL
// -----------------------------------------------------------------------------

/**
 * Sets up listeners for the settings modal and theme options
 */
function setupSettingsListeners() {
  // Open settings button
  document.getElementById('settingsBtn').addEventListener('click', showSettingsModal);

  // Close settings button
  document.getElementById('closeSettings').addEventListener('click', hideSettingsModal);

  // Close on backdrop click
  document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') hideSettingsModal();
  });

  // Theme radio buttons
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const theme = e.target.value;

      // Apply theme immediately
      applyTheme(theme);

      // Save preference to storage
      chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: theme });
    });
  });

  // Load saved theme setting to check the correct radio button
  loadThemeSetting();
}

// -----------------------------------------------------------------------------
// CHROME TAB CHANGE LISTENERS
// -----------------------------------------------------------------------------

/**
 * Sets up listeners for Chrome tab events
 *
 * Automatically refreshes the Current Tabs panel when tabs
 * are created, removed, updated, moved, or activated.
 */
function setupTabChangeListeners() {
  // When a tab is created
  chrome.tabs.onCreated.addListener(() => {
    renderCurrentTabs();
  });

  // When a tab is removed
  chrome.tabs.onRemoved.addListener(() => {
    renderCurrentTabs();
  });

  // When a tab is updated (URL change, title change, favicon change)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url || changeInfo.title || changeInfo.favIconUrl) {
      renderCurrentTabs();
    }
  });

  // When a tab is moved within a window
  chrome.tabs.onMoved.addListener(() => {
    renderCurrentTabs();
  });

  // When a different tab is activated (switched to)
  chrome.tabs.onActivated.addListener(() => {
    renderCurrentTabs();
  });
}
