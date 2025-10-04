/**
 * BlockedAds Chrome Extension Unit Tests
 * Tests core functionality of the ad blocking engine
 */

// Import the source files
const fs = require('fs');
const path = require('path');

// Load the source code
const coreCode = fs.readFileSync(path.join(__dirname, '../blockedads-mvp-chrome/blockedads-core.js'), 'utf8');
const popupCode = fs.readFileSync(path.join(__dirname, '../blockedads-mvp-chrome/popup/blockedads-popup.js'), 'utf8');

// Execute the source code to make classes available
eval(coreCode);
eval(popupCode);

// Mock Chrome APIs for testing
const mockChrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    },
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    getURL: jest.fn((path) => `chrome-extension://test/${path}`),
    sendMessage: jest.fn()
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  },
  declarativeNetRequest: {
    updateDynamicRules: jest.fn()
  }
};

global.chrome = mockChrome;

// Mock fetch for filter loading
global.fetch = jest.fn();

describe('BlockedAds Filter Engine', () => {
  let filterEngine;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock successful filter loading
    global.fetch.mockResolvedValue({
      text: () => Promise.resolve(`
        ! Test filter list
        ||googleadservices.com^
        ||doubleclick.net^
        ##.advertisement
        ##div[class*="ad"]
        @@||google.com/recaptcha^
      `)
    });
    
    // Mock storage responses
    mockChrome.storage.sync.get.mockResolvedValue({
      isEnabled: true,
      whitelist: []
    });
    
    filterEngine = new BlockedAdsFilterEngine();
  });
  
  describe('Initialization', () => {
    test('should initialize with default settings', async () => {
      await filterEngine.init();
      
      expect(filterEngine.isEnabled).toBe(true);
      expect(filterEngine.whitelist).toEqual(new Set());
      expect(filterEngine.stats.adsBlocked).toBe(0);
    });
    
    test('should load filter rules from EasyList', async () => {
      await filterEngine.init();
      
      expect(global.fetch).toHaveBeenCalledWith(
        'chrome-extension://test/filters/blockedads-easylist.txt'
      );
      expect(filterEngine.rules.length).toBeGreaterThan(0);
      expect(filterEngine.elementRules.length).toBeGreaterThan(0);
    });
    
    test('should fallback to basic rules on filter load failure', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));
      
      await filterEngine.init();
      
      expect(filterEngine.rules.length).toBeGreaterThan(0);
      expect(filterEngine.rules.some(rule => 
        rule.pattern.includes('googleadservices.com')
      )).toBe(true);
    });
  });
  
  describe('URL Blocking', () => {
    beforeEach(async () => {
      await filterEngine.init();
    });
    
    test('should block Google Ads URLs', () => {
      const shouldBlock = filterEngine.shouldBlockUrl('https://googleadservices.com/pagead/ads');
      expect(shouldBlock).toBe(true);
    });
    
    test('should block DoubleClick URLs', () => {
      const shouldBlock = filterEngine.shouldBlockUrl('https://doubleclick.net/ads');
      expect(shouldBlock).toBe(true);
    });
    
    test('should not block legitimate URLs', () => {
      const shouldBlock = filterEngine.shouldBlockUrl('https://google.com/search');
      expect(shouldBlock).toBe(false);
    });
    
    test('should respect whitelist', () => {
      filterEngine.whitelist.add('googleadservices.com');
      
      const shouldBlock = filterEngine.shouldBlockUrl('https://googleadservices.com/pagead/ads');
      expect(shouldBlock).toBe(false);
    });
    
    test('should respect exception rules', () => {
      const shouldBlock = filterEngine.shouldBlockUrl('https://google.com/recaptcha');
      expect(shouldBlock).toBe(false);
    });
    
    test('should not block when disabled', () => {
      filterEngine.isEnabled = false;
      
      const shouldBlock = filterEngine.shouldBlockUrl('https://googleadservices.com/pagead/ads');
      expect(shouldBlock).toBe(false);
    });
  });
  
  describe('Pattern Matching', () => {
    test('should convert wildcard patterns to regex', () => {
      const rule = filterEngine.createRule('||example.com^');
      expect(rule.regex.test('https://example.com/path')).toBe(true);
      expect(rule.regex.test('https://subdomain.example.com/path')).toBe(true);
      expect(rule.regex.test('https://other.com/path')).toBe(false);
    });
    
    test('should handle complex patterns', () => {
      const rule = filterEngine.createRule('||ads*.example.com^');
      expect(rule.regex.test('https://ads.example.com/path')).toBe(true);
      expect(rule.regex.test('https://ads123.example.com/path')).toBe(true);
      expect(rule.regex.test('https://example.com/path')).toBe(false);
    });
  });
  
  describe('Statistics', () => {
    beforeEach(async () => {
      await filterEngine.init();
    });
    
    test('should increment ads blocked counter', () => {
      const initialCount = filterEngine.stats.adsBlocked;
      
      filterEngine.shouldBlockUrl('https://googleadservices.com/ads');
      
      expect(filterEngine.stats.adsBlocked).toBe(initialCount + 1);
    });
    
    test('should calculate data saved', () => {
      filterEngine.stats.adsBlocked = 10;
      filterEngine.updateStats();
      
      expect(filterEngine.stats.dataSaved).toBe(0.5); // 10 * 0.05 MB
    });
  });
  
  describe('Whitelist Management', () => {
    beforeEach(async () => {
      await filterEngine.init();
    });
    
    test('should add domain to whitelist', async () => {
      await filterEngine.addToWhitelist('example.com');
      
      expect(filterEngine.whitelist.has('example.com')).toBe(true);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        whitelist: ['example.com']
      });
    });
    
    test('should remove domain from whitelist', async () => {
      filterEngine.whitelist.add('example.com');
      
      await filterEngine.removeFromWhitelist('example.com');
      
      expect(filterEngine.whitelist.has('example.com')).toBe(false);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        whitelist: []
      });
    });
  });
  
  describe('Toggle Functionality', () => {
    beforeEach(async () => {
      await filterEngine.init();
    });
    
    test('should toggle blocking on', async () => {
      filterEngine.isEnabled = false;
      
      await filterEngine.toggleBlocking(true);
      
      expect(filterEngine.isEnabled).toBe(true);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        isEnabled: true
      });
    });
    
    test('should toggle blocking off', async () => {
      await filterEngine.toggleBlocking(false);
      
      expect(filterEngine.isEnabled).toBe(false);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        isEnabled: false
      });
    });
  });
});

