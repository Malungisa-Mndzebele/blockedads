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
 * WebView Activity with Ad Blocking functionality
 * Provides basic browser interface with ad blocking
 */
public class BlockedAdsWebViewActivity extends AppCompatActivity {
    
    private WebView webView;
    private EditText urlInput;
    private Button goBtn;
    private Button backBtn;
    private Button forwardBtn;
    private Button refreshBtn;
    private TextView statsText;
    private BlockedAdsWebViewClient webViewClient;
    private BlockedAdsStats stats;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_webview);
        
        initializeViews();
        initializeWebView();
        initializeStats();
        setupEventListeners();
        updateStatsDisplay();
    }
    
    /**
     * Initialize UI views
     */
    private void initializeViews() {
        webView = findViewById(R.id.webView);
        urlInput = findViewById(R.id.urlInput);
        goBtn = findViewById(R.id.goBtn);
        backBtn = findViewById(R.id.backBtn);
        forwardBtn = findViewById(R.id.forwardBtn);
        refreshBtn = findViewById(R.id.refreshBtn);
        statsText = findViewById(R.id.statsText);
    }
    
    /**
     * Initialize WebView with ad blocking
     */
    private void initializeWebView() {
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setLoadWithOverviewMode(true);
        webView.getSettings().setUseWideViewPort(true);
        
        webViewClient = new BlockedAdsWebViewClient();
        webView.setWebViewClient(webViewClient);
        
        // Load default page
        webView.loadUrl("https://www.google.com");
    }
    
    /**
     * Initialize statistics tracking
     */
    private void initializeStats() {
        stats = new BlockedAdsStats(this);
    }
    
    /**
     * Setup event listeners
     */
    private void setupEventListeners() {
        goBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                navigateToUrl();
            }
        });
        
        backBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (webView.canGoBack()) {
                    webView.goBack();
                }
            }
        });
        
        forwardBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (webView.canGoForward()) {
                    webView.goForward();
                }
            }
        });
        
        refreshBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                webView.reload();
            }
        });
        
        // Update URL when page loads
        webViewClient.setOnPageFinishedListener(new BlockedAdsWebViewClient.OnPageFinishedListener() {
            @Override
            public void onPageFinished(String url) {
                urlInput.setText(url);
                updateStatsDisplay();
            }
        });
    }
    
    /**
     * Navigate to URL entered in input field
     */
    private void navigateToUrl() {
        String url = urlInput.getText().toString().trim();
        
        if (url.isEmpty()) {
            return;
        }
        
        // Add protocol if missing
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        
        webView.loadUrl(url);
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
    
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
