// Tab Saver - Side Panel JavaScript

// State
let savedTabs = [];
let groups = [];
let dailyTabs = [];
let pinnedTabs = [];
let selectedTab = null;

// DOM Elements (initialized after DOM loads)
let searchInput, saveCurrentTabBtn, pickFromWindowBtn, pickFromAllWindowsBtn, openDailyTabsBtn;
let tabPickerModal, tabPickerList, selectAllTabsBtn, deselectAllTabsBtn, saveSelectedTabsBtn, cancelPickerBtn;
let createGroupBtn, pinnedTabsList, openPinnedTabsBtn, dailyTabsList, groupsList, savedTabsList, currentTabsList;
let groupModal, modalTitle, groupNameInput, saveGroupBtn, cancelGroupBtn, contextMenu;
let remindersList, reminderModal, reminderInput, saveReminderBtn, cancelReminderBtn;

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

  remindersList = document.getElementById('remindersList');
  reminderModal = document.getElementById('reminderModal');
  reminderInput = document.getElementById('reminderInput');
  saveReminderBtn = document.getElementById('saveReminder');
  cancelReminderBtn = document.getElementById('cancelReminder');

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
  const result = await chrome.storage.sync.get(['savedTabs', 'groups', 'dailyTabs', 'pinnedTabs']);
  savedTabs = result.savedTabs || [];
  groups = result.groups || [];
  dailyTabs = result.dailyTabs || [];
  pinnedTabs = result.pinnedTabs || [];
}

async function saveData() {
  await chrome.storage.sync.set({ savedTabs, groups, dailyTabs, pinnedTabs });
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
      <img class="picker-favicon" src="${tab.favIconUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23ddd%22 width=%2216%22 height=%2216%22 rx=%222%22/></svg>'}" alt="">
      <div class="picker-info">
        <div class="picker-title">${escapeHtml(tab.title)}${alreadySaved ? ' (saved)' : ''}</div>
        <div class="picker-url">${escapeHtml(new URL(tab.url).hostname)}</div>
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

  // Set default to tomorrow at 9 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const tab = savedTabs.find(t => t.id === tabId);
  if (tab && tab.reminder) {
    reminderInput.value = new Date(tab.reminder).toISOString().slice(0, 16);
  } else {
    reminderInput.value = tomorrow.toISOString().slice(0, 16);
  }

  reminderModal.classList.remove('hidden');
  reminderInput.focus();
}

function hideReminderModal() {
  reminderModal.classList.add('hidden');
  reminderModal.dataset.tabId = '';
}

function handleSaveReminder() {
  const tabId = parseFloat(reminderModal.dataset.tabId);
  const reminder = reminderInput.value;

  if (!reminder) return;

  const tab = savedTabs.find(t => t.id === tabId);
  if (tab) {
    tab.reminder = new Date(reminder).toISOString();
    saveData();
    renderAll();
  }

  hideReminderModal();
}

function removeReminder(tabId) {
  const tab = savedTabs.find(t => t.id === tabId);
  if (tab) {
    delete tab.reminder;
    saveData();
    renderAll();
  }
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

  // Show/hide relevant menu items
  const addToDailyItem = contextMenu.querySelector('[data-action="addToDaily"]');
  const removeFromDailyItem = contextMenu.querySelector('[data-action="removeFromDaily"]');
  const pinTabItem = contextMenu.querySelector('[data-action="pinTab"]');
  const unpinTabItem = contextMenu.querySelector('[data-action="unpinTab"]');
  const setReminderItem = contextMenu.querySelector('[data-action="setReminder"]');
  const removeReminderItem = contextMenu.querySelector('[data-action="removeReminder"]');

  addToDailyItem.style.display = isDaily ? 'none' : 'block';
  removeFromDailyItem.style.display = isDaily ? 'block' : 'none';
  pinTabItem.style.display = isPinned ? 'none' : 'block';
  unpinTabItem.style.display = isPinned ? 'block' : 'none';
  setReminderItem.style.display = hasReminder ? 'none' : 'block';
  removeReminderItem.style.display = hasReminder ? 'block' : 'none';

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
  renderReminders(query);
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

  if (filtered.length === 0) {
    pinnedTabsList.innerHTML = '<div class="empty-state">No pinned tabs. Right-click a tab to pin it.</div>';
    return;
  }

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
      <img class="tab-favicon" src="${tab.favicon || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23ddd%22 width=%2216%22 height=%2216%22 rx=%222%22/></svg>'}" alt="">
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-url">${escapeHtml(new URL(tab.url).hostname)}</div>
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

  if (filtered.length === 0) {
    dailyTabsList.innerHTML = '<div class="empty-state">No daily tabs. Right-click a tab to add it.</div>';
    return;
  }

  dailyTabsList.innerHTML = filtered.map(tab => createTabHTML(tab, true)).join('');
  attachTabListeners(dailyTabsList);
}

function renderReminders(searchQuery) {
  const query = getSearchQuery(searchQuery);
  // Get all tabs with reminders, sorted by reminder time
  const tabsWithReminders = savedTabs
    .filter(t => t.reminder)
    .sort((a, b) => new Date(a.reminder) - new Date(b.reminder));

  const filtered = filterTabs(tabsWithReminders, query);

  if (filtered.length === 0) {
    remindersList.innerHTML = '<div class="empty-state">No reminders. Right-click a tab to set one.</div>';
    return;
  }

  remindersList.innerHTML = filtered.map(tab => createReminderTabHTML(tab)).join('');
  attachTabListeners(remindersList);
  attachReminderEditListeners(remindersList);
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

function createReminderTabHTML(tab) {
  const reminder = new Date(tab.reminder);
  const now = new Date();
  const isOverdue = reminder < now;
  const isToday = reminder.toDateString() === now.toDateString();

  let reminderText;
  const diffMs = reminder - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (isOverdue) {
    reminderText = 'Overdue';
  } else if (isToday) {
    reminderText = 'Today ' + reminder.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    reminderText = 'Tomorrow ' + reminder.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays <= 7) {
    reminderText = reminder.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  } else {
    reminderText = reminder.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return `
    <div class="tab-item reminder-tab ${isOverdue ? 'overdue' : ''}" data-tab-id="${tab.id}" data-url="${escapeHtml(tab.url)}" draggable="true">
      <span class="drag-handle">⋮⋮</span>
      <img class="tab-favicon" src="${tab.favicon || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23ddd%22 width=%2216%22 height=%2216%22 rx=%222%22/></svg>'}" alt="">
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
      <img class="tab-favicon" src="${tab.favIconUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23ddd%22 width=%2216%22 height=%2216%22 rx=%222%22/></svg>'}" alt="">
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-url">${escapeHtml(new URL(tab.url).hostname)}</div>
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
      <img class="tab-favicon" src="${tab.favicon || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect fill=%22%23ddd%22 width=%2216%22 height=%2216%22 rx=%222%22/></svg>'}" alt="">
      <div class="tab-info">
        <div class="tab-title">${escapeHtml(tab.title)}</div>
        <div class="tab-url">${escapeHtml(new URL(tab.url).hostname)}</div>
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
