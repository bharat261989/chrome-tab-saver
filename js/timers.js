/**
 * ============================================================================
 * TIMERS.JS
 * ============================================================================
 *
 * Manages countdown timers for tabs in the Tab Saver extension.
 * Timers show a live countdown and trigger notifications when complete.
 *
 * Timer Object Structure (extends base tab object):
 * {
 *   ...tabProperties,
 *   timerEnd: number,      // Unix timestamp (ms) when timer ends
 *   timerDuration: number, // Original duration in milliseconds
 *   notified?: boolean     // Whether notification was already shown
 * }
 *
 * How Timers Work:
 * 1. User sets a timer via context menu or UI
 * 2. Timer is stored in timedTabs array and Chrome alarm is created
 * 3. Live countdown updates every second via setInterval
 * 4. When timer expires, notification is triggered
 * 5. Background script also listens for alarm for when sidepanel is closed
 *
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// TIMER MODAL
// -----------------------------------------------------------------------------

/**
 * Shows the timer modal for setting a countdown timer
 *
 * Pre-fills with default values (0 hours, 30 minutes).
 * User can set hours and/or minutes for the countdown.
 *
 * @param {number} tabId - ID of the tab to set timer for
 */
function showTimerModal(tabId) {
  // Store tabId for later use when saving
  timerModal.dataset.tabId = tabId;

  // Default values
  timerHoursInput.value = 0;
  timerMinutesInput.value = 30;

  timerModal.classList.remove('hidden');
  timerMinutesInput.focus();
}

/**
 * Hides the timer modal and clears its state
 */
function hideTimerModal() {
  timerModal.classList.add('hidden');
  timerModal.dataset.tabId = '';
}

// -----------------------------------------------------------------------------
// TIMER OPERATIONS
// -----------------------------------------------------------------------------

/**
 * Handles saving a timer from the modal
 *
 * Creates a timed tab entry with:
 * - timerEnd: Calculated end time (now + duration)
 * - timerDuration: Original duration for reference
 *
 * Also creates a Chrome alarm for background notification.
 */
function handleSaveTimer() {
  const tabId = parseFloat(timerModal.dataset.tabId);
  const hours = parseInt(timerHoursInput.value) || 0;
  const minutes = parseInt(timerMinutesInput.value) || 0;

  // Must have at least some duration
  if (hours === 0 && minutes === 0) return;

  const tab = savedTabs.find(t => t.id === tabId);
  if (tab) {
    // Calculate duration and end time
    const durationMs = (hours * TIME.HOUR / TIME.SECOND / TIME.SECOND) + (minutes * TIME.MINUTE);
    // Simpler calculation: hours * 60 * 60 * 1000 + minutes * 60 * 1000
    const actualDurationMs = (hours * 60 + minutes) * 60 * 1000;
    const endTime = Date.now() + actualDurationMs;

    // Create timed tab object (copy of tab with timer properties)
    const timedTab = {
      ...tab,
      timerEnd: endTime,
      timerDuration: actualDurationMs
    };

    // Remove existing timer for this tab if any
    timedTabs = timedTabs.filter(t => t.id !== tabId);
    timedTabs.push(timedTab);

    // Create Chrome alarm for notification when timer completes
    // This ensures notification works even if sidepanel is closed
    chrome.alarms.create(`timer-${tabId}`, { when: endTime }, () => {
      console.log(`Alarm created: timer-${tabId}, will fire at:`, new Date(endTime));
    });

    saveData();
    renderAll();
  }

  hideTimerModal();
}

/**
 * Removes a timer from a tab
 *
 * Clears the Chrome alarm and any active interval for countdown display.
 * Removes the tab from timedTabs array.
 *
 * @param {number} tabId - ID of the tab to remove timer from
 */
function removeTimer(tabId) {
  timedTabs = timedTabs.filter(t => t.id !== tabId);

  // Clear Chrome alarm
  chrome.alarms.clear(`timer-${tabId}`);

  // Clear countdown interval
  if (timerIntervals[tabId]) {
    clearInterval(timerIntervals[tabId]);
    delete timerIntervals[tabId];
  }

  saveData();
  renderAll();
}

// -----------------------------------------------------------------------------
// COUNTDOWN DISPLAY
// -----------------------------------------------------------------------------

/**
 * Starts countdown interval updates for all timed tabs
 *
 * Creates a setInterval for each timed tab that updates
 * the countdown display every second. Also clears any
 * existing intervals first to prevent duplicates.
 */
function startTimerCountdowns() {
  // Clear existing intervals to prevent duplicates
  Object.values(timerIntervals).forEach(clearInterval);
  timerIntervals = {};

  // Create new intervals for each timed tab
  timedTabs.forEach(tab => {
    // Initial update
    updateTimerDisplay(tab.id);

    // Update every second
    timerIntervals[tab.id] = setInterval(() => {
      updateTimerDisplay(tab.id);
    }, 1000);
  });
}

/**
 * Updates the countdown display for a specific timed tab
 *
 * Calculates remaining time and updates the DOM element.
 * When timer expires, shows "Time up!" and triggers notification.
 *
 * @param {number} tabId - ID of the timed tab to update
 */
