/**
 * ============================================================================
 * PICKER.JS
 * ============================================================================
 *
 * Tab Picker Modal functionality for the Tab Saver extension.
 * Allows users to select multiple tabs from current or all windows
 * and save them at once, optionally to a group.
 *
 * Features:
 * - Pick from current window or all windows
 * - Multi-select with Select All/Deselect All
 * - Group selection or create new group inline
 * - Visual indication of already-saved tabs
 *
 * ============================================================================
 */

// -----------------------------------------------------------------------------
// SHOW TAB PICKER
// -----------------------------------------------------------------------------

/**
 * Shows the tab picker modal with available tabs
 *
 * Queries Chrome for tabs and displays them in a selectable list.
 * Can show tabs from current window only or all windows.
 *
 * @async
 * @param {boolean} [allWindows=false] - Whether to show tabs from all windows
 */
async function showTabPicker(allWindows = false) {
  let tabs;

  if (allWindows) {
    // Get tabs from all windows
    tabs = await chrome.tabs.query({});
  } else {
    // Get tabs from current window only
    tabs = await chrome.tabs.query({ currentWindow: true });
  }

  // Group tabs by window if showing all windows
  if (allWindows) {
    // Create a map of windows to their tabs
    const windows = {};
    tabs.forEach(tab => {
      if (!windows[tab.windowId]) {
        windows[tab.windowId] = [];
      }
      windows[tab.windowId].push(tab);
    });

    // Render with window headers
    tabPickerList.innerHTML = Object.entries(windows).map(([windowId, windowTabs], index) => `
      <div class="window-header">Window ${index + 1} (${windowTabs.length} tabs)</div>
      ${windowTabs.map(tab => createPickerItemHTML(tab)).join('')}
    `).join('');
  } else {
    // Render flat list
    tabPickerList.innerHTML = tabs.map(tab => createPickerItemHTML(tab)).join('');
  }

  // Attach click listeners to toggle selection
  tabPickerList.querySelectorAll('.picker-item').forEach(item => {
    item.addEventListener('click', () => {
      const checkbox = item.querySelector('.picker-checkbox');
      checkbox.checked = !checkbox.checked;
      item.classList.toggle('selected', checkbox.checked);
    });
  });

  // Populate group dropdown
  populatePickerGroupSelect();

  // Handle favicon loading errors
  attachFaviconErrorHandlers(tabPickerList);

  // Show the modal
  tabPickerModal.classList.remove('hidden');
}

/**
 * Creates HTML for a tab item in the picker
 *
 * Shows checkbox, favicon, title, and URL.
 * Marks already-saved tabs and disables their checkboxes.
 *
 * @param {chrome.tabs.Tab} tab - Chrome tab object
 * @returns {string} - HTML string
 */
