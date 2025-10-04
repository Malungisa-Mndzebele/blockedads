/**
 * Jest Test Setup for BlockedAds
 * Configures test environment and mocks
 */

// This is a setup file, not a test file

// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    },
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }
  },
  runtime: {
    getURL: jest.fn((path) => `chrome-extension://test/${path}`),
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    onUpdated: {
      addListener: jest.fn()
    }
  },
  declarativeNetRequest: {
    updateDynamicRules: jest.fn()
  },
  action: {
    onClicked: {
      addListener: jest.fn()
    }
  },
  scripting: {
    executeScript: jest.fn()
  }
};

// Mock fetch API
global.fetch = jest.fn();

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now())
};

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Setup DOM environment
document.body.innerHTML = `
  <div id="adsBlocked">0</div>
  <div id="dataSaved">0</div>
  <input id="blockingToggle" type="checkbox">
  <div id="currentDomain">-</div>
  <div id="whitelistList"></div>
  <input id="whitelistInput" type="text">
  <div class="status-dot"></div>
  <span class="status-text">Active</span>
`;

// Mock URL constructor
global.URL = class URL {
  constructor(url) {
    this.href = url;
    this.hostname = new URL(url).hostname;
  }
  
  static createObjectURL() {
    return 'blob:mock-url';
  }
  
  static revokeObjectURL() {}
};

// Setup test utilities
global.testUtils = {
  createMockTab: (url = 'https://example.com') => ({
    id: 1,
    url: url,
    title: 'Test Page',
    active: true
  }),
  
  createMockRequest: (url) => ({
    getUrl: () => ({ toString: () => url })
  }),
  
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Global test timeout
jest.setTimeout(10000);
