/**
 * BlockedAds Core Filter Engine - Test Version
 * uBlock Origin-inspired standalone version for testing
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
    this.filterLists = new Map();
  }

  async init() {
    try {
      await this.loadSettings();
      await this.loadFilterLists();
    } catch (error) {
      console.error('BlockedAds: Failed to initialize', error);
    }
  }

  async loadSettings() {
    // Mock settings for testing
    this.isEnabled = true;
    this.whitelist = new Set();
  }

  async loadFilterLists() {
    try {
      // Mock uBlock Origin filter lists for testing
      const mockFilterLists = [
        {
          name: 'EasyList',
          content: `
            ! EasyList - Primary ad blocking rules
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
            ##.advertisement
            ##div[class*="ad"]
            ##.banner-ad
            @@||google.com/recaptcha^
          `
        },
        {
          name: 'EasyPrivacy',
          content: `
            ! EasyPrivacy - Privacy protection rules
            ||google-analytics.com^
            ||googletagmanager.com^
            ||facebook.net^
            ||connect.facebook.net^
            ||amazon-adsystem.com^
            ||adsystem.amazon.com^
            ||aaxads.com^
            ##.analytics
            ##.tracking
          `
        },
        {
          name: 'uBlock Origin Filters',
          content: `
            ! uBlock Origin additional filters
            ||googletagservices.com^
            ||googleadservices.com/pagead/ads^
            ||doubleclick.net/ads^
            ||facebook.com/tr^
            ||amazon-adsystem.com/aax^
            ##.ytp-ad-player-overlay
            ##.ytp-ad-text
            ##.ytp-ad-skip-button
          `
        },
        {
          name: 'YouTube Ad Blocking',
          content: `
            ! YouTube-specific ad blocking
            ##.ytd-promoted-sparkles-web-renderer
            ##.ytd-ad-slot-renderer
            ##.ytd-promoted-video-renderer
            ##.ytd-video-masthead-ad-v3-renderer
            ##.ytd-compact-promoted-video-renderer
            ##[aria-label*="sponsored"]
            ##[aria-label*="promoted"]
          `
        }
      ];

      for (const list of mockFilterLists) {
        this.filterLists.set(list.name, list);
        this.parseFilterRules(list.content, list.name);
      }
    } catch (error) {
      console.error('BlockedAds: Failed to load filter lists', error);
      this.loadBasicRules();
    }
  }

  parseFilterRules(text, listName = 'default') {
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) {
        continue;
      }

      if (trimmed.startsWith('@@')) {
        this.exceptionRules.push(this.createRule(trimmed.substring(2), 'exception'));
      } else if (trimmed.includes('##')) {
        this.elementRules.push(this.createElementRule(trimmed));
      } else {
        this.rules.push(this.createRule(trimmed, 'network'));
      }
    }
  }

  createRule(pattern, type = 'network') {
    return {
      pattern: pattern,
      regex: this.patternToRegex(pattern),
      type: type,
      priority: 1
    };
  }

  createElementRule(rule) {
    const [domain, selector] = rule.split('##');
    return {
      domain: domain || '*',
      selector: selector,
      regex: this.patternToRegex(domain || '*'),
      type: 'cosmetic'
    };
  }

  patternToRegex(pattern) {
    // Handle Adblock patterns (uBlock Origin compatible)
    let regex = pattern;
    
    // Remove anchor markers
    regex = regex.replace(/^\|\|/, ''); // Remove || prefix
    regex = regex.replace(/\^$/, '');   // Remove ^ suffix
    
    // Escape special regex characters except * and ?
    regex = regex.replace(/[.+${}()|[\]\\]/g, '\\$&');
    
    // Convert wildcards
    regex = regex.replace(/\*/g, '.*');
    regex = regex.replace(/\?/g, '.');
    
    return new RegExp(regex, 'i');
  }

  getRuleType(pattern) {
    if (pattern.includes('$')) {
      const options = pattern.split('$')[1];
      if (options.includes('script')) return 'script';
      if (options.includes('image')) return 'image';
      if (options.includes('stylesheet')) return 'stylesheet';
    }
    return 'all';
  }

  loadBasicRules() {
    const basicRules = [
      '||googleadservices.com^',
      '||googlesyndication.com^',
      '||doubleclick.net^',
      '||facebook.com/tr^',
      '||amazon-adsystem.com^',
      '||ads.yahoo.com^',
      '||adsystem.yahoo.com^',
      '||ads-twitter.com^',
      '||twitter.com/i/adsct^',
      '||scorecardresearch.com^',
      '||quantserve.com^',
      '||outbrain.com^'
    ];

    for (const rule of basicRules) {
      this.rules.push(this.createRule(rule, 'network'));
    }
  }

  shouldBlockUrl(url) {
    if (!this.isEnabled) return false;
    
    const domain = this.extractDomain(url);
    if (this.whitelist.has(domain)) return false;

    // Check exception rules first
    for (const rule of this.exceptionRules) {
      if (rule.regex.test(url)) return false;
    }

    // Check network rules
    for (const rule of this.rules) {
      if (rule.regex.test(url) || rule.regex.test(domain)) {
        this.stats.adsBlocked++;
        this.updateStats();
        return true;
      }
    }

    return false;
  }

  shouldHideElement(selector, domain = '*') {
    if (!this.isEnabled) return false;
    
    for (const rule of this.elementRules) {
      if (rule.domain === '*' || rule.domain === domain) {
        if (rule.selector === selector) {
          return true;
        }
      }
    }
    
    return false;
  }

  updateStats() {
    const dataSaved = this.stats.adsBlocked * 0.05;
    this.stats.dataSaved = Math.round(dataSaved * 100) / 100;
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }

  async addToWhitelist(domain) {
    this.whitelist.add(domain);
  }

  async removeFromWhitelist(domain) {
    this.whitelist.delete(domain);
  }

  async toggleBlocking(enabled) {
    this.isEnabled = enabled;
  }

  getFilterListStats() {
    return {
      totalRules: this.rules.length + this.elementRules.length + this.exceptionRules.length,
      networkRules: this.rules.length,
      cosmeticRules: this.elementRules.length,
      exceptionRules: this.exceptionRules.length,
      filterLists: Array.from(this.filterLists.keys())
    };
  }

  // uBlock Origin compatibility methods
  getStats() {
    return {
      adsBlocked: this.stats.adsBlocked,
      dataSaved: this.stats.dataSaved,
      runtime: Math.floor((Date.now() - this.stats.startTime) / 1000 / 60)
    };
  }

  getEnabled() {
    return this.isEnabled;
  }

  getWhitelist() {
    return Array.from(this.whitelist);
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BlockedAdsFilterEngine };
}