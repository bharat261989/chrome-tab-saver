// Tab Saver - Side Panel JavaScript

// Default favicon placeholder
const DEFAULT_FAVICON = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23ddd%22 width=%2216%22 height=%2216%22 rx=%222%22/></svg>';

// State
let savedTabs = [];
let groups = [];
let dailyTabs = [];
let pinnedTabs = [];
let timedTabs = [];
let selectedTab = null;
let timerIntervals = {}; // Track active timer intervals

// DOM Elements (initialized after DOM loads)
let searchInput, saveCurrentTabBtn, pickFromWindowBtn, pickFromAllWindowsBtn, openDailyTabsBtn;
let tabPickerModal, tabPickerList, selectAllTabsBtn, deselectAllTabsBtn, saveSelectedTabsBtn, cancelPickerBtn;
let createGroupBtn, pinnedTabsList, openPinnedTabsBtn, dailyTabsList, groupsList, savedTabsList, currentTabsList;
let groupModal, modalTitle, groupNameInput, saveGroupBtn, cancelGroupBtn, contextMenu;
let reminderModal, reminderDateInput, reminderTimeInput, saveReminderBtn, cancelReminderBtn;
let timedTabsList, timerModal, timerHoursInput, timerMinutesInput, saveTimerBtn, cancelTimerBtn;
let dueSoonContainer, overdueList, todayList, tomorrowList, thisWeekList, laterList;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Initialize DOM elements after DOM is ready
  searchInput = document.getElementById('searchInput');
  saveCurrentTabBtn = document.getElementById('saveCurrentTab');
  pickFromWindowBtn = document.getElementById('pickFromWindow');
  pickFromAllWindowsBtn = document.getElementById('pickFromAllWindows');
  openDailyTabsBtn = document.getElementById('openDailyTabs');

  tabPickerModal = document.getElementById('tabPickerModal');
  tabPickerList = document.getElementById('tabPickerList');
  selectAllTabsBtn = document.getElementById('selectAllTabs');
  deselectAllTabsBtn = document.getElementById('deselectAllTabs');
  saveSelectedTabsBtn = document.getElementById('saveSelectedTabs');
  cancelPickerBtn = document.getElementById('cancelPicker');

  createGroupBtn = document.getElementById('createGroup');
  pinnedTabsList = document.getElementById('pinnedTabsList');
  openPinnedTabsBtn = document.getElementById('openPinnedTabs');
  dailyTabsList = document.getElementById('dailyTabsList');
  groupsList = document.getElementById('groupsList');
  savedTabsList = document.getElementById('savedTabsList');
  currentTabsList = document.getElementById('currentTabsList');

  groupModal = document.getElementById('groupModal');
  modalTitle = document.getElementById('modalTitle');
  groupNameInput = document.getElementById('groupNameInput');
  saveGroupBtn = document.getElementById('saveGroup');
  cancelGroupBtn = document.getElementById('cancelGroup');
  contextMenu = document.getElementById('contextMenu');

  reminderModal = document.getElementById('reminderModal');
  reminderDateInput = document.getElementById('reminderDateInput');
  reminderTimeInput = document.getElementById('reminderTimeInput');
  saveReminderBtn = document.getElementById('saveReminder');
  cancelReminderBtn = document.getElementById('cancelReminder');

  // Timed tabs elements
  timedTabsList = document.getElementById('timedTabsList');
  timerModal = document.getElementById('timerModal');
  timerHoursInput = document.getElementById('timerHours');
  timerMinutesInput = document.getElementById('timerMinutes');
  saveTimerBtn = document.getElementById('saveTimer');
  cancelTimerBtn = document.getElementById('cancelTimer');

  // Due Soon elements
  dueSoonContainer = document.getElementById('dueSoonList');
  overdueList = document.getElementById('overdueList');
  todayList = document.getElementById('todayList');
  tomorrowList = document.getElementById('tomorrowList');
  thisWeekList = document.getElementById('thisWeekList');
  laterList = document.getElementById('laterList');

  await loadData();
  renderAll();
  setupEventListeners();
  setupGroupDropZones();
  setupTabChangeListeners();
  setupStorageChangeListener();
}

// Listen for storage changes (e.g., when pinned tab is removed from background script)
function setupStorageChangeListener() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync') {
      if (changes.pinnedTabs) {
        pinnedTabs = changes.pinnedTabs.newValue || [];
        renderPinnedTabs();
      }
      if (changes.savedTabs) {
        savedTabs = changes.savedTabs.newValue || [];
        renderAll();
      }
      if (changes.groups) {
        groups = changes.groups.newValue || [];
        renderGroups();
      }
      if (changes.dailyTabs) {
        dailyTabs = changes.dailyTabs.newValue || [];
        renderDailyTabs();
      }
      if (changes.timedTabs) {
        timedTabs = changes.timedTabs.newValue || [];
        renderTimedTabs();
      }
    }
  });
}

