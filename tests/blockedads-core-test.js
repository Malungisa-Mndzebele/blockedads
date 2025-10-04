/**
 * BlockedAds Core Filter Engine - Test Version
 * Standalone version for testing without Chrome APIs
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
  }

  async init() {
    try {
      await this.loadSettings();
      await this.loadFilterRules();
    } catch (error) {
      console.error('BlockedAds: Failed to initialize', error);
    }
  }

  async loadSettings() {
    // Mock settings for testing
    this.isEnabled = true;
    this.whitelist = new Set();
  }

  async loadFilterRules() {
    try {
      // Mock filter rules for testing
      const mockRules = `
        ! Test filter list
        ||googleadservices.com^
        ||doubleclick.net^
        ||facebook.com/tr^
        ||amazon-adsystem.com^
        ##.advertisement
        ##div[class*="ad"]
        @@||google.com/recaptcha^
      `;
      this.parseFilterRules(mockRules);
    } catch (error) {
      console.error('BlockedAds: Failed to load filter rules', error);
      this.loadBasicRules();
    }
  }

  parseFilterRules(text) {
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) {
        continue;
      }

      if (trimmed.startsWith('@@')) {
        this.exceptionRules.push(this.createRule(trimmed.substring(2)));
      } else if (trimmed.includes('##')) {
        this.elementRules.push(this.createElementRule(trimmed));
      } else {
        this.rules.push(this.createRule(trimmed));
      }
    }
  }

  createRule(pattern) {
    return {
      pattern: pattern,
      regex: this.patternToRegex(pattern),
      type: this.getRuleType(pattern)
    };
  }

  createElementRule(rule) {
    const [domain, selector] = rule.split('##');
    return {
      domain: domain || '*',
      selector: selector,
      regex: this.patternToRegex(domain || '*')
    };
  }

  patternToRegex(pattern) {
    // Handle Adblock patterns
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
      '||adsystem.yahoo.com^'
    ];

    for (const rule of basicRules) {
      this.rules.push(this.createRule(rule));
    }
  }

  shouldBlockUrl(url) {
    if (!this.isEnabled) return false;
    
    const domain = this.extractDomain(url);
    if (this.whitelist.has(domain)) return false;

    for (const rule of this.exceptionRules) {
      if (rule.regex.test(url)) return false;
    }

    for (const rule of this.rules) {
      if (rule.regex.test(url) || rule.regex.test(domain)) {
        this.stats.adsBlocked++;
        this.updateStats();
        return true;
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
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BlockedAdsFilterEngine };
}
