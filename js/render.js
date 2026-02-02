/**
 * ============================================================================
 * RENDER.JS
 * ============================================================================
 *
 * UI rendering functions for the Tab Saver extension.
 * These functions convert data from state into HTML and update the DOM.
 *
 * Rendering Strategy:
 * - Each panel has its own render function (renderPinnedTabs, renderGroups, etc.)
 * - renderAll() is called after data changes to refresh all panels
 * - Search query can be passed to filter displayed items
 * - Empty sections are automatically hidden
 * - Favicon error handlers are attached after each render
 *
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// MAIN RENDER FUNCTION
// -----------------------------------------------------------------------------

/**
 * Renders all sections of the UI
 *
 * This is the main entry point for refreshing the UI after data changes.
 * Calls individual render functions for each panel.
 *
 * @param {string} [searchQuery] - Optional search query to filter items
 */
function renderAll(searchQuery) {
  const query = getSearchQuery(searchQuery);

  // Render each section
  renderPinnedTabs(query);
  renderDailyTabs(query);
  renderTimedTabs(query);
  renderDueSoon(query);
  renderGroups(query);
  renderSavedTabs(query);
  renderCurrentTabs(query);
}

// -----------------------------------------------------------------------------
// PINNED TABS
// -----------------------------------------------------------------------------

/**
 * Renders the Pinned Tabs section
 *
 * Pinned tabs are protected tabs that the background script
 * will re-open if accidentally closed. Hidden if no pinned tabs.
 *
 * @param {string} [searchQuery] - Optional search query to filter items
 */
function renderPinnedTabs(searchQuery) {
  const query = getSearchQuery(searchQuery);
  const filtered = filterTabs(pinnedTabs, query);
  const section = pinnedTabsList.closest('.section');

  // Hide section if empty
  if (filtered.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  pinnedTabsList.innerHTML = filtered.map(tab => createPinnedTabHTML(tab)).join('');

  // Attach event listeners
  attachTabListeners(pinnedTabsList);
  attachPinnedTabListeners(pinnedTabsList);
  attachFaviconErrorHandlers(pinnedTabsList);
}

/**
 * Creates HTML for a pinned tab item
 *
 * Pinned tabs have a pin icon, open button, and unpin button.
 *
 * @param {Object} tab - Tab object
 * @returns {string} - HTML string
 */
function createPinnedTabHTML(tab) {
  return `
    <div class="tab-item pinned-tab" data-tab-id="${tab.id}" data-url="${escapeHtml(tab.url)}">
      <span class="pin-icon">📌</span>
      <img class="tab-favicon" src="${tab.favicon || DEFAULT_FAVICON}" alt="">
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-url">${escapeHtml(getHostname(tab.url))}</div>
      </div>
      <div class="tab-actions">
        <button class="tab-action-btn tab-open" title="Open">↗</button>
        <button class="tab-action-btn tab-unpin" title="Unpin">×</button>
      </div>
    </div>
  `;
}

/**
 * Attaches unpin button listeners for pinned tabs
 *
 * @param {HTMLElement} container - Container element with pinned tabs
 */
function attachPinnedTabListeners(container) {
  container.querySelectorAll('.tab-unpin').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tabItem = btn.closest('.tab-item');
      const tabId = parseFloat(tabItem.dataset.tabId);
      removeFromPinnedTabs(tabId);
    });
  });
}

// -----------------------------------------------------------------------------
// DAILY TABS
// -----------------------------------------------------------------------------

/**
 * Renders the Daily Tabs section
 *
 * Daily tabs are tabs for quick daily access.
 * Hidden if no daily tabs exist.
 *
 * @param {string} [searchQuery] - Optional search query to filter items
 */
