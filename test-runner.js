/**
 * Test Runner for BlockedAds (uBlock Origin Inspired)
 * Run with: node test-runner.js
 */

const { BlockedAdsFilterEngine } = require('./tests/blockedads-core-test.js');

async function runTests() {
  console.log('🧪 BlockedAds Tests Starting...\n');
  console.log('🚀 Testing uBlock Origin-inspired architecture\n');
  
  let passed = 0;
  let failed = 0;
  
  function test(name, testFn) {
    try {
      testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }
  
  // Initialize engine
  const engine = new BlockedAdsFilterEngine();
  await engine.init();
  
  console.log('📋 Initialization Tests:');
  test('Engine initializes successfully', () => {
    if (!engine) throw new Error('Engine not created');
  });
  
  test('Default settings loaded', () => {
    if (!engine.isEnabled) throw new Error('Should be enabled by default');
    if (engine.whitelist.size !== 0) throw new Error('Whitelist should be empty');
  });
  
  test('uBlock Origin filter lists loaded', () => {
    if (engine.filterLists.size !== 4) throw new Error('Should load 4 filter lists');
    if (!engine.filterLists.has('EasyList')) throw new Error('Should load EasyList');
    if (!engine.filterLists.has('EasyPrivacy')) throw new Error('Should load EasyPrivacy');
    if (!engine.filterLists.has('uBlock Origin Filters')) throw new Error('Should load uBlock Origin Filters');
    if (!engine.filterLists.has('YouTube Ad Blocking')) throw new Error('Should load YouTube Ad Blocking');
  });
  
  test('Filter rules loaded', () => {
    if (engine.rules.length === 0) throw new Error('No network rules loaded');
    if (engine.elementRules.length === 0) throw new Error('No cosmetic rules loaded');
    if (engine.exceptionRules.length === 0) throw new Error('No exception rules loaded');
  });
  
  console.log('\n🛡️ Ad Blocking Tests (uBlock Origin Compatible):');
  test('Blocks Google Ads', () => {
    if (!engine.shouldBlockUrl('https://googleadservices.com/pagead/ads')) {
      throw new Error('Should block Google Ads');
    }
  });
  
  test('Blocks DoubleClick', () => {
    if (!engine.shouldBlockUrl('https://doubleclick.net/ads')) {
      throw new Error('Should block DoubleClick');
    }
  });
  
  test('Blocks Facebook tracking', () => {
    if (!engine.shouldBlockUrl('https://facebook.com/tr')) {
      throw new Error('Should block Facebook tracking');
    }
  });
  
  test('Blocks Amazon ads', () => {
    if (!engine.shouldBlockUrl('https://amazon-adsystem.com/ads')) {
      throw new Error('Should block Amazon ads');
    }
  });
  
  test('Blocks Yahoo ads', () => {
    if (!engine.shouldBlockUrl('https://ads.yahoo.com/ads')) {
      throw new Error('Should block Yahoo ads');
    }
  });
  
  test('Blocks Twitter ads', () => {
    if (!engine.shouldBlockUrl('https://ads-twitter.com/ads')) {
      throw new Error('Should block Twitter ads');
    }
  });
  
  test('Blocks analytics', () => {
    if (!engine.shouldBlockUrl('https://google-analytics.com/analytics.js')) {
      throw new Error('Should block Google Analytics');
    }
  });
  
  test('Allows legitimate sites', () => {
    if (engine.shouldBlockUrl('https://google.com/search')) {
      throw new Error('Should not block Google search');
    }
  });
  
  test('Allows when disabled', () => {
    engine.isEnabled = false;
    if (engine.shouldBlockUrl('https://googleadservices.com/ads')) {
      throw new Error('Should not block when disabled');
    }
    engine.isEnabled = true; // Reset
  });
  
  console.log('\n🎥 YouTube Ad Blocking Tests:');
  test('Blocks YouTube ad elements', () => {
    if (!engine.shouldHideElement('.ytp-ad-player-overlay')) {
      throw new Error('Should hide YouTube ad overlay');
    }
    if (!engine.shouldHideElement('.ytp-ad-text')) {
      throw new Error('Should hide YouTube ad text');
    }
    if (!engine.shouldHideElement('.ytp-ad-skip-button')) {
      throw new Error('Should hide YouTube skip button');
    }
  });
  
  test('Blocks YouTube promoted content', () => {
    if (!engine.shouldHideElement('.ytd-promoted-sparkles-web-renderer')) {
      throw new Error('Should hide YouTube promoted content');
    }
    if (!engine.shouldHideElement('.ytd-ad-slot-renderer')) {
      throw new Error('Should hide YouTube ad slots');
    }
    if (!engine.shouldHideElement('.ytd-promoted-video-renderer')) {
      throw new Error('Should hide YouTube promoted videos');
    }
  });
  
  test('Blocks sponsored content', () => {
    if (!engine.shouldHideElement('[aria-label*="sponsored"]')) {
      throw new Error('Should hide sponsored content');
    }
    if (!engine.shouldHideElement('[aria-label*="promoted"]')) {
      throw new Error('Should hide promoted content');
    }
  });
  
  console.log('\n📊 Statistics Tests (uBlock Origin Style):');
  test('Increments ads blocked counter', () => {
    const initial = engine.stats.adsBlocked;
    engine.shouldBlockUrl('https://googleadservices.com/ads');
    if (engine.stats.adsBlocked !== initial + 1) {
      throw new Error('Ads blocked counter not incremented');
    }
  });
  
  test('Calculates data saved', () => {
    engine.stats.adsBlocked = 10;
    engine.updateStats();
    if (engine.stats.dataSaved !== 0.5) {
      throw new Error('Data saved calculation incorrect');
    }
  });
  
  test('Provides uBlock Origin compatible stats', () => {
    const stats = engine.getStats();
    if (!stats.hasOwnProperty('adsBlocked')) throw new Error('Stats should have adsBlocked');
    if (!stats.hasOwnProperty('dataSaved')) throw new Error('Stats should have dataSaved');
    if (!stats.hasOwnProperty('runtime')) throw new Error('Stats should have runtime');
  });
  
  console.log('\n⚪ Whitelist Tests:');
  await engine.addToWhitelist('example.com');
  test('Adds domain to whitelist', () => {
    if (!engine.whitelist.has('example.com')) {
      throw new Error('Domain not added to whitelist');
    }
  });
  
  await engine.addToWhitelist('googleadservices.com');
  test('Respects whitelist', () => {
    if (engine.shouldBlockUrl('https://googleadservices.com/ads')) {
      throw new Error('Should not block whitelisted domain');
    }
  });
  
  await engine.removeFromWhitelist('example.com');
  test('Removes domain from whitelist', () => {
    if (engine.whitelist.has('example.com')) {
      throw new Error('Domain not removed from whitelist');
    }
  });
  
  console.log('\n🔧 Filter List Management:');
  test('Provides filter list statistics', () => {
    const stats = engine.getFilterListStats();
    if (stats.totalRules === 0) throw new Error('Should have filter rules');
    if (stats.networkRules === 0) throw new Error('Should have network rules');
    if (stats.cosmeticRules === 0) throw new Error('Should have cosmetic rules');
    if (stats.exceptionRules === 0) throw new Error('Should have exception rules');
    if (!stats.filterLists.includes('EasyList')) throw new Error('Should include EasyList');
  });
  
  console.log('\n⚡ Performance Tests (uBlock Origin Level):');
  test('Processes URLs quickly', () => {
    const startTime = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      engine.shouldBlockUrl(`https://example${i}.com/ads`);
    }
    
    const duration = Date.now() - startTime;
    if (duration > 100) {
      throw new Error(`Too slow: ${duration}ms (should be <100ms)`);
    }
  });
  
  test('Uses minimal memory', () => {
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > 20 * 1024 * 1024) {
      throw new Error(`Memory usage too high: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB (should be <20MB)`);
    }
  });
  
  console.log('\n🔍 EasyList Compatibility:');
  test('Supports EasyList syntax', () => {
    const easyListPatterns = [
      '||googleadservices.com^',
      '||doubleclick.net^',
      '##.advertisement',
      '##div[class*="ad"]',
      '@@||google.com/recaptcha^'
    ];
    
    easyListPatterns.forEach(pattern => {
      const rule = engine.createRule(pattern);
      if (!rule) throw new Error(`Failed to parse EasyList pattern: ${pattern}`);
    });
  });
  
  console.log('\n📈 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! BlockedAds is working correctly!');
    console.log('\n🚀 uBlock Origin-inspired features verified:');
    console.log('✅ Fast and lean performance (<20MB memory, <100ms processing)');
    console.log('✅ EasyList-compatible filter syntax');
    console.log('✅ YouTube-specific ad blocking');
    console.log('✅ Comprehensive ad network coverage');
    console.log('✅ Privacy-focused blocking');
    console.log('✅ Real-time statistics tracking');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Load Chrome extension: chrome://extensions/ → Load unpacked → blockedads-mvp-chrome');
    console.log('2. Test Android app: Import blockedads-mvp-android into Android Studio');
    console.log('3. Test YouTube browser: Launch custom YouTube client');
    console.log('4. Run integration tests on real websites');
    console.log('5. Verify uBlock Origin performance targets');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run the tests
runTests().catch(console.error);