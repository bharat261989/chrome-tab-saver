/**
 * ============================================================================
 * CONTEXT-MENU.JS
 * ============================================================================
 *
 * Right-click context menu functionality for tabs in the Tab Saver extension.
 *
 * Context Menu Options:
 * - Open in current tab / Open in new tab
 * - Add to / Remove from Daily Tabs
 * - Pin / Unpin tab
 * - Move to group
 * - Set / Remove reminder
 * - Set / Remove timer
 * - Delete tab
 *
 * The menu shows/hides options based on the current state of the clicked tab.
 *
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// SHOW CONTEXT MENU
// -----------------------------------------------------------------------------

/**
 * Shows the context menu for a tab
 *
 * Positions the menu at the click location and shows/hides
 * relevant menu items based on the tab's current state.
 *
 * @param {MouseEvent} e - The right-click event
 * @param {Object} tab - The tab object that was right-clicked
 */
function showContextMenu(e, tab) {
  e.preventDefault();

  // Store the selected tab for later use in action handler
  selectedTab = tab;

  // Determine current state of the tab
  const isDaily = dailyTabs.some(t => t.id === tab.id);
  const isPinned = pinnedTabs.some(t => t.id === tab.id);
  const hasReminder = tab.reminder != null;
  const hasTimer = timedTabs.some(t => t.id === tab.id);

  // Get menu items
  const addToDailyItem = contextMenu.querySelector('[data-action="addToDaily"]');
  const removeFromDailyItem = contextMenu.querySelector('[data-action="removeFromDaily"]');
  const pinTabItem = contextMenu.querySelector('[data-action="pinTab"]');
  const unpinTabItem = contextMenu.querySelector('[data-action="unpinTab"]');
  const setReminderItem = contextMenu.querySelector('[data-action="setReminder"]');
  const removeReminderItem = contextMenu.querySelector('[data-action="removeReminder"]');
  const setTimerItem = contextMenu.querySelector('[data-action="setTimer"]');
  const removeTimerItem = contextMenu.querySelector('[data-action="removeTimer"]');

  // Show/hide based on state (toggle pairs)
  addToDailyItem.style.display = isDaily ? 'none' : 'block';
  removeFromDailyItem.style.display = isDaily ? 'block' : 'none';

  pinTabItem.style.display = isPinned ? 'none' : 'block';
  unpinTabItem.style.display = isPinned ? 'block' : 'none';

  setReminderItem.style.display = hasReminder ? 'none' : 'block';
  removeReminderItem.style.display = hasReminder ? 'block' : 'none';

  setTimerItem.style.display = hasTimer ? 'none' : 'block';
  removeTimerItem.style.display = hasTimer ? 'block' : 'none';

  // Position the menu at click location
  contextMenu.style.left = `${e.pageX}px`;
  contextMenu.style.top = `${e.pageY}px`;

  // Show the menu
  contextMenu.classList.remove('hidden');
}

// -----------------------------------------------------------------------------
// HIDE CONTEXT MENU
// -----------------------------------------------------------------------------

/**
 * Hides the context menu
 *
 * Called when user clicks anywhere outside the menu
 * or after selecting a menu action.
 */
function hideContextMenu() {
  contextMenu.classList.add('hidden');
  selectedTab = null;
}

// -----------------------------------------------------------------------------
// HANDLE MENU ACTIONS
// -----------------------------------------------------------------------------

/**
 * Handles clicks on context menu items
 *
 * Reads the data-action attribute from the clicked element
 * and performs the corresponding action on the selected tab.
 *
 * @param {MouseEvent} e - The click event on the menu
 */
function handleContextMenuAction(e) {
  const action = e.target.dataset.action;

  // Ignore if no action or no selected tab
  if (!action || !selectedTab) return;

  // Perform action based on data-action value
  switch (action) {
    case 'open':
      // Open in current tab
      openTab(selectedTab.url, false);
      break;

    case 'openNew':
      // Open in new tab
      openTab(selectedTab.url, true);
      break;

    case 'addToDaily':
      // Add to daily tabs list
      addToDailyTabs(selectedTab.id);
      break;

    case 'removeFromDaily':
      // Remove from daily tabs list
      removeFromDailyTabs(selectedTab.id);
      break;

    case 'pinTab':
      // Add to pinned tabs
      addToPinnedTabs(selectedTab.id);
      break;

    case 'unpinTab':
      // Remove from pinned tabs
      removeFromPinnedTabs(selectedTab.id);
      break;

    case 'moveToGroup':
      // Show move to group prompt
      showMoveToGroupMenu(selectedTab.id);
      break;

    case 'setReminder':
      // Open reminder modal
      showReminderModal(selectedTab.id);
      break;

    case 'removeReminder':
      // Clear reminder from tab
      removeReminder(selectedTab.id);
      break;

    case 'setTimer':
      // Open timer modal
      showTimerModal(selectedTab.id);
      break;

    case 'removeTimer':
      // Clear timer from tab
      removeTimer(selectedTab.id);
      break;

    case 'delete':
      // Delete the tab
      deleteTab(selectedTab.id);
      break;
  }

  // Hide menu after action
  hideContextMenu();
}