function createPickerItemHTML(tab) {
  // Check if this tab is already saved
  const alreadySaved = savedTabs.some(t => t.url === tab.url);

  return `
    <div class="picker-item ${alreadySaved ? 'already-saved' : ''}"
         data-url="${escapeHtml(tab.url)}"
         data-title="${escapeHtml(tab.title)}"
         data-favicon="${tab.favIconUrl || ''}">
      <input type="checkbox" class="picker-checkbox" ${alreadySaved ? 'disabled' : ''}>
      <img class="picker-favicon" src="${tab.favIconUrl || DEFAULT_FAVICON}" alt="">
      <div class="picker-info">
        <div class="picker-title">${escapeHtml(tab.title)}${alreadySaved ? ' (saved)' : ''}</div>
        <div class="picker-url">${escapeHtml(getHostname(tab.url))}</div>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// GROUP SELECTION
// -----------------------------------------------------------------------------

/**
 * Populates the group dropdown in the tab picker
 *
 * Shows existing groups sorted alphabetically, followed by
 * "No Group" option and "+ New Group" for creating inline.
 */
function populatePickerGroupSelect() {
  const select = document.getElementById('pickerGroupSelect');
  const newGroupInput = document.getElementById('pickerNewGroupInput');
  const nameInput = document.getElementById('pickerNewGroupName');

  // Sort groups alphabetically by name
  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));

  // Clear existing options
  select.innerHTML = '';

  // Add sorted groups first
  sortedGroups.forEach(group => {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = group.name;
    select.appendChild(option);
  });

  // Add "No Group" option
  const noGroupOption = document.createElement('option');
  noGroupOption.value = '';
  noGroupOption.textContent = 'No Group';
  select.appendChild(noGroupOption);

  // Add "+ New Group" option at the end
  const newGroupOption = document.createElement('option');
  newGroupOption.value = NEW_GROUP_VALUE;
  newGroupOption.textContent = '+ New Group';
  select.appendChild(newGroupOption);

  // Select first group by default if groups exist, otherwise "No Group"
  if (sortedGroups.length > 0) {
    select.value = sortedGroups[0].id;
  } else {
    select.value = '';
  }

  // Reset new group input visibility
  newGroupInput.classList.add('hidden');
  nameInput.value = '';
}

/**
 * Handles group dropdown selection change
 *
 * When "+ New Group" is selected, shows the inline input
 * for entering a new group name.
 */
function handlePickerGroupChange() {
  const select = document.getElementById('pickerGroupSelect');
  const newGroupInput = document.getElementById('pickerNewGroupInput');
  const nameInput = document.getElementById('pickerNewGroupName');

  if (select.value === NEW_GROUP_VALUE) {
    // Show new group input
    newGroupInput.classList.remove('hidden');
    nameInput.focus();
  } else {
    // Hide new group input
    newGroupInput.classList.add('hidden');
    nameInput.value = '';
  }
}

// -----------------------------------------------------------------------------
// SELECTION ACTIONS
// -----------------------------------------------------------------------------

/**
 * Selects all non-saved tabs in the picker
 *
 * Checks all checkboxes except for already-saved tabs.
 */
function selectAllPickerTabs() {
  tabPickerList.querySelectorAll('.picker-item:not(.already-saved)').forEach(item => {
    const checkbox = item.querySelector('.picker-checkbox');
    checkbox.checked = true;
    item.classList.add('selected');
  });
}

/**
 * Deselects all tabs in the picker
 *
 * Unchecks all checkboxes.
 */
function deselectAllPickerTabs() {
  tabPickerList.querySelectorAll('.picker-item').forEach(item => {
    const checkbox = item.querySelector('.picker-checkbox');
    checkbox.checked = false;
    item.classList.remove('selected');
  });
}

// -----------------------------------------------------------------------------
// SAVE SELECTED TABS
// -----------------------------------------------------------------------------

/**
 * Saves all selected tabs from the picker
 *
 * Creates savedTab entries for each selected tab.
 * If "+ New Group" was selected, creates the new group first.
 * Assigns all saved tabs to the selected/created group.
 */
function saveSelectedTabs() {
  const selectedItems = tabPickerList.querySelectorAll('.picker-item.selected');

  // Get selected group or prepare to create new one
  let groupId = document.getElementById('pickerGroupSelect').value;
  const newGroupName = document.getElementById('pickerNewGroupName').value.trim();

  // Handle new group creation
  if (groupId === NEW_GROUP_VALUE) {
    if (!newGroupName) {
      alert('Please enter a name for the new group');
      document.getElementById('pickerNewGroupName').focus();
      return;
    }

    // Create new group
    const newGroup = {
      id: generateStringId(),
      name: newGroupName,
      expanded: true,
      parentId: null
    };
    groups.push(newGroup);
    groupId = newGroup.id;
  } else if (groupId === '') {
    // "No Group" selected
    groupId = null;
  }

  // Save each selected tab
  selectedItems.forEach(item => {
    const url = item.dataset.url;
    const title = item.dataset.title;
    const favicon = item.dataset.favicon;

    // Skip if already saved
    if (savedTabs.some(t => t.url === url)) return;

    const savedTab = {
      id: generateId(),
      title: title,
      url: url,
      favicon: favicon,
      savedAt: new Date().toISOString(),
      groupId: groupId
    };

    // Add to beginning of array
    savedTabs.unshift(savedTab);
  });

  saveData();
  renderAll();
  hideTabPicker();
}

// -----------------------------------------------------------------------------
// HIDE TAB PICKER
// -----------------------------------------------------------------------------

/**
 * Hides the tab picker modal and clears its state
 *
 * Clears the tab list and resets the new group input.
 */
function hideTabPicker() {
  tabPickerModal.classList.add('hidden');
  tabPickerList.innerHTML = '';

  // Reset new group input
  document.getElementById('pickerNewGroupInput').classList.add('hidden');
  document.getElementById('pickerNewGroupName').value = '';
}
