/**
 * BlockedAds Popup Script
 * Based on uBlock Origin popup architecture
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
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (response) {
        this.stats = response.stats;
      }
    } catch (error) {
      console.error('BlockedAds Popup: Failed to load settings', error);
    }
  }

  /**
   * Load statistics
   */
  async loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (response) {
        this.stats = response.stats;
      }
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

    // YouTube browser button
    document.getElementById('youtubeBtn').addEventListener('click', () => {
      this.openYouTubeBrowser();
    });

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

    // Close button
    document.getElementById('closeBtn').addEventListener('click', () => {
      window.close();
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

    // Close whitelist section
    document.getElementById('closeWhitelistBtn').addEventListener('click', () => {
      this.toggleWhitelistSection();
    });

    // Update filters button
    document.getElementById('updateFiltersBtn').addEventListener('click', () => {
      this.updateFilterLists();
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
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (this.isEnabled) {
      statusDot.classList.add('active');
      statusText.textContent = 'Active';
    } else {
      statusDot.classList.remove('active');
      statusText.textContent = 'Disabled';
    }

    // Update whitelist
    this.updateWhitelistDisplay();
  }

  /**
   * Toggle blocking on/off
   */
  async toggleBlocking(enabled) {
    try {
      this.isEnabled = enabled;
      
      const response = await chrome.runtime.sendMessage({
        type: 'TOGGLE_BLOCKING',
        enabled: enabled
      });
      
      if (response && response.success) {
        this.updateUI();
      }
    } catch (error) {
      console.error('BlockedAds Popup: Failed to toggle blocking', error);
    }
  }

  /**
   * Open YouTube browser
   */
  async openYouTubeBrowser() {
    try {
      // Open YouTube in new tab with our content script
      const tab = await chrome.tabs.create({
        url: 'https://www.youtube.com',
        active: true
      });
      
      // Inject our YouTube ad blocker
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      
      window.close();
    } catch (error) {
      console.error('BlockedAds Popup: Failed to open YouTube browser', error);
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
  async updateWhitelistDisplay() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_WHITELIST' });
      if (response) {
        this.whitelist = response.whitelist;
      }
      
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
    } catch (error) {
      console.error('BlockedAds Popup: Failed to update whitelist display', error);
    }
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
      const response = await chrome.runtime.sendMessage({
        type: 'ADD_TO_WHITELIST',
        domain: domain
      });
      
      if (response && response.success) {
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
      const response = await chrome.runtime.sendMessage({
        type: 'REMOVE_FROM_WHITELIST',
        domain: domain
      });
      
      if (response && response.success) {
        this.updateWhitelistDisplay();
      }
    } catch (error) {
      console.error('BlockedAds Popup: Failed to remove from whitelist', error);
    }
  }

  /**
   * Show detailed statistics
   */
  async showStats() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (response) {
        const stats = response.stats;
        
        let statsText = 'BlockedAds Statistics\n\n';
        statsText += `Ads Blocked: ${stats.adsBlocked}\n`;
        statsText += `Data Saved: ${stats.dataSaved.toFixed(2)} MB\n`;
        statsText += `Runtime: ${Math.floor((Date.now() - stats.startTime) / 1000 / 60)} minutes\n\n`;
        statsText += 'Filter Lists:\n';
        statsText += '• EasyList (Active)\n';
        statsText += '• EasyPrivacy (Active)\n';
        statsText += '• uBlock Origin Filters (Active)\n';
        statsText += '• YouTube Ad Blocking (Active)';
        
        alert(statsText);
      }
    } catch (error) {
      console.error('BlockedAds Popup: Failed to show stats', error);
    }
  }

  /**
   * Update filter lists
   */
  async updateFilterLists() {
    try {
      const button = document.getElementById('updateFiltersBtn');
      button.textContent = 'Updating...';
      button.disabled = true;
      
      const response = await chrome.runtime.sendMessage({ type: 'UPDATE_FILTER_LISTS' });
      
      if (response && response.success) {
        button.textContent = 'Updated!';
        setTimeout(() => {
          button.textContent = 'Update';
          button.disabled = false;
        }, 2000);
      }
    } catch (error) {
      console.error('BlockedAds Popup: Failed to update filter lists', error);
      const button = document.getElementById('updateFiltersBtn');
      button.textContent = 'Error';
      setTimeout(() => {
        button.textContent = 'Update';
        button.disabled = false;
      }, 2000);
    }
  }

  /**
   * Open settings page
   */
  openSettings() {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
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