// Listen for tab changes to auto-refresh Current Tabs
function setupTabChangeListeners() {
  // When a tab is created
  chrome.tabs.onCreated.addListener(() => {
    renderCurrentTabs();
  });

  // When a tab is removed
  chrome.tabs.onRemoved.addListener(() => {
    renderCurrentTabs();
  });

  // When a tab is updated (URL change, title change, etc.)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url || changeInfo.title || changeInfo.favIconUrl) {
      renderCurrentTabs();
    }
  });

  // When tab is moved
  chrome.tabs.onMoved.addListener(() => {
    renderCurrentTabs();
  });

  // When tab is activated (switched to)
  chrome.tabs.onActivated.addListener(() => {
    renderCurrentTabs();
  });
}

// Data Management
async function loadData() {
  const result = await chrome.storage.sync.get(['savedTabs', 'groups', 'dailyTabs', 'pinnedTabs', 'timedTabs']);
  savedTabs = result.savedTabs || [];
  groups = result.groups || [];
  dailyTabs = result.dailyTabs || [];
  pinnedTabs = result.pinnedTabs || [];
  timedTabs = result.timedTabs || [];
}

async function saveData() {
  await chrome.storage.sync.set({ savedTabs, groups, dailyTabs, pinnedTabs, timedTabs });
}

// Event Listeners
function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', handleSearch);

  // Save buttons
  saveCurrentTabBtn.addEventListener('click', saveCurrentTab);
  pickFromWindowBtn.addEventListener('click', () => showTabPicker(false));
  pickFromAllWindowsBtn.addEventListener('click', () => showTabPicker(true));

  // Tab picker
  selectAllTabsBtn.addEventListener('click', selectAllPickerTabs);
  deselectAllTabsBtn.addEventListener('click', deselectAllPickerTabs);
  saveSelectedTabsBtn.addEventListener('click', saveSelectedTabs);
  cancelPickerBtn.addEventListener('click', hideTabPicker);
  tabPickerModal.addEventListener('click', (e) => {
    if (e.target === tabPickerModal) hideTabPicker();
  });

  // Pinned tabs
  openPinnedTabsBtn.addEventListener('click', openAllPinnedTabs);

  // Daily tabs
  openDailyTabsBtn.addEventListener('click', openAllDailyTabs);

  // Groups
  createGroupBtn.addEventListener('click', () => showGroupModal());
  saveGroupBtn.addEventListener('click', handleSaveGroup);
  cancelGroupBtn.addEventListener('click', hideGroupModal);

  // Context menu
  document.addEventListener('click', hideContextMenu);
  contextMenu.addEventListener('click', handleContextMenuAction);

  // Close modal on outside click
  groupModal.addEventListener('click', (e) => {
    if (e.target === groupModal) hideGroupModal();
  });

  // Reminder modal
  saveReminderBtn.addEventListener('click', handleSaveReminder);
  cancelReminderBtn.addEventListener('click', hideReminderModal);
  reminderModal.addEventListener('click', (e) => {
    if (e.target === reminderModal) hideReminderModal();
  });

  // Timer modal
  saveTimerBtn.addEventListener('click', handleSaveTimer);
  cancelTimerBtn.addEventListener('click', hideTimerModal);
  timerModal.addEventListener('click', (e) => {
    if (e.target === timerModal) hideTimerModal();
  });

  // Test notification button
  document.getElementById('testNotification').addEventListener('click', testNotification);
  document.getElementById('testAlarm').addEventListener('click', testAlarm);

  // Setup category toggle listeners
  setupCategoryToggleListeners();
}

// Test notification function
function testNotification() {
  console.log('Testing notification...');

  // Check if notifications permission exists
  if (!chrome.notifications) {
    alert('chrome.notifications API not available!\n\nMake sure "notifications" is in manifest.json permissions.');
    return;
  }

  // Try with extension icon first
  const iconUrl = chrome.runtime.getURL('icons/icon128.png');
  console.log('Icon URL:', iconUrl);

  // Also try getting permission status
  chrome.notifications.getPermissionLevel((level) => {
    console.log('Notification permission level:', level);

    if (level !== 'granted') {
      alert('Notification permission not granted!\nLevel: ' + level + '\n\nCheck Chrome settings > Privacy > Notifications');
      return;
    }

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

// Test alarm function - creates a 5 second alarm
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

  // Create alarm - note: Chrome alarms have minimum ~1 minute in production
  // But we'll try with delayInMinutes for shorter delay
  const alarmName = `timer-${testTab.id}`;

  chrome.alarms.create(alarmName, {
    when: Date.now() + 5000  // 5 seconds from now
  });

  // Also list all alarms
  chrome.alarms.getAll((alarms) => {
    console.log('All alarms:', alarms);
  });

  alert('Test alarm created!\n\nAlarm name: ' + alarmName + '\nShould fire in 5 seconds.\n\nNote: Chrome alarms have ~1 min minimum delay.\nCheck background console for alarm events.');

  renderTimedTabs();
}

// Save Tab Functions
async function saveCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    addTab(tab);
  }
}

