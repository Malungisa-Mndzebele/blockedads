/**
 * BlockedAds Background Service Worker
 * Based on uBlock Origin architecture
 */

// Extension state
let isEnabled = true;
let filterLists = new Map();
let dynamicRules = new Map();
let stats = {
  adsBlocked: 0,
  dataSaved: 0,
  startTime: Date.now()
};

// Filter list URLs (same as uBlock Origin)
const FILTER_LISTS = [
  {
    name: 'EasyList',
    url: 'https://easylist.to/easylist/easylist.txt',
    enabled: true
  },
  {
    name: 'EasyPrivacy',
    url: 'https://easylist.to/easylist/easyprivacy.txt',
    enabled: true
  },
  {
    name: 'uBlock Origin Filters',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
    enabled: true
  },
  {
    name: 'YouTube Ad Blocking',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/youtube.txt',
    enabled: true
  }
];

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await initializeExtension();
  } else if (details.reason === 'update') {
    await updateFilterLists();
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'GET_STATS':
      sendResponse({ stats });
      break;
      
    case 'TOGGLE_BLOCKING':
      toggleBlocking(request.enabled);
      sendResponse({ success: true });
      break;
      
    case 'GET_FILTER_LISTS':
      sendResponse({ filterLists: Array.from(filterLists.values()) });
      break;
      
    case 'UPDATE_FILTER_LISTS':
      updateFilterLists().then(sendResponse);
      return true;
      
    case 'AD_BLOCKED':
      recordBlockedAd(request.adType, request.url);
      sendResponse({ success: true });
      break;
      
    case 'GET_WHITELIST':
      chrome.storage.sync.get(['whitelist']).then(result => {
        sendResponse({ whitelist: result.whitelist || [] });
      });
      return true;
      
    case 'ADD_TO_WHITELIST':
      addToWhitelist(request.domain).then(sendResponse);
      return true;
      
    case 'REMOVE_FROM_WHITELIST':
      removeFromWhitelist(request.domain).then(sendResponse);
      return true;
  }
});

// Initialize extension
async function initializeExtension() {
  try {
    // Load settings
    const result = await chrome.storage.sync.get({
      isEnabled: true,
      whitelist: []
    });
    
    isEnabled = result.isEnabled;
    
    // Load filter lists
    await loadFilterLists();
    
    // Setup declarative net request rules
    await setupDeclarativeNetRequest();
    
    console.log('BlockedAds: Extension initialized successfully');
  } catch (error) {
    console.error('BlockedAds: Failed to initialize', error);
  }
}

// Load filter lists
async function loadFilterLists() {
  for (const list of FILTER_LISTS) {
    if (list.enabled) {
      try {
        const response = await fetch(list.url);
        const text = await response.text();
        filterLists.set(list.name, {
          name: list.name,
          url: list.url,
          content: text,
          lastUpdated: Date.now()
        });
        console.log(`BlockedAds: Loaded ${list.name}`);
      } catch (error) {
        console.error(`BlockedAds: Failed to load ${list.name}`, error);
      }
    }
  }
}

// Parse filter rules (EasyList syntax)
function parseFilterRules(content) {
  const rules = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) {
      continue;
    }
    
    // Parse different rule types
    if (trimmed.startsWith('@@')) {
      // Exception rule
      rules.push({
        type: 'exception',
        pattern: trimmed.substring(2),
        priority: 1
      });
    } else if (trimmed.includes('##')) {
      // Cosmetic rule
      const [domain, selector] = trimmed.split('##');
      rules.push({
        type: 'cosmetic',
        domain: domain || '*',
        selector: selector,
        priority: 1
      });
    } else {
      // Network rule
      rules.push({
        type: 'network',
        pattern: trimmed,
        priority: 1
      });
    }
  }
  
  return rules;
}

