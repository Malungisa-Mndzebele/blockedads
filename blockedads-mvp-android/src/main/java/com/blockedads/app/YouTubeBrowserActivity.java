package com.blockedads.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

/**
 * YouTube Browser Activity
 * Custom WebView-based YouTube client with integrated ad blocking
 * Based on uBlock Origin architecture
 */
public class YouTubeBrowserActivity extends AppCompatActivity {
    
    private WebView webView;
    private EditText urlInput;
    private Button backBtn, forwardBtn, refreshBtn, goBtn;
    private TextView statsText;
    private YouTubeAdBlocker adBlocker;
    private BlockedAdsStats stats;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_youtube_browser);
        
        initializeViews();
        setupWebView();
        setupEventListeners();
        loadYouTube();
    }
    
    /**
     * Initialize UI views
     */
    private void initializeViews() {
        webView = findViewById(R.id.webView);
        urlInput = findViewById(R.id.urlInput);
        backBtn = findViewById(R.id.backBtn);
        forwardBtn = findViewById(R.id.forwardBtn);
        refreshBtn = findViewById(R.id.refreshBtn);
        goBtn = findViewById(R.id.goBtn);
        statsText = findViewById(R.id.statsText);
        
        stats = new BlockedAdsStats(this);
        adBlocker = new YouTubeAdBlocker();
    }
    
    /**
     * Setup WebView with ad blocking
     */
    private void setupWebView() {
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setLoadWithOverviewMode(true);
        webView.getSettings().setUseWideViewPort(true);
        webView.getSettings().setBuiltInZoomControls(true);
        webView.getSettings().setDisplayZoomControls(false);
        
        // Set custom WebViewClient with ad blocking
        webView.setWebViewClient(new YouTubeWebViewClient());
        
        // Add JavaScript interface for ad blocking
        webView.addJavascriptInterface(adBlocker, "AdBlocker");
    }
    
    /**
     * Setup event listeners
     */
    private void setupEventListeners() {
        backBtn.setOnClickListener(v -> {
            if (webView.canGoBack()) {
                webView.goBack();
            }
        });
        
        forwardBtn.setOnClickListener(v -> {
            if (webView.canGoForward()) {
                webView.goForward();
            }
        });
        
        refreshBtn.setOnClickListener(v -> {
            webView.reload();
        });
        
        goBtn.setOnClickListener(v -> {
            String url = urlInput.getText().toString().trim();
            if (!url.isEmpty()) {
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    if (url.contains(".")) {
                        url = "https://" + url;
                    } else {
                        url = "https://www.youtube.com/results?search_query=" + url;
                    }
                }
                webView.loadUrl(url);
            }
        });
        
        urlInput.setOnEditorActionListener((v, actionId, event) -> {
            goBtn.performClick();
            return true;
        });
    }
    
    /**
     * Load YouTube
     */
    private void loadYouTube() {
        webView.loadUrl("https://m.youtube.com");
        urlInput.setText("https://m.youtube.com");
    }
    
    /**
     * Update statistics display
     */
    private void updateStatsDisplay() {
        int adsBlocked = stats.getAdsBlocked();
        double dataSaved = stats.getDataSaved();
        
        String statsDisplay = String.format(
            "🛡️ %d ads blocked | 📊 %.1f MB saved",
            adsBlocked, dataSaved
        );
        
        statsText.setText(statsDisplay);
    }
    
    /**
     * Custom WebViewClient with YouTube ad blocking
     */
    private class YouTubeWebViewClient extends WebViewClient {
        
        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            
            // Inject ad blocking JavaScript
            injectAdBlockingScript(view);
            
            // Update URL input
            urlInput.setText(url);
            
            // Update stats
            updateStatsDisplay();
        }
        
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            // Handle YouTube URLs
            if (url.contains("youtube.com") || url.contains("youtu.be")) {
                view.loadUrl(url);
                return true;
            }
            return false;
        }
    }
    
    /**
     * Inject ad blocking JavaScript
     */
    private void injectAdBlockingScript(WebView webView) {
        String script = 
            "javascript:(function() {" +
            "  // YouTube Ad Blocker Script" +
            "  function blockYouTubeAds() {" +
            "    // Block pre-roll ads" +
            "    const skipButton = document.querySelector('.ytp-ad-skip-button');" +
            "    if (skipButton && !skipButton.disabled) {" +
            "      skipButton.click();" +
            "      AdBlocker.recordBlockedAd('pre-roll');" +
            "    }" +
            "    " +
            "    // Block ad countdown" +
            "    const adText = document.querySelector('.ytp-ad-text');" +
            "    if (adText) {" +
            "      const video = document.querySelector('video');" +
            "      if (video && video.duration > 0) {" +
            "        video.currentTime = video.duration - 0.1;" +
            "        AdBlocker.recordBlockedAd('countdown');" +
            "      }" +
            "    }" +
            "    " +
            "    // Hide banner ads" +
            "    const adSelectors = [" +
            "      '.ytd-promoted-sparkles-web-renderer'," +
            "      '.ytd-ad-slot-renderer'," +
            "      '.ytd-promoted-video-renderer'," +
            "      '.ytd-video-masthead-ad-v3-renderer'," +
            "      '.ytd-compact-promoted-video-renderer'" +
            "    ];" +
            "    " +
            "    adSelectors.forEach(selector => {" +
            "      const elements = document.querySelectorAll(selector);" +
            "      elements.forEach(element => {" +
            "        if (!element.hasAttribute('data-blockedads-hidden')) {" +
            "          element.style.display = 'none';" +
            "          element.setAttribute('data-blockedads-hidden', 'true');" +
            "          AdBlocker.recordBlockedAd('banner');" +
            "        }" +
            "      });" +
            "    });" +
            "  }" +
            "  " +
            "  // Run immediately" +
            "  blockYouTubeAds();" +
            "  " +
            "  // Run on mutations" +
            "  const observer = new MutationObserver(blockYouTubeAds);" +
            "  observer.observe(document.body, { childList: true, subtree: true });" +
            "})();";
        
        webView.evaluateJavascript(script, null);
    }
    
    /**
     * YouTube Ad Blocker JavaScript Interface
     */
    public class YouTubeAdBlocker {
        
        @android.webkit.JavascriptInterface
        public void recordBlockedAd(String adType) {
            runOnUiThread(() -> {
                stats.incrementAdsBlocked();
                stats.addDataSaved(0.05); // Estimate 50KB per ad
                updateStatsDisplay();
            });
        }
        
        @android.webkit.JavascriptInterface
        public void recordYouTubeSession() {
            runOnUiThread(() -> {
                stats.incrementYouTubeSessions();
                updateStatsDisplay();
            });
        }
    }
    
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        updateStatsDisplay();
    }
}
