/**
 * ============================================================================
 * TEST SETUP
 * ============================================================================
 *
 * Jest setup file that runs before each test file.
 * Provides mocks for Chrome Extension APIs and common test utilities.
 *
 * ============================================================================
 */

// =============================================================================
// CHROME API MOCKS
// =============================================================================

/**
 * Mock storage data store
 * Simulates chrome.storage.sync behavior
 */
const mockStorageData = {};

/**
 * Mock Chrome storage API
 */
const mockStorage = {
  sync: {
    get: jest.fn((keys) => {
      return new Promise((resolve) => {
        if (Array.isArray(keys)) {
          const result = {};
          keys.forEach(key => {
            if (mockStorageData[key] !== undefined) {
              result[key] = mockStorageData[key];
            }
          });
          resolve(result);
        } else if (typeof keys === 'string') {
          const result = {};
          if (mockStorageData[keys] !== undefined) {
            result[keys] = mockStorageData[keys];
          }
          resolve(result);
        } else if (typeof keys === 'object') {
          const result = { ...keys };
          Object.keys(keys).forEach(key => {
            if (mockStorageData[key] !== undefined) {
              result[key] = mockStorageData[key];
            }
          });
          resolve(result);
        } else {
          resolve({ ...mockStorageData });
        }
      });
    }),
    set: jest.fn((items) => {
      return new Promise((resolve) => {
        Object.assign(mockStorageData, items);
        resolve();
      });
    }),
    remove: jest.fn((keys) => {
      return new Promise((resolve) => {
        if (Array.isArray(keys)) {
          keys.forEach(key => delete mockStorageData[key]);
        } else {
          delete mockStorageData[keys];
        }
        resolve();
      });
    }),
    clear: jest.fn(() => {
      return new Promise((resolve) => {
        Object.keys(mockStorageData).forEach(key => delete mockStorageData[key]);
        resolve();
      });
    })
  },
  onChanged: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  }
};

/**
 * Mock Chrome tabs API
 */
const mockTabs = {
  query: jest.fn(() => Promise.resolve([])),
  create: jest.fn((options) => Promise.resolve({ id: Date.now(), ...options })),
  update: jest.fn((tabId, options) => Promise.resolve({ id: tabId, ...options })),
  remove: jest.fn(() => Promise.resolve()),
  get: jest.fn((tabId) => Promise.resolve({ id: tabId, url: 'https://example.com', title: 'Example' })),
  onCreated: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  },
  onRemoved: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  },
  onUpdated: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  },
  onMoved: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  },
  onActivated: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  }
};

/**
 * Mock Chrome windows API
 */
const mockWindows = {
  update: jest.fn(() => Promise.resolve()),
  getCurrent: jest.fn(() => Promise.resolve({ id: 1 }))
};

/**
 * Mock Chrome alarms API
 */
const mockAlarms = {
  create: jest.fn((name, options, callback) => {
    if (callback) callback();
  }),
  clear: jest.fn((name, callback) => {
    if (callback) callback(true);
    return Promise.resolve(true);
  }),
  getAll: jest.fn((callback) => {
    if (callback) callback([]);
    return Promise.resolve([]);
  }),
  onAlarm: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  }
};

/**
 * Mock Chrome notifications API
 */
const mockNotifications = {
  create: jest.fn((id, options, callback) => {
    if (callback) callback(id);
    return id;
  }),
  clear: jest.fn((id, callback) => {
    if (callback) callback(true);
    return Promise.resolve(true);
  }),
  getPermissionLevel: jest.fn((callback) => {
    if (callback) callback('granted');
  }),
  onClicked: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  },
  onButtonClicked: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  }
};

/**
 * Mock Chrome runtime API
 */
const mockRuntime = {
  getURL: jest.fn((path) => `chrome-extension://mock-id/${path}`),
  lastError: null,
  sendMessage: jest.fn(),
  onMessage: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  }
};

/**
 * Mock Chrome action API
 */
const mockAction = {
  onClicked: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  }
};

/**
 * Mock Chrome sidePanel API
 */