function renderDailyTabs(searchQuery) {
  const query = getSearchQuery(searchQuery);
  const filtered = filterTabs(dailyTabs, query);
  const section = dailyTabsList.closest('.section');

  // Hide section if empty
  if (filtered.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  dailyTabsList.innerHTML = filtered.map(tab => createTabHTML(tab, true)).join('');

  attachTabListeners(dailyTabsList);
  attachFaviconErrorHandlers(dailyTabsList);
}

// -----------------------------------------------------------------------------
// TIMED TABS
// -----------------------------------------------------------------------------

/**
 * Renders the Timed Tabs section
 *
 * Displays tabs with active countdown timers.
 * Hidden if no timed tabs exist.
 *
 * @param {string} [searchQuery] - Optional search query to filter items
 */
function renderTimedTabs(searchQuery) {
  const query = getSearchQuery(searchQuery);
  const filtered = filterTabs(timedTabs, query);
  const section = timedTabsList.closest('.section');

  // Hide section if empty
  if (filtered.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Sort by remaining time (soonest first)
  const sorted = [...filtered].sort((a, b) => a.timerEnd - b.timerEnd);

  timedTabsList.innerHTML = sorted.map(tab => createTimedTabHTML(tab)).join('');

  attachTabListeners(timedTabsList);
  attachTimedTabListeners(timedTabsList);
  attachFaviconErrorHandlers(timedTabsList);

  // Start countdown updates
  startTimerCountdowns();
}

/**
 * Creates HTML for a timed tab item
 *
 * Shows timer icon, countdown display, and remove timer button.
 *
 * @param {Object} tab - Timed tab object
 * @returns {string} - HTML string
 */
function createTimedTabHTML(tab) {
  const remaining = tab.timerEnd - Date.now();
  const isTimeUp = remaining <= 0;

  return `
    <div class="tab-item timed-tab ${isTimeUp ? 'time-up' : ''}" data-tab-id="${tab.id}" data-url="${escapeHtml(tab.url)}">
      <span class="timer-icon">⏱️</span>
      <img class="tab-favicon" src="${tab.favicon || DEFAULT_FAVICON}" alt="">
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="timer-countdown ${isTimeUp ? 'time-up' : ''}" data-tab-id="${tab.id}">Loading...</div>
      </div>
      <div class="tab-actions">
        <button class="tab-action-btn tab-open" title="Open">↗</button>
        <button class="tab-action-btn tab-remove-timer" title="Remove timer">×</button>
      </div>
    </div>
  `;
}

/**
 * Attaches remove timer button listeners
 *
 * @param {HTMLElement} container - Container element with timed tabs
 */
function attachTimedTabListeners(container) {
  container.querySelectorAll('.tab-remove-timer').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tabItem = btn.closest('.tab-item');
      const tabId = parseFloat(tabItem.dataset.tabId);
      removeTimer(tabId);
    });
  });
}

// -----------------------------------------------------------------------------
// DUE SOON (REMINDERS)
// -----------------------------------------------------------------------------

/**
 * Renders the Due Soon section with categorized reminders
 *
 * Organizes tabs with reminders into time categories:
 * Overdue, Today, Tomorrow, This Week, Later.
 * Hidden if no reminders exist.
 *
 * @param {string} [searchQuery] - Optional search query to filter items
 */
