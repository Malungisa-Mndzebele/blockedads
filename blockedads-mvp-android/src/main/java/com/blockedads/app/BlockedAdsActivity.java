package com.blockedads.app;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

/**
 * Main Activity for BlockedAds Android App
 * Provides basic browser functionality with ad blocking
 */
public class BlockedAdsActivity extends AppCompatActivity {
    
    private TextView statsText;
    private Button openBrowserBtn;
    private Button settingsBtn;
    private BlockedAdsStats stats;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        initializeViews();
        initializeStats();
        setupEventListeners();
        updateStatsDisplay();
    }
    
    /**
     * Initialize UI views
     */
    private void initializeViews() {
        statsText = findViewById(R.id.statsText);
        openBrowserBtn = findViewById(R.id.openBrowserBtn);
        settingsBtn = findViewById(R.id.settingsBtn);
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
        openBrowserBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                openBrowser();
            }
        });
        
        settingsBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                openSettings();
            }
        });
    }
    
    /**
     * Open the ad-blocking browser
     */
    private void openBrowser() {
        try {
            // Launch WebView activity
            android.content.Intent intent = new android.content.Intent(this, BlockedAdsWebViewActivity.class);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Failed to open browser: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }
    
    /**
     * Open settings (placeholder for MVP)
     */
    private void openSettings() {
        Toast.makeText(this, "Settings coming soon!", Toast.LENGTH_SHORT).show();
    }
    
    /**
     * Update statistics display
     */
    private void updateStatsDisplay() {
        int adsBlocked = stats.getAdsBlocked();
        double dataSaved = stats.getDataSaved();
        
        String statsDisplay = String.format(
            "🛡️ %d ads blocked today\n📊 %.1f MB data saved",
            adsBlocked, dataSaved
        );
        
        statsText.setText(statsDisplay);
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        updateStatsDisplay();
    }
}
