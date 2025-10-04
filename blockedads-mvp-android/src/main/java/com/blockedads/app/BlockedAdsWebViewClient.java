package com.blockedads.app;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Custom WebViewClient with Ad Blocking functionality
 * Intercepts and blocks ad-related network requests
 */
public class BlockedAdsWebViewClient extends WebViewClient {
    
    private OnPageFinishedListener pageFinishedListener;
    private BlockedAdsFilterEngine filterEngine;
    private BlockedAdsStats stats;
    
    public interface OnPageFinishedListener {
        void onPageFinished(String url);
    }
    
    public BlockedAdsWebViewClient() {
        filterEngine = new BlockedAdsFilterEngine();
        stats = new BlockedAdsStats(null);
    }
    
    /**
     * Set page finished listener
     */
    public void setOnPageFinishedListener(OnPageFinishedListener listener) {
        this.pageFinishedListener = listener;
    }
    
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        String url = request.getUrl().toString();
        
        // Check if URL should be blocked
        if (filterEngine.shouldBlockUrl(url)) {
            stats.incrementAdsBlocked();
            stats.addDataSaved(0.05); // Estimate 50KB per blocked ad
            
            // Return empty response to block the request
            return new WebResourceResponse(
                "text/plain",
                "utf-8",
                new ByteArrayInputStream("".getBytes())
            );
        }
        
        return super.shouldInterceptRequest(view, request);
    }
    
    @Override
    public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        
        // Inject ad blocking CSS
        injectAdBlockingCSS(view);
        
        if (pageFinishedListener != null) {
            pageFinishedListener.onPageFinished(url);
        }
    }
    
    /**
     * Inject CSS to hide ad elements
     */
    private void injectAdBlockingCSS(WebView view) {
        String css = 
            "var style = document.createElement('style');" +
            "style.innerHTML = '" +
            ".ad, .advertisement, .ad-banner, .ad-container, .ad-wrapper, " +
            ".adsense, .google-ad, .sponsored, .promo, .banner-ad, " +
            ".sidebar-ad, .header-ad, .footer-ad, [class*=\"ad\"], " +
            "[id*=\"ad\"], [class*=\"banner\"], [id*=\"banner\"] " +
            "{ display: none !important; }';" +
            "document.head.appendChild(style);";
        
        view.evaluateJavascript(css, null);
    }
}

/**
 * Simple Filter Engine for Ad Blocking
 */
class BlockedAdsFilterEngine {
    
    private Set<Pattern> blockedPatterns;
    
    public BlockedAdsFilterEngine() {
        blockedPatterns = new HashSet<>();
        loadBasicRules();
    }
    
    /**
     * Load basic ad blocking rules
     */
    private void loadBasicRules() {
        String[] rules = {
            ".*googleadservices\\.com.*",
            ".*googlesyndication\\.com.*",
            ".*doubleclick\\.net.*",
            ".*googletagmanager\\.com.*",
            ".*googletagservices\\.com.*",
            ".*google-analytics\\.com.*",
            ".*facebook\\.com/tr.*",
            ".*facebook\\.net.*",
            ".*connect\\.facebook\\.net.*",
            ".*fbcdn\\.net.*",
            ".*amazon-adsystem\\.com.*",
            ".*adsystem\\.amazon\\.com.*",
            ".*aaxads\\.com.*",
            ".*ads\\.yahoo\\.com.*",
            ".*adsystem\\.yahoo\\.com.*",
            ".*ads-twitter\\.com.*",
            ".*twitter\\.com/i/adsct.*",
            ".*ads-api\\.twitter\\.com.*"
        };
        
        for (String rule : rules) {
            blockedPatterns.add(Pattern.compile(rule, Pattern.CASE_INSENSITIVE));
        }
    }
    
    /**
     * Check if URL should be blocked
     */
    public boolean shouldBlockUrl(String url) {
        for (Pattern pattern : blockedPatterns) {
            if (pattern.matcher(url).matches()) {
                return true;
            }
        }
        return false;
    }
}

/**
 * Simple Statistics Tracker
 */
class BlockedAdsStats {
    
    private static final String PREFS_NAME = "BlockedAdsStats";
    private static final String KEY_ADS_BLOCKED = "ads_blocked";
    private static final String KEY_DATA_SAVED = "data_saved";
    
    private android.content.SharedPreferences prefs;
    
    public BlockedAdsStats(android.content.Context context) {
        if (context != null) {
            prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE);
        }
    }
    
    /**
     * Get number of ads blocked
     */
    public int getAdsBlocked() {
        return prefs != null ? prefs.getInt(KEY_ADS_BLOCKED, 0) : 0;
    }
    
    /**
     * Get data saved in MB
     */
    public double getDataSaved() {
        return prefs != null ? prefs.getFloat(KEY_DATA_SAVED, 0.0f) : 0.0;
    }
    
    /**
     * Increment ads blocked counter
     */
    public void incrementAdsBlocked() {
        if (prefs != null) {
            int current = getAdsBlocked();
            prefs.edit().putInt(KEY_ADS_BLOCKED, current + 1).apply();
        }
    }
    
    /**
     * Add to data saved counter
     */
    public void addDataSaved(double mb) {
        if (prefs != null) {
            double current = getDataSaved();
            prefs.edit().putFloat(KEY_DATA_SAVED, (float)(current + mb)).apply();
        }
    }
}
