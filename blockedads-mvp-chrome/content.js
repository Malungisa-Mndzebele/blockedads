/**
 * BlockedAds Content Script
 * Based on uBlock Origin content script architecture
 */

// Content script state
let isEnabled = true;
let cosmeticFilters = new Map();
let stats = {
  adsBlocked: 0,
  dataSaved: 0
};

// Initialize content script
(async function() {
  try {
    await loadSettings();
    await loadCosmeticFilters();
    setupElementHiding();
    setupYouTubeAdBlocking();
    setupStatsTracking();
  } catch (error) {
    console.error('BlockedAds: Failed to initialize content script', error);
  }
})();

// Load settings from background script
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
    if (response) {
      stats = response.stats;
    }
  } catch (error) {
    console.error('BlockedAds: Failed to load settings', error);
  }
}

// Load cosmetic filters
async function loadCosmeticFilters() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_FILTER_LISTS' });
    if (response && response.filterLists) {
      for (const list of response.filterLists) {
        parseCosmeticFilters(list.content);
      }
    }
  } catch (error) {
    console.error('BlockedAds: Failed to load cosmetic filters', error);
  }
}

// Parse cosmetic filters from filter list content
function parseCosmeticFilters(content) {
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) {
      continue;
    }
    
    // Parse cosmetic rules (contain ##)
    if (trimmed.includes('##')) {
      const [domain, selector] = trimmed.split('##');
      const domainKey = domain || '*';
      
      if (!cosmeticFilters.has(domainKey)) {
        cosmeticFilters.set(domainKey, []);
      }
      
      cosmeticFilters.get(domainKey).push({
        selector: selector,
        domain: domainKey
      });
    }
  }
}

// Setup element hiding
function setupElementHiding() {
  // Hide elements on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideElements);
  } else {
    hideElements();
  }
  
  // Watch for dynamically added elements
  const observer = new MutationObserver(() => {
    hideElements();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Hide elements matching cosmetic filters
function hideElements() {
  const hostname = window.location.hostname;
  
  // Get filters for current domain and global filters
  const domainFilters = cosmeticFilters.get(hostname) || [];
  const globalFilters = cosmeticFilters.get('*') || [];
  const allFilters = [...domainFilters, ...globalFilters];
  
  for (const filter of allFilters) {
    try {
      const elements = document.querySelectorAll(filter.selector);
      elements.forEach(element => {
        if (!element.hasAttribute('data-blockedads-hidden')) {
          element.style.display = 'none';
          element.setAttribute('data-blockedads-hidden', 'true');
          recordBlockedAd('cosmetic', filter.selector);
        }
      });
    } catch (error) {
      // Invalid selector, skip
    }
  }
}

// YouTube-specific ad blocking
function setupYouTubeAdBlocking() {
  if (!window.location.hostname.includes('youtube.com')) {
    return;
  }
  
  // YouTube ad selectors (based on uBlock Origin)
  const youtubeAdSelectors = [
    // Pre-roll ads
    '.ytp-ad-player-overlay',
    '.ytp-ad-text',
    '.ytp-ad-skip-button',
    
    // Mid-roll ads
    '.ytp-ad-module',
    '.ytp-ad-overlay-container',
    
    // Banner ads
    '.ytd-promoted-sparkles-web-renderer',
    '.ytd-ad-slot-renderer',
    '.ytd-promoted-video-renderer',
    
    // Sponsored content
    '.ytd-video-masthead-ad-v3-renderer',
    '.ytd-compact-promoted-video-renderer',
    '[aria-label*="sponsored"]',
    '[aria-label*="promoted"]'
  ];
  
  // Block YouTube ads
  const blockYouTubeAds = () => {
    youtubeAdSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (!element.hasAttribute('data-blockedads-hidden')) {
          element.style.display = 'none';
          element.setAttribute('data-blockedads-hidden', 'true');
          recordBlockedAd('youtube', selector);
        }
      });
    });
    
    // Skip pre-roll ads
    const skipButton = document.querySelector('.ytp-ad-skip-button');
    if (skipButton && !skipButton.disabled) {
      skipButton.click();
      recordBlockedAd('youtube-pre-roll', 'skip-button');
    }
    
    // Skip ad countdown
    const adText = document.querySelector('.ytp-ad-text');
    if (adText) {
      const video = document.querySelector('video');
      if (video && video.duration > 0) {
        video.currentTime = video.duration - 0.1;
        recordBlockedAd('youtube-countdown', 'countdown-skip');
      }
    }
  };
  
  // Run immediately and on mutations
  blockYouTubeAds();
  
  const observer = new MutationObserver(() => {
    blockYouTubeAds();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Handle mid-roll ads
  const video = document.querySelector('video');
  if (video) {
    let lastTime = 0;
    
    video.addEventListener('timeupdate', () => {
      const currentTime = video.currentTime;
      
      // Detect ad interruption
      if (Math.abs(currentTime - lastTime) > 1 && !video.paused) {
        if (isAdPlaying()) {
          skipToNextSegment(video);
          recordBlockedAd('youtube-mid-roll', 'mid-roll-skip');
        }
      }
      
      lastTime = currentTime;
    });
  }
}

// Check if ad is playing
function isAdPlaying() {
  return document.querySelector('.ytp-ad-player-overlay') !== null ||
         document.querySelector('.ytp-ad-module') !== null;
}

// Skip to next video segment
function skipToNextSegment(video) {
  video.currentTime += 5;
}

// Setup statistics tracking
function setupStatsTracking() {
  // Listen for stats updates from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'STATS_UPDATE') {
      stats = request.stats;
      updateStatsDisplay();
    }
  });
  
  // Update stats display
  updateStatsDisplay();
}

// Update stats display
function updateStatsDisplay() {
  // Send stats to popup if it's open
  chrome.runtime.sendMessage({
    type: 'STATS_UPDATE',
    stats: stats
  });
}

// Record blocked ad
function recordBlockedAd(type, selector) {
  stats.adsBlocked++;
  stats.dataSaved += 0.05; // Estimate 50KB per ad
  
  // Send to background script
  chrome.runtime.sendMessage({
    type: 'AD_BLOCKED',
    adType: type,
    url: window.location.href,
    selector: selector
  });
  
  // Update local display
  updateStatsDisplay();
}

// Handle network requests (for additional blocking)
function handleNetworkRequest(details) {
  if (!isEnabled) {
    return { cancel: false };
  }
  
  const url = details.url;
  const hostname = new URL(url).hostname;
  
  // Check against known ad domains
  const adDomains = [
    'googleadservices.com',
    'googlesyndication.com',
    'doubleclick.net',
    'facebook.com',
    'amazon-adsystem.com',
    'ads.yahoo.com'
  ];
  
  for (const domain of adDomains) {
    if (hostname.includes(domain)) {
      recordBlockedAd('network', domain);
      return { cancel: true };
    }
  }
  
  return { cancel: false };
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    hideElements,
    recordBlockedAd,
    isAdPlaying,
    skipToNextSegment
  };
}
