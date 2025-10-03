/**
 * BlockedAds Popup Script
 * Handles popup UI interactions and communication with background script
 */

class BlockedAdsPopup {
  constructor() {
    this.isEnabled = true;
    this.stats = { adsBlocked: 0, dataSaved: 0 };
    this.whitelist = [];
    this.currentDomain = '';
    
    this.init();
  }

  /**
   * Initialize the popup
   */
  async init() {
    try {
      await this.loadSettings();
      await this.loadStats();
      await this.getCurrentTab();
      this.setupEventListeners();
      this.updateUI();
    } catch (error) {
      console.error('BlockedAds Popup: Failed to initialize', error);
    }
  }

  /**
   * Load user settings
   */
  async loadSettings() {
    const result = await chrome.storage.sync.get({
      isEnabled: true,
      whitelist: []
    });
    
    this.isEnabled = result.isEnabled;
    this.whitelist = result.whitelist;
  }

  /**
   * Load statistics
   */
  async loadStats() {
    try {
      const result = await chrome.storage.local.get(['dailyStats']);
      const dailyStats = result.dailyStats || {};
      const today = new Date().toDateString();
      
      this.stats = dailyStats[today] || { adsBlocked: 0, dataSaved: 0 };
    } catch (error) {
      console.error('BlockedAds Popup: Failed to load stats', error);
    }
  }

  /**
   * Get current active tab
   */
  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        this.currentDomain = this.extractDomain(tab.url);
      }
    } catch (error) {
      console.error('BlockedAds Popup: Failed to get current tab', error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Toggle blocking
    const toggle = document.getElementById('blockingToggle');
    toggle.checked = this.isEnabled;
    toggle.addEventListener('change', (e) => this.toggleBlocking(e.target.checked));

    // Whitelist button
    document.getElementById('whitelistBtn').addEventListener('click', () => {
      this.toggleWhitelistSection();
    });

    // Stats button
    document.getElementById('statsBtn').addEventListener('click', () => {
      this.showStats();
    });

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.openSettings();
    });

    // Add to whitelist
    document.getElementById('addWhitelistBtn').addEventListener('click', () => {
      this.addToWhitelist();
    });

    // Whitelist input enter key
    document.getElementById('whitelistInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addToWhitelist();
      }
    });
  }

  /**
   * Update UI elements
   */
  updateUI() {
    // Update stats
    document.getElementById('adsBlocked').textContent = this.stats.adsBlocked || 0;
    document.getElementById('dataSaved').textContent = (this.stats.dataSaved || 0).toFixed(1);

    // Update status
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (this.isEnabled) {
      statusDot.classList.add('active');
      statusText.textContent = 'Active';
    } else {
      statusDot.classList.remove('active');
      statusText.textContent = 'Disabled';
    }

    // Update current domain
    document.getElementById('currentDomain').textContent = this.currentDomain || 'Unknown';

    // Update whitelist
    this.updateWhitelistDisplay();
  }

  /**
   * Toggle blocking on/off
   */
  async toggleBlocking(enabled) {
    try {
      this.isEnabled = enabled;
      await chrome.storage.sync.set({ isEnabled: enabled });
      
      // Send message to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'TOGGLE_BLOCKING',
          enabled: enabled
        });
      }
      
      this.updateUI();
    } catch (error) {
      console.error('BlockedAds Popup: Failed to toggle blocking', error);
    }
  }

  /**
   * Toggle whitelist section visibility
   */
  toggleWhitelistSection() {
    const section = document.getElementById('whitelistSection');
    const isVisible = section.style.display !== 'none';
    section.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
      this.updateWhitelistDisplay();
    }
  }

  /**
   * Update whitelist display
   */
  updateWhitelistDisplay() {
    const list = document.getElementById('whitelistList');
    list.innerHTML = '';

    if (this.whitelist.length === 0) {
      list.innerHTML = '<div class="whitelist-item">No whitelisted sites</div>';
      return;
    }

    this.whitelist.forEach(domain => {
      const item = document.createElement('div');
      item.className = 'whitelist-item';
      item.innerHTML = `
        <span class="whitelist-domain">${domain}</span>
        <button class="remove-whitelist" data-domain="${domain}">Remove</button>
      `;
      
      item.querySelector('.remove-whitelist').addEventListener('click', (e) => {
        this.removeFromWhitelist(e.target.dataset.domain);
      });
      
      list.appendChild(item);
    });
  }

  /**
   * Add current site to whitelist
   */
  async addToWhitelist() {
    const input = document.getElementById('whitelistInput');
    const domain = input.value.trim();
    
    if (!domain) {
      // Add current domain if no input
      if (this.currentDomain) {
        await this.addDomainToWhitelist(this.currentDomain);
      }
      return;
    }

    // Validate domain format
    if (!this.isValidDomain(domain)) {
      alert('Please enter a valid domain (e.g., example.com)');
      return;
    }

    await this.addDomainToWhitelist(domain);
    input.value = '';
  }

  /**
   * Add domain to whitelist
   */
  async addDomainToWhitelist(domain) {
    try {
      if (!this.whitelist.includes(domain)) {
        this.whitelist.push(domain);
        await chrome.storage.sync.set({ whitelist: this.whitelist });
        
        // Send message to content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'ADD_WHITELIST',
            domain: domain
          });
        }
        
        this.updateWhitelistDisplay();
      }
    } catch (error) {
      console.error('BlockedAds Popup: Failed to add to whitelist', error);
    }
  }

  /**
   * Remove domain from whitelist
   */
  async removeFromWhitelist(domain) {
    try {
      this.whitelist = this.whitelist.filter(d => d !== domain);
      await chrome.storage.sync.set({ whitelist: this.whitelist });
      
      // Send message to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'REMOVE_WHITELIST',
          domain: domain
        });
      }
      
      this.updateWhitelistDisplay();
    } catch (error) {
      console.error('BlockedAds Popup: Failed to remove from whitelist', error);
    }
  }

  /**
   * Show detailed statistics
   */
  async showStats() {
    try {
      const result = await chrome.storage.local.get(['dailyStats']);
      const dailyStats = result.dailyStats || {};
      
      let statsText = 'BlockedAds Statistics\n\n';
      statsText += `Today: ${this.stats.adsBlocked} ads blocked, ${this.stats.dataSaved} MB saved\n\n`;
      
      const sortedDays = Object.entries(dailyStats)
        .sort(([a], [b]) => new Date(b) - new Date(a))
        .slice(0, 7);
      
      if (sortedDays.length > 0) {
        statsText += 'Last 7 days:\n';
        sortedDays.forEach(([date, stats]) => {
          const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
          statsText += `${dayName}: ${stats.adsBlocked} ads, ${stats.dataSaved} MB\n`;
        });
      }
      
      alert(statsText);
    } catch (error) {
      console.error('BlockedAds Popup: Failed to show stats', error);
    }
  }

  /**
   * Open settings page
   */
  openSettings() {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/blockedads-options.html') });
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
   * Validate domain format
   */
  isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$/;
    return domainRegex.test(domain);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new BlockedAdsPopup();
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'STATS_UPDATE') {
    // Update stats in real-time
    const popup = window.blockedAdsPopup;
    if (popup) {
      popup.stats = request.stats;
      popup.updateUI();
    }
  }
});
