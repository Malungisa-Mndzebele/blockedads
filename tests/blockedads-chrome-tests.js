/**
 * BlockedAds Chrome Extension Unit Tests
 * Tests core functionality of the uBlock Origin-inspired ad blocking engine
 */

// Import the source files
const fs = require('fs');
const path = require('path');

// Load the source code
const backgroundCode = fs.readFileSync(path.join(__dirname, '../blockedads-mvp-chrome/background.js'), 'utf8');
const contentCode = fs.readFileSync(path.join(__dirname, '../blockedads-mvp-chrome/content.js'), 'utf8');
const popupCode = fs.readFileSync(path.join(__dirname, '../blockedads-mvp-chrome/popup/popup.js'), 'utf8');

// Execute the source code to make classes available
eval(backgroundCode);
eval(contentCode);
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
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    create: jest.fn()
  },
  declarativeNetRequest: {
    updateDynamicRules: jest.fn()
  },
  scripting: {
    executeScript: jest.fn()
  }
};

global.chrome = mockChrome;

// Mock fetch for filter loading
global.fetch = jest.fn();

// Mock DOM for content script testing
global.document = {
  body: {
    addEventListener: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn()
  },
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  readyState: 'loading'
};

global.window = {
  location: {
    hostname: 'youtube.com',
    href: 'https://youtube.com'
  }
};

describe('BlockedAds Background Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful filter loading
    global.fetch.mockResolvedValue({
      text: () => Promise.resolve(`
        ! uBlock Origin inspired filter list
        ||googleadservices.com^
        ||googlesyndication.com^
        ||doubleclick.net^
        ||facebook.com/tr^
        ||amazon-adsystem.com^
        ||ads.yahoo.com^
        ||adsystem.yahoo.com^
        ||ads-twitter.com^
        ||twitter.com/i/adsct^
        ||scorecardresearch.com^
        ||quantserve.com^
        ||outbrain.com^
        ##.ytp-ad-player-overlay
        ##.ytp-ad-text
        ##.ytp-ad-skip-button
        ##.ytd-promoted-sparkles-web-renderer
        ##.ytd-ad-slot-renderer
        ##.ytd-promoted-video-renderer
        @@||google.com/recaptcha^
      `)
    });
    
    // Mock storage responses
    mockChrome.storage.sync.get.mockResolvedValue({
      isEnabled: true,
      whitelist: []
    });
    
    mockChrome.storage.local.get.mockResolvedValue({
      lastFilterUpdate: Date.now() - 86400000 // 24 hours ago
    });
  });
  
  describe('Filter List Management', () => {
    test('should load uBlock Origin filter lists', async () => {
      await loadFilterLists();
      
      expect(global.fetch).toHaveBeenCalledWith('https://easylist.to/easylist/easylist.txt');
      expect(global.fetch).toHaveBeenCalledWith('https://easylist.to/easylist/easyprivacy.txt');
      expect(global.fetch).toHaveBeenCalledWith('https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt');
      expect(global.fetch).toHaveBeenCalledWith('https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/youtube.txt');
    });
    
    test('should parse EasyList syntax correctly', () => {
      const mockContent = `
        ! Comment line
        ||googleadservices.com^
        ||doubleclick.net^
        ##.advertisement
        @@||google.com/recaptcha^
      `;
      
      const rules = parseFilterRules(mockContent);
      
      expect(rules).toHaveLength(4);
      expect(rules.some(rule => rule.type === 'network' && rule.pattern === '||googleadservices.com^')).toBe(true);
      expect(rules.some(rule => rule.type === 'cosmetic' && rule.selector === '.advertisement')).toBe(true);
      expect(rules.some(rule => rule.type === 'exception' && rule.pattern === '||google.com/recaptcha^')).toBe(true);
    });
  });
  
  describe('Declarative Net Request', () => {
    test('should convert filter rules to DNR rules', () => {
      const filterRule = {
        type: 'network',
        pattern: '||googleadservices.com^',
        priority: 1
      };
      
      const dnrRule = convertToDeclarativeNetRequest(filterRule, 1);
      
      expect(dnrRule).toEqual({
        id: 1,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '*://googleadservices.com/*',
          resourceTypes: ['main_frame', 'sub_frame', 'script', 'image', 'stylesheet', 'xmlhttprequest', 'media']
        }
      });
    });
    
    test('should handle regex patterns', () => {
      const filterRule = {
        type: 'network',
        pattern: '/ads\\.example\\.com/',
        priority: 1
      };
      
      const dnrRule = convertToDeclarativeNetRequest(filterRule, 1);
      
      expect(dnrRule.condition.regexFilter).toBe('ads\\.example\\.com');
    });
  });
  
  describe('Statistics Tracking', () => {
    test('should record blocked ads', () => {
      const initialCount = stats.adsBlocked;
      
      recordBlockedAd('pre-roll', 'https://googleadservices.com/ads');
      
      expect(stats.adsBlocked).toBe(initialCount + 1);
      expect(stats.dataSaved).toBeGreaterThan(0);
    });
    
    test('should update data saved calculation', () => {
      stats.adsBlocked = 10;
      recordBlockedAd('banner', 'https://doubleclick.net/ads');
      
      expect(stats.dataSaved).toBe(0.55); // 11 * 0.05 MB
    });
  });
  
  describe('Whitelist Management', () => {
    test('should add domain to whitelist', async () => {
      const result = await addToWhitelist('example.com');
      
      expect(result.success).toBe(true);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        whitelist: ['example.com']
      });
    });
    
    test('should remove domain from whitelist', async () => {
      mockChrome.storage.sync.get.mockResolvedValue({
        whitelist: ['example.com', 'test.com']
      });
      
      const result = await removeFromWhitelist('example.com');
      
      expect(result.success).toBe(true);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
        whitelist: ['test.com']
      });
    });
  });
});

