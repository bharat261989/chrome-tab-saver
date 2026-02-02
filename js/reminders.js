/**
 * ============================================================================
 * REMINDERS.JS
 * ============================================================================
 *
 * Manages tab reminders for the Tab Saver extension.
 * Reminders are displayed in the "Due Soon" panel, organized by time category.
 *
 * Time Categories:
 * - Overdue: Past the reminder date/time
 * - Today: Due today
 * - Tomorrow: Due tomorrow
 * - This Week: Due within the next 7 days
 * - Later: Due more than a week from now
 *
 * Reminder Properties on Tab Object:
 * - reminder: ISO timestamp string of when the tab is due
 * - hasTime: Boolean indicating if a specific time was set (vs. all day)
 *
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// REMINDER MODAL
// -----------------------------------------------------------------------------

/**
 * Shows the reminder modal for setting/editing a reminder
 *
 * Pre-fills the date input with tomorrow's date for new reminders,
 * or the existing reminder date for edits. Time is optional.
 *
 * @param {number} tabId - ID of the tab to set reminder for
 */
function showReminderModal(tabId) {
  // Store tabId for later use when saving
  reminderModal.dataset.tabId = tabId;

  // Default to tomorrow for new reminders
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if tab already has a reminder
  const tab = savedTabs.find(t => t.id === tabId);

  if (tab && tab.reminder) {
    // Pre-fill with existing reminder date
    const reminderDate = new Date(tab.reminder);
    reminderDateInput.value = reminderDate.toISOString().slice(0, 10);

    // Only set time if it was explicitly set (not midnight placeholder)
    if (reminderDate.getHours() !== 0 || reminderDate.getMinutes() !== 0) {
      reminderTimeInput.value = reminderDate.toTimeString().slice(0, 5);
    } else {
      reminderTimeInput.value = '';
    }
  } else {
    // New reminder - default to tomorrow, no time
    reminderDateInput.value = tomorrow.toISOString().slice(0, 10);
    reminderTimeInput.value = '';
  }

  reminderModal.classList.remove('hidden');
  reminderDateInput.focus();
}

/**
 * Hides the reminder modal and clears its state
 */
function hideReminderModal() {
  reminderModal.classList.add('hidden');
  reminderModal.dataset.tabId = '';
}

// -----------------------------------------------------------------------------
// REMINDER OPERATIONS
// -----------------------------------------------------------------------------

/**
 * Handles saving a reminder from the modal
 *
 * Creates a reminder timestamp from the date and optional time inputs.
 * If no time is specified, sets to midnight (start of day) and
 * marks hasTime as false to display "All day" in the UI.
 */
function handleSaveReminder() {
  const tabId = parseFloat(reminderModal.dataset.tabId);
  const dateValue = reminderDateInput.value;
  const timeValue = reminderTimeInput.value;

  // Date is required
  if (!dateValue) return;

  const tab = savedTabs.find(t => t.id === tabId);
  if (tab) {
    let reminderDate;

    if (timeValue) {
      // Combine date and time
      reminderDate = new Date(`${dateValue}T${timeValue}`);
    } else {
      // No time specified - set to midnight
      reminderDate = new Date(`${dateValue}T00:00:00`);
    }

    // Store reminder as ISO string
    tab.reminder = reminderDate.toISOString();

    // Track whether time was explicitly set
    // This affects how the reminder is displayed in the UI
    tab.hasTime = !!timeValue;

    saveData();
    renderAll();
  }

  hideReminderModal();
}

/**
 * Removes a reminder from a tab
 *
 * Deletes the reminder and hasTime properties from the tab object.
 * The tab remains saved; only the reminder is removed.
 *
 * @param {number} tabId - ID of the tab to remove reminder from
 */
function removeReminder(tabId) {
  const tab = savedTabs.find(t => t.id === tabId);
  if (tab) {
    delete tab.reminder;
    delete tab.hasTime;
    saveData();
    renderAll();
  }
}

// -----------------------------------------------------------------------------
// CATEGORY TOGGLE
// -----------------------------------------------------------------------------

/**
 * Sets up click listeners for Due Soon category headers
 *
 * Allows users to expand/collapse each time category
 * (Overdue, Today, Tomorrow, etc.) independently.
 */
function setupCategoryToggleListeners() {
  document.querySelectorAll('.category-header').forEach(header => {
    header.addEventListener('click', () => {
      const category = header.closest('.due-soon-category');
      category.classList.toggle('collapsed');
    });
  });
}