// Tab Picker Functions
async function showTabPicker(allWindows = false) {
  let tabs;

  if (allWindows) {
    tabs = await chrome.tabs.query({});
  } else {
    tabs = await chrome.tabs.query({ currentWindow: true });
  }

  // Group tabs by window if showing all windows
  if (allWindows) {
    const windows = {};
    tabs.forEach(tab => {
      if (!windows[tab.windowId]) {
        windows[tab.windowId] = [];
      }
      windows[tab.windowId].push(tab);
    });

    tabPickerList.innerHTML = Object.entries(windows).map(([windowId, windowTabs], index) => `
      <div class="window-header">Window ${index + 1} (${windowTabs.length} tabs)</div>
      ${windowTabs.map(tab => createPickerItemHTML(tab)).join('')}
    `).join('');
  } else {
    tabPickerList.innerHTML = tabs.map(tab => createPickerItemHTML(tab)).join('');
  }

  // Attach click listeners
  tabPickerList.querySelectorAll('.picker-item').forEach(item => {
    item.addEventListener('click', () => {
      const checkbox = item.querySelector('.picker-checkbox');
      checkbox.checked = !checkbox.checked;
      item.classList.toggle('selected', checkbox.checked);
    });
  });

  tabPickerModal.classList.remove('hidden');
}

function createPickerItemHTML(tab) {
  const alreadySaved = savedTabs.some(t => t.url === tab.url);
  return `
    <div class="picker-item ${alreadySaved ? 'already-saved' : ''}" data-url="${escapeHtml(tab.url)}" data-title="${escapeHtml(tab.title)}" data-favicon="${tab.favIconUrl || ''}">
      <input type="checkbox" class="picker-checkbox" ${alreadySaved ? 'disabled' : ''}>
      <img class="picker-favicon" src="${tab.favIconUrl || DEFAULT_FAVICON}" onerror="this.src='${DEFAULT_FAVICON}'" alt="">
      <div class="picker-info">
        <div class="picker-title">${escapeHtml(tab.title)}${alreadySaved ? ' (saved)' : ''}</div>
        <div class="picker-url">${escapeHtml(getHostname(tab.url))}</div>
      </div>
    </div>
  `;
}

function hideTabPicker() {
  tabPickerModal.classList.add('hidden');
  tabPickerList.innerHTML = '';
}

function selectAllPickerTabs() {
  tabPickerList.querySelectorAll('.picker-item:not(.already-saved)').forEach(item => {
    const checkbox = item.querySelector('.picker-checkbox');
    checkbox.checked = true;
    item.classList.add('selected');
  });
}

function deselectAllPickerTabs() {
  tabPickerList.querySelectorAll('.picker-item').forEach(item => {
    const checkbox = item.querySelector('.picker-checkbox');
    checkbox.checked = false;
    item.classList.remove('selected');
  });
}

function saveSelectedTabs() {
  const selectedItems = tabPickerList.querySelectorAll('.picker-item.selected');

  selectedItems.forEach(item => {
    const url = item.dataset.url;
    const title = item.dataset.title;
    const favicon = item.dataset.favicon;

    // Check if already saved
    if (savedTabs.some(t => t.url === url)) return;

    const savedTab = {
      id: Date.now() + Math.random(),
      title: title,
      url: url,
      favicon: favicon,
      savedAt: new Date().toISOString(),
      groupId: null
    };

    savedTabs.unshift(savedTab);
  });

  saveData();
  renderAll();
  hideTabPicker();
}

function addTab(tab) {
  // Check if already saved
  const exists = savedTabs.some(t => t.url === tab.url);
  if (exists) return;

  const savedTab = {
    id: Date.now() + Math.random(),
    title: tab.title,
    url: tab.url,
    favicon: tab.favIconUrl || '',
    savedAt: new Date().toISOString(),
    groupId: null
  };

  savedTabs.unshift(savedTab);
  saveData();
  renderAll();
}

// Daily Tabs
function addToDailyTabs(tabId) {
  const tab = savedTabs.find(t => t.id === tabId);
  if (!tab) return;

  if (!dailyTabs.some(t => t.id === tabId)) {
    dailyTabs.push({ ...tab });
    saveData();
    renderAll();
  }
}

function removeFromDailyTabs(tabId) {
  dailyTabs = dailyTabs.filter(t => t.id !== tabId);
  saveData();
  renderAll();
}

async function openAllDailyTabs() {
  for (const tab of dailyTabs) {
    await openTab(tab.url, true);
  }
}

// Groups
function showGroupModal(group = null, parentId = null) {
  modalTitle.textContent = group ? 'Edit Group' : 'Create Group';
  groupNameInput.value = group ? group.name : '';
  groupModal.dataset.groupId = group ? group.id : '';
  groupModal.dataset.parentId = parentId || '';
  groupModal.classList.remove('hidden');
  groupNameInput.focus();
}

function hideGroupModal() {
  groupModal.classList.add('hidden');
  groupNameInput.value = '';
  groupModal.dataset.groupId = '';
  groupModal.dataset.parentId = '';
}

function handleSaveGroup() {
  const name = groupNameInput.value.trim();
  if (!name) return;

  const groupId = groupModal.dataset.groupId;
  const parentId = groupModal.dataset.parentId || null;

  if (groupId) {
    // Edit existing group
    const group = groups.find(g => g.id === groupId);
    if (group) {
      group.name = name;
    }
  } else {
    // Create new group
    groups.push({
      id: Date.now().toString(),
      name: name,
      expanded: true,
      parentId: parentId
    });
  }

  saveData();
  renderAll();
  hideGroupModal();
}