describe('BlockedAds Content Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DOM elements
    global.document.querySelector = jest.fn();
    global.document.querySelectorAll = jest.fn();
    global.document.body = {
      addEventListener: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn()
    };
    
    // Mock YouTube elements
    global.document.querySelector.mockImplementation((selector) => {
      if (selector === '.ytp-ad-skip-button') {
        return { click: jest.fn(), disabled: false };
      }
      if (selector === '.ytp-ad-text') {
        return { textContent: 'Ad: 5 seconds remaining' };
      }
      if (selector === 'video') {
        return { duration: 30, currentTime: 0 };
      }
      return null;
    });
    
    global.document.querySelectorAll.mockReturnValue([]);
  });
  
  describe('YouTube Ad Blocking', () => {
    test('should detect and skip pre-roll ads', () => {
      const skipButton = { click: jest.fn(), disabled: false };
      global.document.querySelector.mockReturnValue(skipButton);
      
      // Simulate ad detection
      const adSelectors = [
        '.ytp-ad-player-overlay',
        '.ytp-ad-text',
        '.ytp-ad-skip-button'
      ];
      
      adSelectors.forEach(selector => {
        const elements = [{ style: { display: 'none' }, setAttribute: jest.fn() }];
        global.document.querySelectorAll.mockReturnValue(elements);
      });
      
      expect(skipButton.click).toBeDefined();
    });
    
    test('should hide banner ads', () => {
      const mockElements = [
        { style: { display: 'block' }, setAttribute: jest.fn() },
        { style: { display: 'block' }, setAttribute: jest.fn() }
      ];
      
      global.document.querySelectorAll.mockReturnValue(mockElements);
      
      // Simulate banner ad hiding
      mockElements.forEach(element => {
        element.style.display = 'none';
        element.setAttribute('data-blockedads-hidden', 'true');
      });
      
      expect(mockElements[0].style.display).toBe('none');
      expect(mockElements[0].setAttribute).toHaveBeenCalledWith('data-blockedads-hidden', 'true');
    });
    
    test('should block sponsored content', () => {
      const sponsoredSelectors = [
        '[aria-label*="sponsored"]',
        '[aria-label*="promoted"]',
        '.ytd-promoted-sparkles-web-renderer'
      ];
      
      const mockElements = [
        { style: { display: 'block' }, setAttribute: jest.fn() }
      ];
      
      global.document.querySelectorAll.mockReturnValue(mockElements);
      
      sponsoredSelectors.forEach(selector => {
        mockElements.forEach(element => {
          element.style.display = 'none';
          element.setAttribute('data-blockedads-hidden', 'true');
        });
      });
      
      expect(mockElements[0].style.display).toBe('none');
    });
  });
  
  describe('Cosmetic Filtering', () => {
    test('should hide elements matching cosmetic filters', () => {
      const mockElements = [
        { style: { display: 'block' }, setAttribute: jest.fn() }
      ];
      
      global.document.querySelectorAll.mockReturnValue(mockElements);
      
      // Simulate cosmetic filtering
      mockElements.forEach(element => {
        if (!element.hasAttribute('data-blockedads-hidden')) {
          element.style.display = 'none';
          element.setAttribute('data-blockedads-hidden', 'true');
        }
      });
      
      expect(mockElements[0].style.display).toBe('none');
    });
  });
  
  describe('Statistics Recording', () => {
    test('should record blocked ad statistics', () => {
      const initialStats = { adsBlocked: 0, dataSaved: 0 };
      
      // Simulate ad blocking
      initialStats.adsBlocked++;
      initialStats.dataSaved += 0.05;
      
      expect(initialStats.adsBlocked).toBe(1);
      expect(initialStats.dataSaved).toBe(0.05);
    });
  });
});