const mockSidePanel = {
  open: jest.fn(() => Promise.resolve()),
  setPanelBehavior: jest.fn(() => Promise.resolve())
};

/**
 * Mock Chrome scripting API
 */
const mockScripting = {
  executeScript: jest.fn(() => Promise.resolve([]))
};

/**
 * Complete Chrome API mock
 */
global.chrome = {
  storage: mockStorage,
  tabs: mockTabs,
  windows: mockWindows,
  alarms: mockAlarms,
  notifications: mockNotifications,
  runtime: mockRuntime,
  action: mockAction,
  sidePanel: mockSidePanel,
  scripting: mockScripting
};

// =============================================================================
// DOM MOCKS
// =============================================================================

/**
 * Creates a mock DOM structure for testing
 */
function createMockDOM() {
  document.body.innerHTML = `
    <div class="container">
      <header class="header">
        <input type="text" id="searchInput" placeholder="Search tabs...">
        <button id="settingsBtn">Settings</button>
      </header>

      <div class="actions">
        <button id="saveCurrentTab">Save Current Tab</button>
        <button id="pickFromWindow">From Window</button>
        <button id="pickFromAllWindows">All Windows</button>
      </div>

      <!-- Tab Picker Modal -->
      <div id="tabPickerModal" class="modal hidden">
        <div class="modal-content">
          <div id="tabPickerList"></div>
          <select id="pickerGroupSelect"></select>
          <div id="pickerNewGroupInput" class="hidden">
            <input type="text" id="pickerNewGroupName">
          </div>
          <button id="selectAllTabs">Select All</button>
          <button id="deselectAllTabs">Deselect All</button>
          <button id="saveSelectedTabs">Save</button>
          <button id="cancelPicker">Cancel</button>
        </div>
      </div>

      <!-- Sections -->
      <div class="section">
        <button id="openPinnedTabs">Open All</button>
        <div id="pinnedTabsList" class="tabs-list"></div>
      </div>

      <div class="section">
        <button id="openDailyTabs">Open All</button>
        <div id="dailyTabsList" class="tabs-list"></div>
      </div>

      <div class="section">
        <button id="testNotification">Test Notif</button>
        <button id="testAlarm">Test Alarm</button>
        <div id="timedTabsList" class="tabs-list"></div>
      </div>

      <div class="section">
        <div id="dueSoonList" class="due-soon-container">
          <div class="due-soon-category" data-category="overdue">
            <div class="category-header"><span class="category-count" id="overdueCount">0</span></div>
            <div class="category-tabs" id="overdueList"></div>
          </div>
          <div class="due-soon-category" data-category="today">
            <div class="category-header"><span class="category-count" id="todayCount">0</span></div>
            <div class="category-tabs" id="todayList"></div>
          </div>
          <div class="due-soon-category" data-category="tomorrow">
            <div class="category-header"><span class="category-count" id="tomorrowCount">0</span></div>
            <div class="category-tabs" id="tomorrowList"></div>
          </div>
          <div class="due-soon-category" data-category="thisWeek">
            <div class="category-header"><span class="category-count" id="thisWeekCount">0</span></div>
            <div class="category-tabs" id="thisWeekList"></div>
          </div>
          <div class="due-soon-category" data-category="later">
            <div class="category-header"><span class="category-count" id="laterCount">0</span></div>
            <div class="category-tabs" id="laterList"></div>
          </div>
        </div>
      </div>

      <div class="section">
        <button id="createGroup">+ Group</button>
        <div id="groupsList" class="groups-list"></div>
      </div>

      <div class="section">
        <div id="savedTabsList" class="tabs-list"></div>
      </div>

      <div class="section">
        <div id="currentTabsList" class="tabs-list"></div>
      </div>

      <!-- Group Modal -->
      <div id="groupModal" class="modal hidden">
        <h3 id="modalTitle">Create Group</h3>
        <input type="text" id="groupNameInput">
        <button id="saveGroup">Save</button>
        <button id="cancelGroup">Cancel</button>
      </div>

      <!-- Context Menu -->
      <div id="contextMenu" class="context-menu hidden">
        <button class="context-item" data-action="open">Open</button>
        <button class="context-item" data-action="openNew">Open in new tab</button>
        <button class="context-item" data-action="pinTab">Pin Tab</button>
        <button class="context-item" data-action="unpinTab">Unpin Tab</button>
        <button class="context-item" data-action="addToDaily">Add to Daily</button>
        <button class="context-item" data-action="removeFromDaily">Remove from Daily</button>
        <button class="context-item" data-action="setReminder">Set Reminder</button>
        <button class="context-item" data-action="removeReminder">Remove Reminder</button>
        <button class="context-item" data-action="setTimer">Set Timer</button>
        <button class="context-item" data-action="removeTimer">Remove Timer</button>
        <button class="context-item" data-action="moveToGroup">Move to Group</button>
        <button class="context-item" data-action="delete">Delete</button>
      </div>

      <!-- Reminder Modal -->
      <div id="reminderModal" class="modal hidden">
        <input type="date" id="reminderDateInput">
        <input type="time" id="reminderTimeInput">
        <button id="saveReminder">Save</button>
        <button id="cancelReminder">Cancel</button>
      </div>

      <!-- Timer Modal -->
      <div id="timerModal" class="modal hidden">
        <input type="number" id="timerHours" value="0">
        <input type="number" id="timerMinutes" value="30">
        <button id="saveTimer">Start Timer</button>
        <button id="cancelTimer">Cancel</button>
      </div>

      <!-- Settings Modal -->
      <div id="settingsModal" class="modal hidden">
        <input type="radio" name="theme" value="light">
        <input type="radio" name="theme" value="dark">
        <input type="radio" name="theme" value="system">
        <button id="closeSettings">Done</button>
      </div>
    </div>
  `;
}

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Creates a mock tab object
 */
