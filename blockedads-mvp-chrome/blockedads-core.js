/**
 * BlockedAds Core Filter Engine
 * Handles ad blocking logic and DOM manipulation
 */

class BlockedAdsFilterEngine {
  constructor() {
    this.rules = [];
    this.elementRules = [];
    this.exceptionRules = [];
    this.stats = {
      adsBlocked: 0,
      dataSaved: 0,
      startTime: Date.now()
    };
    this.isEnabled = true;
    this.whitelist = new Set();
    
    this.init();
  }

  /**
   * Initialize the filter engine
   */
  async init() {
    try {
      await this.loadSettings();
      await this.loadFilterRules();
      this.setupNetworkBlocking();
      this.setupElementHiding();
      this.setupStatsTracking();
    } catch (error) {
      console.error('BlockedAds: Failed to initialize', error);
    }
  }

  /**
   * Load user settings from storage
   */
  async loadSettings() {
    const result = await chrome.storage.sync.get({
      isEnabled: true,
      whitelist: []
    });
    
    this.isEnabled = result.isEnabled;
    this.whitelist = new Set(result.whitelist);
  }

  /**
   * Load filter rules from EasyList
   */
  async loadFilterRules() {
    try {
      const response = await fetch(chrome.runtime.getURL('filters/blockedads-easylist.txt'));
      const text = await response.text();
      this.parseFilterRules(text);
    } catch (error) {
      console.error('BlockedAds: Failed to load filter rules', error);
      // Fallback to basic rules
      this.loadBasicRules();
    }
  }

  /**
   * Parse filter rules from text
   */
  parseFilterRules(text) {
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) {
        continue;
      }