function renderDueSoon(searchQuery) {
  const query = getSearchQuery(searchQuery);

  // Get tabs that have reminders set
  const tabsWithReminders = savedTabs.filter(t => t.reminder);
  const filtered = filterTabs(tabsWithReminders, query);
  const section = dueSoonContainer.closest('.section');

  // Hide section if no reminders
  if (filtered.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Restore category structure if needed (might have been cleared)
  if (!document.getElementById('overdueCount')) {
    dueSoonContainer.innerHTML = createDueSoonCategoriesHTML();
    setupCategoryToggleListeners();

    // Re-cache DOM elements
    overdueList = document.getElementById('overdueList');
    todayList = document.getElementById('todayList');
    tomorrowList = document.getElementById('tomorrowList');
    thisWeekList = document.getElementById('thisWeekList');
    laterList = document.getElementById('laterList');
  }

  // Calculate date boundaries
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  // Categorize tabs by reminder date
  const overdue = [];
  const todayTabs = [];
  const tomorrowTabs = [];
  const thisWeekTabs = [];
  const later = [];

  filtered.forEach(tab => {
    const reminderDate = new Date(tab.reminder);

    if (reminderDate < now) {
      overdue.push(tab);
    } else if (reminderDate < tomorrow) {
      todayTabs.push(tab);
    } else if (reminderDate < dayAfterTomorrow) {
      tomorrowTabs.push(tab);
    } else if (reminderDate < endOfWeek) {
      thisWeekTabs.push(tab);
    } else {
      later.push(tab);
    }
  });

  // Sort each category by reminder time
  const sortByReminder = (a, b) => new Date(a.reminder) - new Date(b.reminder);
  overdue.sort(sortByReminder);
  todayTabs.sort(sortByReminder);
  tomorrowTabs.sort(sortByReminder);
  thisWeekTabs.sort(sortByReminder);
  later.sort(sortByReminder);

  // Update category counts
  document.getElementById('overdueCount').textContent = overdue.length;
  document.getElementById('todayCount').textContent = todayTabs.length;
  document.getElementById('tomorrowCount').textContent = tomorrowTabs.length;
  document.getElementById('thisWeekCount').textContent = thisWeekTabs.length;
  document.getElementById('laterCount').textContent = later.length;

  // Render each category
  renderCategoryTabs(overdueList, overdue, 'overdue');
  renderCategoryTabs(todayList, todayTabs, 'today');
  renderCategoryTabs(tomorrowList, tomorrowTabs, 'tomorrow');
  renderCategoryTabs(thisWeekList, thisWeekTabs, 'thisWeek');
  renderCategoryTabs(laterList, later, 'later');

  // Show/hide empty categories
  document.querySelector('[data-category="overdue"]').style.display = overdue.length ? 'block' : 'none';
  document.querySelector('[data-category="today"]').style.display = todayTabs.length ? 'block' : 'none';
  document.querySelector('[data-category="tomorrow"]').style.display = tomorrowTabs.length ? 'block' : 'none';
  document.querySelector('[data-category="thisWeek"]').style.display = thisWeekTabs.length ? 'block' : 'none';
  document.querySelector('[data-category="later"]').style.display = later.length ? 'block' : 'none';
}

/**
 * Creates HTML for the Due Soon category structure
 *
 * @returns {string} - HTML string for all category containers
 */
function createDueSoonCategoriesHTML() {
  return `
    <div class="due-soon-category" data-category="overdue">
      <div class="category-header">
        <span class="category-icon">⚠️</span>
        <span class="category-name">Overdue</span>
        <span class="category-count" id="overdueCount">0</span>
      </div>
      <div class="category-tabs" id="overdueList"></div>
    </div>
    <div class="due-soon-category" data-category="today">
      <div class="category-header">
        <span class="category-icon">📅</span>
        <span class="category-name">Today</span>
        <span class="category-count" id="todayCount">0</span>
      </div>
      <div class="category-tabs" id="todayList"></div>
    </div>
    <div class="due-soon-category" data-category="tomorrow">
      <div class="category-header">
        <span class="category-icon">🌅</span>
        <span class="category-name">Tomorrow</span>
        <span class="category-count" id="tomorrowCount">0</span>
      </div>
      <div class="category-tabs" id="tomorrowList"></div>
    </div>
    <div class="due-soon-category" data-category="thisWeek">
      <div class="category-header">
        <span class="category-icon">📆</span>
        <span class="category-name">This Week</span>
        <span class="category-count" id="thisWeekCount">0</span>
      </div>
      <div class="category-tabs" id="thisWeekList"></div>
    </div>
    <div class="due-soon-category" data-category="later">
      <div class="category-header">
        <span class="category-icon">📋</span>
        <span class="category-name">Later</span>
        <span class="category-count" id="laterCount">0</span>
      </div>
      <div class="category-tabs" id="laterList"></div>
    </div>
  `;
}

/**
 * Renders tabs within a Due Soon category
 *
 * @param {HTMLElement} container - Category container element
 * @param {Object[]} tabs - Array of tab objects to render
 * @param {string} category - Category name for styling
 */
function renderCategoryTabs(container, tabs, category) {
  if (tabs.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = tabs.map(tab => createDueSoonTabHTML(tab, category)).join('');

  attachTabListeners(container);
  attachReminderEditListeners(container);
  attachFaviconErrorHandlers(container);
}

/**
 * Creates HTML for a tab in the Due Soon section
 *
 * Displays reminder time in a format appropriate for the category.
 *
 * @param {Object} tab - Tab object with reminder
 * @param {string} category - Category name
 * @returns {string} - HTML string
 */
function createDueSoonTabHTML(tab, category) {
  const reminder = new Date(tab.reminder);
  const isOverdue = category === 'overdue';

  // Format reminder text based on category and whether time was set
  let reminderText;

  if (tab.hasTime) {
    // Time was explicitly set - show it
    if (category === 'overdue') {
      reminderText = reminder.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
                     reminder.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (category === 'today' || category === 'tomorrow') {
      reminderText = reminder.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (category === 'thisWeek') {
      reminderText = reminder.toLocaleDateString([], { weekday: 'short' }) + ' ' +
                     reminder.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      reminderText = reminder.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
                     reminder.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  } else {
    // No specific time - show "All day" or date only
    if (category === 'overdue') {
      reminderText = reminder.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else if (category === 'today' || category === 'tomorrow') {
      reminderText = 'All day';
    } else if (category === 'thisWeek') {
      reminderText = reminder.toLocaleDateString([], { weekday: 'long' });
    } else {
      reminderText = reminder.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  return `
    <div class="tab-item reminder-tab ${isOverdue ? 'overdue' : ''}" data-tab-id="${tab.id}" data-url="${escapeHtml(tab.url)}" draggable="true">
      <span class="drag-handle">⋮⋮</span>
      <img class="tab-favicon" src="${tab.favicon || DEFAULT_FAVICON}" alt="">
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-reminder-time ${isOverdue ? 'overdue' : ''}" data-tab-id="${tab.id}" title="Click to edit">${reminderText}</div>
      </div>
      <div class="tab-actions">
        <button class="tab-action-btn tab-edit-reminder" title="Edit reminder">✎</button>
        <button class="tab-action-btn tab-open" title="Open">↗</button>
        <button class="tab-action-btn tab-delete" title="Delete">×</button>
      </div>
    </div>
  `;
}

/**
 * Attaches reminder edit listeners
 *
 * Allows clicking on the edit button or reminder time text
 * to open the reminder edit modal.
 *
 * @param {HTMLElement} container - Container with reminder tabs
 */
function attachReminderEditListeners(container) {
  // Edit button
  container.querySelectorAll('.tab-edit-reminder').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tabItem = btn.closest('.tab-item');
      const tabId = parseFloat(tabItem.dataset.tabId);
      showReminderModal(tabId);
    });
  });

  // Clickable reminder text
  container.querySelectorAll('.tab-reminder-time').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const tabId = parseFloat(el.dataset.tabId);
      showReminderModal(tabId);
    });
  });
}