function createMockTab(overrides = {}) {
  return {
    id: Date.now() + Math.random(),
    title: 'Test Tab',
    url: 'https://example.com/test',
    favicon: 'https://example.com/favicon.ico',
    savedAt: new Date().toISOString(),
    groupId: null,
    ...overrides
  };
}

/**
 * Creates a mock Chrome tab object (from tabs API)
 */
function createMockChromeTab(overrides = {}) {
  return {
    id: Math.floor(Math.random() * 10000),
    title: 'Chrome Tab',
    url: 'https://example.com',
    favIconUrl: 'https://example.com/favicon.ico',
    windowId: 1,
    active: false,
    ...overrides
  };
}

/**
 * Creates a mock group object
 */
function createMockGroup(overrides = {}) {
  return {
    id: Date.now().toString(),
    name: 'Test Group',
    expanded: true,
    parentId: null,
    ...overrides
  };
}

/**
 * Creates a mock timed tab object
 */
function createMockTimedTab(overrides = {}) {
  const baseTab = createMockTab();
  return {
    ...baseTab,
    timerEnd: Date.now() + 60000, // 1 minute from now
    timerDuration: 60000,
    ...overrides
  };
}

/**
 * Clears all mock storage data
 */
function clearMockStorage() {
  Object.keys(mockStorageData).forEach(key => delete mockStorageData[key]);
}

/**
 * Sets mock storage data
 */
function setMockStorage(data) {
  Object.assign(mockStorageData, data);
}

/**
 * Gets current mock storage data
 */
function getMockStorage() {
  return { ...mockStorageData };
}

/**
 * Resets all mocks
 */
function resetAllMocks() {
  jest.clearAllMocks();
  clearMockStorage();
}

/**
 * Waits for promises to resolve
 */
function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Export utilities for tests
global.testUtils = {
  createMockDOM,
  createMockTab,
  createMockChromeTab,
  createMockGroup,
  createMockTimedTab,
  clearMockStorage,
  setMockStorage,
  getMockStorage,
  resetAllMocks,
  flushPromises,
  mockStorageData
};

// Reset before each test
beforeEach(() => {
  resetAllMocks();
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-theme');
});