      // Exception rules (start with @@)
      if (trimmed.startsWith('@@')) {
        this.exceptionRules.push(this.createRule(trimmed.substring(2)));
      }
      // Element hiding rules (contain ##)
      else if (trimmed.includes('##')) {
        this.elementRules.push(this.createElementRule(trimmed));
      }
      // Network rules
      else {
        this.rules.push(this.createRule(trimmed));
      }
    }
  }

  /**
   * Create a network rule object
   */
  createRule(pattern) {
    return {
      pattern: pattern,
      regex: this.patternToRegex(pattern),
      type: this.getRuleType(pattern)
    };
  }

  /**
   * Create an element hiding rule object
   */
  createElementRule(rule) {
    const [domain, selector] = rule.split('##');
    return {
      domain: domain || '*',
      selector: selector,
      regex: this.patternToRegex(domain || '*')
    };
  }

  /**
   * Convert Adblock pattern to regex
   */
  patternToRegex(pattern) {
    // Escape special regex characters except * and ?
    let regex = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp('^' + regex + '$', 'i');
  }

  /**
   * Get rule type from pattern
   */
  getRuleType(pattern) {
    if (pattern.includes('$')) {
      const options = pattern.split('$')[1];
      if (options.includes('script')) return 'script';
      if (options.includes('image')) return 'image';
      if (options.includes('stylesheet')) return 'stylesheet';
    }
    return 'all';
  }

  /**
   * Load basic fallback rules
   */
  loadBasicRules() {
    const basicRules = [
      '||googleadservices.com^',
      '||googlesyndication.com^',
      '||doubleclick.net^',
      '||facebook.com/tr^',
      '||amazon-adsystem.com^',
      '||adsystem.amazon.com^',
      '||ads.yahoo.com^',
      '||adsystem.yahoo.com^'
    ];

    for (const rule of basicRules) {
      this.rules.push(this.createRule(rule));
    }
  }

  /**
   * Setup network request blocking
   */
  setupNetworkBlocking() {
    // Use declarativeNetRequest for blocking
    chrome.declarativeNetRequest.updateDynamicRules({
      addRules: this.createDeclarativeRules(),
      removeRuleIds: []
    });
  }

  /**
   * Create declarative net request rules
   */
  createDeclarativeRules() {
    const rules = [];
    let id = 1;

    for (const rule of this.rules) {
      if (this.shouldBlockUrl(rule.pattern)) {
        rules.push({
          id: id++,
          priority: 1,
          action: { type: 'block' },
          condition: {
            urlFilter: rule.pattern,
            resourceTypes: ['main_frame', 'sub_frame', 'script', 'image', 'stylesheet', 'xmlhttprequest']
          }
        });
      }
    }

    return rules;
  }

  /**
   * Check if URL should be blocked
   */
  shouldBlockUrl(url) {
    if (!this.isEnabled) return false;
    
    // Check whitelist first
    const domain = this.extractDomain(url);
    if (this.whitelist.has(domain)) return false;

    // Check exception rules
    for (const rule of this.exceptionRules) {
      if (rule.regex.test(url)) return false;
    }

    // Check blocking rules
    for (const rule of this.rules) {
      if (rule.regex.test(url)) {
        this.stats.adsBlocked++;
        this.updateStats();
        return true;
      }
    }

    return false;
  }

  /**
   * Setup element hiding
   */
  setupElementHiding() {
    // Hide elements on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.hideElements());
    } else {
      this.hideElements();
    }

    // Watch for dynamically added elements
    const observer = new MutationObserver(() => this.hideElements());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Hide elements matching rules
   */
  hideElements() {
    const currentDomain = window.location.hostname;
    
    for (const rule of this.elementRules) {
      if (rule.domain === '*' || rule.regex.test(currentDomain)) {
        const elements = document.querySelectorAll(rule.selector);
        elements.forEach(element => {
          if (!element.hasAttribute('data-blockedads-hidden')) {
            element.style.display = 'none';
            element.setAttribute('data-blockedads-hidden', 'true');
          }
        });
      }
    }
  }

  /**
   * Setup statistics tracking
   */
  setupStatsTracking() {
    // Update stats every minute
    setInterval(() => {
      this.updateStats();
    }, 60000);

    // Save stats on page unload
    window.addEventListener('beforeunload', () => {
      this.saveStats();
    });
  }

  /**
   * Update statistics
   */
  updateStats() {
    const dataSaved = this.stats.adsBlocked * 0.05; // Estimate 50KB per ad
    this.stats.dataSaved = Math.round(dataSaved * 100) / 100;
    
    // Send stats to popup
    chrome.runtime.sendMessage({
      type: 'STATS_UPDATE',
      stats: this.stats
    });
  }

  /**
   * Save statistics to storage
   */
  async saveStats() {
    try {
      const result = await chrome.storage.local.get(['dailyStats']);
      const dailyStats = result.dailyStats || {};
      const today = new Date().toDateString();
      
      dailyStats[today] = {
        adsBlocked: (dailyStats[today]?.adsBlocked || 0) + this.stats.adsBlocked,
        dataSaved: (dailyStats[today]?.dataSaved || 0) + this.stats.dataSaved
      };
      
      await chrome.storage.local.set({ dailyStats });
    } catch (error) {
      console.error('BlockedAds: Failed to save stats', error);
    }
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  /**
   * Toggle blocking on/off
   */
  async toggleBlocking(enabled) {
    this.isEnabled = enabled;
    await chrome.storage.sync.set({ isEnabled: enabled });
    
    if (enabled) {
      this.setupNetworkBlocking();
    } else {
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: Array.from({length: 1000}, (_, i) => i + 1)
      });
    }
  }

  /**
   * Add site to whitelist
   */
  async addToWhitelist(domain) {
    this.whitelist.add(domain);
    const whitelistArray = Array.from(this.whitelist);
    await chrome.storage.sync.set({ whitelist: whitelistArray });
  }

  /**
   * Remove site from whitelist
   */
  async removeFromWhitelist(domain) {
    this.whitelist.delete(domain);
    const whitelistArray = Array.from(this.whitelist);
    await chrome.storage.sync.set({ whitelist: whitelistArray });
  }
}

// Initialize the filter engine
const blockedAdsEngine = new BlockedAdsFilterEngine();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'TOGGLE_BLOCKING':
      blockedAdsEngine.toggleBlocking(request.enabled);
      sendResponse({ success: true });
      break;
      
    case 'ADD_WHITELIST':
      blockedAdsEngine.addToWhitelist(request.domain);
      sendResponse({ success: true });
      break;
      
    case 'REMOVE_WHITELIST':
      blockedAdsEngine.removeFromWhitelist(request.domain);
      sendResponse({ success: true });
      break;
      
    case 'GET_STATS':
      sendResponse({ stats: blockedAdsEngine.stats });
      break;
      
    case 'GET_WHITELIST':
      sendResponse({ whitelist: Array.from(blockedAdsEngine.whitelist) });
      break;
  }
});
