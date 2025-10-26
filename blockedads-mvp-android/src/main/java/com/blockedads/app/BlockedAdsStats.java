package com.blockedads.app;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * BlockedAds Statistics Manager
 * Based on uBlock Origin statistics tracking
 */
public class BlockedAdsStats {
    
    private static final String PREFS_NAME = "BlockedAdsStats";
    private static final String KEY_ADS_BLOCKED = "ads_blocked";
    private static final String KEY_DATA_SAVED = "data_saved";
    private static final String KEY_YOUTUBE_SESSIONS = "youtube_sessions";
    private static final String KEY_START_TIME = "start_time";
    
    private SharedPreferences prefs;
    private Context context;
    
    public BlockedAdsStats(Context context) {
        this.context = context;
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        // Initialize start time if not set
        if (!prefs.contains(KEY_START_TIME)) {
            prefs.edit().putLong(KEY_START_TIME, System.currentTimeMillis()).apply();
        }
    }
    
    /**
     * Get total ads blocked
     */
    public int getAdsBlocked() {
        return prefs.getInt(KEY_ADS_BLOCKED, 0);
    }
    
    /**
     * Increment ads blocked counter
     */
    public void incrementAdsBlocked() {
        int current = getAdsBlocked();
        prefs.edit().putInt(KEY_ADS_BLOCKED, current + 1).apply();
    }
    
    /**
     * Add to ads blocked counter
     */
    public void addAdsBlocked(int count) {
        int current = getAdsBlocked();
        prefs.edit().putInt(KEY_ADS_BLOCKED, current + count).apply();
    }
    
    /**
     * Get total data saved in MB
     */
    public double getDataSaved() {
        return Double.longBitsToDouble(prefs.getLong(KEY_DATA_SAVED, 0));
    }
    
    /**
     * Add to data saved counter
     */
    public void addDataSaved(double mb) {
        double current = getDataSaved();
        prefs.edit().putLong(KEY_DATA_SAVED, Double.doubleToLongBits(current + mb)).apply();
    }
    
    /**
     * Get YouTube sessions count
     */
    public int getYouTubeSessions() {
        return prefs.getInt(KEY_YOUTUBE_SESSIONS, 0);
    }
    
    /**
     * Increment YouTube sessions counter
     */
    public void incrementYouTubeSessions() {
        int current = getYouTubeSessions();
        prefs.edit().putInt(KEY_YOUTUBE_SESSIONS, current + 1).apply();
    }
    
    /**
     * Get start time
     */
    public long getStartTime() {
        return prefs.getLong(KEY_START_TIME, System.currentTimeMillis());
    }
    
    /**
     * Get runtime in minutes
     */
    public long getRuntimeMinutes() {
        return (System.currentTimeMillis() - getStartTime()) / (1000 * 60);
    }
    
    /**
     * Reset all statistics
     */
    public void resetStats() {
        prefs.edit()
            .putInt(KEY_ADS_BLOCKED, 0)
            .putLong(KEY_DATA_SAVED, 0)
            .putInt(KEY_YOUTUBE_SESSIONS, 0)
            .putLong(KEY_START_TIME, System.currentTimeMillis())
            .apply();
    }
    
    /**
     * Get formatted statistics string
     */
    public String getFormattedStats() {
        return String.format(
            "Ads Blocked: %d\nData Saved: %.2f MB\nYouTube Sessions: %d\nRuntime: %d minutes",
            getAdsBlocked(),
            getDataSaved(),
            getYouTubeSessions(),
            getRuntimeMinutes()
        );
    }
    
    /**
     * Get daily statistics (resets at midnight)
     */
    public int getDailyAdsBlocked() {
        // This would require more complex date handling
        // For MVP, return total ads blocked
        return getAdsBlocked();
    }
    
    /**
     * Get daily data saved
     */
    public double getDailyDataSaved() {
        // This would require more complex date handling
        // For MVP, return total data saved
        return getDataSaved();
    }
}