function updateTimerDisplay(tabId) {
  const tab = timedTabs.find(t => t.id === tabId);
  if (!tab) return;

  const remaining = tab.timerEnd - Date.now();
  const countdownEl = document.querySelector(`.timer-countdown[data-tab-id="${tabId}"]`);

  if (!countdownEl) return;

  if (remaining <= 0) {
    // Timer has expired
    countdownEl.textContent = 'Time up!';
    countdownEl.classList.add('time-up');

    // Clear the interval since timer is complete
    if (timerIntervals[tabId]) {
      clearInterval(timerIntervals[tabId]);
      delete timerIntervals[tabId];
    }

    // Trigger notification from sidepanel as fallback
    // (Background script also handles this via alarm)
    triggerTimerNotification(tab);
  } else {
    // Format remaining time
    const hours = Math.floor(remaining / TIME.HOUR);
    const minutes = Math.floor((remaining % TIME.HOUR) / TIME.MINUTE);
    const seconds = Math.floor((remaining % TIME.MINUTE) / TIME.SECOND);

    // Display format varies based on remaining time
    if (hours > 0) {
      countdownEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      countdownEl.textContent = `${minutes}m ${seconds}s`;
    } else {
      countdownEl.textContent = `${seconds}s`;
    }
  }
}

// -----------------------------------------------------------------------------
// TIMER NOTIFICATIONS
// -----------------------------------------------------------------------------

/**
 * Triggers a notification when a timer completes
 *
 * This is a fallback notification from the sidepanel.
 * The background script also creates notifications via Chrome alarms,
 * but this ensures notification works when sidepanel is visible.
 *
 * Prevents duplicate notifications by checking/setting the notified flag.
 *
 * @param {Object} tab - The timed tab object
 */
function triggerTimerNotification(tab) {
  // Check if we already notified for this tab
  const timedTab = timedTabs.find(t => t.id === tab.id);
  if (!timedTab || timedTab.notified) return;

  // Mark as notified to prevent duplicate notifications
  timedTab.notified = true;
  saveData();

  console.log('Triggering timer notification for:', tab.title);

  // Create notification using Chrome notifications API
  const iconUrl = chrome.runtime.getURL('icons/icon128.png');

  chrome.notifications.create(`timer-sidepanel-${tab.id}`, {
    type: 'basic',
    iconUrl: iconUrl,
    title: 'Timer Complete!',
    message: tab.title || 'Your timer has finished',
    priority: 2,
    requireInteraction: true  // Keep notification visible until dismissed
  }, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error('Notification error:', chrome.runtime.lastError);

      // Fallback: show alert if notification fails and page is visible
      if (document.visibilityState === 'visible') {
        alert(`Timer Complete!\n\n${tab.title}`);
      }
    } else {
      console.log('Timer notification shown:', notificationId);
    }
  });
}

// -----------------------------------------------------------------------------
// TEST FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Test function for notifications
 *
 * Creates a test notification to verify the notifications API
 * is working correctly. Useful for debugging notification issues.
 */
function testNotification() {
  console.log('Testing notification...');

  // Check if notifications API is available
  if (!chrome.notifications) {
    alert('chrome.notifications API not available!\n\nMake sure "notifications" is in manifest.json permissions.');
    return;
  }

  const iconUrl = chrome.runtime.getURL('icons/icon128.png');
  console.log('Icon URL:', iconUrl);

  // Check permission level
  chrome.notifications.getPermissionLevel((level) => {
    console.log('Notification permission level:', level);

    if (level !== 'granted') {
      alert('Notification permission not granted!\nLevel: ' + level + '\n\nCheck Chrome settings > Privacy > Notifications');
      return;
    }

    // Create test notification
    chrome.notifications.create('test-notification-' + Date.now(), {
      type: 'basic',
      iconUrl: iconUrl,
      title: 'Test Notification',
      message: 'If you see this, notifications are working!',
      priority: 2
    }, (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('Notification error:', chrome.runtime.lastError);
        alert('Notification failed: ' + chrome.runtime.lastError.message);
      } else {
        console.log('Test notification created:', notificationId);
        alert('Notification created with ID: ' + notificationId + '\n\nCheck:\n1. System notification center\n2. Chrome notification area\n3. Do Not Disturb is OFF');
      }
    });
  });
}

/**
 * Test function for Chrome alarms
 *
 * Creates a 5-second test alarm and adds a test timed tab
 * to verify the alarm system is working correctly.
 * Note: Chrome alarms have a minimum ~1 minute delay in production.
 */
function testAlarm() {
  console.log('Creating test alarm for 5 seconds...');

  // Create a test timed tab entry
  const testTab = {
    id: Date.now(),
    title: 'Test Alarm Tab',
    url: 'https://example.com',
    favicon: '',
    timerEnd: Date.now() + 5000,
    timerDuration: 5000
  };

  // Add to timed tabs
  timedTabs.push(testTab);
  saveData();

  // Create alarm
  const alarmName = `timer-${testTab.id}`;

  chrome.alarms.create(alarmName, {
    when: Date.now() + 5000  // 5 seconds from now
  });

  // Log all alarms for debugging
  chrome.alarms.getAll((alarms) => {
    console.log('All alarms:', alarms);
  });

  alert('Test alarm created!\n\nAlarm name: ' + alarmName + '\nShould fire in 5 seconds.\n\nNote: Chrome alarms have ~1 min minimum delay.\nCheck background console for alarm events.');

  renderTimedTabs();
}