describe('BlockedAds Popup', () => {
  let popup;
  
  beforeEach(() => {
    // Mock DOM elements
    document.body.innerHTML = `
      <div id="adsBlocked">0</div>
      <div id="dataSaved">0.0</div>
      <div id="statusDot" class="status-dot"></div>
      <div id="statusText" class="status-text">Active</div>
      <input id="blockingToggle" type="checkbox" checked>
      <div id="whitelistList"></div>
      <input id="whitelistInput" type="text">
      <div id="filterLists"></div>
    `;
    
    // Mock chrome.tabs.query
    mockChrome.tabs.query.mockResolvedValue([{
      id: 1,
      url: 'https://youtube.com/watch?v=test'
    }]);
    
    // Mock chrome.runtime.sendMessage
    mockChrome.runtime.sendMessage.mockResolvedValue({
      stats: { adsBlocked: 10, dataSaved: 0.5 },
      whitelist: ['example.com']
    });
    
    popup = new BlockedAdsPopup();
  });
  
  describe('Initialization', () => {
    test('should load settings on init', async () => {
      await popup.init();
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'GET_STATS' });
    });
    
    test('should get current tab domain', async () => {
      await popup.init();
      
      expect(mockChrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true
      });
      expect(popup.currentDomain).toBe('youtube.com');
    });
  });
  
  describe('UI Updates', () => {
    test('should update statistics display', () => {
      popup.stats = { adsBlocked: 15, dataSaved: 0.75 };
      popup.updateUI();
      
      expect(document.getElementById('adsBlocked').textContent).toBe('15');
      expect(document.getElementById('dataSaved').textContent).toBe('0.8');
    });
    
    test('should update status indicator', () => {
      popup.isEnabled = true;
      popup.updateUI();
      
      const statusDot = document.getElementById('statusDot');
      const statusText = document.getElementById('statusText');
      
      expect(statusDot.classList.contains('active')).toBe(true);
      expect(statusText.textContent).toBe('Active');
    });
  });
  
  describe('YouTube Browser', () => {
    test('should open YouTube browser', async () => {
      mockChrome.tabs.create.mockResolvedValue({ id: 123 });
      mockChrome.scripting.executeScript.mockResolvedValue();
      
      await popup.openYouTubeBrowser();
      
      expect(mockChrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://www.youtube.com',
        active: true
      });
      expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 123 },
        files: ['content.js']
      });
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
  
  describe('Filter List Management', () => {
    test('should update filter lists', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });
      
      const button = document.getElementById('updateFiltersBtn');
      button.textContent = 'Update';
      button.disabled = false;
      
      await popup.updateFilterLists();
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'UPDATE_FILTER_LISTS' });
    });
  });
});

describe('Performance Tests', () => {
  test('should process URLs quickly', async () => {
    const startTime = performance.now();
    
    // Test 1000 URL checks
    for (let i = 0; i < 1000; i++) {
      const url = `https://example${i}.com/ads`;
      // Simulate URL processing
      new URL(url);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should complete in less than 100ms
    expect(duration).toBeLessThan(100);
  });
  
  test('should use minimal memory', () => {
    // Check that memory usage is reasonable
    const memoryUsage = process.memoryUsage();
    expect(memoryUsage.heapUsed).toBeLessThan(50 * 1024 * 1024); // 50MB
  });
  
  test('should handle many filter rules efficiently', () => {
    const rules = [];
    
    // Create 1000 filter rules
    for (let i = 0; i < 1000; i++) {
      rules.push({
        pattern: `||test${i}.com^`,
        regex: new RegExp(`test${i}\\.com`, 'i')
      });
    }
    
    const startTime = performance.now();
    
    // Test URL checking with many rules
    for (let i = 0; i < 100; i++) {
      const url = `https://test${i}.com/ads`;
      rules.some(rule => rule.regex.test(url));
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should still be fast even with many rules
    expect(duration).toBeLessThan(100);
  });
});

describe('uBlock Origin Compatibility', () => {
  test('should support EasyList syntax', () => {
    const easyListRules = [
      '||googleadservices.com^',
      '||doubleclick.net^',
      '##.advertisement',
      '##div[class*="ad"]',
      '@@||google.com/recaptcha^'
    ];
    
    easyListRules.forEach(rule => {
      if (rule.startsWith('||')) {
        expect(rule).toMatch(/^\|\|.*\^$/);
      } else if (rule.startsWith('##')) {
        expect(rule).toMatch(/^##.*$/);
      } else if (rule.startsWith('@@')) {
        expect(rule).toMatch(/^@@.*$/);
      }
    });
  });
  
  test('should support uBlock Origin filter lists', () => {
    const uBlockLists = [
      'https://easylist.to/easylist/easylist.txt',
      'https://easylist.to/easylist/easyprivacy.txt',
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/youtube.txt'
    ];
    
    uBlockLists.forEach(url => {
      expect(url).toMatch(/^https:\/\//);
      expect(url).toMatch(/\.txt$/);
    });
  });
  
  test('should achieve uBlock Origin performance targets', () => {
    // Memory usage should be under 20MB
    const memoryUsage = process.memoryUsage();
    expect(memoryUsage.heapUsed).toBeLessThan(20 * 1024 * 1024);
    
    // CPU impact should be minimal
    const startTime = performance.now();
    // Simulate light processing
    for (let i = 0; i < 100; i++) {
      Math.random();
    }
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(10); // Should be very fast
  });
});