// -----------------------------------------------------------------------------
// GROUPS
// -----------------------------------------------------------------------------

/**
 * Renders the Groups section
 *
 * Displays tab groups with nested subgroups.
 * Shows empty state message if no groups exist.
 *
 * @param {string} [searchQuery] - Optional search query to filter items
 */
function renderGroups(searchQuery) {
  const query = getSearchQuery(searchQuery);

  if (groups.length === 0) {
    groupsList.innerHTML = '<div class="empty-state">No groups yet. Create one to organize your tabs.</div>';
    return;
  }

  // Get root level groups (no parent)
  const rootGroups = groups.filter(g => !g.parentId);

  groupsList.innerHTML = rootGroups.map(group => renderGroupHTML(group, query, 0)).join('');

  // Attach all group listeners
  attachGroupListeners();
}

/**
 * Creates HTML for a group and its contents
 *
 * Recursively renders nested subgroups.
 *
 * @param {Object} group - Group object
 * @param {string} searchQuery - Search query for filtering
 * @param {number} depth - Nesting depth for indentation
 * @returns {string} - HTML string
 */
function renderGroupHTML(group, searchQuery, depth) {
  // Get tabs directly in this group
  const groupTabs = savedTabs.filter(t => t.groupId === group.id);
  const filtered = filterTabs(groupTabs, searchQuery);

  // Get child groups
  const childGroups = groups.filter(g => g.parentId === group.id);

  // Count total tabs including nested groups
  const totalTabs = countGroupTabs(group.id);

  return `
    <div class="group-item ${group.expanded ? 'expanded' : ''}" data-group-id="${group.id}" style="margin-left: ${depth * 16}px;">
      <div class="group-header" draggable="true">
        <span class="drag-handle">⋮⋮</span>
        <span class="group-expand">▶</span>
        <span class="group-name">${escapeHtml(group.name)}</span>
        <span class="group-count">${totalTabs}</span>
        <div class="group-actions">
          <button class="tab-action-btn group-add-subgroup" title="Add subgroup">+</button>
          <button class="tab-action-btn group-open-all" title="Open all">↗</button>
          <button class="tab-action-btn group-edit" title="Edit">✎</button>
          <button class="tab-action-btn group-delete" title="Delete">×</button>
        </div>
      </div>
      <div class="group-tabs">
        ${filtered.length > 0
          ? filtered.map(tab => createTabHTML(tab)).join('')
          : (childGroups.length === 0 ? '<div class="empty-state">No tabs in this group</div>' : '')}
        ${childGroups.map(child => renderGroupHTML(child, searchQuery, depth + 1)).join('')}
      </div>
    </div>
  `;
}

