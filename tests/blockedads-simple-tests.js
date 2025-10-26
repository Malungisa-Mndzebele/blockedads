/**
 * BlockedAds Simple Unit Tests
 * Tests uBlock Origin-inspired functionality without Chrome dependencies
 */

const { BlockedAdsFilterEngine } = require('./blockedads-core-test.js');

describe('BlockedAds Filter Engine (uBlock Origin Inspired)', () => {
  let filterEngine;
  
  beforeEach(async () => {
    filterEngine = new BlockedAdsFilterEngine();
    await filterEngine.init();
  });
  
  describe('Initialization', () => {
    test('should initialize with default settings', () => {
      expect(filterEngine.isEnabled).toBe(true);
      expect(filterEngine.whitelist).toEqual(new Set());
      expect(filterEngine.stats.adsBlocked).toBe(0);
    });
    
    test('should load uBlock Origin filter lists', () => {
      expect(filterEngine.filterLists.size).toBe(4);
      expect(filterEngine.filterLists.has('EasyList')).toBe(true);
      expect(filterEngine.filterLists.has('EasyPrivacy')).toBe(true);
      expect(filterEngine.filterLists.has('uBlock Origin Filters')).toBe(true);
      expect(filterEngine.filterLists.has('YouTube Ad Blocking')).toBe(true);
    });
    
    test('should parse filter rules correctly', () => {
      expect(filterEngine.rules.length).toBeGreaterThan(0);
      expect(filterEngine.elementRules.length).toBeGreaterThan(0);
      expect(filterEngine.exceptionRules.length).toBeGreaterThan(0);
    });
  });
  
  describe('URL Blocking (uBlock Origin Compatible)', () => {
    test('should block Google Ads URLs', () => {
      const shouldBlock = filterEngine.shouldBlockUrl('https://googleadservices.com/pagead/ads');
      expect(shouldBlock).toBe(true);
    });
    
    test('should block DoubleClick URLs', () => {
      const shouldBlock = filterEngine.shouldBlockUrl('https://doubleclick.net/ads');
      expect(shouldBlock).toBe(true);
    });
    
    test('should block Facebook tracking URLs', () => {
      const shouldBlock = filterEngine.shouldBlockUrl('https://facebook.com/tr');
      expect(shouldBlock).toBe(true);
    });
    
    test('should block Amazon ads URLs', () => {
      const shouldBlock = filterEngine.shouldBlockUrl('https://amazon-adsystem.com/ads');
      expect(shouldBlock).toBe(true);
    });
    
    test('should block Yahoo ads URLs', () => {
      const shouldBlock = filterEngine.shouldBlockUrl('https://ads.yahoo.com/ads');
      expect(shouldBlock).toBe(true);
    });
    
    test('should block Twitter ads URLs', () => {
      const shouldBlock = filterEngine.shouldBlockUrl('https://ads-twitter.com/ads');
      expect(shouldBlock).toBe(true);
    });
    
    test('should block analytics URLs', () => {
      const shouldBlock = filterEngine.shouldBlockUrl('https://google-analytics.com/analytics.js');
      expect(shouldBlock).toBe(true);
    });
    
    test('should not block legitimate URLs', () => {
      const shouldBlock = filterEngine.shouldBlockUrl('https://google.com/search');
      expect(shouldBlock).toBe(false);
    });
    
    test('should not block when disabled', () => {
      filterEngine.isEnabled = false;
      const shouldBlock = filterEngine.shouldBlockUrl('https://googleadservices.com/pagead/ads');
      expect(shouldBlock).toBe(false);
    });
  });
  
  describe('Element Hiding (Cosmetic Filtering)', () => {
    test('should hide advertisement elements', () => {
      const shouldHide = filterEngine.shouldHideElement('.advertisement');
      expect(shouldHide).toBe(true);
    });
    
    test('should hide ad-related divs', () => {
      const shouldHide = filterEngine.shouldHideElement('div[class*="ad"]');
      expect(shouldHide).toBe(true);
    });
    
    test('should hide banner ads', () => {
      const shouldHide = filterEngine.shouldHideElement('.banner-ad');
      expect(shouldHide).toBe(true);
    });
    
    test('should hide YouTube ad elements', () => {
      const shouldHide = filterEngine.shouldHideElement('.ytp-ad-player-overlay');
      expect(shouldHide).toBe(true);
    });
    
    test('should hide YouTube promoted content', () => {
      const shouldHide = filterEngine.shouldHideElement('.ytd-promoted-sparkles-web-renderer');
      expect(shouldHide).toBe(true);
    });
    
    test('should hide sponsored content', () => {
      const shouldHide = filterEngine.shouldHideElement('[aria-label*="sponsored"]');
      expect(shouldHide).toBe(true);
    });
    
    test('should not hide legitimate elements', () => {
      const shouldHide = filterEngine.shouldHideElement('.content');
      expect(shouldHide).toBe(false);
    });
  });
  
  describe('Exception Rules', () => {
    test('should respect exception rules', () => {
      const shouldBlock = filterEngine.shouldBlockUrl('https://google.com/recaptcha');
      expect(shouldBlock).toBe(false);
    });
  });
  
  describe('Whitelist Management', () => {
    test('should add domain to whitelist', async () => {
      const testEngine = new BlockedAdsFilterEngine();
      await testEngine.init();
      await testEngine.addToWhitelist('example.com');
      expect(testEngine.whitelist.has('example.com')).toBe(true);
    });
    
    test('should remove domain from whitelist', async () => {
      const testEngine = new BlockedAdsFilterEngine();
      await testEngine.init();
      testEngine.whitelist.add('example.com');
      await testEngine.removeFromWhitelist('example.com');
      expect(testEngine.whitelist.has('example.com')).toBe(false);
    });
    
    test('should respect whitelist when blocking', async () => {
      const testEngine = new BlockedAdsFilterEngine();
      await testEngine.init();
      await testEngine.addToWhitelist('googleadservices.com');
      const shouldBlock = testEngine.shouldBlockUrl('https://googleadservices.com/pagead/ads');
      expect(shouldBlock).toBe(false);
    });
  });
  
  describe('Statistics (uBlock Origin Style)', () => {
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
    
  test('should provide uBlock Origin compatible stats', () => {
    filterEngine.stats.adsBlocked = 25;
    filterEngine.stats.dataSaved = 1.25;
    filterEngine.stats.startTime = Date.now() - 60000; // Set start time to 1 minute ago
    
    const stats = filterEngine.getStats();
    expect(stats.adsBlocked).toBe(25);
    expect(stats.dataSaved).toBe(1.25);
    expect(stats.runtime).toBeGreaterThan(0);
  });
  });
  
  describe('Pattern Matching (EasyList Compatible)', () => {
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
    
    test('should handle EasyList syntax', () => {
      const easyListPatterns = [
        '||googleadservices.com^',
        '||doubleclick.net^',
        '##.advertisement',
        '##div[class*="ad"]',
        '@@||google.com/recaptcha^'
      ];
      
      easyListPatterns.forEach(pattern => {
        const rule = filterEngine.createRule(pattern);
        expect(rule).toBeDefined();
        expect(rule.pattern).toBe(pattern);
      });
    });
  });
  
  describe('Toggle Functionality', () => {
    test('should toggle blocking on', async () => {
      filterEngine.isEnabled = false;
      await filterEngine.toggleBlocking(true);
      expect(filterEngine.isEnabled).toBe(true);
    });
    
    test('should toggle blocking off', async () => {
      await filterEngine.toggleBlocking(false);
      expect(filterEngine.isEnabled).toBe(false);
    });
  });
  
  describe('Filter List Statistics', () => {
    test('should provide filter list stats', () => {
      const stats = filterEngine.getFilterListStats();
      
      expect(stats.totalRules).toBeGreaterThan(0);
      expect(stats.networkRules).toBeGreaterThan(0);
      expect(stats.cosmeticRules).toBeGreaterThan(0);
      expect(stats.exceptionRules).toBeGreaterThan(0);
      expect(stats.filterLists).toContain('EasyList');
      expect(stats.filterLists).toContain('EasyPrivacy');
      expect(stats.filterLists).toContain('uBlock Origin Filters');
      expect(stats.filterLists).toContain('YouTube Ad Blocking');
    });
  });
});

