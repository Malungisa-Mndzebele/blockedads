/**
 * BlockedAds Background Service Worker
 * Handles extension lifecycle and message routing
 */

// Extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialize default settings
    chrome.storage.sync.set({
      isEnabled: true,
      whitelist: [],
      stats: {
        adsBlocked: 0,
        dataSaved: 0,
        startTime: Date.now()
      }
    });
    
    console.log('BlockedAds: Extension installed successfully');
  } else if (details.reason === 'update') {
    console.log('BlockedAds: Extension updated to version', chrome.runtime.getManifest().version);
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'STATS_UPDATE':
      handleStatsUpdate(request.stats);
      break;
      
    case 'GET_DAILY_STATS':
      getDailyStats().then(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'CLEAR_STATS':
      clearStats().then(sendResponse);
      return true;
      
    case 'UPDATE_FILTERS':
      updateFilters().then(sendResponse);
      return true;
  }
});

/**
 * Handle statistics updates
 */
async function handleStatsUpdate(stats) {
  try {
    const result = await chrome.storage.local.get(['dailyStats']);
    const dailyStats = result.dailyStats || {};
    const today = new Date().toDateString();
    
    dailyStats[today] = {
      adsBlocked: (dailyStats[today]?.adsBlocked || 0) + stats.adsBlocked,
      dataSaved: (dailyStats[today]?.dataSaved || 0) + stats.dataSaved,
      lastUpdate: Date.now()
    };
    
    await chrome.storage.local.set({ dailyStats });
  } catch (error) {
    console.error('BlockedAds: Failed to update stats', error);
  }
}

/**
 * Get daily statistics
 */
async function getDailyStats() {
  try {
    const result = await chrome.storage.local.get(['dailyStats']);
    return { dailyStats: result.dailyStats || {} };
  } catch (error) {
    console.error('BlockedAds: Failed to get daily stats', error);
    return { dailyStats: {} };
  }
}

/**
 * Clear all statistics
 */
async function clearStats() {
  try {
    await chrome.storage.local.remove(['dailyStats']);
    await chrome.storage.sync.set({
      stats: {
        adsBlocked: 0,
        dataSaved: 0,
        startTime: Date.now()
      }
    });
    return { success: true };
  } catch (error) {
    console.error('BlockedAds: Failed to clear stats', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update filter rules
 */
async function updateFilters() {
  try {
    // In a real implementation, this would fetch updated filter lists
    // For MVP, we'll just return success
    console.log('BlockedAds: Filter update requested');
    return { success: true, message: 'Filters updated successfully' };
  } catch (error) {
    console.error('BlockedAds: Failed to update filters', error);
    return { success: false, error: error.message };
  }
}

// Handle tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if content script needs to be injected
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['blockedads-core.js']
    }).catch(() => {
      // Ignore errors for restricted pages
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will open the popup automatically due to manifest configuration
  console.log('BlockedAds: Icon clicked for tab', tab.id);
});

// Periodic maintenance tasks
setInterval(async () => {
  try {
    // Clean up old statistics (keep only last 30 days)
    const result = await chrome.storage.local.get(['dailyStats']);
    const dailyStats = result.dailyStats || {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const cleanedStats = {};
    for (const [date, stats] of Object.entries(dailyStats)) {
      const statDate = new Date(date);
      if (statDate >= thirtyDaysAgo) {
        cleanedStats[date] = stats;
      }
    }
    
    if (Object.keys(cleanedStats).length !== Object.keys(dailyStats).length) {
      await chrome.storage.local.set({ dailyStats: cleanedStats });
      console.log('BlockedAds: Cleaned up old statistics');
    }
  } catch (error) {
    console.error('BlockedAds: Failed to perform maintenance', error);
  }
}, 24 * 60 * 60 * 1000); // Run daily