/**
 * Attaches all event listeners for groups
 *
 * Handles expand/collapse, drag-and-drop, and action buttons.
 */
function attachGroupListeners() {
  groupsList.querySelectorAll('.group-header').forEach(header => {
    const groupItem = header.closest('.group-item');
    const groupId = groupItem.dataset.groupId;

    // Expand/collapse on arrow or name click
    const expandBtn = header.querySelector('.group-expand');
    const groupName = header.querySelector('.group-name');

    if (expandBtn) {
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleGroup(groupId);
      });
    }

    if (groupName) {
      groupName.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleGroup(groupId);
      });
    }

    // Group drag events
    setupGroupDragEvents(header, groupItem, groupId);

    // Action buttons
    header.querySelector('.group-add-subgroup')?.addEventListener('click', (e) => {
      e.stopPropagation();
      showGroupModal(null, groupId);
    });

    header.querySelector('.group-open-all')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const groupTabs = getGroupTabsRecursive(groupId);
      for (const tab of groupTabs) {
        await openTab(tab.url, true);
      }
    });

    header.querySelector('.group-edit')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const group = groups.find(g => g.id === groupId);
      if (group) showGroupModal(group);
    });

    header.querySelector('.group-delete')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Delete this group and all subgroups? Tabs will be moved to Saved Tabs.')) {
        deleteGroup(groupId);
      }
    });
  });

  // Attach tab listeners within groups
  groupsList.querySelectorAll('.group-tabs').forEach(container => {
    attachTabListeners(container);
    attachDragListeners(container);
    attachFaviconErrorHandlers(container);
  });
}

/**
 * Sets up drag and drop event handlers for a group
 *
 * @param {HTMLElement} header - Group header element
 * @param {HTMLElement} groupItem - Group item container
 * @param {string} groupId - ID of the group
 */