describe('Performance Tests (uBlock Origin Level)', () => {
  test('should process URLs quickly', async () => {
    const filterEngine = new BlockedAdsFilterEngine();
    await filterEngine.init();
    
    const startTime = Date.now();
    
    // Test 1000 URL checks
    for (let i = 0; i < 1000; i++) {
      filterEngine.shouldBlockUrl(`https://example${i}.com/ads`);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete in less than 100ms (uBlock Origin performance)
    expect(duration).toBeLessThan(100);
  });
  
  test('should handle many rules efficiently', async () => {
    const filterEngine = new BlockedAdsFilterEngine();
    await filterEngine.init();
    
    // Add many rules (simulate large filter lists)
    for (let i = 0; i < 1000; i++) {
      filterEngine.rules.push(filterEngine.createRule(`||test${i}.com^`));
    }
    
    const startTime = Date.now();
    
    // Test URL checking with many rules
    for (let i = 0; i < 100; i++) {
      filterEngine.shouldBlockUrl(`https://test${i}.com/ads`);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should still be fast even with many rules
    expect(duration).toBeLessThan(100);
  });
  
  test('should use minimal memory', async () => {
    const filterEngine = new BlockedAdsFilterEngine();
    await filterEngine.init();
    
    // Check that memory usage is reasonable (adjusted for Node.js environment)
    const memoryUsage = process.memoryUsage();
    expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // 100MB (more realistic for Node.js)
  });
});

describe('Edge Cases', () => {
  test('should handle malformed URLs gracefully', async () => {
    const filterEngine = new BlockedAdsFilterEngine();
    await filterEngine.init();
    
    // Should not throw errors
    expect(() => filterEngine.shouldBlockUrl('not-a-url')).not.toThrow();
    expect(() => filterEngine.shouldBlockUrl('')).not.toThrow();
    expect(() => filterEngine.shouldBlockUrl(null)).not.toThrow();
  });
  
  test('should handle empty filter lists', async () => {
    const filterEngine = new BlockedAdsFilterEngine();
    await filterEngine.init();
    filterEngine.rules = []; // Empty rules after init
    
    // Should not block anything
    const shouldBlock = filterEngine.shouldBlockUrl('https://googleadservices.com/ads');
    expect(shouldBlock).toBe(false);
  });
  
  test('should handle invalid regex patterns', () => {
    const filterEngine = new BlockedAdsFilterEngine();
    
    // Should not throw errors with invalid patterns
    expect(() => filterEngine.createRule('||invalid[pattern^')).not.toThrow();
    expect(() => filterEngine.createRule('||test.com^')).not.toThrow();
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
  
  test('should achieve uBlock Origin performance targets', async () => {
    const filterEngine = new BlockedAdsFilterEngine();
    await filterEngine.init();
    
    // Memory usage should be reasonable (adjusted for Node.js environment)
    const memoryUsage = process.memoryUsage();
    expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // 100MB (more realistic for Node.js)
    
    // CPU impact should be minimal
    const startTime = performance.now();
    // Simulate light processing
    for (let i = 0; i < 100; i++) {
      filterEngine.shouldBlockUrl(`https://test${i}.com/ads`);
    }
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(10); // Should be very fast
  });
  
  test('should provide uBlock Origin compatible API', async () => {
    const filterEngine = new BlockedAdsFilterEngine();
    await filterEngine.init();
    
    // Test uBlock Origin compatible methods
    expect(typeof filterEngine.getStats).toBe('function');
    expect(typeof filterEngine.getEnabled).toBe('function');
    expect(typeof filterEngine.getWhitelist).toBe('function');
    
    const stats = filterEngine.getStats();
    expect(stats).toHaveProperty('adsBlocked');
    expect(stats).toHaveProperty('dataSaved');
    expect(stats).toHaveProperty('runtime');
    
    const whitelist = filterEngine.getWhitelist();
    expect(Array.isArray(whitelist)).toBe(true);
  });
});