describe('BlockedAds Popup', () => {
  let popup;
  
  beforeEach(() => {
    // Mock DOM elements
    document.body.innerHTML = `
      <div id="adsBlocked">0</div>
      <div id="dataSaved">0</div>
      <input id="blockingToggle" type="checkbox">
      <div id="currentDomain">-</div>
      <div id="whitelistList"></div>
      <input id="whitelistInput" type="text">
    `;
    
    // Mock chrome.tabs.query
    mockChrome.tabs.query.mockResolvedValue([{
      id: 1,
      url: 'https://example.com/page'
    }]);
    
    popup = new BlockedAdsPopup();
  });
  
  describe('Initialization', () => {
    test('should load settings on init', async () => {
      await popup.init();
      
      expect(mockChrome.storage.sync.get).toHaveBeenCalledWith({
        isEnabled: true,
        whitelist: []
      });
    });
    
    test('should get current tab domain', async () => {
      await popup.init();
      
      expect(mockChrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true
      });
      expect(popup.currentDomain).toBe('example.com');
    });
  });
  
  describe('UI Updates', () => {
    test('should update statistics display', () => {
      popup.stats = { adsBlocked: 10, dataSaved: 0.5 };
      popup.updateUI();
      
      expect(document.getElementById('adsBlocked').textContent).toBe('10');
      expect(document.getElementById('dataSaved').textContent).toBe('0.5');
    });
    
    test('should update status indicator', () => {
      popup.isEnabled = true;
      popup.updateUI();
      
      const statusDot = document.querySelector('.status-dot');
      expect(statusDot.classList.contains('active')).toBe(true);
    });
  });
  
  describe('Domain Validation', () => {
    test('should validate correct domain format', () => {
      expect(popup.isValidDomain('example.com')).toBe(true);
      expect(popup.isValidDomain('subdomain.example.com')).toBe(true);
      expect(popup.isValidDomain('example.co.uk')).toBe(true);
    });
    
    test('should reject invalid domain format', () => {
      expect(popup.isValidDomain('invalid')).toBe(false);
      expect(popup.isValidDomain('')).toBe(false);
      expect(popup.isValidDomain('example.')).toBe(false);
    });
  });
});

describe('Performance Tests', () => {
  test('should process URLs quickly', async () => {
    const filterEngine = new BlockedAdsFilterEngine();
    await filterEngine.init();
    
    const startTime = performance.now();
    
    // Test 1000 URL checks
    for (let i = 0; i < 1000; i++) {
      filterEngine.shouldBlockUrl(`https://example${i}.com/ads`);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should complete in less than 100ms
    expect(duration).toBeLessThan(100);
  });
  
  test('should use minimal memory', async () => {
    const filterEngine = new BlockedAdsFilterEngine();
    await filterEngine.init();
    
    // Check that memory usage is reasonable
    const memoryUsage = process.memoryUsage();
    expect(memoryUsage.heapUsed).toBeLessThan(50 * 1024 * 1024); // 50MB
  });
});