function setupGroupDragEvents(header, groupItem, groupId) {
  // Drag start
  header.addEventListener('dragstart', (e) => {
    e.stopPropagation();
    e.dataTransfer.setData('application/group-id', groupId);
    e.dataTransfer.effectAllowed = 'move';
    groupItem.classList.add('dragging');

    // Show drop zones on valid target groups
    document.querySelectorAll('.group-item').forEach(g => {
      // Can't drop onto self or descendants
      if (g.dataset.groupId !== groupId && !isDescendantGroup(g.dataset.groupId, groupId)) {
        g.classList.add('drop-target');
      }
    });
  });

  // Drag end
  header.addEventListener('dragend', () => {
    groupItem.classList.remove('dragging');
    document.querySelectorAll('.group-item').forEach(g => {
      g.classList.remove('drop-target', 'drag-over');
    });
  });

  // Drop zone for receiving groups and tabs
  groupItem.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Clear drag-over from other groups
    document.querySelectorAll('.group-item.drag-over').forEach(g => {
      if (g !== groupItem) g.classList.remove('drag-over');
    });

    const isDraggingGroup = e.dataTransfer.types.includes('application/group-id');
    const isDraggingTab = e.dataTransfer.types.includes('text/plain');

    if (isDraggingGroup && groupItem.classList.contains('drop-target')) {
      groupItem.classList.add('drag-over');
    } else if (isDraggingTab) {
      groupItem.classList.add('drag-over');
    }
  });

  groupItem.addEventListener('dragleave', (e) => {
    e.stopPropagation();
    if (!groupItem.contains(e.relatedTarget)) {
      groupItem.classList.remove('drag-over');
    }
  });

  // Handle drop
  groupItem.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if dropping a group
    const draggedGroupId = e.dataTransfer.getData('application/group-id');
    if (draggedGroupId && draggedGroupId !== groupId) {
      moveGroupToParent(draggedGroupId, groupId);
    } else {
      // Check if dropping a tab
      const tabId = e.dataTransfer.getData('text/plain');
      if (tabId) {
        moveToGroup(parseFloat(tabId), groupId);
      }
    }

    groupItem.classList.remove('drag-over');
    document.querySelectorAll('.group-item').forEach(g => {
      g.classList.remove('drop-target', 'drag-over');
    });
  });
}

// -----------------------------------------------------------------------------
// SAVED TABS (UNGROUPED)
// -----------------------------------------------------------------------------

/**
 * Renders the Saved Tabs section (ungrouped tabs)
 *
 * Shows only tabs that don't belong to any group.
 *
 * @param {string} [searchQuery] - Optional search query to filter items
 */
function renderSavedTabs(searchQuery) {
  const query = getSearchQuery(searchQuery);

  // Get only ungrouped tabs
  const ungroupedTabs = savedTabs.filter(t => !t.groupId);
  const filtered = filterTabs(ungroupedTabs, query);

  if (filtered.length === 0) {
    savedTabsList.innerHTML = '<div class="empty-state">No saved tabs yet. Click a button above to save tabs.</div>';
    return;
  }

  savedTabsList.innerHTML = filtered.map(tab => createTabHTML(tab)).join('');

  attachTabListeners(savedTabsList);
  attachDragListeners(savedTabsList);
  attachFaviconErrorHandlers(savedTabsList);
}

// -----------------------------------------------------------------------------
// CURRENT TABS
// -----------------------------------------------------------------------------

/**
 * Renders the Current Tabs section
 *
 * Shows tabs currently open in the browser window.
 * Indicates which tabs are already saved.
 *
 * @async
 * @param {string} [searchQuery] - Optional search query to filter items
 */
async function renderCurrentTabs(searchQuery) {
  const query = getSearchQuery(searchQuery);

  // Get tabs from current window
  const tabs = await chrome.tabs.query({ currentWindow: true });

  // Filter by search query
  const filtered = query
    ? tabs.filter(tab =>
        tab.title.toLowerCase().includes(query) ||
        tab.url.toLowerCase().includes(query))
    : tabs;

  if (filtered.length === 0) {
    currentTabsList.innerHTML = '<div class="empty-state">No tabs in current window.</div>';
    return;
  }

  currentTabsList.innerHTML = filtered.map(tab => createCurrentTabHTML(tab)).join('');

  attachCurrentTabListeners(currentTabsList);
  attachFaviconErrorHandlers(currentTabsList);
}

