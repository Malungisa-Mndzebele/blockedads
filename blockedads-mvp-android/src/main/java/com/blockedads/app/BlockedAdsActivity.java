package com.blockedads.app;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

/**
 * Main Activity for BlockedAds Android App
 * Based on uBlock Origin architecture
 */
public class BlockedAdsActivity extends AppCompatActivity {
    
    private TextView statsText;
    private Button openYouTubeBrowserBtn;
    private Button enableAdBlockingBtn;
    private Button settingsBtn;
    private BlockedAdsStats stats;
    private boolean isAdBlockingEnabled = false;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        initializeViews();
        initializeStats();
        setupEventListeners();
        updateStatsDisplay();
        updateUI();
    }
    
    /**
     * Initialize UI views
     */
    private void initializeViews() {
        statsText = findViewById(R.id.statsText);
        openYouTubeBrowserBtn = findViewById(R.id.openYouTubeBrowserBtn);
        enableAdBlockingBtn = findViewById(R.id.enableAdBlockingBtn);
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
        openYouTubeBrowserBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                openYouTubeBrowser();
            }
        });
        
        enableAdBlockingBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                toggleAdBlocking();
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
     * Open the YouTube browser with ad blocking
     */
    private void openYouTubeBrowser() {
        try {
            // Launch YouTube browser activity
            android.content.Intent intent = new android.content.Intent(this, YouTubeBrowserActivity.class);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "Failed to open YouTube browser: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }
    
    /**
     * Toggle ad blocking on/off
     */
    private void toggleAdBlocking() {
        isAdBlockingEnabled = !isAdBlockingEnabled;
        
        if (isAdBlockingEnabled) {
            enableAdBlockingBtn.setText("🔴 Disable Ad Blocking");
            Toast.makeText(this, "Ad blocking enabled", Toast.LENGTH_SHORT).show();
        } else {
            enableAdBlockingBtn.setText("🔴 Enable Ad Blocking");
            Toast.makeText(this, "Ad blocking disabled", Toast.LENGTH_SHORT).show();
        }
        
        updateUI();
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
            "🛡️ %d ads blocked today\n📊 %.1f MB data saved\n🎥 %d YouTube sessions",
            adsBlocked, dataSaved, stats.getYouTubeSessions()
        );
        
        statsText.setText(statsDisplay);
    }
    
    /**
     * Update UI elements
     */
    private void updateUI() {
        // Update button text based on state
        if (isAdBlockingEnabled) {
            enableAdBlockingBtn.setText("🔴 Disable Ad Blocking");
            enableAdBlockingBtn.setBackgroundColor(getResources().getColor(android.R.color.holo_red_light));
        } else {
            enableAdBlockingBtn.setText("🔴 Enable Ad Blocking");
            enableAdBlockingBtn.setBackgroundColor(getResources().getColor(android.R.color.holo_green_light));
        }
        
        updateStatsDisplay();
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        updateStatsDisplay();
        updateUI();
    }
}