function deleteGroup(groupId) {
  // Move tabs back to ungrouped (including from nested groups)
  const groupsToDelete = getGroupAndDescendants(groupId);

  savedTabs.forEach(tab => {
    if (groupsToDelete.includes(tab.groupId)) {
      tab.groupId = null;
    }
  });

  groups = groups.filter(g => !groupsToDelete.includes(g.id));
  saveData();
  renderAll();
}

// Get a group and all its descendant group IDs
function getGroupAndDescendants(groupId) {
  const result = [groupId];
  const children = groups.filter(g => g.parentId === groupId);
  for (const child of children) {
    result.push(...getGroupAndDescendants(child.id));
  }
  return result;
}

// Reminder functions
function showReminderModal(tabId) {
  reminderModal.dataset.tabId = tabId;

  // Set default to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tab = savedTabs.find(t => t.id === tabId);
  if (tab && tab.reminder) {
    const reminderDate = new Date(tab.reminder);
    reminderDateInput.value = reminderDate.toISOString().slice(0, 10);
    // Only set time if it was explicitly set (not midnight)
    if (reminderDate.getHours() !== 0 || reminderDate.getMinutes() !== 0) {
      reminderTimeInput.value = reminderDate.toTimeString().slice(0, 5);
    } else {
      reminderTimeInput.value = '';
    }
  } else {
    reminderDateInput.value = tomorrow.toISOString().slice(0, 10);
    reminderTimeInput.value = '';
  }

  reminderModal.classList.remove('hidden');
  reminderDateInput.focus();
}

function hideReminderModal() {
  reminderModal.classList.add('hidden');
  reminderModal.dataset.tabId = '';
}

function handleSaveReminder() {
  const tabId = parseFloat(reminderModal.dataset.tabId);
  const dateValue = reminderDateInput.value;
  const timeValue = reminderTimeInput.value;

  if (!dateValue) return;

  const tab = savedTabs.find(t => t.id === tabId);
  if (tab) {
    let reminderDate;
    if (timeValue) {
      reminderDate = new Date(`${dateValue}T${timeValue}`);
    } else {
      // If no time specified, set to start of day (midnight)
      reminderDate = new Date(`${dateValue}T00:00:00`);
    }
    tab.reminder = reminderDate.toISOString();
    tab.hasTime = !!timeValue; // Track if time was explicitly set
    saveData();
    renderAll();
  }

  hideReminderModal();
}

function removeReminder(tabId) {
  const tab = savedTabs.find(t => t.id === tabId);
  if (tab) {
    delete tab.reminder;
    delete tab.hasTime;
    saveData();
    renderAll();
  }
}

// Timer functions
function showTimerModal(tabId) {
  timerModal.dataset.tabId = tabId;
  timerHoursInput.value = 0;
  timerMinutesInput.value = 30;
  timerModal.classList.remove('hidden');
  timerMinutesInput.focus();
}

function hideTimerModal() {
  timerModal.classList.add('hidden');
  timerModal.dataset.tabId = '';
}

function handleSaveTimer() {
  const tabId = parseFloat(timerModal.dataset.tabId);
  const hours = parseInt(timerHoursInput.value) || 0;
  const minutes = parseInt(timerMinutesInput.value) || 0;

  if (hours === 0 && minutes === 0) return;

  const tab = savedTabs.find(t => t.id === tabId);
  if (tab) {
    const durationMs = (hours * 60 + minutes) * 60 * 1000;
    const endTime = Date.now() + durationMs;

    // Add to timed tabs
    const timedTab = {
      ...tab,
      timerEnd: endTime,
      timerDuration: durationMs
    };

    // Remove existing timer for this tab if any
    timedTabs = timedTabs.filter(t => t.id !== tabId);
    timedTabs.push(timedTab);

    // Create chrome alarm for notification
    chrome.alarms.create(`timer-${tabId}`, { when: endTime }, () => {
      console.log(`Alarm created: timer-${tabId}, will fire at:`, new Date(endTime));
    });

    saveData();
    renderAll();
  }

  hideTimerModal();
}

function removeTimer(tabId) {
  timedTabs = timedTabs.filter(t => t.id !== tabId);
  chrome.alarms.clear(`timer-${tabId}`);
  if (timerIntervals[tabId]) {
    clearInterval(timerIntervals[tabId]);
    delete timerIntervals[tabId];
  }
  saveData();
  renderAll();
}

// Category toggle for Due Soon
function setupCategoryToggleListeners() {
  document.querySelectorAll('.category-header').forEach(header => {
    header.addEventListener('click', () => {
      const category = header.closest('.due-soon-category');
      category.classList.toggle('collapsed');
    });
  });
}

function toggleGroup(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (group) {
    group.expanded = !group.expanded;
    saveData();
    renderGroups();
  }
}

function moveToGroup(tabId, groupId) {
  const tab = savedTabs.find(t => t.id === tabId);
  if (tab) {
    tab.groupId = groupId;
    saveData();
    renderAll();
  }
}