/**
 * Creates HTML for a current tab item
 *
 * Shows save button if not already saved, or "Saved" badge if it is.
 *
 * @param {chrome.tabs.Tab} tab - Chrome tab object
 * @returns {string} - HTML string
 */
function createCurrentTabHTML(tab) {
  const alreadySaved = savedTabs.some(t => t.url === tab.url);

  return `
    <div class="tab-item current-tab ${alreadySaved ? 'already-saved' : ''}" data-tab-id="${tab.id}" data-url="${escapeHtml(tab.url)}" data-title="${escapeHtml(tab.title)}" data-favicon="${tab.favIconUrl || ''}">
      <img class="tab-favicon" src="${tab.favIconUrl || DEFAULT_FAVICON}" alt="">
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-url">${escapeHtml(getHostname(tab.url))}</div>
      </div>
      <div class="tab-actions">
        ${alreadySaved
          ? '<span class="saved-badge">Saved</span>'
          : '<button class="tab-action-btn tab-save" title="Save tab">+</button>'}
      </div>
    </div>
  `;
}

/**
 * Attaches event listeners for current tabs
 *
 * Handles clicking to focus tab and save button.
 *
 * @param {HTMLElement} container - Container with current tabs
 */
function attachCurrentTabListeners(container) {
  container.querySelectorAll('.tab-item.current-tab').forEach(item => {
    const url = item.dataset.url;
    const title = item.dataset.title;
    const favicon = item.dataset.favicon;

    // Click to focus the tab
    item.addEventListener('click', async (e) => {
      if (!e.target.closest('.tab-actions')) {
        const tabId = parseInt(item.dataset.tabId);
        await chrome.tabs.update(tabId, { active: true });
      }
    });

    // Save button
    item.querySelector('.tab-save')?.addEventListener('click', (e) => {
      e.stopPropagation();
      saveTabFromCurrent(url, title, favicon);
      renderAll();
    });
  });
}

// -----------------------------------------------------------------------------
// GENERIC TAB HTML
// -----------------------------------------------------------------------------

/**
 * Creates HTML for a standard saved tab item
 *
 * Used in Saved Tabs section, Groups, and Daily tabs.
 *
 * @param {Object} tab - Tab object
 * @param {boolean} [isDaily=false] - Whether this is in Daily section
 * @returns {string} - HTML string
 */
function createTabHTML(tab, isDaily = false) {
  const isDailyTab = dailyTabs.some(t => t.id === tab.id);

  return `
    <div class="tab-item ${isDaily ? 'daily' : ''}" data-tab-id="${tab.id}" data-url="${escapeHtml(tab.url)}" draggable="true">
      <span class="drag-handle">⋮⋮</span>
      <img class="tab-favicon" src="${tab.favicon || DEFAULT_FAVICON}" alt="">
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-url">${escapeHtml(getHostname(tab.url))}</div>
      </div>
      <div class="tab-actions">
        ${isDailyTab ? '<button class="tab-action-btn daily-indicator" title="Daily tab">★</button>' : ''}
        <button class="tab-action-btn tab-open" title="Open">↗</button>
        <button class="tab-action-btn tab-delete" title="Delete">×</button>
      </div>
    </div>
  `;
}

/**
 * Attaches event listeners for tab items
 *
 * Handles click to open, right-click for context menu,
 * and action buttons.
 *
 * @param {HTMLElement} container - Container with tab items
 */
function attachTabListeners(container) {
  container.querySelectorAll('.tab-item').forEach(item => {
    const tabId = parseFloat(item.dataset.tabId);
    const url = item.dataset.url;
    const tab = savedTabs.find(t => t.id === tabId) || dailyTabs.find(t => t.id === tabId);

    // Click to open tab
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.tab-actions')) {
        openTab(url, false);
      }
    });

    // Right-click for context menu
    item.addEventListener('contextmenu', (e) => {
      if (tab) showContextMenu(e, tab);
    });

    // Open button (opens in new tab)
    item.querySelector('.tab-open')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openTab(url, true);
    });

    // Delete button
    item.querySelector('.tab-delete')?.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTab(tabId);
    });
  });
}