// Setup declarative net request rules
async function setupDeclarativeNetRequest() {
  const rules = [];
  let ruleId = 1;
  
  // Convert filter rules to declarative net request rules
  for (const [name, list] of filterLists) {
    const parsedRules = parseFilterRules(list.content);
    
    for (const rule of parsedRules) {
      if (rule.type === 'network') {
        const dnrRule = convertToDeclarativeNetRequest(rule, ruleId++);
        if (dnrRule) {
          rules.push(dnrRule);
        }
      }
    }
  }
  
  // Update dynamic rules
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules,
      removeRuleIds: Array.from(dynamicRules.keys())
    });
    
    // Store rule IDs
    rules.forEach(rule => {
      dynamicRules.set(rule.id, rule);
    });
    
    console.log(`BlockedAds: Updated ${rules.length} declarative net request rules`);
  } catch (error) {
    console.error('BlockedAds: Failed to update declarative net request rules', error);
  }
}

// Convert filter rule to declarative net request rule
function convertToDeclarativeNetRequest(rule, id) {
  try {
    const pattern = rule.pattern;
    
    // Handle different pattern types
    if (pattern.startsWith('||')) {
      // Domain-based rule
      const domain = pattern.substring(2).replace(/\^$/, '');
      return {
        id: id,
        priority: rule.priority,
        action: { type: 'block' },
        condition: {
          urlFilter: `*://${domain}/*`,
          resourceTypes: ['main_frame', 'sub_frame', 'script', 'image', 'stylesheet', 'xmlhttprequest', 'media']
        }
      };
    } else if (pattern.startsWith('|')) {
      // URL-based rule
      const url = pattern.substring(1);
      return {
        id: id,
        priority: rule.priority,
        action: { type: 'block' },
        condition: {
          urlFilter: url,
          resourceTypes: ['main_frame', 'sub_frame', 'script', 'image', 'stylesheet', 'xmlhttprequest', 'media']
        }
      };
    } else if (pattern.startsWith('/') && pattern.endsWith('/')) {
      // Regex rule
      const regex = pattern.substring(1, pattern.length - 1);
      return {
        id: id,
        priority: rule.priority,
        action: { type: 'block' },
        condition: {
          regexFilter: regex,
          resourceTypes: ['main_frame', 'sub_frame', 'script', 'image', 'stylesheet', 'xmlhttprequest', 'media']
        }
      };
    }
  } catch (error) {
    console.error('BlockedAds: Failed to convert rule', rule, error);
  }
  
  return null;
}

// Toggle blocking on/off
async function toggleBlocking(enabled) {
  isEnabled = enabled;
  await chrome.storage.sync.set({ isEnabled: enabled });
  
  if (enabled) {
    await setupDeclarativeNetRequest();
  } else {
    // Remove all dynamic rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Array.from(dynamicRules.keys())
    });
    dynamicRules.clear();
  }
}

// Update filter lists
async function updateFilterLists() {
  await loadFilterLists();
  await setupDeclarativeNetRequest();
  return { success: true };
}

// Record blocked ad
function recordBlockedAd(adType, url) {
  stats.adsBlocked++;
  stats.dataSaved += 0.05; // Estimate 50KB per ad
  
  // Send to content script for UI update
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'STATS_UPDATE',
        stats: stats
      });
    }
  });
}

// Whitelist management
async function addToWhitelist(domain) {
  const result = await chrome.storage.sync.get(['whitelist']);
  const whitelist = result.whitelist || [];
  
  if (!whitelist.includes(domain)) {
    whitelist.push(domain);
    await chrome.storage.sync.set({ whitelist: whitelist });
  }
  
  return { success: true };
}

async function removeFromWhitelist(domain) {
  const result = await chrome.storage.sync.get(['whitelist']);
  const whitelist = result.whitelist || [];
  
  const index = whitelist.indexOf(domain);
  if (index > -1) {
    whitelist.splice(index, 1);
    await chrome.storage.sync.set({ whitelist: whitelist });
  }
  
  return { success: true };
}

// Periodic maintenance
setInterval(async () => {
  try {
    // Update filter lists every 24 hours
    const lastUpdate = await chrome.storage.local.get(['lastFilterUpdate']);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (!lastUpdate.lastFilterUpdate || (now - lastUpdate.lastFilterUpdate) > oneDay) {
      await updateFilterLists();
      await chrome.storage.local.set({ lastFilterUpdate: now });
      console.log('BlockedAds: Updated filter lists');
    }
  } catch (error) {
    console.error('BlockedAds: Failed to perform maintenance', error);
  }
}, 60 * 60 * 1000); // Check every hour