// Search
function handleSearch() {
  const query = searchInput.value.toLowerCase();
  renderAll(query);
}

// Delete Tab
function deleteTab(tabId) {
  savedTabs = savedTabs.filter(t => t.id !== tabId);
  dailyTabs = dailyTabs.filter(t => t.id !== tabId);
  // Also remove from timed tabs and clear alarm
  if (timedTabs.some(t => t.id === tabId)) {
    timedTabs = timedTabs.filter(t => t.id !== tabId);
    chrome.alarms.clear(`timer-${tabId}`);
    if (timerIntervals[tabId]) {
      clearInterval(timerIntervals[tabId]);
      delete timerIntervals[tabId];
    }
  }
  saveData();
  renderAll();
}

// Open Tab - checks for existing tab first to avoid duplicates
async function openTab(url, newTab = false) {
  // Check if tab with this URL already exists
  const allTabs = await chrome.tabs.query({});
  const existingTab = allTabs.find(t => normalizeUrl(t.url) === normalizeUrl(url));

  if (existingTab) {
    // Focus existing tab instead of creating duplicate
    await chrome.tabs.update(existingTab.id, { active: true });
    await chrome.windows.update(existingTab.windowId, { focused: true });
  } else if (newTab) {
    await chrome.tabs.create({ url });
  } else {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.update(currentTab.id, { url });
  }
}

// Normalize URL for comparison (same as background.js)
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname.replace(/\/$/, '') + parsed.search;
  } catch {
    return url;
  }
}

// Context Menu
function showContextMenu(e, tab) {
  e.preventDefault();
  selectedTab = tab;

  const isDaily = dailyTabs.some(t => t.id === tab.id);
  const isPinned = pinnedTabs.some(t => t.id === tab.id);
  const hasReminder = tab.reminder != null;
  const hasTimer = timedTabs.some(t => t.id === tab.id);

  // Show/hide relevant menu items
  const addToDailyItem = contextMenu.querySelector('[data-action="addToDaily"]');
  const removeFromDailyItem = contextMenu.querySelector('[data-action="removeFromDaily"]');
  const pinTabItem = contextMenu.querySelector('[data-action="pinTab"]');
  const unpinTabItem = contextMenu.querySelector('[data-action="unpinTab"]');
  const setReminderItem = contextMenu.querySelector('[data-action="setReminder"]');
  const removeReminderItem = contextMenu.querySelector('[data-action="removeReminder"]');
  const setTimerItem = contextMenu.querySelector('[data-action="setTimer"]');
  const removeTimerItem = contextMenu.querySelector('[data-action="removeTimer"]');

  addToDailyItem.style.display = isDaily ? 'none' : 'block';
  removeFromDailyItem.style.display = isDaily ? 'block' : 'none';
  pinTabItem.style.display = isPinned ? 'none' : 'block';
  unpinTabItem.style.display = isPinned ? 'block' : 'none';
  setReminderItem.style.display = hasReminder ? 'none' : 'block';
  removeReminderItem.style.display = hasReminder ? 'block' : 'none';
  setTimerItem.style.display = hasTimer ? 'none' : 'block';
  removeTimerItem.style.display = hasTimer ? 'block' : 'none';

  contextMenu.style.left = `${e.pageX}px`;
  contextMenu.style.top = `${e.pageY}px`;
  contextMenu.classList.remove('hidden');
}

function hideContextMenu() {
  contextMenu.classList.add('hidden');
  selectedTab = null;
}

function handleContextMenuAction(e) {
  const action = e.target.dataset.action;
  if (!action || !selectedTab) return;

  switch (action) {
    case 'open':
      openTab(selectedTab.url, false);
      break;
    case 'openNew':
      openTab(selectedTab.url, true);
      break;
    case 'addToDaily':
      addToDailyTabs(selectedTab.id);
      break;
    case 'removeFromDaily':
      removeFromDailyTabs(selectedTab.id);
      break;
    case 'pinTab':
      addToPinnedTabs(selectedTab.id);
      break;
    case 'unpinTab':
      removeFromPinnedTabs(selectedTab.id);
      break;
    case 'moveToGroup':
      showMoveToGroupMenu(selectedTab.id);
      break;
    case 'setReminder':
      showReminderModal(selectedTab.id);
      break;
    case 'removeReminder':
      removeReminder(selectedTab.id);
      break;
    case 'setTimer':
      showTimerModal(selectedTab.id);
      break;
    case 'removeTimer':
      removeTimer(selectedTab.id);
      break;
    case 'delete':
      deleteTab(selectedTab.id);
      break;
  }

  hideContextMenu();
}

function showMoveToGroupMenu(tabId) {
  // Simple prompt for now - could be enhanced with a submenu
  const groupNames = groups.map(g => g.name).join(', ');
  const groupName = prompt(`Move to group (available: ${groupNames || 'none - create a group first'}):`);

  if (groupName) {
    const group = groups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
    if (group) {
      moveToGroup(tabId, group.id);
    } else {
      alert('Group not found');
    }
  }
}

// Rendering
function renderAll(searchQuery) {
  const query = getSearchQuery(searchQuery);
  renderPinnedTabs(query);
  renderDailyTabs(query);
  renderTimedTabs(query);
  renderDueSoon(query);
  renderGroups(query);
  renderSavedTabs(query);
  renderCurrentTabs(query);
}

