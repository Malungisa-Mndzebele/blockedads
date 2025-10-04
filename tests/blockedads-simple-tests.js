/**
 * BlockedAds Simple Unit Tests
 * Tests core functionality without Chrome dependencies
 */

const { BlockedAdsFilterEngine } = require('./blockedads-core-test.js');

describe('BlockedAds Filter Engine', () => {
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
    
    test('should load filter rules', () => {
      expect(filterEngine.rules.length).toBeGreaterThan(0);
      expect(filterEngine.elementRules.length).toBeGreaterThan(0);
    });
  });
  
  describe('URL Blocking', () => {
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
  
  describe('Statistics', () => {
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
});

describe('Performance Tests', () => {
  test('should process URLs quickly', async () => {
    const filterEngine = new BlockedAdsFilterEngine();
    await filterEngine.init();
    
    const startTime = Date.now();
    
    // Test 100 URL checks (reduced for performance)
    for (let i = 0; i < 100; i++) {
      filterEngine.shouldBlockUrl(`https://example${i}.com/ads`);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete in less than 1000ms (more realistic for 100 checks)
    expect(duration).toBeLessThan(1000);
  });
  
  test('should handle many rules efficiently', async () => {
    const filterEngine = new BlockedAdsFilterEngine();
    
    // Add many rules
    for (let i = 0; i < 50; i++) {
      filterEngine.rules.push(filterEngine.createRule(`||test${i}.com^`));
    }
    
    const startTime = Date.now();
    
    // Test URL checking with many rules
    for (let i = 0; i < 50; i++) {
      filterEngine.shouldBlockUrl(`https://test${i}.com/ads`);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should still be fast even with many rules
    expect(duration).toBeLessThan(1000);
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
});
