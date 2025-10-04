/**
 * Simple Test Runner for BlockedAds MVP
 * Run with: node test-runner.js
 */

const { BlockedAdsFilterEngine } = require('./tests/blockedads-core-test.js');

async function runTests() {
  console.log('🧪 BlockedAds MVP Tests Starting...\n');
  
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
  
  test('Filter rules loaded', () => {
    if (engine.rules.length === 0) throw new Error('No rules loaded');
  });
  
  console.log('\n🛡️ Ad Blocking Tests:');
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
  
  console.log('\n📊 Statistics Tests:');
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
  
  console.log('\n⚡ Performance Tests:');
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
  
  console.log('\n📈 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! BlockedAds MVP is working correctly!');
    console.log('\n📋 Next Steps:');
    console.log('1. Load Chrome extension: chrome://extensions/ → Load unpacked → blockedads-mvp-chrome');
    console.log('2. Test Android app: Import blockedads-mvp-android into Android Studio');
    console.log('3. Run integration tests on real websites');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run the tests
runTests().catch(console.error);