// Helper to safely get search query string
function getSearchQuery(searchQuery) {
  if (typeof searchQuery === 'string') return searchQuery;
  return searchInput?.value?.toLowerCase() || '';
}

// Pinned Tabs
function renderPinnedTabs(searchQuery) {
  const query = getSearchQuery(searchQuery);
  const filtered = filterTabs(pinnedTabs, query);
  const section = pinnedTabsList.closest('.section');

  if (filtered.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  pinnedTabsList.innerHTML = filtered.map(tab => createPinnedTabHTML(tab)).join('');
  attachTabListeners(pinnedTabsList);
  attachPinnedTabListeners(pinnedTabsList);
}

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

function createPinnedTabHTML(tab) {
  return `
    <div class="tab-item pinned-tab" data-tab-id="${tab.id}" data-url="${escapeHtml(tab.url)}">
      <span class="pin-icon">📌</span>
      <img class="tab-favicon" src="${tab.favicon || DEFAULT_FAVICON}" onerror="this.src='${DEFAULT_FAVICON}'" alt="">
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

function addToPinnedTabs(tabId) {
  const tab = savedTabs.find(t => t.id === tabId);
  if (!tab) return;

  if (!pinnedTabs.some(t => t.id === tabId)) {
    pinnedTabs.push({ ...tab });
    saveData();
    renderAll();
  }
}

function removeFromPinnedTabs(tabId) {
  pinnedTabs = pinnedTabs.filter(t => t.id !== tabId);
  saveData();
  renderAll();
}

async function openAllPinnedTabs() {
  for (const tab of pinnedTabs) {
    await openTab(tab.url, true);
  }
}

function renderDailyTabs(searchQuery) {
  const query = getSearchQuery(searchQuery);
  const filtered = filterTabs(dailyTabs, query);
  const section = dailyTabsList.closest('.section');

  if (filtered.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  dailyTabsList.innerHTML = filtered.map(tab => createTabHTML(tab, true)).join('');
  attachTabListeners(dailyTabsList);
}

// Timed Tabs
function renderTimedTabs(searchQuery) {
  const query = getSearchQuery(searchQuery);
  const filtered = filterTabs(timedTabs, query);
  const section = timedTabsList.closest('.section');

  if (filtered.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Sort by remaining time
  const sorted = [...filtered].sort((a, b) => a.timerEnd - b.timerEnd);
  timedTabsList.innerHTML = sorted.map(tab => createTimedTabHTML(tab)).join('');
  attachTabListeners(timedTabsList);
  attachTimedTabListeners(timedTabsList);

  // Start countdown updates
  startTimerCountdowns();
}

function startTimerCountdowns() {
  // Clear existing intervals
  Object.values(timerIntervals).forEach(clearInterval);
  timerIntervals = {};

  timedTabs.forEach(tab => {
    updateTimerDisplay(tab.id);
    timerIntervals[tab.id] = setInterval(() => {
      updateTimerDisplay(tab.id);
    }, 1000);
  });
}

function updateTimerDisplay(tabId) {
  const tab = timedTabs.find(t => t.id === tabId);
  if (!tab) return;

  const remaining = tab.timerEnd - Date.now();
  const countdownEl = document.querySelector(`.timer-countdown[data-tab-id="${tabId}"]`);

  if (!countdownEl) return;

  if (remaining <= 0) {
    countdownEl.textContent = 'Time up!';
    countdownEl.classList.add('time-up');
    if (timerIntervals[tabId]) {
      clearInterval(timerIntervals[tabId]);
      delete timerIntervals[tabId];
    }
    // Trigger notification from sidepanel as fallback
    triggerTimerNotification(tab);
  } else {
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    if (hours > 0) {
      countdownEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      countdownEl.textContent = `${minutes}m ${seconds}s`;
    } else {
      countdownEl.textContent = `${seconds}s`;
    }
  }
}

// Trigger notification when timer completes (fallback from sidepanel)
function triggerTimerNotification(tab) {
  // Check if we already notified for this tab
  const timedTab = timedTabs.find(t => t.id === tab.id);
  if (!timedTab || timedTab.notified) return;

  // Mark as notified to prevent duplicate notifications
  timedTab.notified = true;
  saveData();

  console.log('Triggering timer notification for:', tab.title);

  // Create notification
  const iconUrl = chrome.runtime.getURL('icons/icon128.png');
  chrome.notifications.create(`timer-sidepanel-${tab.id}`, {
    type: 'basic',
    iconUrl: iconUrl,
    title: 'Timer Complete!',
    message: tab.title || 'Your timer has finished',
    priority: 2,
    requireInteraction: true
  }, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error('Notification error:', chrome.runtime.lastError);
      // Fallback: show alert if notification fails
      if (document.visibilityState === 'visible') {
        alert(`Timer Complete!\n\n${tab.title}`);
      }
    } else {
      console.log('Timer notification shown:', notificationId);
    }
  });
}

function createTimedTabHTML(tab) {
  const remaining = tab.timerEnd - Date.now();
  const isTimeUp = remaining <= 0;

  return `
    <div class="tab-item timed-tab ${isTimeUp ? 'time-up' : ''}" data-tab-id="${tab.id}" data-url="${escapeHtml(tab.url)}">
      <span class="timer-icon">⏱️</span>
      <img class="tab-favicon" src="${tab.favicon || DEFAULT_FAVICON}" onerror="this.src='${DEFAULT_FAVICON}'" alt="">
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

// Due Soon (Reminders organized by time category)
function renderDueSoon(searchQuery) {
  const query = getSearchQuery(searchQuery);
  const tabsWithReminders = savedTabs.filter(t => t.reminder);
  const filtered = filterTabs(tabsWithReminders, query);
  const section = dueSoonContainer.closest('.section');

  // Hide section if no reminders at all
  if (filtered.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Restore the category structure if it was replaced with empty state
  if (!document.getElementById('overdueCount')) {
    dueSoonContainer.innerHTML = `
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
    // Re-setup category toggle listeners
    setupCategoryToggleListeners();
    // Re-cache the DOM elements
    overdueList = document.getElementById('overdueList');
    todayList = document.getElementById('todayList');
    tomorrowList = document.getElementById('tomorrowList');
    thisWeekList = document.getElementById('thisWeekList');
    laterList = document.getElementById('laterList');
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  // Categorize tabs
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

  // Sort each category by time
  const sortByReminder = (a, b) => new Date(a.reminder) - new Date(b.reminder);
  overdue.sort(sortByReminder);
  todayTabs.sort(sortByReminder);
  tomorrowTabs.sort(sortByReminder);
  thisWeekTabs.sort(sortByReminder);
  later.sort(sortByReminder);

  // Update counts
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

function renderCategoryTabs(container, tabs, category) {
  if (tabs.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = tabs.map(tab => createDueSoonTabHTML(tab, category)).join('');
  attachTabListeners(container);
  attachReminderEditListeners(container);
}

function createDueSoonTabHTML(tab, category) {
  const reminder = new Date(tab.reminder);
  const isOverdue = category === 'overdue';

  let reminderText;
  if (tab.hasTime) {
    // Show time if it was explicitly set
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
    // No time set, just show date info
    if (category === 'overdue') {
      reminderText = reminder.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else if (category === 'today') {
      reminderText = 'All day';
    } else if (category === 'tomorrow') {
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
      <img class="tab-favicon" src="${tab.favicon || DEFAULT_FAVICON}" onerror="this.src='${DEFAULT_FAVICON}'" alt="">
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

function renderGroupHTML(group, searchQuery, depth) {
  const groupTabs = savedTabs.filter(t => t.groupId === group.id);
  const filtered = filterTabs(groupTabs, searchQuery);
  const childGroups = groups.filter(g => g.parentId === group.id);
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
        ${filtered.length > 0 ? filtered.map(tab => createTabHTML(tab)).join('') : (childGroups.length === 0 ? '<div class="empty-state">No tabs in this group</div>' : '')}
        ${childGroups.map(child => renderGroupHTML(child, searchQuery, depth + 1)).join('')}
      </div>
    </div>
  `;
}

function countGroupTabs(groupId) {
  let count = savedTabs.filter(t => t.groupId === groupId).length;
  const childGroups = groups.filter(g => g.parentId === groupId);
  for (const child of childGroups) {
    count += countGroupTabs(child.id);
  }
  return count;
}

function attachGroupListeners() {
  groupsList.querySelectorAll('.group-header').forEach(header => {
    const groupItem = header.closest('.group-item');
    const groupId = groupItem.dataset.groupId;

    // Click on expand arrow or group name to toggle
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
    header.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      e.dataTransfer.setData('application/group-id', groupId);
      e.dataTransfer.effectAllowed = 'move';
      groupItem.classList.add('dragging');

      // Show drop zones on other groups
      document.querySelectorAll('.group-item').forEach(g => {
        if (g.dataset.groupId !== groupId && !isDescendantGroup(g.dataset.groupId, groupId)) {
          g.classList.add('drop-target');
        }
      });
    });

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
  });
}

// Check if potentialChild is a descendant of parentGroupId
function isDescendantGroup(potentialChildId, parentGroupId) {
  const child = groups.find(g => g.id === potentialChildId);
  if (!child) return false;
  if (child.parentId === parentGroupId) return true;
  if (child.parentId) return isDescendantGroup(child.parentId, parentGroupId);
  return false;
}

// Move a group to become a subgroup of another
function moveGroupToParent(groupId, newParentId) {
  const group = groups.find(g => g.id === groupId);
  if (group) {
    group.parentId = newParentId;
    saveData();
    renderGroups();
  }
}

function getGroupTabsRecursive(groupId) {
  let tabs = savedTabs.filter(t => t.groupId === groupId);
  const childGroups = groups.filter(g => g.parentId === groupId);
  for (const child of childGroups) {
    tabs = tabs.concat(getGroupTabsRecursive(child.id));
  }
  return tabs;
}

function renderSavedTabs(searchQuery) {
  const query = getSearchQuery(searchQuery);
  // Show only ungrouped tabs
  const ungroupedTabs = savedTabs.filter(t => !t.groupId);
  const filtered = filterTabs(ungroupedTabs, query);

  if (filtered.length === 0) {
    savedTabsList.innerHTML = '<div class="empty-state">No saved tabs yet. Click a button above to save tabs.</div>';
    return;
  }

  savedTabsList.innerHTML = filtered.map(tab => createTabHTML(tab)).join('');
  attachTabListeners(savedTabsList);
  attachDragListeners(savedTabsList);
}

async function renderCurrentTabs(searchQuery) {
  const query = getSearchQuery(searchQuery);

  const tabs = await chrome.tabs.query({ currentWindow: true });

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
}

function createCurrentTabHTML(tab) {
  const alreadySaved = savedTabs.some(t => t.url === tab.url);
  return `
    <div class="tab-item current-tab ${alreadySaved ? 'already-saved' : ''}" data-tab-id="${tab.id}" data-url="${escapeHtml(tab.url)}" data-title="${escapeHtml(tab.title)}" data-favicon="${tab.favIconUrl || ''}">
      <img class="tab-favicon" src="${tab.favIconUrl || DEFAULT_FAVICON}" onerror="this.src='${DEFAULT_FAVICON}'" alt="">
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

function saveTabFromCurrent(url, title, favicon) {
  if (savedTabs.some(t => t.url === url)) return;

  const savedTab = {
    id: Date.now() + Math.random(),
    title: title,
    url: url,
    favicon: favicon,
    savedAt: new Date().toISOString(),
    groupId: null
  };

  savedTabs.unshift(savedTab);
  saveData();
}

function createTabHTML(tab, isDaily = false) {
  const isDailyTab = dailyTabs.some(t => t.id === tab.id);

  return `
    <div class="tab-item ${isDaily ? 'daily' : ''}" data-tab-id="${tab.id}" data-url="${escapeHtml(tab.url)}" draggable="true">
      <span class="drag-handle">⋮⋮</span>
      <img class="tab-favicon" src="${tab.favicon || DEFAULT_FAVICON}" onerror="this.src='${DEFAULT_FAVICON}'" alt="">
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

function attachTabListeners(container) {
  container.querySelectorAll('.tab-item').forEach(item => {
    const tabId = parseFloat(item.dataset.tabId);
    const url = item.dataset.url;
    const tab = savedTabs.find(t => t.id === tabId) || dailyTabs.find(t => t.id === tabId);

    // Click to open
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.tab-actions')) {
        openTab(url, false);
      }
    });

    // Right-click for context menu
    item.addEventListener('contextmenu', (e) => {
      if (tab) showContextMenu(e, tab);
    });

    // Open button
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

function filterTabs(tabs, query) {
  if (!query) return tabs;
  return tabs.filter(tab =>
    tab.title.toLowerCase().includes(query) ||
    tab.url.toLowerCase().includes(query)
  );
}

// Drag and Drop
function attachDragListeners(container) {
  container.querySelectorAll('.tab-item[draggable="true"]').forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
  });
}

function handleDragStart(e) {
  const tabItem = e.target.closest('.tab-item');
  if (!tabItem) return;

  const tabId = tabItem.dataset.tabId;
  e.dataTransfer.setData('text/plain', tabId);
  e.dataTransfer.effectAllowed = 'move';
  tabItem.classList.add('dragging');

  // Show drop zones on groups
  document.querySelectorAll('.group-item').forEach(group => {
    group.classList.add('drop-target');
  });
}

function handleDragEnd(e) {
  const tabItem = e.target.closest('.tab-item');
  if (tabItem) tabItem.classList.remove('dragging');
  document.querySelectorAll('.group-item').forEach(group => {
    group.classList.remove('drop-target', 'drag-over');
  });
}

function setupGroupDropZones() {
  groupsList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const groupItem = e.target.closest('.group-item');
    if (groupItem) {
      document.querySelectorAll('.group-item.drag-over').forEach(g => g.classList.remove('drag-over'));
      groupItem.classList.add('drag-over');
    }
  });

  groupsList.addEventListener('dragleave', (e) => {
    const groupItem = e.target.closest('.group-item');
    if (groupItem && !groupItem.contains(e.relatedTarget)) {
      groupItem.classList.remove('drag-over');
    }
  });

  groupsList.addEventListener('drop', (e) => {
    e.preventDefault();
    const groupItem = e.target.closest('.group-item');

    // Check if dropping a group
    const draggedGroupId = e.dataTransfer.getData('application/group-id');
    if (draggedGroupId) {
      if (groupItem) {
        // Dropping onto another group - handled by group's own drop listener
      } else {
        // Dropping onto empty area - move to root
        moveGroupToParent(draggedGroupId, null);
      }
    } else {
      // Dropping a tab
      if (groupItem) {
        const tabId = parseFloat(e.dataTransfer.getData('text/plain'));
        const groupId = groupItem.dataset.groupId;
        moveToGroup(tabId, groupId);
      }
    }

    document.querySelectorAll('.group-item').forEach(g => {
      g.classList.remove('drop-target', 'drag-over');
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Safely extract hostname from URL
function getHostname(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
